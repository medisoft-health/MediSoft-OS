import "server-only";
import type { PatientFullContext } from "@/lib/queries/patient-context";

/**
 * FHIR R4 Context Builder.
 *
 * Converts MediSoft patient data to HL7 FHIR R4 Bundle format.
 * Used by MedGemma (which is trained on FHIR) and for Cloud Healthcare API compliance.
 *
 * Reference: https://hl7.org/fhir/R4/
 */

export interface FHIRBundle {
  resourceType: "Bundle";
  type: "collection";
  entry: Array<{ resource: Record<string, unknown> }>;
}

export function buildFHIRPatientContext(ctx: PatientFullContext): FHIRBundle {
  const entries: Array<{ resource: Record<string, unknown> }> = [];

  // Patient Resource
  entries.push({
    resource: {
      resourceType: "Patient",
      id: String(ctx.demographics.id),
      name: [{ given: [ctx.demographics.firstName], family: ctx.demographics.lastName }],
      gender: ctx.demographics.sex === "male" ? "male" : ctx.demographics.sex === "female" ? "female" : "unknown",
      birthDate: calculateBirthDate(ctx.demographics.age),
      extension: [
        ...(ctx.demographics.bloodType ? [{
          url: "http://hl7.org/fhir/StructureDefinition/patient-bloodType",
          valueString: ctx.demographics.bloodType,
        }] : []),
      ],
    },
  });

  // Allergies → AllergyIntolerance
  for (const allergy of ctx.demographics.allergies) {
    entries.push({
      resource: {
        resourceType: "AllergyIntolerance",
        patient: { reference: `Patient/${ctx.demographics.id}` },
        code: { text: allergy.substance },
        reaction: allergy.reaction ? [{ description: allergy.reaction }] : [],
        criticality: allergy.severity === "severe" ? "high" : allergy.severity === "moderate" ? "low" : "unable-to-assess",
      },
    });
  }

  // Chronic Conditions → Condition
  for (const cond of ctx.demographics.chronicConditions) {
    entries.push({
      resource: {
        resourceType: "Condition",
        subject: { reference: `Patient/${ctx.demographics.id}` },
        code: {
          text: cond.description,
          ...(cond.icdCode ? { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: cond.icdCode }] } : {}),
        },
        onsetDateTime: cond.onsetDate ?? undefined,
        clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
      },
    });
  }

  // Active Medications → MedicationRequest
  for (const med of ctx.activeMedications) {
    entries.push({
      resource: {
        resourceType: "MedicationRequest",
        id: med.id,
        status: med.status === "active" ? "active" : "completed",
        intent: "order",
        subject: { reference: `Patient/${ctx.demographics.id}` },
        medicationCodeableConcept: { text: med.drugName },
        dosageInstruction: [{
          text: `${med.dose} ${med.frequency}`,
          route: { text: med.route },
        }],
        authoredOn: med.startDate ?? undefined,
      },
    });
  }

  // Latest Vitals → Observation (vital-signs)
  if (ctx.latestVitals) {
    const v = ctx.latestVitals;
    const vitalDate = v.recordedAt.toISOString();

    if (v.bloodPressureSystolic && v.bloodPressureDiastolic) {
      entries.push({
        resource: {
          resourceType: "Observation",
          status: "final",
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
          code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure" }] },
          subject: { reference: `Patient/${ctx.demographics.id}` },
          effectiveDateTime: vitalDate,
          component: [
            { code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic" }] }, valueQuantity: { value: v.bloodPressureSystolic, unit: "mmHg" } },
            { code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic" }] }, valueQuantity: { value: v.bloodPressureDiastolic, unit: "mmHg" } },
          ],
        },
      });
    }

    if (v.heartRate) {
      entries.push({ resource: buildVitalObservation(ctx.demographics.id, vitalDate, "8867-4", "Heart rate", v.heartRate, "beats/min") });
    }
    if (v.bmi) {
      entries.push({ resource: buildVitalObservation(ctx.demographics.id, vitalDate, "39156-5", "BMI", Number(v.bmi), "kg/m2") });
    }
    if (v.spO2) {
      entries.push({ resource: buildVitalObservation(ctx.demographics.id, vitalDate, "2708-6", "SpO2", v.spO2, "%") });
    }
  }

  // Lab Results → Observation (laboratory)
  if (ctx.labHistory.length > 0) {
    const latest = ctx.labHistory[0];
    for (const r of latest.results.slice(0, 30)) {
      const val = typeof r.value === "number" ? r.value : parseFloat(String(r.value));
      entries.push({
        resource: {
          resourceType: "Observation",
          status: "final",
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
          code: { text: r.testName },
          subject: { reference: `Patient/${ctx.demographics.id}` },
          effectiveDateTime: latest.resultDate.toISOString(),
          ...(isNaN(val) ? { valueString: String(r.value) } : { valueQuantity: { value: val, unit: r.unit ?? "" } }),
          ...(r.referenceLow != null && r.referenceHigh != null ? {
            referenceRange: [{ low: { value: Number(r.referenceLow) }, high: { value: Number(r.referenceHigh) } }],
          } : {}),
          ...(r.flag ? { interpretation: [{ text: r.flag }] } : {}),
        },
      });
    }
  }

  // Recent Encounters → Encounter
  for (const enc of ctx.recentEncounters.slice(0, 5)) {
    const soap = enc.soapNote as { subjective?: { chiefComplaint?: string }; assessment?: { diagnoses?: Array<{ description: string }> } } | null;
    entries.push({
      resource: {
        resourceType: "Encounter",
        id: enc.id,
        status: enc.status === "signed" ? "finished" : "in-progress",
        class: { code: enc.encounterType ?? "AMB", display: enc.encounterType ?? "ambulatory" },
        subject: { reference: `Patient/${ctx.demographics.id}` },
        period: { start: enc.encounterDate.toISOString() },
        reasonCode: soap?.subjective?.chiefComplaint ? [{ text: soap.subjective.chiefComplaint }] : [],
        diagnosis: soap?.assessment?.diagnoses?.map((d) => ({ condition: { display: d.description } })) ?? [],
      },
    });
  }

  return { resourceType: "Bundle", type: "collection", entry: entries };
}

// ─── Helpers ──────────────────────────────────────────────────

function calculateBirthDate(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

function buildVitalObservation(patientId: number, date: string, loincCode: string, display: string, value: number, unit: string): Record<string, unknown> {
  return {
    resourceType: "Observation",
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
    code: { coding: [{ system: "http://loinc.org", code: loincCode, display }] },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: date,
    valueQuantity: { value, unit },
  };
}

/**
 * Convert a FHIR Bundle to a compact text representation for LLM context injection.
 * MedGemma understands FHIR natively, but this is useful for other models.
 */
export function fhirBundleToText(bundle: FHIRBundle): string {
  const lines: string[] = ["=== PATIENT FHIR CONTEXT ==="];
  for (const entry of bundle.entry) {
    const r = entry.resource;
    const type = r.resourceType as string;
    switch (type) {
      case "Patient": {
        const name = (r.name as Array<{ given: string[]; family: string }>)?.[0];
        lines.push(`Patient: ${name?.given?.[0] ?? ""} ${name?.family ?? ""} | Gender: ${r.gender} | DOB: ${r.birthDate}`);
        break;
      }
      case "AllergyIntolerance":
        lines.push(`Allergy: ${(r.code as { text: string }).text} (${r.criticality})`);
        break;
      case "Condition":
        lines.push(`Condition: ${(r.code as { text: string }).text}`);
        break;
      case "MedicationRequest":
        lines.push(`Medication: ${(r.medicationCodeableConcept as { text: string }).text} — ${(r.dosageInstruction as Array<{ text: string }>)?.[0]?.text ?? ""}`);
        break;
      case "Observation": {
        const cat = ((r.category as Array<{ coding: Array<{ code: string }> }>)?.[0]?.coding?.[0]?.code) ?? "";
        const code = (r.code as { text?: string; coding?: Array<{ display: string }> });
        const display = code.text ?? code.coding?.[0]?.display ?? "";
        const vq = r.valueQuantity as { value: number; unit: string } | undefined;
        const vs = r.valueString as string | undefined;
        const val = vq ? `${vq.value} ${vq.unit}` : vs ?? "";
        lines.push(`${cat === "vital-signs" ? "Vital" : "Lab"}: ${display} = ${val}`);
        break;
      }
    }
  }
  return lines.join("\n");
}

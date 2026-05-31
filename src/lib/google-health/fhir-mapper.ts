import "server-only";

/**
 * FHIR R4 Data Mapper — Converts between MediSoft internal schema and FHIR R4 resources.
 *
 * This module provides bidirectional mapping for:
 * - Patient ↔ FHIR Patient
 * - Encounter ↔ FHIR Encounter
 * - Prescription ↔ FHIR MedicationRequest
 * - Lab Result ↔ FHIR DiagnosticReport + Observation
 * - Scan ↔ FHIR ImagingStudy
 * - Vitals ↔ FHIR Observation (vital-signs)
 */

import type {
  FHIRPatient,
  FHIREncounter,
  FHIRMedicationRequest,
  FHIRDiagnosticReport,
  FHIRImagingStudy,
  FHIRObservation,
} from "./fhir-client";

// ─── Patient Mapper ──────────────────────────────────────────────────────────

interface MediSoftPatient {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  insuranceId: string | null;
  insuranceProvider: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

export function patientToFHIR(patient: MediSoftPatient): FHIRPatient {
  const nameParts = patient.fullName.split(" ");
  const family = nameParts.pop() || "";
  const given = nameParts.length > 0 ? nameParts : [patient.fullName];

  const telecom: FHIRPatient["telecom"] = [];
  if (patient.phone) telecom.push({ system: "phone", value: patient.phone, use: "mobile" });
  if (patient.email) telecom.push({ system: "email", value: patient.email });

  const identifier: FHIRPatient["identifier"] = [];
  identifier.push({ system: "urn:medisoft:patient-id", value: patient.id });
  if (patient.nationalId) {
    identifier.push({ system: "urn:sa:national-id", value: patient.nationalId });
  }
  if (patient.insuranceId) {
    identifier.push({
      system: `urn:insurance:${patient.insuranceProvider || "unknown"}`,
      value: patient.insuranceId,
    });
  }

  const genderMap: Record<string, FHIRPatient["gender"]> = {
    male: "male",
    female: "female",
    M: "male",
    F: "female",
  };

  return {
    resourceType: "Patient",
    identifier,
    name: [{ family, given, use: "official" }],
    gender: genderMap[patient.gender || ""] || "unknown",
    birthDate: patient.dateOfBirth || "1900-01-01",
    telecom: telecom.length > 0 ? telecom : undefined,
    address: patient.address
      ? [
          {
            line: [patient.address],
            city: patient.city || undefined,
            country: patient.country || undefined,
          },
        ]
      : undefined,
  };
}

export function fhirToPatient(fhir: FHIRPatient): Partial<MediSoftPatient> {
  const name = fhir.name?.[0];
  const fullName = name
    ? [...(name.given || []), name.family].filter(Boolean).join(" ")
    : "Unknown";

  const phone = fhir.telecom?.find((t) => t.system === "phone")?.value || null;
  const email = fhir.telecom?.find((t) => t.system === "email")?.value || null;
  const nationalId =
    fhir.identifier?.find((i) => i.system === "urn:sa:national-id")?.value || null;
  const insuranceEntry = fhir.identifier?.find((i) =>
    i.system.startsWith("urn:insurance:"),
  );

  return {
    id: fhir.id,
    fullName,
    dateOfBirth: fhir.birthDate || null,
    gender: fhir.gender === "unknown" ? null : fhir.gender,
    phone,
    email,
    nationalId,
    insuranceId: insuranceEntry?.value || null,
    insuranceProvider: insuranceEntry?.system.replace("urn:insurance:", "") || null,
  };
}

// ─── Encounter Mapper ────────────────────────────────────────────────────────

interface MediSoftEncounter {
  id: string;
  patientId: string;
  physicianId: string;
  status: string;
  chiefComplaint: string | null;
  startedAt: string;
  endedAt?: string | null;
  icdCodes?: Array<{ code: string; display: string }>;
}

export function encounterToFHIR(encounter: MediSoftEncounter): FHIREncounter {
  const statusMap: Record<string, FHIREncounter["status"]> = {
    draft: "planned",
    active: "in-progress",
    completed: "finished",
    cancelled: "cancelled",
  };

  return {
    resourceType: "Encounter",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory",
    },
    status: statusMap[encounter.status] || "in-progress",
    subject: { reference: `Patient/${encounter.patientId}` },
    period: {
      start: encounter.startedAt,
      end: encounter.endedAt || undefined,
    },
    participant: [{ individual: { reference: `Practitioner/${encounter.physicianId}` } }],
    reasonCode: encounter.icdCodes?.map((icd) => ({
      coding: [{ system: "http://hl7.org/fhir/sid/icd-11", code: icd.code, display: icd.display }],
    })),
  };
}

// ─── Prescription Mapper ─────────────────────────────────────────────────────

interface MediSoftPrescription {
  id: string;
  patientId: string;
  encounterId: string | null;
  status: string;
  medications: Array<{
    name: string;
    rxnormCode?: string;
    dosage: string;
    frequency: string;
    route: string;
    duration?: string;
  }>;
}

export function prescriptionToFHIR(
  rx: MediSoftPrescription,
): FHIRMedicationRequest[] {
  return rx.medications.map((med) => ({
    resourceType: "MedicationRequest" as const,
    status: (rx.status === "active" ? "active" : "completed") as FHIRMedicationRequest["status"],
    intent: "order" as const,
    medicationCodeableConcept: {
      coding: [
        {
          system: "http://www.nlm.nih.gov/research/umls/rxnorm",
          code: med.rxnormCode || "unknown",
          display: med.name,
        },
      ],
    },
    subject: { reference: `Patient/${rx.patientId}` },
    encounter: rx.encounterId ? { reference: `Encounter/${rx.encounterId}` } : undefined,
    dosageInstruction: [
      {
        text: `${med.dosage} ${med.frequency} via ${med.route}${med.duration ? ` for ${med.duration}` : ""}`,
      },
    ],
  }));
}

// ─── Lab Result Mapper ───────────────────────────────────────────────────────

interface MediSoftLabResult {
  id: string;
  patientId: string;
  testName: string;
  category: string | null;
  status: string;
  collectedAt: string | null;
  results: Array<{
    name: string;
    value: number | string;
    unit: string;
    referenceRange?: string;
    loincCode?: string;
  }>;
  conclusion: string | null;
}

export function labResultToFHIR(lab: MediSoftLabResult): {
  report: FHIRDiagnosticReport;
  observations: FHIRObservation[];
} {
  const observations: FHIRObservation[] = lab.results.map((result, idx) => ({
    resourceType: "Observation",
    id: `${lab.id}-obs-${idx}`,
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: result.loincCode || "unknown",
          display: result.name,
        },
      ],
      text: result.name,
    },
    subject: { reference: `Patient/${lab.patientId}` },
    effectiveDateTime: lab.collectedAt || undefined,
    valueQuantity:
      typeof result.value === "number"
        ? { value: result.value, unit: result.unit }
        : undefined,
  }));

  const report: FHIRDiagnosticReport = {
    resourceType: "DiagnosticReport",
    status: lab.status === "completed" ? "final" : "preliminary",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0074",
            code: "LAB",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "unknown",
          display: lab.testName,
        },
      ],
      text: lab.testName,
    },
    subject: { reference: `Patient/${lab.patientId}` },
    effectiveDateTime: lab.collectedAt || undefined,
    result: observations.map((obs) => ({ reference: `Observation/${obs.id}` })),
    conclusion: lab.conclusion || undefined,
  };

  return { report, observations };
}

// ─── Scan / Imaging Mapper ───────────────────────────────────────────────────

interface MediSoftScan {
  id: string;
  patientId: string;
  modality: string | null;
  studyInstanceUid: string | null;
  bodyPart: string | null;
  scanDate: string | null;
  findings: string | null;
}

export function scanToFHIR(scan: MediSoftScan): FHIRImagingStudy {
  return {
    resourceType: "ImagingStudy",
    status: "available",
    subject: { reference: `Patient/${scan.patientId}` },
    started: scan.scanDate || undefined,
    modality: scan.modality
      ? [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: scan.modality }]
      : undefined,
    description: scan.bodyPart
      ? `${scan.modality || "Imaging"} of ${scan.bodyPart}`
      : undefined,
    series: scan.studyInstanceUid
      ? [
          {
            uid: scan.studyInstanceUid,
            modality: {
              system: "http://dicom.nema.org/resources/ontology/DCM",
              code: scan.modality || "OT",
            },
            numberOfInstances: 1,
          },
        ]
      : undefined,
  };
}

// ─── Vitals Mapper ───────────────────────────────────────────────────────────

interface MediSoftVitals {
  patientId: string;
  recordedAt: string;
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weight?: number | null;
  height?: number | null;
}

export function vitalsToFHIR(vitals: MediSoftVitals): FHIRObservation[] {
  const observations: FHIRObservation[] = [];
  const base = {
    resourceType: "Observation" as const,
    status: "final" as const,
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs",
          },
        ],
      },
    ],
    subject: { reference: `Patient/${vitals.patientId}` },
    effectiveDateTime: vitals.recordedAt,
  };

  // Blood Pressure (compound)
  if (vitals.systolic != null || vitals.diastolic != null) {
    observations.push({
      ...base,
      code: {
        coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel" }],
      },
      component: [
        ...(vitals.systolic != null
          ? [
              {
                code: {
                  coding: [
                    { system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" },
                  ],
                },
                valueQuantity: { value: vitals.systolic, unit: "mmHg" },
              },
            ]
          : []),
        ...(vitals.diastolic != null
          ? [
              {
                code: {
                  coding: [
                    { system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" },
                  ],
                },
                valueQuantity: { value: vitals.diastolic, unit: "mmHg" },
              },
            ]
          : []),
      ],
    });
  }

  if (vitals.heartRate != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
      valueQuantity: { value: vitals.heartRate, unit: "beats/min" },
    });
  }

  if (vitals.temperature != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
      valueQuantity: { value: vitals.temperature, unit: "°C" },
    });
  }

  if (vitals.respiratoryRate != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: "http://loinc.org", code: "9279-1", display: "Respiratory rate" }] },
      valueQuantity: { value: vitals.respiratoryRate, unit: "breaths/min" },
    });
  }

  if (vitals.oxygenSaturation != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: "http://loinc.org", code: "2708-6", display: "Oxygen saturation" }] },
      valueQuantity: { value: vitals.oxygenSaturation, unit: "%" },
    });
  }

  if (vitals.weight != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] },
      valueQuantity: { value: vitals.weight, unit: "kg" },
    });
  }

  if (vitals.height != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: "http://loinc.org", code: "8302-2", display: "Body height" }] },
      valueQuantity: { value: vitals.height, unit: "cm" },
    });
  }

  return observations;
}

// ─── Sync Status Tracker ─────────────────────────────────────────────────────

export interface FHIRSyncStatus {
  resourceType: string;
  localId: string;
  fhirId: string | null;
  lastSynced: string | null;
  syncError: string | null;
}

import "server-only";
import { Type, type Schema } from "@google/genai";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";
import type { PatientFullContext } from "@/lib/queries/patient-context";

/**
 * AI Differential Diagnosis Engine.
 *
 * Sends patient symptoms + full clinical context to Gemini and returns
 * ranked diagnostic candidates with supporting/against evidence.
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface SymptomInput {
  symptoms: string[];
  duration?: string;
  severity?: "mild" | "moderate" | "severe";
  onset?: "sudden" | "gradual";
  additionalNotes?: string;
}

export interface DiagnosisCandidate {
  rank: number;
  diagnosis: string;
  diagnosisAr: string;
  icdCode: string | null;
  probability: "very_likely" | "likely" | "possible" | "unlikely";
  probabilityPercent: number;
  supportingEvidence: Array<{
    type: string;
    finding: string;
    strength: "strong" | "moderate" | "weak";
  }>;
  againstEvidence: Array<{
    type: string;
    finding: string;
    strength: "strong" | "moderate" | "weak";
  }>;
  recommendedTests: Array<{
    test: string;
    reason: string;
    urgency: "stat" | "routine" | "follow_up";
  }>;
  recommendedActions: Array<{
    action: string;
    category: string;
    urgency: "immediate" | "within_week" | "within_month";
  }>;
  clinicalPearl: string | null;
}

export interface DifferentialDiagnosisResult {
  sessionId: string;
  patientId: number;
  inputSymptoms: string[];
  timestamp: string;
  diagnoses: DiagnosisCandidate[];
  criticalAlerts: string[];
  clinicalSummary: string;
  disclaimer: string;
}

export type DDxResult =
  | { kind: "ok"; data: DifferentialDiagnosisResult }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

// ─────────────────────────────────────────────────────────────────
// Gemini Schema
// ─────────────────────────────────────────────────────────────────

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    diagnoses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rank: { type: Type.NUMBER },
          diagnosis: { type: Type.STRING },
          diagnosisAr: { type: Type.STRING },
          icdCode: { type: Type.STRING },
          probability: { type: Type.STRING, enum: ["very_likely", "likely", "possible", "unlikely"] },
          probabilityPercent: { type: Type.NUMBER },
          supportingEvidence: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, finding: { type: Type.STRING }, strength: { type: Type.STRING, enum: ["strong", "moderate", "weak"] } }, required: ["type", "finding", "strength"] } },
          againstEvidence: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, finding: { type: Type.STRING }, strength: { type: Type.STRING, enum: ["strong", "moderate", "weak"] } }, required: ["type", "finding", "strength"] } },
          recommendedTests: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { test: { type: Type.STRING }, reason: { type: Type.STRING }, urgency: { type: Type.STRING, enum: ["stat", "routine", "follow_up"] } }, required: ["test", "reason", "urgency"] } },
          recommendedActions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, category: { type: Type.STRING }, urgency: { type: Type.STRING, enum: ["immediate", "within_week", "within_month"] } }, required: ["action", "category", "urgency"] } },
          clinicalPearl: { type: Type.STRING },
        },
        required: ["rank", "diagnosis", "diagnosisAr", "probability", "probabilityPercent", "supportingEvidence", "againstEvidence", "recommendedTests", "recommendedActions"],
      },
    },
    criticalAlerts: { type: Type.ARRAY, items: { type: Type.STRING } },
    clinicalSummary: { type: Type.STRING },
  },
  required: ["diagnoses", "criticalAlerts", "clinicalSummary"],
};

const SYSTEM_PROMPT = `You are a senior internal medicine specialist AI assistant for MediSoft C-OS, a clinical operating system used in Saudi Arabia. You perform differential diagnosis based on patient data.

RULES:
1. Analyze ALL provided data: symptoms, lab results, vitals, medications, demographics, medical history
2. Provide 5-7 ranked diagnoses maximum
3. For each diagnosis, cite SPECIFIC evidence from the patient data (exact values, dates)
4. Consider Saudi/Middle Eastern population epidemiology (higher diabetes prevalence, consanguinity-related conditions, vitamin D deficiency prevalence)
5. Flag any CRITICAL or EMERGENCY conditions in criticalAlerts
6. Provide ICD-10 codes where confident
7. Recommend specific tests to confirm/rule out each diagnosis
8. NEVER invent data — only use what is provided
9. Include a brief clinical pearl relevant to the case
10. Write clinicalSummary in Arabic (العربية الفصحى البسيطة)
11. Write diagnosisAr in Arabic
12. DO NOT use Unicode escape sequences — write Arabic characters directly
13. probabilityPercent should sum to approximately 100% across all diagnoses`;

// ─────────────────────────────────────────────────────────────────
// Build context text for prompt
// ─────────────────────────────────────────────────────────────────

function buildContextText(ctx: PatientFullContext, symptoms: SymptomInput): string {
  const lines: string[] = [];

  lines.push("=== PATIENT DEMOGRAPHICS ===");
  lines.push(`Age: ${ctx.demographics.age} | Sex: ${ctx.demographics.sex}`);
  if (ctx.demographics.bloodType) lines.push(`Blood Type: ${ctx.demographics.bloodType}`);
  if (ctx.demographics.allergies.length > 0)
    lines.push(`Allergies: ${ctx.demographics.allergies.map((a) => a.substance).join(", ")}`);
  if (ctx.demographics.chronicConditions.length > 0)
    lines.push(`Chronic Conditions: ${ctx.demographics.chronicConditions.map((c) => c.description).join(", ")}`);
  if (ctx.demographics.medicalHistory) lines.push(`Medical History: ${ctx.demographics.medicalHistory}`);
  if (ctx.demographics.familyHistory) lines.push(`Family History: ${ctx.demographics.familyHistory}`);
  if (ctx.demographics.socialHistory) lines.push(`Social History: ${ctx.demographics.socialHistory}`);

  lines.push("\n=== PRESENTING SYMPTOMS ===");
  lines.push(`Symptoms: ${symptoms.symptoms.join(", ")}`);
  if (symptoms.duration) lines.push(`Duration: ${symptoms.duration}`);
  if (symptoms.severity) lines.push(`Severity: ${symptoms.severity}`);
  if (symptoms.onset) lines.push(`Onset: ${symptoms.onset}`);
  if (symptoms.additionalNotes) lines.push(`Additional Notes: ${symptoms.additionalNotes}`);

  if (ctx.latestVitals) {
    lines.push("\n=== LATEST VITALS ===");
    const v = ctx.latestVitals;
    if (v.bloodPressureSystolic) lines.push(`BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic ?? "?"} mmHg`);
    if (v.heartRate) lines.push(`HR: ${v.heartRate} bpm`);
    if (v.temperature) lines.push(`Temp: ${v.temperature} °C`);
    if (v.spO2) lines.push(`SpO2: ${v.spO2}%`);
    if (v.weightKg) lines.push(`Weight: ${v.weightKg} kg`);
    if (v.bmi) lines.push(`BMI: ${v.bmi}`);
  }

  if (ctx.labHistory.length > 0) {
    lines.push("\n=== RECENT LAB RESULTS ===");
    const latest = ctx.labHistory[0];
    lines.push(`Panel: ${latest.panelName} (${latest.resultDate.toISOString().slice(0, 10)})`);
    for (const r of latest.results.slice(0, 40)) {
      const flag = r.flag ? ` [${r.flag}]` : "";
      lines.push(`  ${r.testName}: ${r.value} ${r.unit ?? ""}${flag}`);
    }
    if (latest.results.length > 40) {
      lines.push(`  ... and ${latest.results.length - 40} more tests`);
    }
  }

  if (ctx.activeMedications.length > 0) {
    lines.push("\n=== ACTIVE MEDICATIONS ===");
    for (const m of ctx.activeMedications) {
      lines.push(`  ${m.drugName} ${m.dose} ${m.frequency} (${m.route})`);
    }
  }

  if (ctx.recentEncounters.length > 0) {
    lines.push("\n=== RECENT ENCOUNTERS ===");
    for (const e of ctx.recentEncounters.slice(0, 3)) {
      lines.push(`  ${e.encounterDate.toISOString().slice(0, 10)} | ${e.encounterType ?? "outpatient"}`);
    }
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────────────────────────

const ARABIC_LOCALE_INSTRUCTION = `\n\nIMPORTANT: Generate ALL output text in Modern Standard Arabic (العربية الفصحى). Use formal medical Arabic terminology consistent with WHO and SFDA standards. Keep internationally recognized abbreviations (ICD-11, SOAP, LOINC, RxNorm, FHIR) in Latin script. Dates should use the Gregorian calendar.`;

export async function generateDifferentialDiagnosis(
  ctx: PatientFullContext,
  symptoms: SymptomInput,
  locale: string = "en",
): Promise<DDxResult> {
  if (!isGeminiConfigured()) {
    return { kind: "not_configured", message: "Set GOOGLE_GEMINI_API_KEY to enable AI diagnosis." };
  }
  const client = getGeminiClient();
  if (!client) return { kind: "not_configured", message: "Gemini unavailable." };

  const contextText = buildContextText(ctx, symptoms);

  console.log(`[ddx] Sending ${contextText.length} chars to Gemini for differential diagnosis...`);

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: `Perform a differential diagnosis based on this patient data:\n\n${contextText}\n\nProvide ranked diagnoses with evidence, recommended tests, and actions.` }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT + (locale === "ar" ? ARABIC_LOCALE_INSTRUCTION : ""),
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const raw = result.text ?? "";
    if (!raw) return { kind: "error", message: "Gemini returned empty." };

    const parsed = decodeAllStrings(JSON.parse(raw) as {
      diagnoses: DiagnosisCandidate[];
      criticalAlerts: string[];
      clinicalSummary: string;
    });

    const sessionId = `ddx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    console.log(`[ddx] Generated ${parsed.diagnoses.length} diagnoses, ${parsed.criticalAlerts.length} critical alerts`);

    return {
      kind: "ok",
      data: {
        sessionId,
        patientId: ctx.demographics.id,
        inputSymptoms: symptoms.symptoms,
        timestamp: new Date().toISOString(),
        diagnoses: parsed.diagnoses,
        criticalAlerts: parsed.criticalAlerts,
        clinicalSummary: parsed.clinicalSummary,
        disclaimer: "هذا التحليل للمساعدة في اتخاذ القرار السريري ولا يغني عن التقييم الطبي المباشر",
      },
    };
  } catch (err) {
    console.error("[ddx] Gemini failed:", err);
    return { kind: "error", message: err instanceof Error ? err.message : "Diagnosis generation failed" };
  }
}

import "server-only";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";
import { Type, type Schema } from "@google/genai";

/**
 * AI-generated encounter summary for both clinical and patient audiences.
 */

export interface EncounterSummary {
  clinicalSummary: string;
  clinicalSummaryAr: string;
  patientSummary: string;
  keyFindings: string[];
  newDiagnoses: string[];
  medicationChanges: Array<{
    drug: string;
    change: "started" | "stopped" | "adjusted" | "continued";
    details: string;
  }>;
  followUpPlan: string;
  followUpDate: string | null;
  warningSignsForPatient: string[];
}

export type SummaryResult =
  | { kind: "ok"; data: EncounterSummary }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    clinicalSummary: { type: Type.STRING },
    clinicalSummaryAr: { type: Type.STRING },
    patientSummary: { type: Type.STRING },
    keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
    newDiagnoses: { type: Type.ARRAY, items: { type: Type.STRING } },
    medicationChanges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { drug: { type: Type.STRING }, change: { type: Type.STRING }, details: { type: Type.STRING } }, required: ["drug", "change", "details"] } },
    followUpPlan: { type: Type.STRING },
    followUpDate: { type: Type.STRING },
    warningSignsForPatient: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["clinicalSummary", "clinicalSummaryAr", "patientSummary", "keyFindings", "newDiagnoses", "medicationChanges", "followUpPlan", "warningSignsForPatient"],
};

export async function generateEncounterSummary(
  soapNote: Record<string, unknown>,
  patientInfo?: { name?: string; age?: number; sex?: string },
): Promise<SummaryResult> {
  if (!isGeminiConfigured()) return { kind: "not_configured", message: "Gemini not configured." };
  const client = getGeminiClient();
  if (!client) return { kind: "not_configured", message: "Gemini unavailable." };

  const prompt = `Summarize this clinical encounter SOAP note.

SOAP Note:
${JSON.stringify(soapNote, null, 2)}

${patientInfo ? `Patient: ${patientInfo.name ?? "Unknown"}, ${patientInfo.age ?? "?"} yo ${patientInfo.sex ?? ""}` : ""}

Generate:
1. clinicalSummary: 3-5 sentence English clinical summary for other doctors
2. clinicalSummaryAr: Arabic version of the clinical summary
3. patientSummary: 3-4 sentences in simple Arabic for the patient
4. keyFindings: list of important findings
5. newDiagnoses: any new diagnoses made
6. medicationChanges: drugs started/stopped/adjusted
7. followUpPlan: what's the next step
8. followUpDate: when to return (YYYY-MM-DD format, null if not specified)
9. warningSignsForPatient: Arabic warning signs (when to go to ER)

Write all Arabic text directly — no Unicode escapes.`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are a medical summarization AI for MediSoft C-OS. Write concise, accurate summaries. Patient-facing text must be in Arabic.",
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const raw = result.text ?? "";
    if (!raw) return { kind: "error", message: "Gemini returned empty." };

    const parsed = decodeAllStrings(JSON.parse(raw) as EncounterSummary);
    return { kind: "ok", data: parsed };
  } catch (err) {
    console.error("[encounter-summary] Failed:", err);
    return { kind: "error", message: err instanceof Error ? err.message : "Summary generation failed" };
  }
}

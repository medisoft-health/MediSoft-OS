import "server-only";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";

/**
 * AI-powered transcript correction for medical recordings.
 * Fixes medical terminology, drug names, and Arabic terms.
 */

export interface CorrectionResult {
  correctedTranscript: string;
  corrections: Array<{
    original: string;
    corrected: string;
    reason: string;
  }>;
  confidence: number;
  language: string;
}

export type CorrectionOutcome =
  | { kind: "ok"; data: CorrectionResult }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

const ARABIC_LOCALE_INSTRUCTION = `\nIMPORTANT: Generate ALL output text in Modern Standard Arabic (العربية الفصحى). Use formal medical Arabic terminology consistent with WHO and SFDA standards. Keep internationally recognized abbreviations (ICD-11, SOAP, LOINC, RxNorm, FHIR) in Latin script. Dates should use the Gregorian calendar.\n`;

export async function correctTranscript(
  rawTranscript: string,
  patientContext?: {
    knownMedications?: string[];
    knownConditions?: string[];
    patientName?: string;
  },
  locale: string = "en",
): Promise<CorrectionOutcome> {
  if (!isGeminiConfigured()) {
    return { kind: "not_configured", message: "Gemini not configured." };
  }
  const client = getGeminiClient();
  if (!client) return { kind: "not_configured", message: "Gemini unavailable." };

  const contextInfo = patientContext
    ? `\nPatient context:\n- Known medications: ${patientContext.knownMedications?.join(", ") ?? "none"}\n- Known conditions: ${patientContext.knownConditions?.join(", ") ?? "none"}\n- Patient name: ${patientContext.patientName ?? "unknown"}`
    : "";

  const localeInstruction = locale === "ar" ? ARABIC_LOCALE_INSTRUCTION : "";

  const prompt = `You are a medical transcription editor. Correct the following raw transcript from a doctor-patient encounter.
${localeInstruction}
RULES:
1. Fix medical terminology spelling (e.g., "metforman" → "Metformin")
2. Standardize drug names to proper spelling
3. Fix Arabic medical terms to their standard form
4. Use patient context to resolve ambiguous terms
5. NEVER add information — only correct existing words
6. Preserve the original meaning and sentence structure
7. Return corrections as a JSON object with the corrected transcript and list of changes
8. Write Arabic text directly, no Unicode escapes
${contextInfo}

Raw transcript:
"""
${rawTranscript}
"""

Return JSON:
{
  "correctedTranscript": "the full corrected transcript",
  "corrections": [{"original": "metforman", "corrected": "Metformin", "reason": "Drug name correction"}],
  "confidence": 85,
  "language": "Arabic" or "English" or "Mixed"
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", temperature: 0.1 },
    });

    const raw = result.text ?? "";
    if (!raw) return { kind: "error", message: "Gemini returned empty." };

    const parsed = decodeAllStrings(JSON.parse(raw) as CorrectionResult);
    return { kind: "ok", data: parsed };
  } catch (err) {
    console.error("[transcript-corrector] Failed:", err);
    return { kind: "error", message: err instanceof Error ? err.message : "Correction failed" };
  }
}

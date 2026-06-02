import "server-only";
import { Type, type Schema } from "@google/genai";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";
import type { ScanType, Severity } from "@/lib/validations/scan";

/**
 * MediScan Gemini Vision analyzer.
 *
 * Sends an image (inline base64) plus structured patient context to
 * Gemini 2.5 with a strict response schema. Produces:
 *   - technicalQuality   (adequate / limited / non_diagnostic)
 *   - findings[]         (structured array)
 *   - impression         (concise)
 *   - differential       (list-style prose)
 *   - recommendations    (next-step prose)
 *   - physicianReport    (full radiologist-style report)
 *   - patientSummary     (plain-language)
 */

export interface VisionAnalyzeInput {
  imageBase64: string;
  mimeType: string;
  scanType: ScanType;
  bodyPart: string;
  patient?: {
    age?: number;
    sex?: string;
    chronicConditions?: string[];
    clinicalQuestion?: string;
  };
}

export interface VisionFinding {
  location?: string;
  description: string;
  severity?: Severity;
  characteristics?: string;
}

export interface VisionOutput {
  technicalQuality: "adequate" | "limited" | "non_diagnostic";
  findings: VisionFinding[];
  impression: string;
  differentialDiagnosis: string;
  recommendations: string;
  physicianReport: string;
  patientSummary: string;
}

const SYSTEM_PROMPT = `
You are MediScan, a medical imaging AI assistant for licensed physicians in
a Saudi-deployed EMR. You are NOT a radiologist; you are a clinical decision-
support tool.

Strict rules:
1. Describe ONLY what is visible in the provided image. Never invent findings.
2. If the image is unreadable, low quality, or not the expected anatomy,
   set technicalQuality accordingly and keep findings empty.
3. Always defer to a radiologist for definitive interpretation. The
   patientSummary must explicitly encourage following up with the doctor.
4. Use precise anatomical and clinical terminology in physicianReport,
   plain language in patientSummary.
5. Do not diagnose. Describe findings; suggest differentials.
6. Output JSON only, no markdown, no commentary.

Format:
- findings: short, specific entries. Location ("right upper lobe"),
  description ("3 cm round opacity"), severity if clinically actionable.
- impression: 1-2 sentences summarising the most clinically relevant
  observation.
- differentialDiagnosis: brief prose listing possible explanations.
- recommendations: brief prose with 1-3 actionable next steps.
- physicianReport: 4-6 sentence radiology-style report covering
  technique, observations, impression.
- patientSummary: 4-6 sentence plain-language explanation. End with:
  "Please discuss this image and any next steps with your doctor."
`.trim();

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    technicalQuality: { type: Type.STRING },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING },
          characteristics: { type: Type.STRING },
        },
        required: ["description"],
      },
    },
    impression: { type: Type.STRING },
    differentialDiagnosis: { type: Type.STRING },
    recommendations: { type: Type.STRING },
    physicianReport: { type: Type.STRING },
    patientSummary: { type: Type.STRING },
  },
  required: [
    "technicalQuality",
    "findings",
    "impression",
    "differentialDiagnosis",
    "recommendations",
    "physicianReport",
    "patientSummary",
  ],
};

export type VisionResult =
  | { kind: "ok"; data: VisionOutput }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

function buildUserPrompt(input: VisionAnalyzeInput): string {
  const lines: string[] = [];
  lines.push(`Modality / type: ${input.scanType}`);
  lines.push(`Anatomical region: ${input.bodyPart}`);
  if (input.patient) {
    if (input.patient.age != null) lines.push(`Patient age: ${input.patient.age}`);
    if (input.patient.sex) lines.push(`Patient sex: ${input.patient.sex}`);
    if (input.patient.chronicConditions?.length) {
      lines.push(`Chronic conditions: ${input.patient.chronicConditions.join("; ")}`);
    }
    if (input.patient.clinicalQuestion) {
      lines.push("");
      lines.push(`Clinical question / referral: ${input.patient.clinicalQuestion}`);
    }
  }
  lines.push("");
  lines.push(
    "Analyze the attached image per the rules above. Return strict JSON only.",
  );
  return lines.join("\n");
}

const ARABIC_LOCALE_INSTRUCTION = `\n\nIMPORTANT: Generate ALL output text in Modern Standard Arabic (العربية الفصحى). Use formal medical Arabic terminology consistent with WHO and SFDA standards. Keep internationally recognized abbreviations (ICD-11, SOAP, LOINC, RxNorm, FHIR) in Latin script. Dates should use the Gregorian calendar.`;

export async function analyzeImage(
  input: VisionAnalyzeInput,
  locale: string = "en",
): Promise<VisionResult> {
  if (!isGeminiConfigured()) {
    return {
      kind: "not_configured",
      message:
        "Gemini not configured. Set GOOGLE_GEMINI_API_KEY in .env.local to enable AI image analysis.",
    };
  }
  const client = getGeminiClient();
  if (!client) {
    return { kind: "not_configured", message: "Gemini client unavailable." };
  }

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: input.mimeType,
                data: input.imageBase64,
              },
            },
            { text: buildUserPrompt(input) },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT + (locale === "ar" ? ARABIC_LOCALE_INSTRUCTION : ""),
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const raw = result.text ?? "";
    if (!raw) {
      return { kind: "error", message: "Gemini returned an empty response." };
    }
    const parsed = decodeAllStrings(JSON.parse(raw) as VisionOutput);

    // Defensive: clamp technicalQuality to allowed set.
    const tq = parsed.technicalQuality;
    if (tq !== "adequate" && tq !== "limited" && tq !== "non_diagnostic") {
      parsed.technicalQuality = "limited";
    }
    if (!Array.isArray(parsed.findings)) parsed.findings = [];

    return { kind: "ok", data: parsed };
  } catch (err) {
    console.error("[mediscan.analyze] Gemini failed", err);
    return {
      kind: "error",
      message:
        err instanceof Error ? err.message : "Unexpected Gemini error",
    };
  }
}

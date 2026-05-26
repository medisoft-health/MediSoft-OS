import "server-only";
import { Type, type Schema } from "@google/genai";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";
import { classifyResult } from "@/lib/medilab/classify";
import type { Sex } from "@/lib/medilab/biomarkers";

/**
 * MediLab AI narrative generator.
 *
 * Produces TWO narratives in one Gemini call:
 *   - physicianSummary: 3-5 sentences, clinical-style. Highlights critical
 *     and abnormal values, suggests next steps in plain prose.
 *   - patientSummary: 4-6 sentences, plain-language. Avoids jargon,
 *     reassures normal findings, advises consulting the physician for
 *     follow-up — does NOT prescribe.
 *
 * Plus a structured trend analysis block reused for the visual layer.
 */

export interface NarrativeRequest {
  panelName: string;
  laboratory?: string | null;
  resultDate: Date;
  results: Array<{
    testName: string;
    value: number | string;
    unit?: string | null;
    referenceLow?: number | string | null;
    referenceHigh?: number | string | null;
    flag?: string | null;
    interpretation?: string | null;
  }>;
  patient?: {
    age?: number;
    sex?: Sex;
    chronicConditions?: string[];
    allergies?: string[];
  };
}

export interface NarrativeOutput {
  physicianSummary: string;
  patientSummary: string;
  highlights: Array<{
    testName: string;
    severity: "normal" | "abnormal" | "critical";
    note: string;
  }>;
}

const SYSTEM_PROMPT = `
You are MediLab, a clinical biomarker narrator for a Saudi-deployed EMR.

You produce TWO narratives from the same evidence:
  1) physicianSummary  — 3 to 5 sentences. Clinical voice in ENGLISH. Mention specific
     abnormalities, possible causes worth checking, and one or two next-step
     suggestions. No bullet lists. No markdown.
  2) patientSummary   — 4 to 6 sentences in ARABIC (العربية الفصحى البسيطة).
     Plain language a non-medical adult can understand. Reassure where things
     look normal. Avoid jargon and never prescribe.
     End with: "يرجى استشارة طبيبك قبل أي تغيير."
     CRITICAL: patientSummary MUST be written entirely in Arabic. DO NOT write
     it in English. DO NOT use Unicode escape sequences — write Arabic directly.

Plus a small structured 'highlights' array of the most clinically relevant
abnormal results, each tagged severity. The 'note' field in highlights should
be in Arabic for the patient view.

Strict rules:
- Use ONLY the EVIDENCE supplied. Never invent results.
- Critical-flagged values must be mentioned in BOTH narratives.
- If everything is normal, both narratives must say so plainly.
- Do not include any markdown formatting in the output.
- Patient summary must not contain disease diagnoses; describe findings.
- DO NOT use Unicode escape sequences like \ا — write actual Arabic characters.
`.trim();

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    physicianSummary: { type: Type.STRING },
    patientSummary: { type: Type.STRING },
    highlights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          testName: { type: Type.STRING },
          severity: { type: Type.STRING },
          note: { type: Type.STRING },
        },
        required: ["testName", "severity", "note"],
      },
    },
  },
  required: ["physicianSummary", "patientSummary", "highlights"],
};

function buildEvidence(req: NarrativeRequest): string {
  const lines: string[] = [];
  lines.push("EVIDENCE");
  lines.push("");
  lines.push(`Panel: ${req.panelName}`);
  if (req.laboratory) lines.push(`Laboratory: ${req.laboratory}`);
  lines.push(`Result date: ${req.resultDate.toISOString().slice(0, 10)}`);
  if (req.patient) {
    lines.push("");
    lines.push("Patient:");
    if (req.patient.age != null) lines.push(`  age: ${req.patient.age}`);
    if (req.patient.sex) lines.push(`  sex: ${req.patient.sex}`);
    if (req.patient.chronicConditions?.length)
      lines.push(
        `  chronic conditions: ${req.patient.chronicConditions.join("; ")}`,
      );
    if (req.patient.allergies?.length)
      lines.push(`  allergies: ${req.patient.allergies.join("; ")}`);
  }
  lines.push("");
  lines.push("Results:");
  for (const r of req.results) {
    const cls = classifyResult({
      testName: r.testName,
      value: r.value,
      referenceLow: r.referenceLow ?? undefined,
      referenceHigh: r.referenceHigh ?? undefined,
      sex: req.patient?.sex,
      age: req.patient?.age,
    });
    const range =
      r.referenceLow != null && r.referenceHigh != null
        ? `[${r.referenceLow}–${r.referenceHigh}]`
        : cls.low != null && cls.high != null
          ? `[${cls.low}–${cls.high}]`
          : "[ref unavailable]";
    const flag = r.flag ?? cls.flag ?? "—";
    lines.push(
      `  - ${r.testName}: ${r.value}${r.unit ? " " + r.unit : ""} ${range} flag=${flag}`,
    );
  }
  return lines.join("\n");
}

export type NarrativeResult =
  | { kind: "ok"; data: NarrativeOutput }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function generateLabNarrative(
  req: NarrativeRequest,
): Promise<NarrativeResult> {
  if (!isGeminiConfigured()) {
    return {
      kind: "not_configured",
      message:
        "Gemini not configured. Set GOOGLE_GEMINI_API_KEY in .env.local to enable AI narratives.",
    };
  }
  const client = getGeminiClient();
  if (!client) {
    return {
      kind: "not_configured",
      message: "Gemini client unavailable.",
    };
  }

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: buildEvidence(req) }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.25,
      },
    });
    const raw = result.text ?? "";
    if (!raw) {
      return { kind: "error", message: "Gemini returned an empty response." };
    }
    const parsed = decodeAllStrings(JSON.parse(raw) as NarrativeOutput);
    if (
      typeof parsed.physicianSummary !== "string" ||
      typeof parsed.patientSummary !== "string" ||
      !Array.isArray(parsed.highlights)
    ) {
      return {
        kind: "error",
        message: "Gemini output did not match the expected schema.",
      };
    }
    return { kind: "ok", data: parsed };
  } catch (err) {
    console.error("[medilab.narrative] Gemini failed", err);
    return {
      kind: "error",
      message:
        err instanceof Error ? err.message : "Unexpected Gemini error",
    };
  }
}

import "server-only";
import { Type, type Schema } from "@google/genai";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";

/**
 * Lab result extraction from uploaded files via Gemini multimodal.
 *
 * CRITICAL: The prompt explicitly demands numeric values — Gemini must
 * extract the actual result number for each test, never leave it empty.
 */

const SYSTEM_PROMPT = `You are a medical lab report data extractor for MediSoft EMR. Your job is to extract EVERY test result with its NUMERIC VALUE from uploaded lab reports.

CRITICAL RULES:
1. For EACH test, you MUST extract the actual numeric result value. The "value" field must NEVER be empty.
2. If a value is partially readable, provide your best reading with a note.
3. If a value truly cannot be read, put "?" but NEVER leave it empty or null.
4. Extract the reference range (low and high) as separate numbers when visible.
5. Determine the flag: compare value to reference range. Below range = "low", above = "high", way outside = "critical_low" or "critical_high", within range = "normal".
6. Identify the panel type (CBC, Lipid Panel, Liver Function, Thyroid, etc.).
7. Extract the collection/sample date or report date if visible (format: YYYY-MM-DD).
8. Extract the laboratory name if visible.
9. Handle BOTH Arabic and English lab reports. Output test names in English.
10. For Arabic reports: translate test names to standard English clinical terms.
11. Return ONLY valid JSON. No markdown, no commentary.

EXAMPLE of correct extraction:
Input: "Hemoglobin 13.2 g/dL (13.5-17.5)"
Output: { "testName": "Hemoglobin", "value": "13.2", "unit": "g/dL", "referenceLow": "13.5", "referenceHigh": "17.5", "flag": "low" }

NEVER do this (empty value):
{ "testName": "Hemoglobin", "value": "", ... }  ← WRONG`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    panelName: { type: Type.STRING },
    panelCategory: { type: Type.STRING },
    laboratory: { type: Type.STRING },
    collectionDate: { type: Type.STRING },
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          testName: { type: Type.STRING },
          value: { type: Type.STRING },
          unit: { type: Type.STRING },
          referenceLow: { type: Type.STRING },
          referenceHigh: { type: Type.STRING },
          flag: { type: Type.STRING },
          interpretation: { type: Type.STRING },
        },
        required: ["testName", "value"],
      },
    },
  },
  required: ["results"],
};

export interface ExtractedLabResult {
  testName: string;
  value: string;
  unit: string;
  referenceLow: string;
  referenceHigh: string;
  flag: string;
  interpretation: string;
}

export interface ExtractionOutput {
  panelName: string;
  panelCategory: string;
  laboratory: string;
  collectionDate: string;
  results: ExtractedLabResult[];
}

export type ExtractionResult =
  | { kind: "ok"; data: ExtractionOutput }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

const USER_PROMPT_IMAGE = `Extract ALL lab results from this document.

For EACH test you find:
1. testName — the test name in English
2. value — THE ACTUAL NUMERIC RESULT (this is CRITICAL — never leave empty)
3. unit — the unit of measurement
4. referenceLow — the low end of the normal range
5. referenceHigh — the high end of the normal range
6. flag — "normal", "low", "high", "critical_low", or "critical_high"

Also extract:
- panelName — the name of the test panel (e.g., "Complete Blood Count")
- panelCategory — one of: CBC, BMP, CMP, Lipid, Diabetes, Thyroid, Renal, Liver, Coagulation, Iron, Vitamins, Cardiac, Tumor, Hormones, Infectious, Electrolytes, ABG, Urinalysis, Other
- collectionDate — sample date in YYYY-MM-DD format
- laboratory — the lab name

IMPORTANT: Every result MUST have a non-empty "value" field with the actual number from the report.`;

const USER_PROMPT_TEXT = `Extract ALL structured lab results from this tabular data.

For EACH test:
1. testName — the test name in English
2. value — THE ACTUAL NUMERIC RESULT (CRITICAL — never empty)
3. unit — measurement unit
4. referenceLow and referenceHigh — normal range bounds
5. flag — normal/low/high/critical_low/critical_high

Also identify: panelName, panelCategory, collectionDate, laboratory.
The "value" field MUST contain the actual result number. If unclear, put "?" but NEVER leave empty.

Data:
`;

export async function extractLabFromImage(
  base64: string,
  mimeType: string,
): Promise<ExtractionResult> {
  if (!isGeminiConfigured()) {
    return { kind: "not_configured", message: "Set GOOGLE_GEMINI_API_KEY." };
  }
  const client = getGeminiClient();
  if (!client) return { kind: "not_configured", message: "Gemini unavailable." };

  console.log(`[extract] Sending image/PDF to Gemini (${(base64.length / 1024).toFixed(0)} KB base64)...`);

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: USER_PROMPT_IMAGE },
        ],
      }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    const raw = result.text ?? "";
    if (!raw) return { kind: "error", message: "Gemini returned empty." };

    const parsed = decodeAllStrings(JSON.parse(raw) as ExtractionOutput);
    const cleaned = normalizeOutput(parsed);

    // Log what was extracted for debugging
    console.log(`[extract] ✓ Panel: "${cleaned.panelName}" | Category: "${cleaned.panelCategory}" | Date: "${cleaned.collectionDate}" | Lab: "${cleaned.laboratory}"`);
    for (const r of cleaned.results) {
      console.log(`[extract]   ${r.testName}: value="${r.value}" unit="${r.unit}" ref=[${r.referenceLow}-${r.referenceHigh}] flag=${r.flag}`);
    }

    return { kind: "ok", data: cleaned };
  } catch (err) {
    console.error("[extract] Gemini failed:", err);
    return { kind: "error", message: err instanceof Error ? err.message : "Extraction failed" };
  }
}

export async function extractLabFromText(
  textContent: string,
): Promise<ExtractionResult> {
  if (!isGeminiConfigured()) {
    return { kind: "not_configured", message: "Set GOOGLE_GEMINI_API_KEY." };
  }
  const client = getGeminiClient();
  if (!client) return { kind: "not_configured", message: "Gemini unavailable." };

  console.log(`[extract] Sending ${textContent.length} chars of text to Gemini...`);

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [{ text: USER_PROMPT_TEXT + textContent }],
      }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    const raw = result.text ?? "";
    if (!raw) return { kind: "error", message: "Gemini returned empty." };

    const parsed = decodeAllStrings(JSON.parse(raw) as ExtractionOutput);
    const cleaned = normalizeOutput(parsed);

    console.log(`[extract] ✓ Text extraction: ${cleaned.results.length} results`);
    for (const r of cleaned.results) {
      console.log(`[extract]   ${r.testName}: value="${r.value}"`);
    }

    return { kind: "ok", data: cleaned };
  } catch (err) {
    console.error("[extract-text] Gemini failed:", err);
    return { kind: "error", message: err instanceof Error ? err.message : "Extraction failed" };
  }
}

function normalizeOutput(raw: ExtractionOutput): ExtractionOutput {
  return {
    panelName: raw.panelName ?? "",
    panelCategory: raw.panelCategory ?? "Other",
    laboratory: raw.laboratory ?? "",
    collectionDate: raw.collectionDate ?? "",
    results: (raw.results ?? []).map((r) => ({
      testName: String(r.testName ?? "").trim(),
      // CRITICAL: ensure value is never empty
      value: String(r.value ?? "?").trim() || "?",
      unit: String(r.unit ?? "").trim(),
      referenceLow: String(r.referenceLow ?? "").trim(),
      referenceHigh: String(r.referenceHigh ?? "").trim(),
      flag: String(r.flag ?? "").trim(),
      interpretation: String(r.interpretation ?? "").trim(),
    })),
  };
}

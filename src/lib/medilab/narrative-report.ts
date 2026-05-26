import "server-only";
import { Type, type Schema } from "@google/genai";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";

/**
 * Comprehensive AI Medical Narrative Report.
 *
 * Generates TWO reports in one Gemini call:
 *   1. Doctor Report — clinical summary with differentials + follow-up
 *   2. Patient Report — visual, bilingual (Arabic+English), health score
 */

const SYSTEM_PROMPT = `أنت طبيب يتحدث مع مريض عربي سعودي. أنت تعمل في منشأة MediSoft C-OS الطبية.

CRITICAL LANGUAGE RULES:
- The DOCTOR report should be in English (clinical language for physicians).
- The PATIENT report MUST be ENTIRELY in Arabic (العربية الفصحى البسيطة).
- DO NOT use Unicode escape sequences — write Arabic characters directly as UTF-8.
- Every single field in patientReport must be in Arabic: overallSummary, results[].nameAr, results[].explanation, results[].advice, lifestyleAdvice[].advice, whenToSeeDoctor, specialistRecommendation.
- You may use English ONLY for scientific test names like Ferritin, RBC, LDL alongside their Arabic equivalent.
- DO NOT write English explanations in the patient report.

Clinical Rules:
1. Be thorough but clear. Every abnormal finding must be explained.
2. Clinical correlations: connect related abnormal values (e.g., elevated liver enzymes + bilirubin = hepatic pattern).
3. Differential diagnosis: rank by probability with matching criteria.
4. Health score (0-100): calculate based on % of normal values and severity of abnormals.
5. Lifestyle advice must be practical and culturally appropriate for Saudi patients. Written in Arabic.
6. Reference Saudi MOH or WHO guidelines when relevant.
7. Red flags must be prominently identified for any critical values.
8. Never minimize critical findings — patient safety comes first.
9. Return ONLY JSON, no markdown or commentary.

CRITICAL for each patient result:
- "refLow" and "refHigh" MUST be the numeric reference range bounds for this test (e.g., Hemoglobin: refLow=12.0, refHigh=17.5). Use standard adult reference ranges.
- "status" MUST be exactly one of: "normal", "warning", "critical"
  - "normal" = value is within reference range
  - "warning" = value is borderline or mildly outside range
  - "critical" = value is significantly outside range or clinically dangerous
- "direction" MUST be exactly one of: "high", "low", "normal"
  - "high" = value is ABOVE the reference range
  - "low" = value is BELOW the reference range
  - "normal" = value is within the reference range`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    doctorReport: {
      type: Type.OBJECT,
      properties: {
        overview: {
          type: Type.OBJECT,
          properties: {
            totalTests: { type: Type.NUMBER },
            normalCount: { type: Type.NUMBER },
            abnormalCount: { type: Type.NUMBER },
            urgencyLevel: { type: Type.STRING },
          },
          required: ["totalTests", "normalCount", "abnormalCount", "urgencyLevel"],
        },
        abnormalFindings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              test: { type: Type.STRING },
              value: { type: Type.STRING },
              unit: { type: Type.STRING },
              reference: { type: Type.STRING },
              status: { type: Type.STRING },
              severity: { type: Type.STRING },
              clinicalSignificance: { type: Type.STRING },
            },
            required: ["test", "value", "status", "clinicalSignificance"],
          },
        },
        clinicalCorrelations: { type: Type.STRING },
        differentialDiagnosis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              condition: { type: Type.STRING },
              probability: { type: Type.NUMBER },
              matchingCriteria: { type: Type.STRING },
            },
            required: ["condition", "probability", "matchingCriteria"],
          },
        },
        recommendedTests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              test: { type: Type.STRING },
              reason: { type: Type.STRING },
              urgency: { type: Type.STRING },
            },
            required: ["test", "reason", "urgency"],
          },
        },
        redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
        guidelinesReference: { type: Type.STRING },
      },
      required: [
        "overview",
        "abnormalFindings",
        "clinicalCorrelations",
        "differentialDiagnosis",
        "recommendedTests",
        "redFlags",
        "guidelinesReference",
      ],
    },
    patientReport: {
      type: Type.OBJECT,
      properties: {
        healthScore: { type: Type.NUMBER },
        overallSummary: { type: Type.STRING },
        results: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              nameAr: { type: Type.STRING },
              value: { type: Type.STRING },
              refLow: { type: Type.NUMBER },
              refHigh: { type: Type.NUMBER },
              status: {
                type: Type.STRING,
                enum: ["normal", "warning", "critical"],
              },
              direction: {
                type: Type.STRING,
                enum: ["high", "low", "normal"],
              },
              explanation: { type: Type.STRING },
              advice: { type: Type.STRING },
            },
            required: ["name", "nameAr", "value", "refLow", "refHigh", "status", "direction", "explanation"],
          },
        },
        lifestyleAdvice: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              icon: { type: Type.STRING },
              advice: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ["icon", "advice", "category"],
          },
        },
        whenToSeeDoctor: { type: Type.STRING },
        specialistRecommendation: { type: Type.STRING },
      },
      required: [
        "healthScore",
        "overallSummary",
        "results",
        "lifestyleAdvice",
        "whenToSeeDoctor",
      ],
    },
  },
  required: ["doctorReport", "patientReport"],
};

export interface DoctorReport {
  overview: {
    totalTests: number;
    normalCount: number;
    abnormalCount: number;
    urgencyLevel: string;
  };
  abnormalFindings: Array<{
    test: string;
    value: string;
    unit?: string;
    reference?: string;
    status: string;
    severity?: string;
    clinicalSignificance: string;
  }>;
  clinicalCorrelations: string;
  differentialDiagnosis: Array<{
    condition: string;
    probability: number;
    matchingCriteria: string;
  }>;
  recommendedTests: Array<{
    test: string;
    reason: string;
    urgency: string;
  }>;
  redFlags: string[];
  guidelinesReference: string;
}

export interface PatientReport {
  healthScore: number;
  overallSummary: string;
  results: Array<{
    name: string;
    nameAr: string;
    value: string;
    refLow: number;
    refHigh: number;
    status: string;
    direction: string;
    explanation: string;
    advice?: string;
  }>;
  lifestyleAdvice: Array<{
    icon: string;
    advice: string;
    category: string;
  }>;
  whenToSeeDoctor: string;
  specialistRecommendation?: string;
}

export interface NarrativeReportOutput {
  doctorReport: DoctorReport;
  patientReport: PatientReport;
}

export type NarrativeReportResult =
  | { kind: "ok"; data: NarrativeReportOutput }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function generateNarrativeReport(
  results: Array<{
    testName: string;
    value: number | string;
    unit?: string;
    referenceLow?: number | string;
    referenceHigh?: number | string;
    flag?: string;
  }>,
  patient?: {
    age?: number;
    sex?: string;
    chronicConditions?: string[];
    allergies?: string[];
    medications?: string[];
  },
): Promise<NarrativeReportResult> {
  if (!isGeminiConfigured()) {
    return {
      kind: "not_configured",
      message: "Set GOOGLE_GEMINI_API_KEY to enable AI reports.",
    };
  }
  const client = getGeminiClient();
  if (!client) return { kind: "not_configured", message: "Gemini unavailable." };

  // Build the results text — OPTIMIZED for large panels
  // For 84 results, sending everything makes a huge prompt.
  // Strategy: detailed listing of abnormal results + summary of normal ones.
  const abnormalResults: typeof results = [];
  const normalResults: typeof results = [];

  for (const r of results) {
    const val = typeof r.value === "number" ? r.value : parseFloat(String(r.value));
    const lo = r.referenceLow != null ? (typeof r.referenceLow === "number" ? r.referenceLow : parseFloat(String(r.referenceLow))) : NaN;
    const hi = r.referenceHigh != null ? (typeof r.referenceHigh === "number" ? r.referenceHigh : parseFloat(String(r.referenceHigh))) : NaN;
    const flag = r.flag?.toLowerCase() ?? "";

    const isAbnormal =
      flag.includes("high") || flag.includes("low") || flag.includes("critical") || flag.includes("abnormal") ||
      (!isNaN(val) && !isNaN(lo) && val < lo) ||
      (!isNaN(val) && !isNaN(hi) && val > hi);

    if (isAbnormal) {
      abnormalResults.push(r);
    } else {
      normalResults.push(r);
    }
  }

  const formatResult = (r: typeof results[number]) => {
    const ref =
      r.referenceLow != null && r.referenceHigh != null
        ? `[${r.referenceLow}-${r.referenceHigh}]`
        : "";
    const flag = r.flag ? ` (${r.flag})` : "";
    return `${r.testName}: ${r.value} ${r.unit ?? ""}  ${ref}${flag}`;
  };

  let resultsText: string;
  if (results.length <= 30) {
    // Small panel: send everything
    resultsText = results.map(formatResult).join("\n");
  } else {
    // Large panel: optimize
    const abnormalSection = abnormalResults.length > 0
      ? `ABNORMAL RESULTS (${abnormalResults.length} of ${results.length} — analyze these in detail):\n${abnormalResults.map(formatResult).join("\n")}`
      : "No abnormal results detected.";

    const normalNames = normalResults.map((r) => r.testName).join(", ");
    const normalSection = `NORMAL RESULTS (${normalResults.length} of ${results.length} — within reference range):\n${normalNames}`;

    resultsText = `Total tests: ${results.length}\n\n${abnormalSection}\n\n${normalSection}`;
  }

  console.log(
    `[narrative-report] Prompt optimized: ${results.length} total → ${abnormalResults.length} abnormal (detailed) + ${normalResults.length} normal (summarized)`,
  );

  let patientInfo = "";
  if (patient) {
    const parts: string[] = [];
    if (patient.age) parts.push(`Age: ${patient.age}`);
    if (patient.sex) parts.push(`Sex: ${patient.sex}`);
    if (patient.chronicConditions?.length)
      parts.push(`Chronic conditions: ${patient.chronicConditions.join(", ")}`);
    if (patient.allergies?.length)
      parts.push(`Allergies: ${patient.allergies.join(", ")}`);
    if (patient.medications?.length)
      parts.push(`Current medications: ${patient.medications.join(", ")}`);
    patientInfo = parts.join("\n");
  }

  const prompt = `Analyze these lab results and provide a comprehensive dual-audience report.

Lab Results:
${resultsText}

${patientInfo ? `Patient Info:\n${patientInfo}` : ""}

Instructions:
- Generate both a doctor report (clinical) and patient report (Arabic, visual-friendly).
- In the patient report, include ALL ${results.length} tests in the results array (both normal and abnormal).
- For normal tests listed by name only, set status="normal", direction="normal", and provide the standard reference range as refLow/refHigh.
- Focus clinical analysis, differentials, and correlations on the abnormal results.
- Every result MUST have refLow and refHigh values (use standard adult reference ranges).`;

  console.log(
    `[narrative-report] Sending ${results.length} results (${abnormalResults.length} abnormal) to Gemini...`,
  );

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const raw = result.text ?? "";
    if (!raw) return { kind: "error", message: "Gemini returned empty." };

    const parsed = decodeAllStrings(JSON.parse(raw) as NarrativeReportOutput);
    console.log(
      `[narrative-report] ✓ Generated: healthScore=${parsed.patientReport.healthScore}, ${parsed.doctorReport.abnormalFindings.length} abnormals, ${parsed.doctorReport.differentialDiagnosis.length} differentials`,
    );
    return { kind: "ok", data: parsed };
  } catch (err) {
    console.error("[narrative-report] Gemini failed:", err);
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Report generation failed",
    };
  }
}

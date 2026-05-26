import "server-only";
import { Type, type Schema } from "@google/genai";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";
import type { PatientFullContext } from "@/lib/queries/patient-context";
import type { BiomarkerTrend } from "@/lib/medilab/trends";

/**
 * Clinical Intelligence Engine — cross-module AI analysis.
 *
 * Unlike the simple narrative generator, this sends the FULL patient
 * context to Gemini: demographics, lab trends, encounters, medications,
 * imaging, and vitals. The AI produces:
 *
 *   1. Trend analysis per biomarker
 *   2. Cross-module correlations
 *   3. Medication impact assessment
 *   4. Overall clinical trajectory
 *   5. Actionable recommendations
 *   6. Patient-friendly summary
 */

const SYSTEM_PROMPT = `You are a senior clinical AI consultant for MediSoft C-OS, a Saudi healthcare EMR. You have access to the patient's COMPLETE medical record across all clinical modules.

Your analysis must:
1. TREND ANALYSIS: For each abnormal or changing lab value, explain the trajectory (improving/stable/worsening) with specific numbers and dates.
2. CROSS-CORRELATION: Connect findings across modules. Example: "Elevated creatinine may be related to the Lisinopril started 2 months ago" or "Rising HbA1c despite Metformin — consider dose adjustment."
3. MEDICATION IMPACT: Flag any lab changes that could be drug-related. Check each active medication against the lab abnormalities.
4. CLINICAL TRAJECTORY: Give an overall assessment — is the patient improving, stable, or declining? Base this on ALL data, not just labs.
5. RECOMMENDATIONS: Provide 3-5 specific, actionable next steps ranked by urgency.
6. PATIENT SUMMARY: A 3-4 sentence plain-language summary suitable for sharing with the patient.

Rules:
- Use ONLY the data provided. Never invent results or medications.
- When a trend shows improvement, say so clearly.
- Flag critical values prominently.
- Be specific with numbers: "HbA1c improved from 8.2% to 7.1% over 6 months" not just "improved."
- Consider the patient's age, gender, chronic conditions, and allergies when interpreting results.
- Output JSON only, no markdown.`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    trendAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          testName: { type: Type.STRING },
          trajectory: { type: Type.STRING },
          detail: { type: Type.STRING },
          clinicalSignificance: { type: Type.STRING },
        },
        required: ["testName", "trajectory", "detail"],
      },
    },
    crossModuleInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          insight: { type: Type.STRING },
          modules: { type: Type.STRING },
          urgency: { type: Type.STRING },
        },
        required: ["insight", "modules"],
      },
    },
    medicationImpact: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          drug: { type: Type.STRING },
          labEffect: { type: Type.STRING },
          recommendation: { type: Type.STRING },
        },
        required: ["drug", "labEffect"],
      },
    },
    clinicalTrajectory: {
      type: Type.OBJECT,
      properties: {
        overallStatus: { type: Type.STRING },
        detail: { type: Type.STRING },
        riskLevel: { type: Type.STRING },
      },
      required: ["overallStatus", "detail"],
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          urgency: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ["action", "urgency"],
      },
    },
    physicianSummary: { type: Type.STRING },
    patientSummary: { type: Type.STRING },
  },
  required: [
    "trendAnalysis",
    "crossModuleInsights",
    "medicationImpact",
    "clinicalTrajectory",
    "recommendations",
    "physicianSummary",
    "patientSummary",
  ],
};

export interface IntelligenceOutput {
  trendAnalysis: Array<{
    testName: string;
    trajectory: string;
    detail: string;
    clinicalSignificance?: string;
  }>;
  crossModuleInsights: Array<{
    insight: string;
    modules: string;
    urgency?: string;
  }>;
  medicationImpact: Array<{
    drug: string;
    labEffect: string;
    recommendation?: string;
  }>;
  clinicalTrajectory: {
    overallStatus: string;
    detail: string;
    riskLevel?: string;
  };
  recommendations: Array<{
    action: string;
    urgency: string;
    rationale?: string;
  }>;
  physicianSummary: string;
  patientSummary: string;
}

export type IntelligenceResult =
  | { kind: "ok"; data: IntelligenceOutput }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

/**
 * Build the evidence text from the full patient context.
 */
function buildEvidence(
  ctx: PatientFullContext,
  trends: BiomarkerTrend[],
  currentResults: Array<{
    testName: string;
    value: number | string;
    unit?: string;
    flag?: string;
  }>,
): string {
  const lines: string[] = [];

  // Demographics
  lines.push("═══ PATIENT DEMOGRAPHICS ═══");
  lines.push(`Name: ${ctx.demographics.firstName} ${ctx.demographics.lastName}`);
  lines.push(`Age: ${ctx.demographics.age} | Sex: ${ctx.demographics.sex} | Blood: ${ctx.demographics.bloodType ?? "unknown"}`);

  if (ctx.demographics.allergies.length > 0) {
    lines.push(`Allergies: ${ctx.demographics.allergies.map((a) => `${a.substance} (${a.severity ?? "unknown"})`).join(", ")}`);
  }
  if (ctx.demographics.chronicConditions.length > 0) {
    lines.push(`Chronic conditions: ${ctx.demographics.chronicConditions.map((c) => `${c.description}${c.icdCode ? ` [${c.icdCode}]` : ""}`).join(", ")}`);
  }
  if (ctx.demographics.medicalHistory) {
    lines.push(`Medical history: ${ctx.demographics.medicalHistory}`);
  }

  // Current lab results — OPTIMIZED for large panels
  lines.push("");
  lines.push("═══ CURRENT LAB RESULTS ═══");

  if (currentResults.length <= 30) {
    // Small panel: send everything
    for (const r of currentResults) {
      const flag = r.flag ? ` [${r.flag.toUpperCase()}]` : "";
      lines.push(`  ${r.testName}: ${r.value} ${r.unit ?? ""}${flag}`);
    }
  } else {
    // Large panel: separate abnormal (detailed) from normal (names only)
    const abnormals: typeof currentResults = [];
    const normals: typeof currentResults = [];
    for (const r of currentResults) {
      const f = (r.flag ?? "").toLowerCase();
      if (f.includes("high") || f.includes("low") || f.includes("critical") || f.includes("abnormal")) {
        abnormals.push(r);
      } else {
        normals.push(r);
      }
    }
    lines.push(`  Total: ${currentResults.length} tests (${abnormals.length} abnormal)`);
    if (abnormals.length > 0) {
      lines.push("  ── Abnormal (analyze in detail) ──");
      for (const r of abnormals) {
        const flag = r.flag ? ` [${r.flag.toUpperCase()}]` : "";
        lines.push(`  ${r.testName}: ${r.value} ${r.unit ?? ""}${flag}`);
      }
    }
    if (normals.length > 0) {
      lines.push(`  ── Normal (${normals.length} tests within range) ──`);
      lines.push(`  ${normals.map((r) => r.testName).join(", ")}`);
    }
  }

  // Trend data
  if (trends.length > 0) {
    lines.push("");
    lines.push("═══ LAB TRENDS (previous → current) ═══");
    for (const t of trends) {
      lines.push(`  ${t.summary}`);
    }
  }

  // Previous lab panels
  if (ctx.labHistory.length > 1) {
    lines.push("");
    lines.push("═══ PREVIOUS LAB PANELS ═══");
    // Skip the first (current) panel, show the next few
    for (const panel of ctx.labHistory.slice(1, 6)) {
      lines.push(`  ${panel.panelName} (${panel.resultDate.toISOString().slice(0, 10)}):`);
      for (const r of panel.results.slice(0, 10)) {
        lines.push(`    ${r.testName}: ${r.value} ${r.unit ?? ""}`);
      }
    }
  }

  // Latest vitals
  if (ctx.latestVitals) {
    lines.push("");
    lines.push("═══ LATEST VITALS ═══");
    const v = ctx.latestVitals;
    if (v.bloodPressureSystolic && v.bloodPressureDiastolic) {
      lines.push(`  BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg`);
    }
    if (v.heartRate) lines.push(`  HR: ${v.heartRate} bpm`);
    if (v.temperature) lines.push(`  Temp: ${v.temperature} °C`);
    if (v.spO2) lines.push(`  SpO2: ${v.spO2}%`);
    if (v.weightKg) lines.push(`  Weight: ${v.weightKg} kg`);
    if (v.bmi) lines.push(`  BMI: ${v.bmi}`);
  }

  // Active medications
  if (ctx.activeMedications.length > 0) {
    lines.push("");
    lines.push("═══ CURRENT MEDICATIONS (PharmaX) ═══");
    for (const m of ctx.activeMedications) {
      lines.push(`  ${m.drugName} ${m.dose} ${m.frequency} (${m.route}) — ${m.status}`);
    }
  }

  // Recent encounters
  if (ctx.recentEncounters.length > 0) {
    lines.push("");
    lines.push("═══ RECENT CONSULTATIONS (MediScript) ═══");
    for (const e of ctx.recentEncounters.slice(0, 5)) {
      lines.push(`  ${e.encounterDate.toISOString().slice(0, 10)} | ${e.encounterType ?? "outpatient"} | ${e.status}`);
      const soap = e.soapNote as {
        subjective?: { chiefComplaint?: string };
        assessment?: { diagnoses?: Array<{ description: string }> };
      } | null;
      if (soap?.subjective?.chiefComplaint) {
        lines.push(`    CC: ${soap.subjective.chiefComplaint}`);
      }
      if (soap?.assessment?.diagnoses?.length) {
        lines.push(
          `    Dx: ${soap.assessment.diagnoses.map((d) => d.description).join(", ")}`,
        );
      }
    }
  }

  // Recent scans
  if (ctx.recentScans.length > 0) {
    lines.push("");
    lines.push("═══ RECENT IMAGING (MediScan) ═══");
    for (const s of ctx.recentScans) {
      lines.push(
        `  ${s.studyDate?.toISOString().slice(0, 10) ?? "?"} | ${s.scanType} | ${s.bodyPart}`,
      );
      if (s.aiImpression) lines.push(`    Impression: ${s.aiImpression}`);
    }
  }

  return lines.join("\n");
}

export async function generateClinicalIntelligence(
  ctx: PatientFullContext,
  trends: BiomarkerTrend[],
  currentResults: Array<{
    testName: string;
    value: number | string;
    unit?: string;
    flag?: string;
  }>,
): Promise<IntelligenceResult> {
  if (!isGeminiConfigured()) {
    return {
      kind: "not_configured",
      message: "Set GOOGLE_GEMINI_API_KEY to enable Clinical Intelligence.",
    };
  }
  const client = getGeminiClient();
  if (!client) {
    return { kind: "not_configured", message: "Gemini unavailable." };
  }

  const evidence = buildEvidence(ctx, trends, currentResults);

  console.log(
    `[intelligence] Sending ${evidence.length} chars of cross-module context to Gemini...`,
  );

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this patient's complete medical record and provide clinical intelligence:\n\n${evidence}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const raw = result.text ?? "";
    if (!raw) return { kind: "error", message: "Gemini returned empty." };

    const parsed = decodeAllStrings(JSON.parse(raw) as IntelligenceOutput);
    console.log(
      `[intelligence] ✓ Generated: ${parsed.trendAnalysis.length} trends, ${parsed.crossModuleInsights.length} insights, ${parsed.recommendations.length} recommendations`,
    );
    return { kind: "ok", data: parsed };
  } catch (err) {
    console.error("[intelligence] Gemini failed:", err);
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Intelligence generation failed",
    };
  }
}

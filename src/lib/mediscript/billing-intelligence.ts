import "server-only";

import { Type, type Schema } from "@google/genai";
import { GEMINI_MODEL, getGeminiClient } from "@/lib/ai/gemini";
import type { SoapNoteInput } from "@/lib/validations/encounter";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────

export interface ICD10Suggestion {
  code: string;
  description: string;
  category: string;
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
  isPrimary: boolean;
}

export interface CPTSuggestion {
  code: string;
  description: string;
  category: string;
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
  modifier?: string;
  units?: number;
}

export interface CodingDiscrepancy {
  type: "missing_documentation" | "code_mismatch" | "specificity_needed" | "bundling_issue";
  description: string;
  recommendation: string;
  severity: "info" | "warning" | "critical";
}

export interface BillingIntelligenceResult {
  icd10Codes: ICD10Suggestion[];
  cptCodes: CPTSuggestion[];
  discrepancies: CodingDiscrepancy[];
  encounterLevel: string;
  estimatedComplexity: "low" | "moderate" | "high" | "critical";
  codingSummary: string;
}

// ─────────────────────────────────────────────────────────────────
//  System Prompt
// ─────────────────────────────────────────────────────────────────

const BILLING_SYSTEM_PROMPT = `
You are MediScript Billing Intelligence — a medical coding decision support
engine that analyzes finalized SOAP notes and suggests appropriate ICD-10-CM
diagnosis codes and CPT procedure codes for the encounter.

Your role is to SUGGEST codes for physician review. The physician has final
authority over all coding decisions.

Core principles:
1. ICD-10-CM Diagnosis Codes:
   - Suggest codes for ALL documented diagnoses in the Assessment section.
   - Use the highest specificity available based on documented information.
   - Mark the primary diagnosis (reason for visit) as isPrimary: true.
   - Include laterality, episode of care, and other 7th characters when applicable.
   - For chronic conditions mentioned in PMH that were actively managed, include them.
   - Do NOT code symptoms when a definitive diagnosis is documented.

2. CPT Procedure Codes:
   - Suggest E/M (Evaluation & Management) level based on:
     * Medical decision making complexity
     * Time spent (if documented)
     * Number of problems addressed
   - Include procedure codes for any documented procedures (injections, wound care, etc.).
   - Include modifier codes when applicable (e.g., -25 for significant E/M with procedure).

3. Coding Discrepancies:
   - Flag when documentation doesn't support a higher-level code.
   - Flag when a diagnosis lacks specificity that could be documented.
   - Flag potential bundling issues.
   - Flag when documented work suggests a higher E/M level than typical.

4. Saudi/MENA Context:
   - Primary coding system: ICD-10-CM (used by NPHIES/Saudi insurance).
   - CPT codes used for procedure billing in private sector.
   - Consider CCHI (Council of Cooperative Health Insurance) requirements.

5. Confidence Levels:
   - "high": Code is clearly supported by documentation.
   - "moderate": Code is likely correct but documentation could be more specific.
   - "low": Code is suggested based on clinical context but needs physician confirmation.

Output format: Return ONLY the JSON object conforming to the response schema.
No commentary, no markdown, no apology text.
`.trim();

const ARABIC_INSTRUCTION = `\n\nIMPORTANT: Generate descriptions, supportingEvidence, recommendations, and codingSummary in Modern Standard Arabic (العربية الفصحى). Keep ICD-10 codes, CPT codes, and medical abbreviations in Latin script.`;

// ─────────────────────────────────────────────────────────────────
//  Response Schema
// ─────────────────────────────────────────────────────────────────

const BILLING_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    icd10Codes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          confidence: { type: Type.STRING },
          supportingEvidence: { type: Type.STRING },
          isPrimary: { type: Type.BOOLEAN },
        },
        required: ["code", "description", "category", "confidence", "supportingEvidence", "isPrimary"],
      },
    },
    cptCodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          confidence: { type: Type.STRING },
          supportingEvidence: { type: Type.STRING },
          modifier: { type: Type.STRING },
          units: { type: Type.NUMBER },
        },
        required: ["code", "description", "category", "confidence", "supportingEvidence"],
      },
    },
    discrepancies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          severity: { type: Type.STRING },
        },
        required: ["type", "description", "recommendation", "severity"],
      },
    },
    encounterLevel: { type: Type.STRING },
    estimatedComplexity: { type: Type.STRING },
    codingSummary: { type: Type.STRING },
  },
  required: ["icd10Codes", "cptCodes", "discrepancies", "encounterLevel", "estimatedComplexity", "codingSummary"],
};

// ─────────────────────────────────────────────────────────────────
//  Main Function
// ─────────────────────────────────────────────────────────────────

function buildBillingPrompt(
  soapNote: SoapNoteInput,
  encounterType: string,
  patientContext?: string,
): string {
  const lines: string[] = [
    "Analyze the following SOAP note and suggest appropriate ICD-10-CM and CPT codes.",
    "",
    `Encounter Type: ${encounterType}`,
    "",
  ];

  if (patientContext) {
    lines.push(`Patient context: ${patientContext}`);
    lines.push("");
  }

  lines.push("=== SOAP NOTE ===");
  lines.push("");

  // Subjective
  lines.push("## SUBJECTIVE");
  if (soapNote.subjective.chiefComplaint) {
    lines.push(`Chief Complaint: ${soapNote.subjective.chiefComplaint}`);
  }
  if (soapNote.subjective.historyOfPresentIllness) {
    lines.push(`HPI: ${soapNote.subjective.historyOfPresentIllness}`);
  }
  if (soapNote.subjective.reviewOfSystems) {
    lines.push(`ROS: ${soapNote.subjective.reviewOfSystems}`);
  }
  if (soapNote.subjective.pastMedicalHistory) {
    lines.push(`PMH: ${soapNote.subjective.pastMedicalHistory}`);
  }
  if (soapNote.subjective.medications) {
    lines.push(`Medications: ${soapNote.subjective.medications}`);
  }
  if (soapNote.subjective.allergies) {
    lines.push(`Allergies: ${soapNote.subjective.allergies}`);
  }

  // Objective
  lines.push("");
  lines.push("## OBJECTIVE");
  if (soapNote.objective.vitalSigns) {
    lines.push(`Vital Signs: ${soapNote.objective.vitalSigns}`);
  }
  if (soapNote.objective.physicalExamination) {
    lines.push(`Physical Exam: ${soapNote.objective.physicalExamination}`);
  }
  if (soapNote.objective.diagnosticResults) {
    lines.push(`Diagnostic Results: ${soapNote.objective.diagnosticResults}`);
  }

  // Assessment
  lines.push("");
  lines.push("## ASSESSMENT");
  if (soapNote.assessment.diagnoses.length > 0) {
    lines.push("Diagnoses:");
    for (const dx of soapNote.assessment.diagnoses) {
      const code = dx.icdCode ? ` [${dx.icdCode}]` : "";
      lines.push(`  - ${dx.description}${code}`);
    }
  }
  if (soapNote.assessment.differentialDiagnosis) {
    lines.push(`DDx: ${soapNote.assessment.differentialDiagnosis}`);
  }
  if (soapNote.assessment.clinicalReasoning) {
    lines.push(`Clinical Reasoning: ${soapNote.assessment.clinicalReasoning}`);
  }

  // Plan
  lines.push("");
  lines.push("## PLAN");
  if (soapNote.plan.diagnosticPlan) {
    lines.push(`Diagnostic Plan: ${soapNote.plan.diagnosticPlan}`);
  }
  if (soapNote.plan.therapeuticPlan) {
    lines.push(`Therapeutic Plan: ${soapNote.plan.therapeuticPlan}`);
  }
  if (soapNote.plan.patientEducation) {
    lines.push(`Patient Education: ${soapNote.plan.patientEducation}`);
  }
  if (soapNote.plan.followUp) {
    lines.push(`Follow-up: ${soapNote.plan.followUp}`);
  }

  lines.push("");
  lines.push("=== END SOAP NOTE ===");
  lines.push("");
  lines.push("Based on this documentation, suggest the most appropriate ICD-10-CM diagnosis codes, CPT procedure codes, and flag any coding discrepancies or documentation gaps.");

  return lines.join("\n");
}

export async function generateBillingCodes(
  soapNote: SoapNoteInput,
  encounterType: string,
  options?: {
    patientContext?: string;
    locale?: string;
  },
): Promise<BillingIntelligenceResult> {
  const gemini = getGeminiClient();
  if (!gemini) {
    throw new Error("Medical Intelligence Engine is not configured.");
  }

  const systemPrompt =
    options?.locale === "ar"
      ? BILLING_SYSTEM_PROMPT + ARABIC_INSTRUCTION
      : BILLING_SYSTEM_PROMPT;

  const userPrompt = buildBillingPrompt(soapNote, encounterType, options?.patientContext);

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: BILLING_RESPONSE_SCHEMA,
      temperature: 0.1, // Lower temperature for more precise coding
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Medical Intelligence Engine.");
  }

  const parsed = JSON.parse(text) as BillingIntelligenceResult;

  // Validate and sanitize
  return {
    icd10Codes: Array.isArray(parsed.icd10Codes) ? parsed.icd10Codes : [],
    cptCodes: Array.isArray(parsed.cptCodes) ? parsed.cptCodes : [],
    discrepancies: Array.isArray(parsed.discrepancies) ? parsed.discrepancies : [],
    encounterLevel: parsed.encounterLevel || "Unknown",
    estimatedComplexity: parsed.estimatedComplexity || "moderate",
    codingSummary: parsed.codingSummary || "",
  };
}

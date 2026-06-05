import "server-only";

import { Type, type Schema } from "@google/genai";
import { GEMINI_MODEL, getGeminiClient } from "@/lib/ai/gemini";
import type { SoapNoteInput } from "@/lib/validations/encounter";

// ─────────────────────────────────────────────────────────────────
//  Types — Saudi Healthcare Coding Standards (CHI / NPHIES)
// ─────────────────────────────────────────────────────────────────

/**
 * ICD-10-AM Diagnosis Code Suggestion
 * System URI: http://hl7.org/fhir/sid/icd-10-am
 * Based on: International Statistical Classification of Diseases,
 * Tenth Revision, Australian Modification (10th Edition)
 * Mandated in Saudi Arabia since January 1, 2020
 */
export interface ICD10AMSuggestion {
  code: string; // ICD-10-AM code (e.g., "E11.9", "I10", "J06.9")
  description: string;
  descriptionAr: string; // Arabic description
  category: string; // Chapter/category (e.g., "Endocrine", "Circulatory")
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
  isPrimary: boolean; // Principal diagnosis for the encounter
  sequencing: number; // Diagnosis sequencing order (1 = principal)
  presentOnAdmission?: "Y" | "N" | "U" | "W"; // POA indicator
}

/**
 * SBS Procedure Code Suggestion
 * System URI: http://nphies.sa/terminology/CodeSystem/procedures
 * Based on: ACHI (Australian Classification of Health Interventions)
 * Extended by CHI (Council of Health Insurance) for Saudi Arabia
 * Format: NNNNN-NN-NN (7 chars + 2-digit extension + 2-digit extension)
 * Total: 9,443 codes (6,224 ACHI + 3,219 Saudi-specific)
 */
export interface SBSProcedureSuggestion {
  code: string; // SBS/ACHI format: "NNNNN-NN-NN" (e.g., "30571-00-00")
  description: string;
  descriptionAr: string; // Arabic description
  category: string; // Block/chapter category
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
  block?: number; // SBS block number
  units?: number; // Number of units
}

/**
 * SBS Service Code Suggestion
 * System URI: http://nphies.sa/terminology/CodeSystem/services
 * Includes: Room & Board, Consultations, Rounding, Service codes
 */
export interface SBSServiceSuggestion {
  code: string; // SBS service format: "NNNNN-NN-NN"
  description: string;
  descriptionAr: string;
  category: "consultation" | "rounding" | "room_board" | "service";
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
}

/**
 * Coding Discrepancy / Documentation Gap
 */
export interface CodingDiscrepancy {
  type:
    | "missing_documentation"
    | "code_mismatch"
    | "specificity_needed"
    | "bundling_issue"
    | "nphies_compliance"
    | "sequencing_issue";
  description: string;
  descriptionAr: string;
  recommendation: string;
  recommendationAr: string;
  severity: "info" | "warning" | "critical";
  nphiesRule?: string; // Reference to specific NPHIES rule if applicable
}

/**
 * NPHIES Encounter Classification
 * Required for claim submission to NPHIES platform
 */
export interface NphiesEncounterClassification {
  type: "AMB" | "EMER" | "HH" | "IMP" | "SS" | "VR";
  typeDescription: string;
  typeDescriptionAr: string;
  claimType: "institutional" | "professional" | "pharmacy" | "dental" | "vision";
  serviceType: string; // Practice code from NPHIES ValueSet
}

/**
 * Complete Billing Intelligence Result — Saudi Compliant
 */
export interface BillingIntelligenceResult {
  // Diagnosis codes — ICD-10-AM (NOT ICD-10-CM)
  icd10amCodes: ICD10AMSuggestion[];
  // Procedure codes — SBS/ACHI (NOT CPT)
  sbsProcedureCodes: SBSProcedureSuggestion[];
  // Service codes — SBS Services
  sbsServiceCodes: SBSServiceSuggestion[];
  // Coding quality issues
  discrepancies: CodingDiscrepancy[];
  // NPHIES encounter classification
  nphiesClassification: NphiesEncounterClassification;
  // Overall assessment
  estimatedComplexity: "low" | "moderate" | "high" | "critical";
  codingSummary: string;
  codingSummaryAr: string;
  // Compliance score
  nphiesReadiness: number; // 0-100 score for NPHIES submission readiness

  // Legacy compatibility aliases (for existing UI components)
  icd10Codes: ICD10AMSuggestion[];
  cptCodes: SBSProcedureSuggestion[];
}

// ─────────────────────────────────────────────────────────────────
//  System Prompt — Saudi Healthcare Standards
// ─────────────────────────────────────────────────────────────────

const BILLING_SYSTEM_PROMPT = `
You are MediScript Billing Intelligence — a medical coding decision support
engine fully compliant with Saudi Arabian healthcare standards. You analyze
finalized SOAP notes and suggest appropriate codes for the Saudi healthcare
billing ecosystem.

CRITICAL: You MUST use Saudi coding standards, NOT American standards.

═══════════════════════════════════════════════════════════════════
SAUDI CODING STANDARDS (Mandated by CHI — Council of Health Insurance)
═══════════════════════════════════════════════════════════════════

1. DIAGNOSIS CODES: ICD-10-AM (Australian Modification), 10th Edition
   - System URI: http://hl7.org/fhir/sid/icd-10-am
   - Mandated in Saudi Arabia since January 1, 2020
   - Based on WHO ICD-10, modified by IHACPA (Australia)
   - Format: Letter + 2-5 digits (e.g., E11.65, I10, J06.9)
   - IMPORTANT: Some codes differ from ICD-10-CM (US version)
   - Use Australian Coding Standards (ACS) sequencing rules
   - Principal diagnosis = condition established after study to be chiefly
     responsible for occasioning the episode of care

2. PROCEDURE CODES: SBS (Saudi Billing System) / ACHI
   - System URI: http://nphies.sa/terminology/CodeSystem/procedures
   - Based on ACHI (Australian Classification of Health Interventions)
   - Extended by CHI with 3,219 Saudi-specific codes
   - Format: NNNNN-NN-NN (e.g., 30571-00-00 = Appendicectomy)
   - Total: 9,443 codes
   - DO NOT use CPT codes — they are NOT valid in Saudi Arabia
   
3. SERVICE CODES: SBS Services
   - System URI: http://nphies.sa/terminology/CodeSystem/services
   - Includes: Consultations, Room & Board, Rounding, Services
   - Format: NNNNN-NN-NN (e.g., 83600-00-10 = Specialist Consultation)
   - Used for: E/M equivalent services, hospital services

4. NPHIES ENCOUNTER TYPES (Required for claim submission):
   - AMB = Ambulatory (outpatient clinic visits)
   - EMER = Emergency department
   - HH = Home Healthcare
   - IMP = Inpatient admission
   - SS = Day Case (same-day surgery/procedure)
   - VR = Telemedicine/Virtual

5. NPHIES CLAIM TYPES:
   - institutional = Hospital-based services (inpatient, day case)
   - professional = Outpatient physician services, consultations
   - pharmacy = Medication dispensing
   - dental = Dental procedures
   - vision = Optical services

═══════════════════════════════════════════════════════════════════
CODING RULES
═══════════════════════════════════════════════════════════════════

ICD-10-AM Diagnosis Coding:
- Suggest codes for ALL documented diagnoses in Assessment section
- Use highest specificity based on documented information
- Mark principal diagnosis (reason for encounter) as isPrimary: true
- Assign sequencing numbers (1 = principal, 2+ = additional)
- Include laterality and episode characters when applicable
- For chronic conditions actively managed during encounter, include them
- DO NOT code symptoms when a definitive diagnosis is documented
- Apply Australian Coding Standards (ACS) sequencing rules

SBS Procedure Coding:
- Suggest SBS/ACHI codes for documented procedures
- Include consultation/service codes for the encounter type
- Format MUST be NNNNN-NN-NN (5 digits, hyphen, 2 digits, hyphen, 2 digits)
- Common codes:
  * 83600-00-10 = Specialist Consultation (new patient)
  * 83600-00-20 = Specialist Consultation (established patient)
  * 83600-00-30 = General Practitioner Consultation
  * 96196-01-00 = Intra-arterial pharmacological agent
  * 30571-00-00 = Appendicectomy
  * 42503-00-02 = Ophthalmological examination, bilateral
  * 13882-00-00 = Continuous ventilatory support <= 24 hours

Discrepancy Detection:
- Flag when documentation doesn't support code specificity
- Flag NPHIES compliance issues (missing required fields)
- Flag sequencing errors per ACS rules
- Flag when encounter type doesn't match service codes
- Flag potential bundling issues per SBS standards

NPHIES Readiness Score (0-100):
- 100 = Ready for immediate NPHIES submission
- 80-99 = Minor documentation gaps, submittable with review
- 60-79 = Significant gaps, needs physician attention
- 0-59 = Major issues, cannot submit to NPHIES

Output: Return ONLY the JSON object conforming to the response schema.
No commentary, no markdown, no apology text.
`.trim();

const ARABIC_INSTRUCTION = `\n\nIMPORTANT: Generate ALL description, descriptionAr, supportingEvidence, recommendation, recommendationAr, codingSummary, and codingSummaryAr fields in Modern Standard Arabic (العربية الفصحى). Keep ICD-10-AM codes, SBS codes, and medical abbreviations in Latin script. The descriptionAr and recommendationAr fields MUST always be in Arabic regardless of locale.`;

// ─────────────────────────────────────────────────────────────────
//  Response Schema — Saudi Compliant
// ─────────────────────────────────────────────────────────────────

const BILLING_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    icd10amCodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          description: { type: Type.STRING },
          descriptionAr: { type: Type.STRING },
          category: { type: Type.STRING },
          confidence: { type: Type.STRING },
          supportingEvidence: { type: Type.STRING },
          isPrimary: { type: Type.BOOLEAN },
          sequencing: { type: Type.NUMBER },
          presentOnAdmission: { type: Type.STRING },
        },
        required: [
          "code",
          "description",
          "descriptionAr",
          "category",
          "confidence",
          "supportingEvidence",
          "isPrimary",
          "sequencing",
        ],
      },
    },
    sbsProcedureCodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          description: { type: Type.STRING },
          descriptionAr: { type: Type.STRING },
          category: { type: Type.STRING },
          confidence: { type: Type.STRING },
          supportingEvidence: { type: Type.STRING },
          block: { type: Type.NUMBER },
          units: { type: Type.NUMBER },
        },
        required: ["code", "description", "descriptionAr", "category", "confidence", "supportingEvidence"],
      },
    },
    sbsServiceCodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          description: { type: Type.STRING },
          descriptionAr: { type: Type.STRING },
          category: { type: Type.STRING },
          confidence: { type: Type.STRING },
          supportingEvidence: { type: Type.STRING },
        },
        required: ["code", "description", "descriptionAr", "category", "confidence", "supportingEvidence"],
      },
    },
    discrepancies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          descriptionAr: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          recommendationAr: { type: Type.STRING },
          severity: { type: Type.STRING },
          nphiesRule: { type: Type.STRING },
        },
        required: ["type", "description", "descriptionAr", "recommendation", "recommendationAr", "severity"],
      },
    },
    nphiesClassification: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        typeDescription: { type: Type.STRING },
        typeDescriptionAr: { type: Type.STRING },
        claimType: { type: Type.STRING },
        serviceType: { type: Type.STRING },
      },
      required: ["type", "typeDescription", "typeDescriptionAr", "claimType", "serviceType"],
    },
    estimatedComplexity: { type: Type.STRING },
    codingSummary: { type: Type.STRING },
    codingSummaryAr: { type: Type.STRING },
    nphiesReadiness: { type: Type.NUMBER },
  },
  required: [
    "icd10amCodes",
    "sbsProcedureCodes",
    "sbsServiceCodes",
    "discrepancies",
    "nphiesClassification",
    "estimatedComplexity",
    "codingSummary",
    "codingSummaryAr",
    "nphiesReadiness",
  ],
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
    "Analyze the following SOAP note and suggest appropriate codes per Saudi healthcare standards.",
    "",
    "CODING SYSTEMS TO USE:",
    "- Diagnoses: ICD-10-AM (Australian Modification) — NOT ICD-10-CM",
    "- Procedures: SBS/ACHI (Saudi Billing System) — NOT CPT",
    "- Services: SBS Services (Consultations, Room & Board)",
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
  lines.push("Based on this documentation, suggest:");
  lines.push("1. ICD-10-AM diagnosis codes (with sequencing and principal diagnosis)");
  lines.push("2. SBS/ACHI procedure codes (format: NNNNN-NN-NN)");
  lines.push("3. SBS service codes (consultation type, etc.)");
  lines.push("4. NPHIES encounter classification (AMB/EMER/HH/IMP/SS/VR)");
  lines.push("5. Coding discrepancies and NPHIES readiness score");

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

  // Always include Arabic instruction since Saudi system requires bilingual output
  const systemPrompt = BILLING_SYSTEM_PROMPT + ARABIC_INSTRUCTION;

  const userPrompt = buildBillingPrompt(soapNote, encounterType, options?.patientContext);

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: BILLING_RESPONSE_SCHEMA,
      temperature: 0.1, // Lower temperature for precise coding
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Medical Intelligence Engine.");
  }

  const parsed = JSON.parse(text);

  // Validate and sanitize
  const result: BillingIntelligenceResult = {
    icd10amCodes: Array.isArray(parsed.icd10amCodes) ? parsed.icd10amCodes : [],
    sbsProcedureCodes: Array.isArray(parsed.sbsProcedureCodes) ? parsed.sbsProcedureCodes : [],
    sbsServiceCodes: Array.isArray(parsed.sbsServiceCodes) ? parsed.sbsServiceCodes : [],
    discrepancies: Array.isArray(parsed.discrepancies) ? parsed.discrepancies : [],
    nphiesClassification: parsed.nphiesClassification || {
      type: "AMB",
      typeDescription: "Ambulatory",
      typeDescriptionAr: "عيادات خارجية",
      claimType: "professional",
      serviceType: "general-practice",
    },
    estimatedComplexity: parsed.estimatedComplexity || "moderate",
    codingSummary: parsed.codingSummary || "",
    codingSummaryAr: parsed.codingSummaryAr || "",
    nphiesReadiness: typeof parsed.nphiesReadiness === "number" ? parsed.nphiesReadiness : 0,
    // Legacy compatibility aliases for existing UI
    icd10Codes: Array.isArray(parsed.icd10amCodes) ? parsed.icd10amCodes : [],
    cptCodes: Array.isArray(parsed.sbsProcedureCodes) ? parsed.sbsProcedureCodes : [],
  };

  return result;
}

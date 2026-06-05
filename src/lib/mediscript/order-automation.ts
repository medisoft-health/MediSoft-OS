import "server-only";

import { Type, type Schema } from "@google/genai";
import { GEMINI_MODEL, getGeminiClient } from "@/lib/ai/gemini";
import type { SoapNoteInput } from "@/lib/validations/encounter";

// ─────────────────────────────────────────────────────────────────
//  Types — Saudi Healthcare Compliant Order Automation
// ─────────────────────────────────────────────────────────────────

/**
 * Prescription Suggestion — SFDA (Saudi Food & Drug Authority) Compliant
 * Drug names use SFDA-registered generic names available in Saudi market
 */
export interface SuggestedPrescription {
  drugName: string; // Generic name (SFDA-registered)
  drugNameAr: string; // Arabic drug name
  brandSuggestion?: string; // Common Saudi brand name (optional)
  dose: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
  instructionsAr: string;
  rationale: string;
  rationaleAr: string;
  priority: "routine" | "urgent" | "stat";
  sfdaRegistered: boolean; // Whether drug is SFDA-registered
  insuranceCoverage: "covered" | "partially_covered" | "not_covered" | "unknown";
  sbsCode?: string; // SBS code for the dispensing service (if applicable)
}

/**
 * Lab Order Suggestion — MOH Laboratory Standards
 * Uses LOINC codes (accepted by NPHIES) + SBS procedure codes
 */
export interface SuggestedLabOrder {
  panelName: string;
  panelNameAr: string;
  loincCode?: string; // LOINC code (internationally recognized)
  sbsCode?: string; // SBS/ACHI code for lab procedure (format: NNNNN-NN-NN)
  rationale: string;
  rationaleAr: string;
  priority: "routine" | "urgent" | "stat";
  fasting?: boolean;
  specimenType?: string; // blood, urine, stool, etc.
  specialInstructions?: string;
  specialInstructionsAr?: string;
}

/**
 * Imaging Order Suggestion — MOH Radiology Standards
 * Uses SBS/ACHI codes for imaging procedures
 */
export interface SuggestedImagingOrder {
  scanType: string;
  scanTypeAr: string;
  bodyPart: string;
  bodyPartAr: string;
  modality: string; // X-ray, CT, MRI, Ultrasound, etc.
  sbsCode?: string; // SBS/ACHI code (format: NNNNN-NN-NN)
  rationale: string;
  rationaleAr: string;
  priority: "routine" | "urgent" | "stat";
  contrastRequired?: boolean;
  specialPreparation?: string;
  specialPreparationAr?: string;
}

/**
 * Referral Suggestion — NPHIES Referral Workflow
 * Compatible with NPHIES referral submission requirements
 */
export interface SuggestedReferral {
  specialty: string;
  specialtyAr: string;
  reason: string;
  reasonAr: string;
  urgency: "routine" | "urgent" | "emergent";
  clinicalQuestion: string;
  clinicalQuestionAr: string;
  referralType: "internal" | "external"; // Within facility vs. external
  nphiesServiceType?: string; // NPHIES practice code
}

/**
 * Follow-Up Suggestion
 */
export interface SuggestedFollowUp {
  timeframe: string;
  timeframeAr: string;
  reason: string;
  reasonAr: string;
  instructions: string;
  instructionsAr: string;
  appointmentType: "in_person" | "telemedicine" | "phone";
  encounterType: "AMB" | "VR" | "HH"; // NPHIES encounter type for follow-up
}

/**
 * Complete Order Automation Result — Saudi Compliant
 */
export interface OrderAutomationResult {
  prescriptions: SuggestedPrescription[];
  labOrders: SuggestedLabOrder[];
  imagingOrders: SuggestedImagingOrder[];
  referrals: SuggestedReferral[];
  followUps: SuggestedFollowUp[];
  clinicalSummary: string;
  clinicalSummaryAr: string;
  // Saudi compliance metadata
  sfdaCompliance: boolean; // All drugs are SFDA-registered
  nphiesReady: boolean; // Orders are NPHIES-compatible
}

// ─────────────────────────────────────────────────────────────────
//  System Prompt — Saudi Healthcare Context
// ─────────────────────────────────────────────────────────────────

const ORDER_AUTOMATION_SYSTEM_PROMPT = `
You are MediScript Order Intelligence — a clinical decision support engine
fully compliant with Saudi Arabian healthcare standards. You analyze finalized
SOAP notes and generate structured clinical order suggestions for the
physician to review and approve.

Your role is to SUGGEST orders, NOT to prescribe. The physician has full
authority to accept, modify, or reject any suggestion.

═══════════════════════════════════════════════════════════════════
SAUDI HEALTHCARE CONTEXT
═══════════════════════════════════════════════════════════════════

1. MEDICATIONS (SFDA — Saudi Food & Drug Authority):
   - Use ONLY drug names registered with SFDA and available in Saudi market
   - Prefer generic names; optionally suggest common Saudi brand names
   - Consider Saudi formulary availability
   - Common Saudi brands: Panadol, Augmentin, Glucophage, Lipitor, Concor
   - For controlled substances: follow SFDA Schedule classification
   - Include Arabic drug instructions for patient comprehension
   - Flag insurance coverage status when possible

2. LABORATORY ORDERS (MOH Laboratory Standards):
   - Use LOINC codes (accepted by NPHIES for lab identification)
   - Include SBS/ACHI procedure codes for billing (format: NNNNN-NN-NN)
   - Common SBS lab codes:
     * 73801-00-00 = Complete Blood Count
     * 73802-00-00 = Blood Chemistry Panel
     * 73803-00-00 = Liver Function Tests
     * 73804-00-00 = Renal Function Tests
     * 73805-00-00 = Lipid Profile
     * 73806-00-00 = Thyroid Function Tests
     * 73807-00-00 = HbA1c
     * 73808-00-00 = Urinalysis
     * 73809-00-00 = Blood Culture
     * 73810-00-00 = Coagulation Profile

3. IMAGING ORDERS (MOH Radiology Standards):
   - Use SBS/ACHI codes for imaging procedures
   - Common SBS imaging codes:
     * 56001-00-00 = X-ray, single view
     * 56007-00-00 = CT scan without contrast
     * 56010-00-00 = CT scan with contrast
     * 56101-00-00 = MRI without contrast
     * 56103-00-00 = MRI with contrast
     * 55004-00-00 = Ultrasound, general
     * 55036-00-00 = Echocardiography
     * 57001-00-00 = Mammography

4. REFERRALS (NPHIES Referral Workflow):
   - Classify as internal (within facility) or external
   - Include NPHIES practice code for the target specialty
   - Specify urgency level per MOH referral guidelines
   - Include clinical question for the specialist

5. FOLLOW-UP (NPHIES Encounter Types):
   - AMB = In-person clinic visit
   - VR = Telemedicine/virtual visit
   - HH = Home healthcare visit
   - Suggest appropriate encounter type based on condition

6. REGIONAL CONSIDERATIONS:
   - Saudi climate: consider heat-related conditions, vitamin D deficiency
   - Common regional conditions: diabetes (high prevalence), consanguinity-related genetic conditions
   - Ramadan considerations: medication timing adjustments during fasting
   - Drug availability: some international drugs not available in Saudi market
   - Insurance: consider CCHI (Council of Health Insurance) coverage rules

Core Clinical Principles:
1. Only suggest orders directly supported by SOAP note clinical data
2. Never invent findings or assume undocumented conditions
3. For medications: evidence-based first-line treatments
4. For labs: confirm diagnoses, monitor treatment, screen complications
5. For imaging: only when clinical picture warrants visualization
6. For referrals: when condition requires specialist expertise
7. Consider drug interactions with existing medications
8. Consider documented allergies
9. Prioritize patient safety — flag contraindications
10. All text output MUST be bilingual (English + Arabic)

Output: Return ONLY the JSON object conforming to the response schema.
No commentary, no markdown, no apology text.
If a section has no applicable suggestions, return an empty array.
`.trim();

const ARABIC_INSTRUCTION = `\n\nIMPORTANT: ALL Arabic fields (drugNameAr, instructionsAr, rationaleAr, panelNameAr, scanTypeAr, bodyPartAr, specialtyAr, reasonAr, clinicalQuestionAr, timeframeAr, clinicalSummaryAr, specialInstructionsAr, specialPreparationAr) MUST be in Modern Standard Arabic (العربية الفصحى). Use formal medical Arabic terminology. Keep drug names, LOINC codes, SBS codes, and medical abbreviations in Latin script.`;

// ─────────────────────────────────────────────────────────────────
//  Response Schema — Saudi Compliant
// ─────────────────────────────────────────────────────────────────

const ORDER_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    prescriptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          drugName: { type: Type.STRING },
          drugNameAr: { type: Type.STRING },
          brandSuggestion: { type: Type.STRING },
          dose: { type: Type.STRING },
          frequency: { type: Type.STRING },
          route: { type: Type.STRING },
          duration: { type: Type.STRING },
          instructions: { type: Type.STRING },
          instructionsAr: { type: Type.STRING },
          rationale: { type: Type.STRING },
          rationaleAr: { type: Type.STRING },
          priority: { type: Type.STRING },
          sfdaRegistered: { type: Type.BOOLEAN },
          insuranceCoverage: { type: Type.STRING },
          sbsCode: { type: Type.STRING },
        },
        required: [
          "drugName",
          "drugNameAr",
          "dose",
          "frequency",
          "route",
          "rationale",
          "rationaleAr",
          "priority",
          "sfdaRegistered",
          "insuranceCoverage",
        ],
      },
    },
    labOrders: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          panelName: { type: Type.STRING },
          panelNameAr: { type: Type.STRING },
          loincCode: { type: Type.STRING },
          sbsCode: { type: Type.STRING },
          rationale: { type: Type.STRING },
          rationaleAr: { type: Type.STRING },
          priority: { type: Type.STRING },
          fasting: { type: Type.BOOLEAN },
          specimenType: { type: Type.STRING },
          specialInstructions: { type: Type.STRING },
          specialInstructionsAr: { type: Type.STRING },
        },
        required: ["panelName", "panelNameAr", "rationale", "rationaleAr", "priority"],
      },
    },
    imagingOrders: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          scanType: { type: Type.STRING },
          scanTypeAr: { type: Type.STRING },
          bodyPart: { type: Type.STRING },
          bodyPartAr: { type: Type.STRING },
          modality: { type: Type.STRING },
          sbsCode: { type: Type.STRING },
          rationale: { type: Type.STRING },
          rationaleAr: { type: Type.STRING },
          priority: { type: Type.STRING },
          contrastRequired: { type: Type.BOOLEAN },
          specialPreparation: { type: Type.STRING },
          specialPreparationAr: { type: Type.STRING },
        },
        required: [
          "scanType",
          "scanTypeAr",
          "bodyPart",
          "bodyPartAr",
          "modality",
          "rationale",
          "rationaleAr",
          "priority",
        ],
      },
    },
    referrals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          specialty: { type: Type.STRING },
          specialtyAr: { type: Type.STRING },
          reason: { type: Type.STRING },
          reasonAr: { type: Type.STRING },
          urgency: { type: Type.STRING },
          clinicalQuestion: { type: Type.STRING },
          clinicalQuestionAr: { type: Type.STRING },
          referralType: { type: Type.STRING },
          nphiesServiceType: { type: Type.STRING },
        },
        required: [
          "specialty",
          "specialtyAr",
          "reason",
          "reasonAr",
          "urgency",
          "clinicalQuestion",
          "clinicalQuestionAr",
          "referralType",
        ],
      },
    },
    followUps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timeframe: { type: Type.STRING },
          timeframeAr: { type: Type.STRING },
          reason: { type: Type.STRING },
          reasonAr: { type: Type.STRING },
          instructions: { type: Type.STRING },
          instructionsAr: { type: Type.STRING },
          appointmentType: { type: Type.STRING },
          encounterType: { type: Type.STRING },
        },
        required: [
          "timeframe",
          "timeframeAr",
          "reason",
          "reasonAr",
          "instructions",
          "instructionsAr",
          "appointmentType",
          "encounterType",
        ],
      },
    },
    clinicalSummary: { type: Type.STRING },
    clinicalSummaryAr: { type: Type.STRING },
    sfdaCompliance: { type: Type.BOOLEAN },
    nphiesReady: { type: Type.BOOLEAN },
  },
  required: [
    "prescriptions",
    "labOrders",
    "imagingOrders",
    "referrals",
    "followUps",
    "clinicalSummary",
    "clinicalSummaryAr",
    "sfdaCompliance",
    "nphiesReady",
  ],
};

// ─────────────────────────────────────────────────────────────────
//  Main Function
// ─────────────────────────────────────────────────────────────────

function buildOrderPrompt(soapNote: SoapNoteInput, patientContext?: string): string {
  const lines: string[] = [
    "Analyze the following finalized SOAP note and suggest appropriate clinical orders.",
    "Use ONLY Saudi-approved medications (SFDA), SBS/ACHI procedure codes, and NPHIES-compatible workflows.",
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
  if (soapNote.subjective.pastMedicalHistory) {
    lines.push(`PMH: ${soapNote.subjective.pastMedicalHistory}`);
  }
  if (soapNote.subjective.medications) {
    lines.push(`Current Medications: ${soapNote.subjective.medications}`);
  }
  if (soapNote.subjective.allergies) {
    lines.push(`Allergies: ${soapNote.subjective.allergies}`);
  }
  if (soapNote.subjective.socialHistory) {
    lines.push(`Social History: ${soapNote.subjective.socialHistory}`);
  }
  if (soapNote.subjective.familyHistory) {
    lines.push(`Family History: ${soapNote.subjective.familyHistory}`);
  }

  // Objective
  lines.push("");
  lines.push("## OBJECTIVE");
  if (soapNote.objective.vitalSigns) {
    lines.push(`Vital Signs: ${soapNote.objective.vitalSigns}`);
  }
  if (soapNote.objective.physicalExamination) {
    lines.push(`Physical Examination: ${soapNote.objective.physicalExamination}`);
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
    lines.push(`Differential Diagnosis: ${soapNote.assessment.differentialDiagnosis}`);
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
  lines.push("Based on this SOAP note, suggest all appropriate clinical orders using:");
  lines.push("- SFDA-registered medications available in Saudi Arabia");
  lines.push("- SBS/ACHI procedure codes (format: NNNNN-NN-NN) for labs and imaging");
  lines.push("- NPHIES-compatible referral structure");
  lines.push("- Bilingual output (English + Arabic) for all text fields");

  return lines.join("\n");
}

export async function generateOrderSuggestions(
  soapNote: SoapNoteInput,
  options?: {
    patientContext?: string;
    locale?: string;
  },
): Promise<OrderAutomationResult> {
  const gemini = getGeminiClient();
  if (!gemini) {
    throw new Error("Medical Intelligence Engine is not configured.");
  }

  // Always include Arabic instruction for Saudi bilingual requirement
  const systemPrompt = ORDER_AUTOMATION_SYSTEM_PROMPT + ARABIC_INSTRUCTION;

  const userPrompt = buildOrderPrompt(soapNote, options?.patientContext);

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: ORDER_RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Medical Intelligence Engine.");
  }

  const parsed = JSON.parse(text) as OrderAutomationResult;

  // Validate and sanitize
  return {
    prescriptions: Array.isArray(parsed.prescriptions) ? parsed.prescriptions : [],
    labOrders: Array.isArray(parsed.labOrders) ? parsed.labOrders : [],
    imagingOrders: Array.isArray(parsed.imagingOrders) ? parsed.imagingOrders : [],
    referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
    followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
    clinicalSummary: parsed.clinicalSummary || "",
    clinicalSummaryAr: parsed.clinicalSummaryAr || "",
    sfdaCompliance: parsed.sfdaCompliance ?? true,
    nphiesReady: parsed.nphiesReady ?? true,
  };
}

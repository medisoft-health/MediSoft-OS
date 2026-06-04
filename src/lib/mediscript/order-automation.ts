import "server-only";

import { Type, type Schema } from "@google/genai";
import { GEMINI_MODEL, getGeminiClient } from "@/lib/ai/gemini";
import type { SoapNoteInput } from "@/lib/validations/encounter";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────

export interface SuggestedPrescription {
  drugName: string;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
  rationale: string;
  priority: "routine" | "urgent" | "stat";
}

export interface SuggestedLabOrder {
  panelName: string;
  loincCode?: string;
  rationale: string;
  priority: "routine" | "urgent" | "stat";
  fasting?: boolean;
}

export interface SuggestedImagingOrder {
  scanType: string;
  bodyPart: string;
  modality: string;
  rationale: string;
  priority: "routine" | "urgent" | "stat";
  contrastRequired?: boolean;
}

export interface SuggestedReferral {
  specialty: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergent";
  clinicalQuestion: string;
}

export interface SuggestedFollowUp {
  timeframe: string;
  reason: string;
  instructions: string;
  appointmentType: "in_person" | "telemedicine" | "phone";
}

export interface OrderAutomationResult {
  prescriptions: SuggestedPrescription[];
  labOrders: SuggestedLabOrder[];
  imagingOrders: SuggestedImagingOrder[];
  referrals: SuggestedReferral[];
  followUps: SuggestedFollowUp[];
  clinicalSummary: string;
}

// ─────────────────────────────────────────────────────────────────
//  System Prompt
// ─────────────────────────────────────────────────────────────────

const ORDER_AUTOMATION_SYSTEM_PROMPT = `
You are MediScript Order Intelligence — a clinical decision support engine
that analyzes a finalized SOAP note and generates structured clinical order
suggestions for the physician to review and approve.

Your role is to SUGGEST orders, NOT to prescribe. The physician has full
authority to accept, modify, or reject any suggestion.

Core principles:
1. Only suggest orders that are directly supported by the clinical data in
   the SOAP note. Never invent findings or assume conditions not documented.
2. For medications: suggest evidence-based first-line treatments appropriate
   for the documented diagnoses. Include dose, frequency, route, and duration.
3. For lab orders: suggest tests that would confirm diagnoses, monitor
   treatment response, or screen for complications mentioned in the plan.
4. For imaging: suggest studies only when the clinical picture warrants
   visualization (e.g., suspected fracture, mass, effusion).
5. For referrals: suggest specialist consultation when the condition
   requires expertise beyond the documenting physician's scope.
6. For follow-up: suggest timing based on condition acuity and treatment
   monitoring needs.
7. Consider drug interactions with the patient's existing medications
   (listed in Subjective > Medications).
8. Consider patient allergies (listed in Subjective > Allergies).
9. Prioritize patient safety — flag any contraindications.
10. Saudi/MENA context: use drug names commonly available in the region.
    Prefer generic names with brand alternatives when helpful.

Output format: Return ONLY the JSON object conforming to the response schema.
No commentary, no markdown, no apology text.

If a section has no applicable suggestions, return an empty array for that
section. Do not force suggestions where none are clinically indicated.
`.trim();

const ARABIC_INSTRUCTION = `\n\nIMPORTANT: Generate ALL output text in Modern Standard Arabic (العربية الفصحى). Use formal medical Arabic terminology. Keep drug names, LOINC codes, and medical abbreviations in Latin script. The rationale and instructions should be in Arabic.`;

// ─────────────────────────────────────────────────────────────────
//  Response Schema
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
          dose: { type: Type.STRING },
          frequency: { type: Type.STRING },
          route: { type: Type.STRING },
          duration: { type: Type.STRING },
          instructions: { type: Type.STRING },
          rationale: { type: Type.STRING },
          priority: { type: Type.STRING },
        },
        required: ["drugName", "dose", "frequency", "route", "rationale", "priority"],
      },
    },
    labOrders: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          panelName: { type: Type.STRING },
          loincCode: { type: Type.STRING },
          rationale: { type: Type.STRING },
          priority: { type: Type.STRING },
          fasting: { type: Type.BOOLEAN },
        },
        required: ["panelName", "rationale", "priority"],
      },
    },
    imagingOrders: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          scanType: { type: Type.STRING },
          bodyPart: { type: Type.STRING },
          modality: { type: Type.STRING },
          rationale: { type: Type.STRING },
          priority: { type: Type.STRING },
          contrastRequired: { type: Type.BOOLEAN },
        },
        required: ["scanType", "bodyPart", "modality", "rationale", "priority"],
      },
    },
    referrals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          specialty: { type: Type.STRING },
          reason: { type: Type.STRING },
          urgency: { type: Type.STRING },
          clinicalQuestion: { type: Type.STRING },
        },
        required: ["specialty", "reason", "urgency", "clinicalQuestion"],
      },
    },
    followUps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timeframe: { type: Type.STRING },
          reason: { type: Type.STRING },
          instructions: { type: Type.STRING },
          appointmentType: { type: Type.STRING },
        },
        required: ["timeframe", "reason", "instructions", "appointmentType"],
      },
    },
    clinicalSummary: { type: Type.STRING },
  },
  required: ["prescriptions", "labOrders", "imagingOrders", "referrals", "followUps", "clinicalSummary"],
};

// ─────────────────────────────────────────────────────────────────
//  Main Function
// ─────────────────────────────────────────────────────────────────

function buildOrderPrompt(soapNote: SoapNoteInput, patientContext?: string): string {
  const lines: string[] = [
    "Analyze the following finalized SOAP note and suggest appropriate clinical orders.",
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
  lines.push("Based on this SOAP note, suggest all appropriate clinical orders.");

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

  const systemPrompt =
    options?.locale === "ar"
      ? ORDER_AUTOMATION_SYSTEM_PROMPT + ARABIC_INSTRUCTION
      : ORDER_AUTOMATION_SYSTEM_PROMPT;

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
  };
}

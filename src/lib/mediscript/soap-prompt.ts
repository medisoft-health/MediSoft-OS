import "server-only";
import { Type, type Schema } from "@google/genai";

/**
 * Gemini 2.5 system prompt + responseSchema for SOAP generation.
 *
 * The schema mirrors the SoapNote shape stored in encounters.soap_note,
 * but only includes the fields we want the model to populate. Extra
 * fields the model omits are filled with empty strings server-side.
 */

const SOAP_SYSTEM_PROMPT_EN = `
You are MediScript, a clinical AI scribe trained to convert a doctor-patient
consultation transcript into a structured SOAP note suitable for inclusion
in an electronic medical record.

Core rules:
1. Never invent medical findings. If the transcript does not contain a
   value, leave the corresponding field as an empty string.
2. Use precise clinical language. Avoid colloquialisms in the structured
   output (the raw transcript already preserves them).
3. For diagnoses, list the most likely working diagnosis first. Include
   an ICD-11 code only if you are highly confident; otherwise omit it and
   the downstream WHO validator will fill it in.
4. Keep each field concise. Long narratives belong in
   "historyOfPresentIllness" or "clinicalReasoning"; everything else is
   factual.
5. Saudi context: drug names may be in English or Arabic. Preserve the
   exact medication name the doctor used.
6. Never produce medical advice; produce a clinical record.
7. Return ONLY the JSON object that conforms to the response schema.
   No commentary, no markdown fences, no apology text.
`.trim();

const ARABIC_INSTRUCTION = `\n\nIMPORTANT: Generate ALL output text in Modern Standard Arabic (العربية الفصحى). Use formal medical Arabic terminology consistent with WHO and SFDA standards. Keep internationally recognized abbreviations (ICD-11, SOAP, LOINC, RxNorm, FHIR) in Latin script. Dates should use the Gregorian calendar.`;

export function getSOAPSystemPrompt(locale: string = "en"): string {
  return locale === "ar" ? SOAP_SYSTEM_PROMPT_EN + ARABIC_INSTRUCTION : SOAP_SYSTEM_PROMPT_EN;
}

/** @deprecated Use getSOAPSystemPrompt() instead */
export const SOAP_SYSTEM_PROMPT = SOAP_SYSTEM_PROMPT_EN;

/**
 * Response schema for Gemini structured output. Uses the SDK's `Type`
 * enum (the SDK's typed equivalent to JSON Schema's "string", "object",
 * etc.).
 */
export const SOAP_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    subjective: {
      type: Type.OBJECT,
      properties: {
        chiefComplaint: { type: Type.STRING },
        historyOfPresentIllness: { type: Type.STRING },
        reviewOfSystems: { type: Type.STRING },
        pastMedicalHistory: { type: Type.STRING },
        medications: { type: Type.STRING },
        allergies: { type: Type.STRING },
        socialHistory: { type: Type.STRING },
        familyHistory: { type: Type.STRING },
      },
    },
    objective: {
      type: Type.OBJECT,
      properties: {
        vitalSigns: { type: Type.STRING },
        physicalExamination: { type: Type.STRING },
        diagnosticResults: { type: Type.STRING },
      },
    },
    assessment: {
      type: Type.OBJECT,
      properties: {
        diagnoses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              icdCode: { type: Type.STRING },
              icdDescription: { type: Type.STRING },
            },
            required: ["description"],
          },
        },
        differentialDiagnosis: { type: Type.STRING },
        clinicalReasoning: { type: Type.STRING },
      },
    },
    plan: {
      type: Type.OBJECT,
      properties: {
        diagnosticPlan: { type: Type.STRING },
        therapeuticPlan: { type: Type.STRING },
        patientEducation: { type: Type.STRING },
        followUp: { type: Type.STRING },
      },
    },
  },
  required: ["subjective", "objective", "assessment", "plan"],
};

/**
 * Build the user-facing prompt for a transcript. The transcript text is
 * wrapped in delimiters so the model treats it as data, not an instruction.
 */
export function buildUserPrompt(transcript: string, patientHint?: string): string {
  const lines = [
    "Generate a structured SOAP note from the following consultation transcript.",
  ];
  if (patientHint) {
    lines.push("");
    lines.push(`Patient context: ${patientHint}`);
  }
  lines.push("");
  lines.push("Transcript begins between the triple-tildes.");
  lines.push("~~~");
  lines.push(transcript);
  lines.push("~~~");
  return lines.join("\n");
}

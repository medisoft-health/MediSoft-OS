import type { SoapNote } from "@/db/schema";

/**
 * Shared helpers for working with the SOAP note JSONB shape stored on
 * `encounters.soap_note`. Mirror the type defined in src/db/schema.ts.
 */

/**
 * A fully-empty SOAP note skeleton — used as the initial state for
 * manual review forms when AI generation is unavailable or skipped.
 */
export function emptySoapNote(): SoapNote {
  return {
    subjective: {
      chiefComplaint: "",
      historyOfPresentIllness: "",
      reviewOfSystems: "",
      pastMedicalHistory: "",
      medications: "",
      allergies: "",
      socialHistory: "",
      familyHistory: "",
    },
    objective: {
      vitalSigns: "",
      physicalExamination: "",
      diagnosticResults: "",
    },
    assessment: {
      diagnoses: [],
      differentialDiagnosis: "",
      clinicalReasoning: "",
    },
    plan: {
      diagnosticPlan: "",
      therapeuticPlan: "",
      patientEducation: "",
      followUp: "",
    },
  };
}

/**
 * Returns true when at least one meaningful field is populated. Used to
 * gate the "Save encounter" button — we don't allow empty notes.
 */
export function isSoapNoteNonEmpty(note: SoapNote): boolean {
  const s = note.subjective ?? {};
  const o = note.objective ?? {};
  const a = note.assessment ?? {};
  const p = note.plan ?? {};

  const anyString = [
    s.chiefComplaint,
    s.historyOfPresentIllness,
    s.reviewOfSystems,
    s.pastMedicalHistory,
    s.medications,
    s.allergies,
    s.socialHistory,
    s.familyHistory,
    o.vitalSigns,
    o.physicalExamination,
    o.diagnosticResults,
    a.differentialDiagnosis,
    a.clinicalReasoning,
    p.diagnosticPlan,
    p.therapeuticPlan,
    p.patientEducation,
    p.followUp,
  ].some((v) => typeof v === "string" && v.trim().length > 0);

  const anyDx = Array.isArray(a.diagnoses) && a.diagnoses.length > 0;

  return anyString || anyDx;
}

/**
 * Re-export the SOAP type so consumers don't all reach into @/db/schema.
 */
export type { SoapNote };

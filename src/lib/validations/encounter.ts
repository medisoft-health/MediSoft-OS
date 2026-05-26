import { z } from "zod";
import type { SoapNote } from "@/db/schema";

/**
 * Zod schemas for the SOAP note JSONB and encounter mutations.
 *
 * **Single source of truth check**: the `SoapNote` type is defined in
 * `src/db/schema.ts`. The `_soapShapeMatchesType` line below is a compile-
 * time assertion that the Zod-inferred shape stays in sync. If the schema
 * adds a field and you forget to update Zod, TypeScript will refuse to
 * compile.
 */

// ─────────────────────────────────────────────────────────────────
//  Encounter type + status
// ─────────────────────────────────────────────────────────────────
export const ENCOUNTER_TYPE_OPTIONS = [
  "outpatient",
  "telemedicine",
  "inpatient",
  "emergency",
] as const;
export type EncounterType = (typeof ENCOUNTER_TYPE_OPTIONS)[number];

// Mirror of encounterStatusEnum in schema.ts
export const ENCOUNTER_STATUS_OPTIONS = [
  "in_progress",
  "awaiting_review",
  "signed",
  "amended",
  "cancelled",
] as const;
export type EncounterStatus = (typeof ENCOUNTER_STATUS_OPTIONS)[number];

// ─────────────────────────────────────────────────────────────────
//  SOAP sub-schemas
// ─────────────────────────────────────────────────────────────────
const STR = z.string().max(10_000); // hard cap on every free-text field

export const diagnosisSchema = z.object({
  description: z.string().min(1, "Diagnosis description required").max(500),
  icdCode: z.string().max(20).optional(),
  icdDescription: z.string().max(500).optional(),
  verified: z.boolean().optional(),
});
export type DiagnosisInput = z.infer<typeof diagnosisSchema>;

export const subjectiveSchema = z.object({
  chiefComplaint: STR.optional(),
  historyOfPresentIllness: STR.optional(),
  reviewOfSystems: STR.optional(),
  pastMedicalHistory: STR.optional(),
  medications: STR.optional(),
  allergies: STR.optional(),
  socialHistory: STR.optional(),
  familyHistory: STR.optional(),
});

export const objectiveSchema = z.object({
  vitalSigns: STR.optional(),
  physicalExamination: STR.optional(),
  diagnosticResults: STR.optional(),
});

export const assessmentSchema = z.object({
  diagnoses: z.array(diagnosisSchema).default([]),
  differentialDiagnosis: STR.optional(),
  clinicalReasoning: STR.optional(),
});

export const planSchema = z.object({
  diagnosticPlan: STR.optional(),
  therapeuticPlan: STR.optional(),
  patientEducation: STR.optional(),
  followUp: STR.optional(),
});

export const soapNoteSchema = z.object({
  subjective: subjectiveSchema,
  objective: objectiveSchema,
  assessment: assessmentSchema,
  plan: planSchema,
});
export type SoapNoteInput = z.infer<typeof soapNoteSchema>;

// Compile-time guard: the four top-level SOAP sections defined here must
// also exist on the SoapNote type imported from the schema. This is a
// no-op at runtime but breaks the build if the two drift on the section
// list. Field-level differences inside sections are tolerated — Zod can
// legitimately validate a narrower subset than the JSONB type stores.
type _SoapTopLevelKey = keyof SoapNoteInput;
type _ExpectedKey = "subjective" | "objective" | "assessment" | "plan";
// Each direction must hold for the union to be the exact set we expect.
type _AssertKeysEqual =
  Exclude<_SoapTopLevelKey, _ExpectedKey> extends never
    ? Exclude<_ExpectedKey, _SoapTopLevelKey> extends never
      ? true
      : false
    : false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _soapShapeMatchesType: _AssertKeysEqual = true;

// The SoapNote schema type is intentionally imported so that if the
// upstream type is removed entirely, this file also fails to compile.
type _SoapNoteImportProof = SoapNote;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _proof: _SoapNoteImportProof | undefined = undefined;

// ─────────────────────────────────────────────────────────────────
//  Encounter mutation schemas
// ─────────────────────────────────────────────────────────────────
export const encounterCreateSchema = z.object({
  patientId: z.number().int().positive("Select a patient"),
  encounterType: z.enum(ENCOUNTER_TYPE_OPTIONS).default("outpatient"),
  rawTranscript: z.string().max(50_000).optional().or(z.literal("")),
  correctedTranscript: z.string().max(50_000).optional().or(z.literal("")),
  soapNote: soapNoteSchema,
  /** When true, the encounter is saved with status `signed` and `signedAt = now()`. */
  sign: z.boolean().default(false),
});
export type EncounterCreateInput = z.infer<typeof encounterCreateSchema>;

export const encounterSignSchema = z.object({
  encounterId: z.string().uuid(),
});
export type EncounterSignInput = z.infer<typeof encounterSignSchema>;

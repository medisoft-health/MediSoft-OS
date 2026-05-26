import { z } from "zod";

/**
 * Prescription validation — strictly aligned with the prescriptions
 * table in src/db/schema.ts.
 *
 * Notes:
 *   - `drugName` is the only required field on the DB; the dose/frequency/
 *     route fields are also required at insert time. We mirror that here.
 *   - `interactions` is a JSONB on the DB. The shape below mirrors the
 *     schema's $type<…>() declaration.
 *   - `severity` mirrors the severityEnum (low/moderate/high/critical).
 */

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────
export const PRESCRIPTION_STATUS_OPTIONS = [
  "draft",
  "active",
  "completed",
  "discontinued",
  "cancelled",
] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUS_OPTIONS)[number];

export const SEVERITY_OPTIONS = ["low", "moderate", "high", "critical"] as const;
export type Severity = (typeof SEVERITY_OPTIONS)[number];

// Common ROUTE shorthands (the column is varchar(40); we keep it a free
// string but offer a curated list in the UI).
export const ROUTE_OPTIONS = [
  "oral",
  "sublingual",
  "topical",
  "transdermal",
  "inhalation",
  "intramuscular",
  "intravenous",
  "subcutaneous",
  "rectal",
  "ophthalmic",
  "otic",
  "nasal",
  "vaginal",
  "other",
] as const;
export type Route = (typeof ROUTE_OPTIONS)[number];

// ─────────────────────────────────────────────────────────────────
// Interaction & contraindication shapes (mirror the DB JSONB types)
// ─────────────────────────────────────────────────────────────────
export const interactionSchema = z.object({
  severity: z.enum(SEVERITY_OPTIONS),
  mechanism: z.string().max(2_000).optional(),
  clinicalEffect: z.string().max(2_000).optional(),
  recommendation: z.string().max(2_000).optional(),
  evidenceSource: z.string().max(200).optional(),
  interactingDrug: z.string().max(256).optional(),
});
export type InteractionItem = z.infer<typeof interactionSchema>;

export const insuranceCoverageSchema = z.object({
  covered: z.boolean().optional(),
  tier: z.string().max(40).optional(),
  copayAmount: z.number().nonnegative().optional(),
  priorAuthRequired: z.boolean().optional(),
  alternativeRxcui: z.string().max(40).optional(),
});

// ─────────────────────────────────────────────────────────────────
// Single-drug input (used by the prescription builder)
// ─────────────────────────────────────────────────────────────────
export const prescriptionDrugSchema = z.object({
  drugName: z.string().min(1, "Drug name required").max(256),
  brandName: z.string().max(256).optional().or(z.literal("")),
  rxcui: z.string().max(40).optional().or(z.literal("")),
  atcCode: z.string().max(10).optional().or(z.literal("")),
  dose: z.string().min(1, "Dose required").max(80), // "500 mg"
  frequency: z.string().min(1, "Frequency required").max(80), // "BID", "every 8 hours"
  route: z.string().min(1, "Route required").max(40),
  duration: z.string().max(80).optional().or(z.literal("")),
  instructions: z.string().max(2_000).optional().or(z.literal("")),
  quantity: z.coerce.number().int().positive().optional(),
  refills: z.coerce.number().int().min(0).max(99).default(0),
});
export type PrescriptionDrugInput = z.infer<typeof prescriptionDrugSchema>;

// ─────────────────────────────────────────────────────────────────
// Multi-drug create (one rx per drug; we batch them in the action)
// ─────────────────────────────────────────────────────────────────
export const prescriptionCreateSchema = z.object({
  patientId: z.number().int().positive(),
  encounterId: z.string().uuid().optional().or(z.literal("")),
  drugs: z
    .array(prescriptionDrugSchema)
    .min(1, "Add at least one drug")
    .max(20, "Maximum 20 drugs per prescription"),
  /** When true, marks all drugs as `active`; otherwise saved as `draft`. */
  finalize: z.boolean().default(false),
});
export type PrescriptionCreateInput = z.infer<typeof prescriptionCreateSchema>;

// ─────────────────────────────────────────────────────────────────
// Drug-safety analysis request (used by the API + AI layer)
// ─────────────────────────────────────────────────────────────────
export const drugSafetyAnalysisRequestSchema = z.object({
  drugs: z
    .array(
      z.object({
        drugName: z.string().min(1).max(256),
        rxcui: z.string().max(40).optional(),
      }),
    )
    .min(1, "At least one drug required")
    .max(20),
  patientId: z.number().int().positive().optional(),
});
export type DrugSafetyAnalysisRequest = z.infer<
  typeof drugSafetyAnalysisRequestSchema
>;

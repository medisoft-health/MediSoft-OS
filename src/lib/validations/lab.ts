import { z } from "zod";

/**
 * Lab-result validation schemas — aligned with the labResults table in
 * src/db/schema.ts.
 */

export const LAB_FLAG_OPTIONS = [
  "normal",
  "low",
  "high",
  "critical_low",
  "critical_high",
] as const;
export type LabFlag = (typeof LAB_FLAG_OPTIONS)[number];

export const labResultItemSchema = z.object({
  testName: z.string().min(1, "Test name required").max(200),
  loincCode: z.string().max(20).optional().or(z.literal("")),
  /** Allow numeric or free-text (e.g. "trace", "positive"). */
  value: z.union([z.number(), z.string().min(1, "Value required")]),
  unit: z.string().max(40).optional().or(z.literal("")),
  referenceLow: z.union([z.number(), z.string()]).optional(),
  referenceHigh: z.union([z.number(), z.string()]).optional(),
  flag: z.enum(LAB_FLAG_OPTIONS).optional(),
  interpretation: z.string().max(2_000).optional().or(z.literal("")),
});
export type LabResultItemInput = z.infer<typeof labResultItemSchema>;

export const labCreateSchema = z.object({
  patientId: z.number().int().positive(),
  encounterId: z.string().uuid().optional().or(z.literal("")),
  panelName: z.string().min(1, "Panel name required").max(200),
  panelLoincCode: z.string().max(20).optional().or(z.literal("")),
  /** ISO date string (YYYY-MM-DD) or full ISO datetime. */
  collectionDate: z.string().optional().or(z.literal("")),
  laboratory: z.string().max(200).optional().or(z.literal("")),
  results: z.array(labResultItemSchema).min(1, "Add at least one result"),
});
export type LabCreateInput = z.infer<typeof labCreateSchema>;

// AI narrative request (used by /api/medilab/narrative)
export const labNarrativeRequestSchema = z.object({
  labResultId: z.string().uuid(),
});
export type LabNarrativeRequest = z.infer<typeof labNarrativeRequestSchema>;

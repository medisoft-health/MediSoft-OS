import { z } from "zod";

/**
 * Patient validation schemas — strictly aligned with the actual DB columns
 * in src/db/schema.ts (patients table).
 *
 * Notes:
 * - Schema uses split `firstName/lastName` + Arabic mirrors, not `fullNameEn`.
 * - `saudiId` is the National ID / Iqama (not "nationalId").
 * - Insurance is two flat columns (`insuranceId`, `insuranceProvider`), not JSONB.
 * - `allergies` and `chronicConditions` are JSONB with specific shapes.
 */

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────
export const SEX_OPTIONS = ["male", "female", "other", "unknown"] as const;
export type Sex = (typeof SEX_OPTIONS)[number];

export const BLOOD_TYPE_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
] as const;
export type BloodType = (typeof BLOOD_TYPE_OPTIONS)[number];

export const ALLERGY_SEVERITY = ["mild", "moderate", "severe", "life-threatening"] as const;
export type AllergySeverity = (typeof ALLERGY_SEVERITY)[number];

export const SMOKING_STATUS = ["never", "former", "current"] as const;
export type SmokingStatus = (typeof SMOKING_STATUS)[number];

export const ALCOHOL_STATUS = ["never", "occasional", "regular"] as const;
export type AlcoholStatus = (typeof ALCOHOL_STATUS)[number];

// ─────────────────────────────────────────────────────────────────
// Sub-shapes (mirror the JSONB column types in schema.ts)
// ─────────────────────────────────────────────────────────────────
export const addressSchema = z
  .object({
    line1: z.string().max(200).optional(),
    line2: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    region: z.string().max(120).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(80).optional(),
  })
  .optional();

export const emergencyContactSchema = z
  .object({
    name: z.string().max(200).optional(),
    relationship: z.string().max(80).optional(),
    phone: z.string().max(32).optional(),
  })
  .optional();

export const allergyItemSchema = z.object({
  substance: z.string().min(1, "Allergen name is required").max(200),
  reaction: z.string().max(200).optional(),
  severity: z.enum(ALLERGY_SEVERITY).optional(),
});

export const chronicConditionItemSchema = z.object({
  description: z.string().min(1, "Condition is required").max(200),
  icdCode: z.string().max(20).optional(),
  onsetDate: z.string().optional(), // YYYY-MM-DD
});

// ─────────────────────────────────────────────────────────────────
// Create patient (used by the multi-step form + server action)
// ─────────────────────────────────────────────────────────────────
export const patientCreateSchema = z.object({
  // Demographics
  firstName: z.string().min(1, "First name is required").max(120),
  lastName: z.string().min(1, "Last name is required").max(120),
  firstNameAr: z.string().max(120).optional().or(z.literal("")),
  lastNameAr: z.string().max(120).optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .refine((v) => Date.parse(v) <= Date.now(), "Date of birth cannot be in the future"),
  sex: z.enum(SEX_OPTIONS),
  bloodType: z.enum(BLOOD_TYPE_OPTIONS).default("unknown"),

  // Identity
  saudiId: z
    .string()
    .max(20)
    .optional()
    .or(z.literal("")),
  mrn: z.string().max(40).optional().or(z.literal("")),

  // Contact
  phone: z.string().min(7, "Enter a valid phone number").max(32).optional().or(z.literal("")),
  email: z.string().email("Invalid email").max(320).optional().or(z.literal("")),
  address: addressSchema,
  emergencyContact: emergencyContactSchema,

  // Insurance (flat columns in schema)
  insuranceProvider: z.string().max(120).optional().or(z.literal("")),
  insuranceId: z.string().max(80).optional().or(z.literal("")),

  // Clinical
  allergies: z.array(allergyItemSchema).default([]),
  chronicConditions: z.array(chronicConditionItemSchema).default([]),
  medicalHistory: z.string().max(5000).optional().or(z.literal("")),
  familyHistory: z.string().max(5000).optional().or(z.literal("")),
  socialHistory: z.string().max(5000).optional().or(z.literal("")),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

// ─────────────────────────────────────────────────────────────────
// List filters (used by the patients list page)
// ─────────────────────────────────────────────────────────────────
export const PATIENT_SORT_OPTIONS = [
  "recent", // by updatedAt desc (default)
  "name", // by lastName, firstName asc
  "oldest", // by createdAt asc
] as const;
export type PatientSort = (typeof PATIENT_SORT_OPTIONS)[number];

export const PATIENT_VIEW_OPTIONS = ["grid", "list"] as const;
export type PatientView = (typeof PATIENT_VIEW_OPTIONS)[number];

export const patientListFiltersSchema = z.object({
  q: z.string().optional(),
  sex: z.enum(SEX_OPTIONS).optional(),
  bloodType: z.enum(BLOOD_TYPE_OPTIONS).optional(),
  sort: z.enum(PATIENT_SORT_OPTIONS).default("recent"),
  view: z.enum(PATIENT_VIEW_OPTIONS).default("grid"),
  page: z.coerce.number().int().min(1).default(1),
});
export type PatientListFilters = z.infer<typeof patientListFiltersSchema>;

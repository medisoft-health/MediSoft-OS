import { z } from "zod";

/**
 * Vital signs — validation + clinical reference ranges.
 *
 * Reference ranges follow widely-accepted adult clinical guidelines
 * (AHA 2017 BP, NIH respiratory rate, etc.). They are used for color-coding
 * in the UI (normal / borderline / critical) and surfacing alerts.
 *
 * IMPORTANT: These are screening hints only. They are not pediatric or
 * pregnancy-adjusted and are not a substitute for clinical judgement.
 */

// Decimal fields in DB are returned as strings by drizzle/postgres-js.
// We accept both and coerce to number client-side.
const numOrString = z.union([z.number(), z.string()]).transform((v) => {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
});

export const vitalsCreateSchema = z
  .object({
    bloodPressureSystolic: z
      .number()
      .int()
      .min(60, "Systolic must be ≥ 60 mmHg")
      .max(300, "Systolic must be ≤ 300 mmHg")
      .optional(),
    bloodPressureDiastolic: z
      .number()
      .int()
      .min(30, "Diastolic must be ≥ 30 mmHg")
      .max(200, "Diastolic must be ≤ 200 mmHg")
      .optional(),
    heartRate: z.number().int().min(20).max(250).optional(),
    respiratoryRate: z.number().int().min(5).max(60).optional(),
    temperature: z.number().min(30).max(45).optional(), // °C
    spO2: z.number().int().min(50).max(100).optional(),
    weightKg: z.number().min(0.5).max(500).optional(),
    heightCm: z.number().min(20).max(300).optional(),
    pain: z.number().int().min(0).max(10).optional(),
    notes: z.string().max(2000).optional().or(z.literal("")),
  })
  // Diastolic must be < systolic when both present.
  .refine(
    (v) =>
      v.bloodPressureSystolic == null ||
      v.bloodPressureDiastolic == null ||
      v.bloodPressureDiastolic < v.bloodPressureSystolic,
    {
      message: "Diastolic must be lower than systolic",
      path: ["bloodPressureDiastolic"],
    },
  )
  // At least one measurement must be present.
  .refine(
    (v) =>
      v.bloodPressureSystolic != null ||
      v.bloodPressureDiastolic != null ||
      v.heartRate != null ||
      v.respiratoryRate != null ||
      v.temperature != null ||
      v.spO2 != null ||
      v.weightKg != null ||
      v.heightCm != null ||
      v.pain != null,
    { message: "Record at least one measurement", path: [] },
  );

export type VitalsCreateInput = z.infer<typeof vitalsCreateSchema>;

// ─────────────────────────────────────────────────────────────────
//  Reference ranges & flagging
// ─────────────────────────────────────────────────────────────────
export type VitalFlag = "normal" | "borderline" | "high" | "low" | "critical";

export interface VitalClassification {
  flag: VitalFlag;
  label: string;
}

/**
 * Classify a blood pressure pair using AHA 2017 categories.
 * Returns the worst of systolic and diastolic.
 */
export function classifyBP(
  systolic?: number | null,
  diastolic?: number | null,
): VitalClassification | null {
  if (systolic == null && diastolic == null) return null;
  const s = systolic ?? 0;
  const d = diastolic ?? 0;
  if (s >= 180 || d >= 120)
    return { flag: "critical", label: "Hypertensive crisis" };
  if (s < 90 || d < 60) return { flag: "low", label: "Hypotension" };
  if (s >= 140 || d >= 90) return { flag: "high", label: "Stage 2 hypertension" };
  if (s >= 130 || d >= 80) return { flag: "borderline", label: "Stage 1 hypertension" };
  if (s >= 120) return { flag: "borderline", label: "Elevated" };
  return { flag: "normal", label: "Normal" };
}

export function classifyHR(hr?: number | null): VitalClassification | null {
  if (hr == null) return null;
  if (hr < 40) return { flag: "critical", label: "Severe bradycardia" };
  if (hr > 130) return { flag: "critical", label: "Severe tachycardia" };
  if (hr < 60) return { flag: "low", label: "Bradycardia" };
  if (hr > 100) return { flag: "high", label: "Tachycardia" };
  return { flag: "normal", label: "Normal" };
}

export function classifyTemp(t?: number | null): VitalClassification | null {
  if (t == null) return null;
  if (t < 35) return { flag: "critical", label: "Hypothermia" };
  if (t >= 39.5) return { flag: "critical", label: "Hyperpyrexia" };
  if (t >= 38) return { flag: "high", label: "Fever" };
  if (t >= 37.3) return { flag: "borderline", label: "Low-grade fever" };
  if (t < 36) return { flag: "low", label: "Below normal" };
  return { flag: "normal", label: "Normal" };
}

export function classifySpO2(s?: number | null): VitalClassification | null {
  if (s == null) return null;
  if (s < 90) return { flag: "critical", label: "Severe hypoxia" };
  if (s < 95) return { flag: "low", label: "Mild hypoxia" };
  return { flag: "normal", label: "Normal" };
}

export function classifyRR(rr?: number | null): VitalClassification | null {
  if (rr == null) return null;
  if (rr < 8) return { flag: "critical", label: "Severe bradypnea" };
  if (rr > 30) return { flag: "critical", label: "Severe tachypnea" };
  if (rr < 12) return { flag: "low", label: "Bradypnea" };
  if (rr > 20) return { flag: "high", label: "Tachypnea" };
  return { flag: "normal", label: "Normal" };
}

export function classifyBMI(bmi?: number | null): VitalClassification | null {
  if (bmi == null) return null;
  if (bmi < 16) return { flag: "critical", label: "Severely underweight" };
  if (bmi < 18.5) return { flag: "low", label: "Underweight" };
  if (bmi >= 35) return { flag: "critical", label: "Severely obese" };
  if (bmi >= 30) return { flag: "high", label: "Obese" };
  if (bmi >= 25) return { flag: "borderline", label: "Overweight" };
  return { flag: "normal", label: "Healthy" };
}

export function classifyPain(p?: number | null): VitalClassification | null {
  if (p == null) return null;
  if (p >= 7) return { flag: "critical", label: "Severe" };
  if (p >= 4) return { flag: "high", label: "Moderate" };
  if (p >= 1) return { flag: "low", label: "Mild" };
  return { flag: "normal", label: "None" };
}

/** BMI = weight (kg) / height (m)². Rounded to 1 decimal. */
export function computeBMI(weightKg?: number | null, heightCm?: number | null) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  const v = weightKg / (m * m);
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 10) / 10;
}

/**
 * Helper to coerce drizzle's `decimal` columns (returned as strings) into
 * numbers for client-side use.
 */
export function toNumber(
  v: number | string | null | undefined,
): number | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed.length === 0) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return Number.isFinite(v) ? v : null;
}

export { numOrString };

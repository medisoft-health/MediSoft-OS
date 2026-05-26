import { findBiomarkerByName, pickRange, type Sex } from "./biomarkers";

/**
 * Classify a single lab result against curated reference ranges.
 *
 * The classification mirrors the schema's flag enum:
 *   normal | low | high | critical_low | critical_high
 *
 * When the value is non-numeric (e.g. "trace", "positive"), or the
 * biomarker is not in our library, we return null — the UI then shows
 * the raw value without a band/flag.
 */
export type LabFlag = "normal" | "low" | "high" | "critical_low" | "critical_high";

export interface ClassificationOptions {
  testName: string;
  value: number | string;
  /** Optional explicit override range supplied by the user / lab report. */
  referenceLow?: number | string;
  referenceHigh?: number | string;
  /** Patient context for sex/age-specific ranges. */
  sex?: Sex;
  age?: number;
}

export interface Classification {
  flag: LabFlag | null;
  /** The numeric value extracted from input (NaN-safe). */
  numericValue: number | null;
  /** The reference range used, if any. */
  low: number | null;
  high: number | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  /** Where to render on a 0..1 band scale (clipped). */
  bandPosition: number | null;
}

function toNum(v: number | string | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const trimmed = v.toString().replace(/,/g, "").trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function classifyResult(opts: ClassificationOptions): Classification {
  const value = toNum(opts.value);
  if (value == null) {
    return {
      flag: null,
      numericValue: null,
      low: null,
      high: null,
      criticalLow: null,
      criticalHigh: null,
      bandPosition: null,
    };
  }

  // Override ranges take priority — that's what the printed lab said.
  const overrideLow = toNum(opts.referenceLow);
  const overrideHigh = toNum(opts.referenceHigh);

  let low: number | null = overrideLow;
  let high: number | null = overrideHigh;
  let critLow: number | null = null;
  let critHigh: number | null = null;

  if (low == null || high == null) {
    const spec = findBiomarkerByName(opts.testName);
    if (spec) {
      const r = pickRange(spec, opts.sex, opts.age);
      if (r) {
        if (low == null) low = r.low;
        if (high == null) high = r.high;
        critLow = r.criticalLow ?? null;
        critHigh = r.criticalHigh ?? null;
      }
    }
  }

  if (low == null || high == null) {
    return {
      flag: null,
      numericValue: value,
      low,
      high,
      criticalLow: critLow,
      criticalHigh: critHigh,
      bandPosition: null,
    };
  }

  let flag: LabFlag = "normal";
  if (critLow != null && value <= critLow) flag = "critical_low";
  else if (critHigh != null && value >= critHigh) flag = "critical_high";
  else if (value < low) flag = "low";
  else if (value > high) flag = "high";

  // Band position: 0 at low, 1 at high, clipped to [-0.2, 1.2] for display.
  const span = high - low;
  const raw = span > 0 ? (value - low) / span : 0.5;
  const bandPosition = Math.max(-0.2, Math.min(1.2, raw));

  return {
    flag,
    numericValue: value,
    low,
    high,
    criticalLow: critLow,
    criticalHigh: critHigh,
    bandPosition,
  };
}

/** Convenience: rank a flag for "highest severity" rolls. */
export const FLAG_SEVERITY: Record<LabFlag, number> = {
  normal: 0,
  low: 1,
  high: 1,
  critical_low: 2,
  critical_high: 2,
};

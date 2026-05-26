/**
 * Lab trend analysis — computes % change, direction, and sparkline
 * data for each biomarker across a patient's lab history.
 */

import type { PatientFullContext } from "@/lib/queries/patient-context";

export type TrendDirection = "improving" | "worsening" | "stable" | "new";

export interface BiomarkerTrend {
  testName: string;
  unit: string;
  /** All historical values, oldest first. */
  history: Array<{
    date: Date;
    value: number;
    flag?: string;
  }>;
  /** Current (most recent) value. */
  current: number;
  /** Previous value (second most recent), null if only one reading. */
  previous: number | null;
  /** Percent change from previous to current. Null if no previous. */
  percentChange: number | null;
  /** Clinical direction based on whether value is moving toward/away from normal. */
  direction: TrendDirection;
  /** Text summary for the AI prompt. */
  summary: string;
}

/**
 * Extract per-biomarker trends from the patient's full lab history.
 *
 * Groups all results by test name (case-insensitive), sorts chronologically,
 * and computes the change metrics.
 */
export function computeLabTrends(
  labHistory: PatientFullContext["labHistory"],
  currentResults: Array<{
    testName: string;
    value: number | string;
    unit?: string;
    referenceLow?: number | string;
    referenceHigh?: number | string;
    flag?: string;
  }>,
): BiomarkerTrend[] {
  // Build a map of all historical values per test name
  const historyMap = new Map<
    string,
    Array<{ date: Date; value: number; flag?: string; unit: string }>
  >();

  for (const panel of labHistory) {
    for (const r of panel.results) {
      const key = r.testName.toLowerCase().trim();
      const num = toNum(r.value);
      if (num === null) continue;

      if (!historyMap.has(key)) historyMap.set(key, []);
      historyMap.get(key)!.push({
        date: panel.resultDate,
        value: num,
        flag: r.flag,
        unit: String(r.unit ?? ""),
      });
    }
  }

  // Sort each test's history chronologically
  for (const [, arr] of historyMap) {
    arr.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Build trends for each current result
  const trends: BiomarkerTrend[] = [];

  for (const r of currentResults) {
    const key = r.testName.toLowerCase().trim();
    const currentNum = toNum(r.value);
    if (currentNum === null) continue;

    const history = historyMap.get(key) ?? [];
    // Exclude the current result if it's already in history (same date)
    const priorHistory = history.filter(
      (h) => Math.abs(h.value - currentNum) > 0.001 || history.length <= 1,
    );

    const previous =
      priorHistory.length > 0
        ? priorHistory[priorHistory.length - 1].value
        : null;

    const percentChange =
      previous !== null && previous !== 0
        ? Math.round(((currentNum - previous) / Math.abs(previous)) * 1000) / 10
        : null;

    const refLow = toNum(r.referenceLow);
    const refHigh = toNum(r.referenceHigh);

    const direction = computeDirection(
      currentNum,
      previous,
      refLow,
      refHigh,
    );

    const summary = buildSummary(
      r.testName,
      currentNum,
      previous,
      percentChange,
      direction,
      String(r.unit ?? ""),
      history.length,
    );

    trends.push({
      testName: r.testName,
      unit: String(r.unit ?? ""),
      history: history.map((h) => ({
        date: h.date,
        value: h.value,
        flag: h.flag,
      })),
      current: currentNum,
      previous,
      percentChange,
      direction,
      summary,
    });
  }

  return trends;
}

function computeDirection(
  current: number,
  previous: number | null,
  refLow: number | null,
  refHigh: number | null,
): TrendDirection {
  if (previous === null) return "new";

  const diff = Math.abs(current - previous);
  const threshold = Math.abs(previous) * 0.02; // 2% change threshold for "stable"
  if (diff <= threshold) return "stable";

  // If we have a reference range, determine if the change is toward or away from normal
  if (refLow !== null && refHigh !== null) {
    const midpoint = (refLow + refHigh) / 2;
    const prevDistance = Math.abs(previous - midpoint);
    const currDistance = Math.abs(current - midpoint);

    if (currDistance < prevDistance) return "improving";
    if (currDistance > prevDistance) return "worsening";
    return "stable";
  }

  // Without reference range, we can't determine clinical direction
  return current > previous ? "worsening" : "improving";
}

function buildSummary(
  name: string,
  current: number,
  previous: number | null,
  pctChange: number | null,
  direction: TrendDirection,
  unit: string,
  historyCount: number,
): string {
  if (previous === null) {
    return `${name}: ${current} ${unit} (first reading)`;
  }

  const arrow =
    direction === "improving"
      ? "↗ improving"
      : direction === "worsening"
        ? "↘ worsening"
        : direction === "stable"
          ? "→ stable"
          : "new";

  const pct =
    pctChange !== null
      ? ` (${pctChange > 0 ? "+" : ""}${pctChange}%)`
      : "";

  return `${name}: ${previous} → ${current} ${unit}${pct} ${arrow} | ${historyCount} prior readings`;
}

function toNum(v: number | string | undefined | null): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const trimmed = String(v).replace(/,/g, "").trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

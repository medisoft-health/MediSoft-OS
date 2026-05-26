"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { LabFlag } from "@/lib/validations/lab";

interface Props {
  value: number;
  low: number;
  high: number;
  criticalLow?: number | null;
  criticalHigh?: number | null;
  unit?: string;
  flag?: LabFlag | null;
  /** Width in pixels of the dot position marker. */
  height?: number;
}

const flagDot: Record<LabFlag, string> = {
  normal: "bg-emerald-500",
  low: "bg-sky-500",
  high: "bg-orange-500",
  critical_low: "bg-rose-600",
  critical_high: "bg-rose-600",
};

/**
 * Horizontal "range bar" infographic. Shows where a result sits between
 * reference low and reference high, with the critical zones tinted on the
 * sides. Inline-sizeable; print-stylesheet friendly.
 */
export function ResultRangeBar({
  value,
  low,
  high,
  criticalLow,
  criticalHigh,
  unit,
  flag,
  height = 12,
}: Props) {
  if (!(Number.isFinite(value) && Number.isFinite(low) && Number.isFinite(high) && high > low)) {
    return (
      <div className="text-xs text-[color:var(--color-muted-foreground)]">
        <strong className="text-[color:var(--color-foreground)] tabular-nums">{value}</strong>
        {unit ? ` ${unit}` : ""}
      </div>
    );
  }

  // Build the visual scale. We extend 20% beyond ref-low and ref-high so
  // values outside the band still render in-frame.
  const span = high - low;
  const scaleMin = low - span * 0.2;
  const scaleMax = high + span * 0.2;
  const scaleSpan = scaleMax - scaleMin;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - scaleMin) / scaleSpan) * 100));

  const lowPct = pct(low);
  const highPct = pct(high);
  const valuePct = pct(value);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <div className="flex items-baseline gap-2">
          <strong className="text-base font-black tabular-nums">{value}</strong>
          {unit && <span className="text-[color:var(--color-muted-foreground)]">{unit}</span>}
        </div>
        <div className="text-[10px] text-[color:var(--color-muted-foreground)] tabular-nums">
          Ref [{low}–{high}]
        </div>
      </div>
      <div
        className="relative w-full overflow-hidden rounded-full bg-[color:var(--color-muted)]"
        style={{ height }}
        aria-hidden
      >
        {/* Critical zones (left & right edges) */}
        {criticalLow != null && (
          <div
            className="absolute inset-y-0 left-0 bg-rose-200/60"
            style={{ width: `${pct(criticalLow)}%` }}
          />
        )}
        {criticalHigh != null && (
          <div
            className="absolute inset-y-0 right-0 bg-rose-200/60"
            style={{ width: `${100 - pct(criticalHigh)}%` }}
          />
        )}
        {/* Reference (normal) zone */}
        <div
          className="absolute inset-y-0 bg-emerald-300/50"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />
        {/* Value marker */}
        <div
          className={cn(
            "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow",
            flag ? flagDot[flag] : "bg-slate-700",
          )}
          style={{ left: `${valuePct}%` }}
          title={`${value}${unit ? " " + unit : ""}`}
        />
      </div>
    </div>
  );
}

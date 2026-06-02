"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Patient Infographic — Converts complex lab results into
 * easy-to-understand visual representations using traffic-light
 * color coding and simple graphics.
 *
 * Designed for the Patient Portal to make medical data accessible.
 */

type ResultLevel = "low" | "normal" | "borderline" | "high" | "critical";

interface LabResultVisualProps {
  name: string;
  nameAr?: string;
  value: number;
  unit: string;
  normalRange: [number, number];
  borderlineRange?: [number, number];
  criticalRange?: [number, number];
  previousValue?: number;
  date?: string;
  description?: string;
  descriptionAr?: string;
}

const levelColors: Record<ResultLevel, { bg: string; text: string; bar: string }> = {
  low: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    bar: "bg-blue-500",
  },
  normal: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  borderline: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  high: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    bar: "bg-red-500",
  },
};

const levelLabels: Record<ResultLevel, { en: string; ar: string }> = {
  low: { en: "Below Normal", ar: "أقل من الطبيعي" },
  normal: { en: "Normal", ar: "طبيعي" },
  borderline: { en: "Borderline", ar: "على الحد" },
  high: { en: "Above Normal", ar: "أعلى من الطبيعي" },
  critical: { en: "Critical", ar: "حرج" },
};

function getLevel(
  value: number,
  normalRange: [number, number],
  borderlineRange?: [number, number],
  criticalRange?: [number, number]
): ResultLevel {
  if (criticalRange && (value < criticalRange[0] || value > criticalRange[1]))
    return "critical";
  if (value >= normalRange[0] && value <= normalRange[1]) return "normal";
  if (borderlineRange) {
    if (value >= borderlineRange[0] && value <= borderlineRange[1])
      return "borderline";
  }
  if (value < normalRange[0]) return "low";
  return "high";
}

export function LabResultVisual({
  name,
  nameAr,
  value,
  unit,
  normalRange,
  borderlineRange,
  criticalRange,
  previousValue,
  date,
  description,
  descriptionAr,
}: LabResultVisualProps) {
  const level = getLevel(value, normalRange, borderlineRange, criticalRange);
  const colors = levelColors[level];
  const labels = levelLabels[level];

  // Calculate position on the range bar (0-100%)
  const rangeMin = criticalRange?.[0] ?? normalRange[0] * 0.5;
  const rangeMax = criticalRange?.[1] ?? normalRange[1] * 1.5;
  const position = Math.min(
    100,
    Math.max(0, ((value - rangeMin) / (rangeMax - rangeMin)) * 100)
  );

  const change = previousValue
    ? ((value - previousValue) / previousValue) * 100
    : null;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5",
        colors.bg,
        "border-slate-200 dark:border-slate-700"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {name}
          </h3>
          {nameAr && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {nameAr}
            </p>
          )}
        </div>
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-bold",
            colors.bg,
            colors.text
          )}
        >
          {labels.en}
        </span>
      </div>

      {/* Value Display */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">
          {value}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {unit}
        </span>
        {change !== null && (
          <span
            className={cn(
              "text-xs font-medium ms-2 px-1.5 py-0.5 rounded",
              change > 0
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : change < 0
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-slate-100 text-slate-500"
            )}
          >
            {change > 0 ? "↑" : change < 0 ? "↓" : "→"}{" "}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Range Bar (Traffic Light) */}
      <div className="relative h-3 rounded-full bg-gradient-to-r from-blue-300 via-emerald-400 via-50% via-amber-400 to-red-400 overflow-hidden mb-2">
        {/* Normal range indicator */}
        <div
          className="absolute top-0 h-full bg-emerald-400/40 border-x-2 border-emerald-600"
          style={{
            left: `${((normalRange[0] - rangeMin) / (rangeMax - rangeMin)) * 100}%`,
            width: `${((normalRange[1] - normalRange[0]) / (rangeMax - rangeMin)) * 100}%`,
          }}
        />
        {/* Current value marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full bg-white border-2 border-slate-900 dark:border-white shadow-md transition-all duration-500"
          style={{ left: `calc(${position}% - 8px)` }}
        />
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-[10px] text-slate-400 mb-3">
        <span>Low</span>
        <span className="text-emerald-600 font-medium">
          Normal ({normalRange[0]}-{normalRange[1]})
        </span>
        <span>High</span>
      </div>

      {/* Description for patient */}
      {description && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>
          {descriptionAr && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed" dir="rtl">
              {descriptionAr}
            </p>
          )}
        </div>
      )}

      {/* Date */}
      {date && (
        <div className="mt-2 text-[10px] text-slate-400">{date}</div>
      )}
    </div>
  );
}

/**
 * Health Summary Card — Overall health status for patient portal
 * with glassmorphism design.
 */
interface HealthSummaryProps {
  patientName: string;
  overallStatus: "excellent" | "good" | "attention" | "urgent";
  metrics: {
    label: string;
    value: string;
    status: ResultLevel;
  }[];
  lastVisit?: string;
  nextAppointment?: string;
}

const overallStatusConfig = {
  excellent: {
    label: "Excellent",
    labelAr: "ممتاز",
    color: "text-emerald-600",
    bg: "from-emerald-500/10 to-emerald-500/5",
    ring: "ring-emerald-500/20",
  },
  good: {
    label: "Good",
    labelAr: "جيد",
    color: "text-blue-600",
    bg: "from-blue-500/10 to-blue-500/5",
    ring: "ring-blue-500/20",
  },
  attention: {
    label: "Needs Attention",
    labelAr: "يحتاج متابعة",
    color: "text-amber-600",
    bg: "from-amber-500/10 to-amber-500/5",
    ring: "ring-amber-500/20",
  },
  urgent: {
    label: "Urgent",
    labelAr: "عاجل",
    color: "text-red-600",
    bg: "from-red-500/10 to-red-500/5",
    ring: "ring-red-500/20",
  },
};

export function HealthSummaryCard({
  patientName,
  overallStatus,
  metrics,
  lastVisit,
  nextAppointment,
}: HealthSummaryProps) {
  const config = overallStatusConfig[overallStatus];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl p-6",
        "bg-gradient-to-br",
        config.bg,
        "backdrop-blur-xl border border-white/20 dark:border-white/10",
        "shadow-xl ring-1",
        config.ring
      )}
    >
      {/* Glassmorphism decorative circles */}
      <div className="absolute -top-12 -end-12 size-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 -start-8 size-24 rounded-full bg-white/10 blur-xl" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Health Overview
            </p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {patientName}
            </h2>
          </div>
          <div
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-bold",
              config.color,
              "bg-white/60 dark:bg-white/10 backdrop-blur-sm"
            )}
          >
            {config.label}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {metrics.map((metric, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm p-3 border border-white/30 dark:border-white/10"
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {metric.label}
              </p>
              <p
                className={cn(
                  "text-lg font-bold mt-0.5",
                  levelColors[metric.status].text
                )}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {/* Appointments */}
        {(lastVisit || nextAppointment) && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-white/20">
            {lastVisit && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">Last Visit:</span> {lastVisit}
              </div>
            )}
            {nextAppointment && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">Next:</span> {nextAppointment}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Privacy assurance */}
      <div className="relative z-10 mt-4 flex items-center gap-1.5 text-[10px] text-slate-400">
        <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>Your data is encrypted and HIPAA compliant</span>
      </div>
    </div>
  );
}

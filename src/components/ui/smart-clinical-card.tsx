"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Pill,
  Activity,
} from "lucide-react";

/**
 * Smart Clinical Card — Interactive medical information cards with
 * hover tooltips, trend indicators, and context-aware styling.
 *
 * Features:
 * - Hover to reveal drug interactions (PharmaX)
 * - Click to expand historical chart (MediLab)
 * - Color-coded status (normal/warning/critical)
 * - Micro-animations for state changes
 */

type CardStatus = "normal" | "warning" | "critical" | "info";
type TrendDirection = "up" | "down" | "stable" | "none";

export interface SmartClinicalCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  status?: CardStatus;
  priority?: CardStatus;
  trend?: TrendDirection;
  trendValue?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  interactions?: string[];
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const statusStyles: Record<CardStatus, string> = {
  normal:
    "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30",
  warning:
    "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
  critical:
    "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30 animate-pulse-subtle",
  info: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
};

const statusDotStyles: Record<CardStatus, string> = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500 animate-ping-slow",
  info: "bg-blue-500",
};

const trendIcons: Record<TrendDirection, React.ReactNode> = {
  up: <TrendingUp className="size-3.5" />,
  down: <TrendingDown className="size-3.5" />,
  stable: <Minus className="size-3.5" />,
  none: null,
};

export function SmartClinicalCard({
  title,
  value,
  unit,
  subtitle,
  status,
  priority,
  trend = "none",
  trendValue,
  icon,
  tooltip,
  interactions,
  onClick,
  className,
  children,
}: SmartClinicalCardProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [showInteractions, setShowInteractions] = React.useState(false);
  const resolvedStatus = status ?? priority ?? "info";

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4 transition-all duration-300",
        "hover:shadow-md hover:-translate-y-0.5",
        "cursor-pointer select-none",
        statusStyles[resolvedStatus],
        className
      )}
      onClick={onClick}
      onMouseEnter={() => {
        setShowTooltip(true);
        if (interactions?.length) setShowInteractions(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
        setShowInteractions(false);
      }}
    >
      {/* Status indicator dot */}
      <div className="absolute top-3 end-3 flex items-center gap-1.5">
        <div className={cn("size-2 rounded-full", statusDotStyles[resolvedStatus])} />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <div className="text-[color:var(--color-muted-foreground)] group-hover:text-[color:var(--color-foreground)] transition-colors">
            {icon}
          </div>
        )}
        <span className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          {title}
        </span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black tabular-nums tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-[color:var(--color-muted-foreground)]">
            {unit}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
          {subtitle}
        </p>
      )}

      {/* Trend */}
      {trend !== "none" && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            trend === "up" && resolvedStatus === "critical"
              ? "text-red-600 dark:text-red-400"
              : trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : trend === "down" && resolvedStatus === "critical"
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
          )}
        >
          {trendIcons[trend]}
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}

      {/* Children (expandable content) */}
      {children && <div className="mt-3 border-t pt-3">{children}</div>}

      {/* Tooltip on hover */}
      {showTooltip && tooltip && (
        <div className="absolute -top-12 start-1/2 -translate-x-1/2 z-50 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap animate-fade-in">
          {tooltip}
          <div className="absolute -bottom-1 start-1/2 -translate-x-1/2 size-2 rotate-45 bg-slate-900" />
        </div>
      )}

      {/* Drug Interactions Popup (for PharmaX) */}
      {showInteractions && interactions && interactions.length > 0 && (
        <div className="absolute top-full start-0 z-50 mt-2 w-72 rounded-xl border border-red-200 bg-white p-4 shadow-xl animate-fade-in dark:border-red-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-red-500" />
            <span className="text-sm font-bold text-red-700 dark:text-red-400">
              Drug Interactions
            </span>
          </div>
          <ul className="space-y-1.5">
            {interactions.map((interaction, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
              >
                <Pill className="size-3 mt-0.5 shrink-0 text-red-400" />
                {interaction}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Smart Clinical Card Grid — Responsive grid for clinical cards
 * that adapts based on the clinical context.
 */
interface SmartCardGridProps {
  children: React.ReactNode;
  context?: "default" | "emergency" | "routine" | "sport";
  className?: string;
}

export function SmartCardGrid({
  children,
  context = "default",
  className,
}: SmartCardGridProps) {
  const gridCols = {
    default: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    emergency: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2", // Larger cards for emergency
    routine: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    sport: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", // More compact for metrics
  };

  return (
    <div className={cn("grid gap-4", gridCols[context], className)}>
      {children}
    </div>
  );
}

/**
 * Vital Sign Card — Specialized card for vital signs with
 * traffic-light color coding and sparkline trend.
 */
interface VitalCardProps {
  label: string;
  value: number;
  unit: string;
  normalRange: [number, number];
  warningRange?: [number, number];
  history?: number[];
}

export function VitalCard({
  label,
  value,
  unit,
  normalRange,
  warningRange,
  history,
}: VitalCardProps) {
  const getStatus = (): CardStatus => {
    if (value >= normalRange[0] && value <= normalRange[1]) return "normal";
    if (
      warningRange &&
      value >= warningRange[0] &&
      value <= warningRange[1]
    )
      return "warning";
    return "critical";
  };

  const status = getStatus();

  return (
    <SmartClinicalCard
      title={label}
      value={value}
      unit={unit}
      status={status}
      icon={<Activity className="size-4" />}
      tooltip={`Normal range: ${normalRange[0]}-${normalRange[1]} ${unit}`}
    >
      {history && history.length > 1 && (
        <MiniSparkline data={history} status={status} />
      )}
    </SmartClinicalCard>
  );
}

/**
 * Mini Sparkline — Tiny inline chart for trend visualization.
 */
function MiniSparkline({
  data,
  status,
}: {
  data: number[];
  status: CardStatus;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 100;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");

  const lineColor =
    status === "normal"
      ? "#10b981"
      : status === "warning"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <svg
      width={width}
      height={height}
      className="w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

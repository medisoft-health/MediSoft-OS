"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  useAdaptiveContext,
  type ClinicalContext,
} from "./adaptive-context";
import {
  Zap,
  Stethoscope,
  Dumbbell,
  ScanLine,
  LayoutGrid,
} from "lucide-react";

/**
 * Context Switcher — Allows physicians to switch the interface context
 * to adapt the UI layout for different clinical scenarios.
 */

const contexts: {
  id: ClinicalContext;
  label: string;
  labelAr: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "default",
    label: "Standard",
    labelAr: "عادي",
    icon: <LayoutGrid className="size-4" />,
    description: "Balanced view for general use",
  },
  {
    id: "emergency",
    label: "Emergency",
    labelAr: "طوارئ",
    icon: <Zap className="size-4" />,
    description: "Critical vitals, allergies, and medications highlighted",
  },
  {
    id: "routine",
    label: "Clinic",
    labelAr: "عيادة",
    icon: <Stethoscope className="size-4" />,
    description: "Timeline, past labs, and disease progression",
  },
  {
    id: "sport",
    label: "Sport",
    labelAr: "رياضي",
    icon: <Dumbbell className="size-4" />,
    description: "Performance metrics and body composition",
  },
  {
    id: "radiology",
    label: "Radiology",
    labelAr: "أشعة",
    icon: <ScanLine className="size-4" />,
    description: "Dark mode optimized for medical imaging",
  },
];

export function ContextSwitcher({ className }: { className?: string }) {
  const { context, setContext } = useAdaptiveContext();

  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800", className)}>
      {contexts.map((ctx) => (
        <button
          type="button"
          key={ctx.id}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContext(ctx.id); }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            context === ctx.id
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
          title={ctx.description}
        >
          {ctx.icon}
          <span className="hidden sm:inline">{ctx.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Compact Context Indicator — Shows current context as a small badge
 * in the header area.
 */
export function ContextBadge({ className }: { className?: string }) {
  const { context } = useAdaptiveContext();
  const current = contexts.find((c) => c.id === context);

  if (!current || context === "default") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        context === "emergency" &&
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse-subtle",
        context === "routine" &&
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        context === "sport" &&
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        context === "radiology" &&
          "bg-slate-800 text-slate-200 dark:bg-slate-700 dark:text-slate-300",
        className
      )}
    >
      {current.icon}
      <span>{current.label}</span>
    </div>
  );
}

"use client";

import * as React from "react";
import { Sparkles, Stethoscope, Users as UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  physicianReport: string | null;
  patientSummary: string | null;
  impression?: string | null;
  recommendations?: string | null;
  defaultAudience?: "physician" | "patient";
}

/**
 * Dual-audience narrative card for the scan detail page.
 *
 * Unlike MediLab, we don't regenerate from this card — the scan's AI
 * report is fixed at save time. If a doctor wants a fresh interpretation,
 * they upload again via /mediscan/new (with the same patient).
 */
export function ScanNarrativePanel({
  physicianReport,
  patientSummary,
  impression,
  recommendations,
  defaultAudience = "physician",
}: Props) {
  const [audience, setAudience] = React.useState<"physician" | "patient">(
    defaultAudience,
  );

  if (!physicianReport && !patientSummary) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-[color:var(--color-brand-magenta)]" />
            AI report
          </CardTitle>
          <div
            role="tablist"
            aria-label="Narrative audience"
            className="inline-flex overflow-hidden rounded-lg border border-[color:var(--color-border)]"
          >
            <button
              role="tab"
              aria-selected={audience === "physician"}
              onClick={() => setAudience("physician")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                audience === "physician"
                  ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                  : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
              )}
            >
              <Stethoscope className="size-3.5" /> Physician
            </button>
            <button
              role="tab"
              aria-selected={audience === "patient"}
              onClick={() => setAudience("patient")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                audience === "patient"
                  ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                  : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
              )}
            >
              <UsersIcon className="size-3.5" /> Patient
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {audience === "physician"
            ? physicianReport ?? "No physician report stored."
            : patientSummary ?? "No patient summary stored."}
        </p>

        {audience === "physician" && (impression || recommendations) && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {impression && (
              <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Impression
                </div>
                <p className="mt-1 text-xs leading-relaxed">{impression}</p>
              </div>
            )}
            {recommendations && (
              <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Recommendations
                </div>
                <p className="mt-1 text-xs leading-relaxed">{recommendations}</p>
              </div>
            )}
          </div>
        )}

        {audience === "patient" && (
          <p className="text-[11px] italic text-[color:var(--color-muted-foreground)]">
            Generated for educational support. Does not replace clinical advice
            — please discuss with your doctor.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

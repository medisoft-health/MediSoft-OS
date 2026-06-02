"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DrugSafetyResult } from "@/lib/ai/pharmax-analyzer";
import type { Severity } from "@/lib/validations/prescription";

const severityCls: Record<Severity, string> = {
  low: "text-sky-700 bg-sky-50 border-sky-200",
  moderate: "text-amber-700 bg-amber-50 border-amber-200",
  high: "text-orange-700 bg-orange-50 border-orange-200",
  critical: "text-rose-700 bg-rose-100 border-rose-300",
};

const severityBadge: Record<
  Severity,
  "info" | "warning" | "destructive" | "critical"
> = {
  low: "info",
  moderate: "warning",
  high: "destructive",
  critical: "critical",
};

interface Props {
  loading: boolean;
  /** null = no analysis yet (e.g. zero drugs). */
  result: DrugSafetyResult | null;
  /** Optional error string from the last failed analysis attempt. */
  error?: string | null;
}

export function SafetyPanel({ loading, result, error }: Props) {
  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-[color:var(--color-brand-magenta)]" />
            Safety
          </CardTitle>
          {result && (
            <SeverityHeadline severity={result.highestSeverity} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Analysis error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !result && (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            Add a drug to see RxNorm normalization, FDA-label warnings, and
            AI-summarised interactions here.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Analysing…
          </div>
        )}

        {result && (
          <>
            {/* AI summary */}
            {result.aiSummary ? (
              <Alert variant="info">
                <Sparkles />
                <AlertTitle>PharmaX AI summary</AlertTitle>
                <AlertDescription>{result.aiSummary}</AlertDescription>
              </Alert>
            ) : result.meta.geminiUsed ? null : (
              <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                Medical Intelligence clinical narrative is not enabled. Contact your administrator to enable
                <code className="mx-1 rounded bg-[color:var(--color-muted)] px-1 py-0.5">
                  GOOGLE_GEMINI_API_KEY
                </code>
                to add a free-text summary.
              </p>
            )}

            {/* Interactions */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Interactions &amp; warnings ({result.interactions.length})
              </div>
              {result.interactions.length === 0 ? (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle2 className="size-4" />
                  No interactions surfaced in the evidence at hand.
                </div>
              ) : (
                <ul className="mt-2 space-y-2">
                  {result.interactions.map((it, i) => (
                    <li
                      key={i}
                      className={cn("rounded-lg border p-3", severityCls[it.severity])}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={severityBadge[it.severity]} className="text-[10px]">
                          {it.severity}
                        </Badge>
                        <span className="text-[10px] opacity-70">
                          {it.evidenceSource ?? "Evidence"}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-semibold">
                        {it.interactingDrug}
                      </div>
                      {it.mechanism && (
                        <p className="mt-1 text-xs leading-relaxed opacity-90">
                          {it.mechanism}
                        </p>
                      )}
                      {it.recommendation && (
                        <p className="mt-2 text-[11px] italic opacity-80">
                          → {it.recommendation}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            {/* Per-drug evidence */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Per-drug evidence
              </div>
              <ul className="mt-2 space-y-2">
                {result.perDrug.map((d) => (
                  <li
                    key={`${d.drugName}-${d.rxcui ?? "free"}`}
                    className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{d.drugName}</div>
                      {d.rxcui ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          RxCUI {d.rxcui}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Free text
                        </Badge>
                      )}
                    </div>
                    <ul className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] text-[color:var(--color-muted-foreground)]">
                      <li>
                        FDA label:{" "}
                        {d.fdaLabelAvailable ? (
                          <span className="font-semibold text-emerald-700">
                            available
                          </span>
                        ) : (
                          <span>not found</span>
                        )}
                      </li>
                      <li>Warnings: {d.warningsCount}</li>
                      <li>Contraindications: {d.contraindicationsCount}</li>
                      <li>
                        Boxed warning:{" "}
                        {d.boxedWarning ? (
                          <span className="font-semibold text-rose-700">yes</span>
                        ) : (
                          "none"
                        )}
                      </li>
                    </ul>
                    {/* SFDA */}
                    <div className="mt-2 flex items-start gap-1.5 text-[11px]">
                      <Globe className="mt-0.5 size-3 text-[color:var(--color-muted-foreground)]" />
                      <span className="text-[color:var(--color-muted-foreground)]">
                        SFDA:{" "}
                        {d.sfda.kind === "ok"
                          ? `${d.sfda.saudiName} (${d.sfda.sfdaCode})`
                          : d.sfda.kind === "not_found"
                            ? "not on the Saudi registry"
                            : "integration not yet connected"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Meta */}
            <div className="rounded-lg border border-dashed border-[color:var(--color-border)] p-3 text-[11px] text-[color:var(--color-muted-foreground)]">
              <div className="font-semibold uppercase tracking-wider">Sources</div>
              <ul className="mt-1 space-y-0.5">
                <li>
                  • RxNorm (NIH) — drug normalization
                </li>
                <li>
                  • OpenFDA Drug Label —{" "}
                  {result.meta.openFdaUsed ? "active" : "no label data fetched"}
                </li>
                <li>
                  • Medical Intelligence Engine —{" "}
                  {result.meta.geminiUsed
                    ? "active"
                    : "not configured"}
                </li>
                <li>
                  • SFDA Saudi Drug Registry —{" "}
                  {result.meta.sfdaConfigured ? "active" : "extension point only"}
                </li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SeverityHeadline({ severity }: { severity: Severity | null }) {
  if (!severity) {
    return (
      <Badge variant="success" className="gap-1 text-[10px]">
        <ShieldCheck className="size-3" />
        Clear
      </Badge>
    );
  }
  return (
    <Badge variant={severityBadge[severity]} className="gap-1 text-[10px]">
      <AlertTriangle className="size-3" />
      {severity}
    </Badge>
  );
}

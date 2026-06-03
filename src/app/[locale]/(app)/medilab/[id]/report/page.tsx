import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Beaker,
  CheckCircle2,
  Printer,
  User as UserIcon,
} from "lucide-react";

import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { getLabResultById, listBiomarkerHistory } from "@/lib/queries/labs";
import { formatClinicalDate, formatPatientId, calculateAge } from "@/lib/utils";
import { classifyResult, type LabFlag } from "@/lib/medilab/classify";
import type { LabResultItem } from "@/db/schema";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

/* ── Color coding helpers ─────────────────────────────────────── */
type Severity = "normal" | "borderline" | "abnormal" | "critical";

function flagToSeverity(flag: LabFlag | null): Severity {
  if (!flag || flag === "normal") return "normal";
  if (flag === "low" || flag === "high") return "abnormal";
  return "critical";
}

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string; dot: string }> = {
  normal: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    dot: "bg-green-500",
  },
  borderline: {
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    dot: "bg-yellow-500",
  },
  abnormal: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  critical: {
    bg: "bg-red-100 dark:bg-red-950/50",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-300 dark:border-red-700",
    dot: "bg-red-600",
  },
};

function severityLabel(
  severity: Severity,
  t: Awaited<ReturnType<typeof getTranslations<"MediLab">>>,
): string {
  switch (severity) {
    case "normal":
      return t("normalResult");
    case "borderline":
      return t("borderlineResult");
    case "abnormal":
      return t("abnormalResult");
    case "critical":
      return t("criticalResult");
  }
}

/* ── Trend helpers ────────────────────────────────────────────── */
type Trend = "improving" | "stable" | "worsening";

function computeTrend(
  current: number,
  previous: number | null,
  low: number | null,
  high: number | null,
): Trend | null {
  if (previous == null || low == null || high == null) return null;
  const midpoint = (low + high) / 2;
  const prevDist = Math.abs(previous - midpoint);
  const currDist = Math.abs(current - midpoint);
  const threshold = (high - low) * 0.05; // 5% of range
  if (currDist < prevDist - threshold) return "improving";
  if (currDist > prevDist + threshold) return "worsening";
  return "stable";
}

function TrendArrow({ trend }: { trend: Trend | null }) {
  if (!trend) return null;
  if (trend === "improving")
    return <ArrowDown className="inline size-4 text-green-600 dark:text-green-400" />;
  if (trend === "worsening")
    return <ArrowUp className="inline size-4 text-red-600 dark:text-red-400" />;
  return <ArrowRight className="inline size-4 text-gray-500 dark:text-gray-400" />;
}

/* ── Band bar component ───────────────────────────────────────── */
function RangeBand({
  value,
  low,
  high,
  criticalLow,
  criticalHigh,
}: {
  value: number;
  low: number;
  high: number;
  criticalLow: number | null;
  criticalHigh: number | null;
}) {
  const span = high - low;
  if (span <= 0) return null;

  // Clamp position to 0-100%
  const raw = ((value - low) / span) * 100;
  const position = Math.max(0, Math.min(100, raw));

  return (
    <div className="relative mt-2 h-3 w-full rounded-full bg-gradient-to-r from-red-300 via-green-300 to-red-300 dark:from-red-800 dark:via-green-800 dark:to-red-800 print:from-red-200 print:via-green-200 print:to-red-200">
      {/* Normal zone overlay */}
      <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-green-400/40 dark:bg-green-600/30" />
      {/* Marker */}
      <div
        className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow-md dark:border-gray-800 dark:bg-white print:bg-black"
        style={{ left: `${position}%` }}
      />
      {/* Labels */}
      <div className="mt-4 flex justify-between text-[10px] text-[color:var(--color-muted-foreground)]">
        <span>{criticalLow != null ? criticalLow : low}</span>
        <span>{low}</span>
        <span>{high}</span>
        <span>{criticalHigh != null ? criticalHigh : high}</span>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Visual Report — ${id.slice(0, 8)}` };
}

export default async function LabVisualReportPage({ params }: PageProps) {
  const { id, locale } = await params;
  if (!UUID_RE.test(id)) notFound();

  const row = await getLabResultById(id);
  if (!row) notFound();
  const { lab, patient, physician } = row;

  const [session, t] = await Promise.all([
    requireSession(),
    getTranslations("MediLab"),
  ]);
  if (session.ok) {
    void logAudit({
      actorId: session.user.id,
      action: "lab.view",
      resourceType: "lab_result",
      resourceId: lab.id,
      patientId: patient.id,
      metadata: { view: "visual_report" },
    });
  }

  const isRtl = locale === "ar";
  const age = calculateAge(patient.dateOfBirth);
  const results = (lab.results ?? []) as LabResultItem[];

  // Classify each result and fetch previous values for trends
  const classifiedResults = await Promise.all(
    results.map(async (r) => {
      const cls = classifyResult({
        testName: r.testName,
        value: r.value,
        referenceLow: r.referenceLow,
        referenceHigh: r.referenceHigh,
        sex:
          patient.sex === "male" || patient.sex === "female"
            ? patient.sex
            : undefined,
        age,
      });

      const severity = flagToSeverity(cls.flag);

      // Load historical data for trend
      let trend: Trend | null = null;
      if (cls.numericValue != null && cls.low != null && cls.high != null) {
        const history = await listBiomarkerHistory(patient.id, r.testName, 5);
        // Previous value is the second most recent (current is latest)
        const previousPoint = history.length >= 2 ? history[history.length - 2] : null;
        trend = computeTrend(
          cls.numericValue,
          previousPoint?.value ?? null,
          cls.low,
          cls.high,
        );
      }

      return { ...r, cls, severity, trend };
    }),
  );

  const criticalCount = classifiedResults.filter(
    (r) => r.severity === "critical",
  ).length;
  const abnormalCount = classifiedResults.filter(
    (r) => r.severity === "abnormal" || r.severity === "critical",
  ).length;

  // Build recommendations based on abnormal values
  const recommendations: string[] = [];
  for (const r of classifiedResults) {
    if (r.cls.flag === "critical_low" || r.cls.flag === "critical_high") {
      recommendations.push(
        `${r.testName}: Critical value detected (${String(r.value)} ${r.unit ?? ""}). Immediate clinical review recommended.`,
      );
    } else if (r.cls.flag === "high") {
      recommendations.push(
        `${r.testName}: Elevated at ${String(r.value)} ${r.unit ?? ""} (ref: ${r.cls.low}–${r.cls.high}). Consider repeat testing or further workup.`,
      );
    } else if (r.cls.flag === "low") {
      recommendations.push(
        `${r.testName}: Low at ${String(r.value)} ${r.unit ?? ""} (ref: ${r.cls.low}–${r.cls.high}). Evaluate for underlying cause.`,
      );
    }
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8 print:max-w-none print:p-4"
    >
      {/* ── Navigation (hidden in print) ──────────────────────── */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/medilab/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          {t("labResults")}
        </Link>
        <button
          onClick={undefined}
          className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--color-muted)]/50"
          data-print-btn
        >
          <Printer className="size-4" />
          {t("printReport")}
        </button>
      </div>

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 print:border-gray-300">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
              {t("visualReport")}
            </div>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-[color:var(--color-foreground)]">
              <Beaker className="size-5 text-[color:var(--color-brand-magenta)] print:text-gray-700" />
              {lab.panelName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--color-muted-foreground)]">
              <span className="font-semibold text-[color:var(--color-foreground)]">
                {patient.firstName} {patient.lastName}
              </span>
              <span className="font-mono text-[10px]">{formatPatientId(patient.id)}</span>
              <span>·</span>
              <span>{age} yrs · <span className="capitalize">{patient.sex}</span></span>
              <span>·</span>
              <span>{formatClinicalDate(lab.resultDate)}</span>
              {lab.laboratory && (
                <>
                  <span>·</span>
                  <span>{lab.laboratory}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {criticalCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 dark:bg-red-950/50 dark:text-red-300 print:bg-red-50">
                <AlertTriangle className="size-3" />
                {criticalCount} {t("criticalResult")}
              </span>
            ) : abnormalCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300 print:bg-yellow-50">
                <AlertTriangle className="size-3" />
                {abnormalCount} {t("abnormalResult")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-950/50 dark:text-green-300 print:bg-green-50">
                <CheckCircle2 className="size-3" />
                {t("normalResult")}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Results Grid ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-[color:var(--color-foreground)]">
          {t("labResults")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
          {classifiedResults.map((r, i) => {
            const colors = SEVERITY_COLORS[r.severity];
            return (
              <div
                key={i}
                className={`rounded-xl border ${colors.border} ${colors.bg} p-4 transition-shadow print:break-inside-avoid`}
              >
                {/* Test name + severity badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      {r.testName}
                    </div>
                    {r.loincCode && (
                      <div className="text-[10px] font-mono text-[color:var(--color-muted-foreground)]">
                        LOINC {r.loincCode}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.trend && <TrendArrow trend={r.trend} />}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${colors.text}`}
                    >
                      <span className={`size-1.5 rounded-full ${colors.dot}`} />
                      {severityLabel(r.severity, t)}
                    </span>
                  </div>
                </div>

                {/* Value display */}
                <div className="mt-3">
                  <span className={`text-2xl font-black tabular-nums ${colors.text}`}>
                    {String(r.value)}
                  </span>
                  {r.unit && (
                    <span className="ml-1 text-sm text-[color:var(--color-muted-foreground)]">
                      {r.unit}
                    </span>
                  )}
                </div>

                {/* Reference range bar */}
                {r.cls.numericValue != null &&
                  r.cls.low != null &&
                  r.cls.high != null && (
                    <RangeBand
                      value={r.cls.numericValue}
                      low={r.cls.low}
                      high={r.cls.high}
                      criticalLow={r.cls.criticalLow}
                      criticalHigh={r.cls.criticalHigh}
                    />
                  )}

                {/* Ref range text */}
                {r.cls.low != null && r.cls.high != null && (
                  <div className="mt-1 text-[10px] text-[color:var(--color-muted-foreground)]">
                    Ref: {r.cls.low}–{r.cls.high} {r.unit ?? ""}
                  </div>
                )}

                {/* Trend label */}
                {r.trend && (
                  <div className="mt-1 text-[10px] text-[color:var(--color-muted-foreground)]">
                    {r.trend === "improving"
                      ? t("improving")
                      : r.trend === "worsening"
                        ? t("worsening")
                        : t("stable")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AI Narrative Summary ──────────────────────────────── */}
      {lab.aiNarrative && (
        <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 print:border-gray-300">
          <h2 className="mb-3 text-lg font-bold text-[color:var(--color-foreground)]">
            {t("aiInterpretation")}
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
            {lab.aiNarrative}
          </p>
        </section>
      )}

      {/* ── Recommendations ───────────────────────────────────── */}
      {recommendations.length > 0 && (
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-950/20 print:border-yellow-300 print:bg-yellow-50">
          <h2 className="mb-3 text-lg font-bold text-yellow-800 dark:text-yellow-300">
            {t("recommendations")}
          </h2>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-yellow-900 dark:text-yellow-200"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600" />
                {rec}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Doctor Notes / Physician ──────────────────────────── */}
      {physician && (
        <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 print:border-gray-300">
          <div className="flex items-center gap-3 text-sm text-[color:var(--color-muted-foreground)]">
            <UserIcon className="size-5" />
            <div>
              <div className="font-semibold text-[color:var(--color-foreground)]">
                {physician.name}
              </div>
              {physician.specialty && (
                <div className="text-xs">{physician.specialty}</div>
              )}
              <div className="text-xs">
                {formatClinicalDate(lab.resultDate)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Print-trigger script (client-side) ────────────────── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', function(e) {
              if (e.target.closest('[data-print-btn]')) {
                window.print();
              }
            });
          `,
        }}
      />

      {/* ── Print styles ──────────────────────────────────────── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print\\:hidden, [data-print-btn], nav, header:not(section header) { display: none !important; }
              .print\\:break-inside-avoid { break-inside: avoid; }
              @page { margin: 1cm; size: A4; }
            }
          `,
        }}
      />

      {/* ── Disclaimer ────────────────────────────────────────── */}
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-3 text-[11px] text-[color:var(--color-muted-foreground)] print:border-gray-300">
        <AlertTriangle className="mr-1 inline size-3" />
        AI-generated visual report — for clinical decision support only. Does
        not replace physician judgement. Always verify against original lab
        documentation.
      </div>
    </div>
  );
}

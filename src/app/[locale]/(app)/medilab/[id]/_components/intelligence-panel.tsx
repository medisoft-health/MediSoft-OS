"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Brain,
  CheckCircle2,
  Loader2,
  Pill,
  RefreshCw,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import {
  generateIntelligence,
  type IntelligenceData,
  type TrendData,
} from "@/lib/medilab/client";
import { cn } from "@/lib/utils";

interface Props {
  labResultId: string;
}

const urgencyColor: Record<string, string> = {
  high: "destructive",
  medium: "warning",
  low: "info",
  urgent: "critical",
  routine: "default",
};

const directionIcon: Record<string, React.ElementType> = {
  improving: TrendingUp,
  worsening: TrendingDown,
  stable: ArrowRight,
  new: Activity,
};

const directionColor: Record<string, string> = {
  improving: "text-emerald-600",
  worsening: "text-rose-600",
  stable: "text-slate-500",
  new: "text-blue-600",
};

const trajectoryBadge: Record<string, string> = {
  improving: "success",
  stable: "info",
  declining: "destructive",
  worsening: "destructive",
  mixed: "warning",
};

export function IntelligencePanel({ labResultId }: Props) {
  const [data, setData] = React.useState<IntelligenceData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notConfigured, setNotConfigured] = React.useState(false);
  const [audience, setAudience] = React.useState<"physician" | "patient">(
    "physician",
  );
  const [phase, setPhase] = React.useState("");
  const phaseTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearPhaseTimers() {
    for (const t of phaseTimers.current) clearTimeout(t);
    phaseTimers.current = [];
  }

  async function run(isRetry = false) {
    setLoading(true);
    setError(null);
    setNotConfigured(false);

    setPhase(isRetry ? "Retrying with optimized prompt..." : "Collecting cross-module data...");
    phaseTimers.current.push(setTimeout(() => setPhase("Analyzing across all clinical modules..."), 3000));
    phaseTimers.current.push(setTimeout(() => setPhase("Computing lab trends..."), 10000));
    phaseTimers.current.push(setTimeout(() => setPhase("Generating cross-module insights..."), 25000));
    phaseTimers.current.push(setTimeout(() => setPhase("Still working — large dataset, please wait..."), 60000));
    phaseTimers.current.push(setTimeout(() => setPhase("Almost done — finalizing analysis..."), 90000));

    const result = await generateIntelligence(labResultId);
    clearPhaseTimers();
    setPhase("");

    if (result.kind === "ok") {
      setData(result.data);
      toast.success("Clinical Intelligence generated");
    } else if (result.kind === "not_configured") {
      setNotConfigured(true);
    } else {
      if (!isRetry && result.message.includes("timed out")) {
        toast.info("First attempt timed out — retrying automatically...");
        return run(true);
      }
      setError(result.message);
    }
    setLoading(false);
  }

  React.useEffect(() => () => clearPhaseTimers(), []);

  return (
    <Card className="border-2 border-[color:var(--color-brand-pink)]/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-5 text-[color:var(--color-brand-magenta)]" />
            Clinical Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            {data && (
              <div
                role="tablist"
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
            )}
            <Button
              variant="brand"
              size="sm"
              onClick={() => run()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing…
                </>
              ) : data ? (
                <>
                  <RefreshCw className="size-4" />
                  Refresh
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Intelligence
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Cross-module analysis: labs + encounters + medications + imaging +
          vitals + patient history — powered by Medical Intelligence Engine.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {notConfigured && (
          <Alert variant="info">
            <Sparkles />
            <AlertTitle>Analysis not configured</AlertTitle>
            <AlertDescription>
              Set <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5">GOOGLE_GEMINI_API_KEY</code> to enable Clinical Intelligence.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Intelligence failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!data && !loading && !error && !notConfigured && (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            Click <strong>Generate Intelligence</strong> to analyze this lab
            result in the context of the patient&apos;s full medical record —
            including prior labs, medications, encounters, and imaging.
          </p>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="size-6 animate-spin text-[color:var(--color-brand-magenta)]" />
            <p className="text-sm text-[color:var(--color-muted-foreground)] transition-opacity">
              {phase || "Analyzing across all clinical modules..."}
            </p>
          </div>
        )}

        {data && (
          <>
            {/* Summary */}
            <div className="rounded-xl border border-[color:var(--color-brand-pink)]/20 bg-[color:var(--color-brand-pink)]/5 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {audience === "physician"
                  ? data.physicianSummary
                  : data.patientSummary}
              </p>
              {audience === "patient" && (
                <p className="mt-2 text-[11px] italic text-[color:var(--color-muted-foreground)]">
                  Speak with your doctor before making any changes.
                </p>
              )}
            </div>

            {/* Clinical Trajectory */}
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] p-4">
              <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--color-brand-pink)]/10">
                <Activity className="size-5 text-[color:var(--color-brand-magenta)]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold">Overall trajectory</div>
                  <Badge
                    variant={
                      (trajectoryBadge[data.clinicalTrajectory.overallStatus.toLowerCase()] ??
                        "info") as "success" | "info" | "warning" | "destructive"
                    }
                    className="text-[10px]"
                  >
                    {data.clinicalTrajectory.overallStatus}
                  </Badge>
                  {data.clinicalTrajectory.riskLevel && (
                    <Badge variant="outline" className="text-[10px]">
                      Risk: {data.clinicalTrajectory.riskLevel}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                  {data.clinicalTrajectory.detail}
                </p>
              </div>
            </div>

            {/* Trend sparklines */}
            {data.trends && data.trends.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Lab trends
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {data.trends.map((t) => (
                    <TrendCard key={t.testName} trend={t} />
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Cross-module insights */}
            {data.crossModuleInsights.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Cross-module insights
                </div>
                <ul className="space-y-2">
                  {data.crossModuleInsights.map((ins, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3"
                    >
                      <div className="text-sm font-semibold">{ins.insight}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[color:var(--color-muted-foreground)]">
                        <Badge variant="outline" className="text-[9px]">
                          {ins.modules}
                        </Badge>
                        {ins.urgency && (
                          <Badge
                            variant={
                              (urgencyColor[ins.urgency.toLowerCase()] ??
                                "default") as "info" | "warning" | "destructive" | "critical" | "default"
                            }
                            className="text-[9px]"
                          >
                            {ins.urgency}
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medication impact */}
            {data.medicationImpact.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Medication impact on labs
                </div>
                <ul className="space-y-2">
                  {data.medicationImpact.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-[color:var(--color-border)] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Pill className="size-4 text-[color:var(--color-brand-magenta)]" />
                        <span className="text-sm font-semibold">{m.drug}</span>
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                        {m.labEffect}
                      </p>
                      {m.recommendation && (
                        <p className="mt-1 text-xs italic text-[color:var(--color-brand-navy)]">
                          → {m.recommendation}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Recommendations
                </div>
                <ol className="space-y-2">
                  {data.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-[color:var(--color-border)] p-3"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[color:var(--color-brand-pink)]/10 text-[10px] font-bold text-[color:var(--color-brand-magenta)]">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {r.action}
                          </span>
                          <Badge
                            variant={
                              (urgencyColor[r.urgency.toLowerCase()] ??
                                "default") as "info" | "warning" | "destructive" | "critical" | "default"
                            }
                            className="text-[9px]"
                          >
                            {r.urgency}
                          </Badge>
                        </div>
                        {r.rationale && (
                          <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                            {r.rationale}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Trend card with mini sparkline
// ─────────────────────────────────────────────────────────────────
function TrendCard({ trend }: { trend: TrendData }) {
  const Icon = directionIcon[trend.direction] ?? Activity;
  const color = directionColor[trend.direction] ?? "text-slate-500";

  // Mini SVG sparkline from history
  const sparkline = React.useMemo(() => {
    if (trend.history.length < 2) return null;
    const values = trend.history.map((h) => h.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 80;
    const h = 24;
    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
      })
      .join(" ");
    return (
      <svg width={w} height={h} className="shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke={trend.direction === "worsening" ? "#E84A8A" : trend.direction === "improving" ? "#10B981" : "#94A3B8"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }, [trend]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[color:var(--color-border)] p-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{trend.testName}</div>
        <div className="flex items-center gap-1.5 text-xs">
          <Icon className={cn("size-3.5", color)} />
          <span className={cn("font-medium", color)}>
            {trend.direction}
          </span>
          {trend.percentChange !== null && (
            <span className="text-[color:var(--color-muted-foreground)]">
              ({trend.percentChange > 0 ? "+" : ""}
              {trend.percentChange}%)
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-[color:var(--color-muted-foreground)] tabular-nums">
          {trend.previous !== null
            ? `${trend.previous} → ${trend.current}`
            : trend.current}{" "}
          {trend.unit}
        </div>
      </div>
      {sparkline}
    </div>
  );
}

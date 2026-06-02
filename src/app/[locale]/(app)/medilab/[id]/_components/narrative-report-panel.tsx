"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Beaker,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Stethoscope,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  generateNarrativeReport,
  type DoctorReportData,
  type NarrativeReportData,
  type PatientReportData,
} from "@/lib/medilab/client";
import { cn } from "@/lib/utils";
import { InfographicReport } from "./infographic-report";

interface Props {
  labResultId: string;
}

const urgencyBadge: Record<string, "success" | "warning" | "destructive"> = {
  routine: "success",
  attention: "warning",
  urgent: "destructive",
};

const severityColor: Record<string, string> = {
  mild: "text-amber-700 bg-amber-50",
  moderate: "text-orange-700 bg-orange-50",
  critical: "text-rose-700 bg-rose-100",
};

const testUrgencyBadge: Record<string, "info" | "warning" | "destructive"> = {
  immediate: "destructive",
  soon: "warning",
  routine: "info",
};

export function NarrativeReportPanel({ labResultId }: Props) {
  const [data, setData] = React.useState<NarrativeReportData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"doctor" | "patient">("doctor");
  const [phase, setPhase] = React.useState("");
  const phaseTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearPhaseTimers() {
    for (const t of phaseTimers.current) clearTimeout(t);
    phaseTimers.current = [];
  }

  async function run(isRetry = false) {
    setLoading(true);
    setError(null);

    // Phased loading messages
    setPhase(isRetry ? "Retrying with optimized prompt..." : "Preparing analysis...");
    phaseTimers.current.push(setTimeout(() => setPhase("Analyzing results with Medical Intelligence Engine..."), 2000));
    phaseTimers.current.push(setTimeout(() => setPhase("Processing abnormal findings..."), 8000));
    phaseTimers.current.push(setTimeout(() => setPhase("Generating clinical correlations..."), 20000));
    phaseTimers.current.push(setTimeout(() => setPhase("Building patient report..."), 40000));
    phaseTimers.current.push(setTimeout(() => setPhase("Still working — large report, please wait..."), 60000));
    phaseTimers.current.push(setTimeout(() => setPhase("Almost done — finalizing recommendations..."), 90000));

    const result = await generateNarrativeReport(labResultId);
    clearPhaseTimers();
    setPhase("");

    if (result.kind === "ok") {
      setData(result.data);
      toast.success("Clinical report generated");
    } else if (result.kind === "not_configured") {
      setError("Set GOOGLE_GEMINI_API_KEY to enable AI reports.");
    } else {
      // Auto-retry once on timeout
      if (!isRetry && result.message.includes("timed out")) {
        toast.info("First attempt timed out — retrying automatically...");
        return run(true);
      }
      setError(result.message);
    }
    setLoading(false);
  }

  // Cleanup timers on unmount
  React.useEffect(() => () => clearPhaseTimers(), []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-5 text-[color:var(--color-brand-magenta)]" />
            AI Medical Report
          </CardTitle>
          <div className="flex items-center gap-2">
            {data && (
              <div
                role="tablist"
                className="inline-flex overflow-hidden rounded-lg border border-[color:var(--color-border)]"
              >
                <button
                  role="tab"
                  aria-selected={tab === "doctor"}
                  onClick={() => setTab("doctor")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                    tab === "doctor"
                      ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                      : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
                  )}
                >
                  <Stethoscope className="size-3.5" /> Doctor
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "patient"}
                  onClick={() => setTab("patient")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                    tab === "patient"
                      ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                      : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
                  )}
                >
                  <UsersIcon className="size-3.5" /> Patient
                </button>
              </div>
            )}
            <Button variant="brand" size="sm" onClick={() => run()} disabled={loading}>
              {loading ? (
                <><Loader2 className="size-4 animate-spin" /> Generating…</>
              ) : data ? (
                <><RefreshCw className="size-4" /> Refresh</>
              ) : (
                <><Sparkles className="size-4" /> Generate AI Report</>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Comprehensive AI analysis with clinical correlations, differentials,
          and a patient-friendly Arabic summary.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!data && !loading && !error && (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            Click <strong>Generate AI Report</strong> for a comprehensive
            analysis including differential diagnosis, clinical correlations,
            and a patient-friendly Arabic summary with health score.
          </p>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-6 animate-spin text-[color:var(--color-brand-magenta)]" />
            <p className="text-sm text-[color:var(--color-muted-foreground)] transition-opacity">
              {phase || "Analyzing results with Medical Intelligence Engine..."}
            </p>
          </div>
        )}

        {data && tab === "doctor" && <DoctorTab report={data.doctorReport} />}
        {data && tab === "patient" && (
          <InfographicReport
            patientReport={data.patientReport}
            doctorReport={data.doctorReport}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Doctor Report Tab
// ─────────────────────────────────────────────────────────────────
function DoctorTab({ report }: { report: DoctorReportData }) {
  return (
    <div className="space-y-5">
      {/* Quick Overview */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[color:var(--color-border)] p-4">
        <div className="text-center">
          <div className="text-2xl font-black tabular-nums">{report.overview.totalTests}</div>
          <div className="text-[10px] text-[color:var(--color-muted-foreground)]">Total tests</div>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <div className="text-center">
          <div className="text-2xl font-black tabular-nums text-emerald-600">{report.overview.normalCount}</div>
          <div className="text-[10px] text-[color:var(--color-muted-foreground)]">Normal</div>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <div className="text-center">
          <div className="text-2xl font-black tabular-nums text-rose-600">{report.overview.abnormalCount}</div>
          <div className="text-[10px] text-[color:var(--color-muted-foreground)]">Abnormal</div>
        </div>
        <div className="ms-auto">
          <Badge
            variant={urgencyBadge[report.overview.urgencyLevel.toLowerCase()] ?? "warning"}
            className="text-xs"
          >
            {report.overview.urgencyLevel}
          </Badge>
        </div>
      </div>

      {/* Red Flags */}
      {report.redFlags.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Red Flags</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 ps-4">
              {report.redFlags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Abnormal Findings */}
      {report.abnormalFindings.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            Abnormal findings
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clinical significance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.abnormalFindings.map((f, i) => (
                <TableRow key={i}>
                  <TableCell className="font-semibold">{f.test}</TableCell>
                  <TableCell className="tabular-nums">
                    {f.value} {f.unit ?? ""}
                  </TableCell>
                  <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                    {f.reference ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        severityColor[f.severity?.toLowerCase() ?? ""] ??
                          "text-amber-700 bg-amber-50",
                      )}
                    >
                      {f.status} {f.severity ? `(${f.severity})` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs text-xs">
                    {f.clinicalSignificance}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Clinical Correlations */}
      {report.clinicalCorrelations && (
        <div className="rounded-xl border border-[color:var(--color-brand-pink)]/20 bg-[color:var(--color-brand-pink)]/5 p-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-brand-magenta)]">
            Clinical correlations
          </div>
          <p className="text-sm leading-relaxed">{report.clinicalCorrelations}</p>
        </div>
      )}

      {/* Differential Diagnosis */}
      {report.differentialDiagnosis.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            Differential diagnosis
          </div>
          <ul className="space-y-2">
            {report.differentialDiagnosis.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-[color:var(--color-border)] p-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--color-brand-pink)]/10 text-sm font-bold text-[color:var(--color-brand-magenta)]">
                  {d.probability}%
                </span>
                <div>
                  <div className="text-sm font-semibold">{d.condition}</div>
                  <div className="text-xs text-[color:var(--color-muted-foreground)]">
                    {d.matchingCriteria}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Tests */}
      {report.recommendedTests.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            Recommended follow-up
          </div>
          <ul className="space-y-2">
            {report.recommendedTests.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--color-border)] p-3"
              >
                <div>
                  <div className="text-sm font-semibold">{t.test}</div>
                  <div className="text-xs text-[color:var(--color-muted-foreground)]">
                    {t.reason}
                  </div>
                </div>
                <Badge
                  variant={testUrgencyBadge[t.urgency.toLowerCase()] ?? "info"}
                  className="text-[10px]"
                >
                  {t.urgency}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Guidelines */}
      {report.guidelinesReference && (
        <div className="rounded-lg border border-dashed border-[color:var(--color-border)] p-3 text-xs text-[color:var(--color-muted-foreground)]">
          <Beaker className="me-1 inline size-3" />
          {report.guidelinesReference}
        </div>
      )}
    </div>
  );
}

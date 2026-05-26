import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { getLabResultById } from "@/lib/queries/labs";
import { formatClinicalDate, formatPatientId, calculateAge } from "@/lib/utils";
import type { LabFlag } from "@/lib/validations/lab";
import { classifyResult } from "@/lib/medilab/classify";

import { ResultRangeBar } from "./_components/result-range-bar";
import { BiomarkerTrendChart } from "./_components/biomarker-trend-chart";
import { NarrativePanel } from "./_components/narrative-panel";
import { IntelligencePanel } from "./_components/intelligence-panel";
import { NarrativeReportPanel } from "./_components/narrative-report-panel";
import { ComparisonPanel } from "./_components/comparison-panel";
import { DrugLabAlertsPanel } from "./_components/drug-lab-alerts-panel";
import { RiskAssessmentPanel } from "./_components/risk-assessment-panel";
import { DifferentialDiagnosisPanel } from "./_components/differential-diagnosis-panel";
import type { NarrativeOutput } from "@/lib/medilab/narrative";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

const flagBadge: Record<LabFlag, "success" | "info" | "warning" | "critical"> = {
  normal: "success",
  low: "info",
  high: "warning",
  critical_low: "critical",
  critical_high: "critical",
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Lab result ${id.slice(0, 8)}` };
}

export default async function LabDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const row = await getLabResultById(id);
  if (!row) notFound();
  const { lab, patient, physician } = row;

  const session = await requireSession();
  if (session.ok) {
    void logAudit({
      actorId: session.user.id,
      action: "lab.view",
      resourceType: "lab_result",
      resourceId: lab.id,
      patientId: patient.id,
    });
  }

  const results = (lab.results ?? []) as Array<{
    testName: string;
    loincCode?: string;
    value: number | string;
    unit?: string;
    referenceLow?: number | string;
    referenceHigh?: number | string;
    flag?: LabFlag;
    interpretation?: string;
  }>;

  const criticalCount = results.filter(
    (r) => r.flag === "critical_low" || r.flag === "critical_high",
  ).length;
  const abnormalCount = results.filter(
    (r) => r.flag && r.flag !== "normal",
  ).length;

  const persistedNarrative = (lab.aiTrendAnalysis as
    | (NarrativeOutput & { generatedAt?: string })
    | null);

  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href={`/patients/${patient.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          Back to {patient.firstName} {patient.lastName}
        </Link>
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                Lab result
              </div>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight">
                <Beaker className="size-5 text-[color:var(--color-brand-magenta)]" />
                {lab.panelName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--color-muted-foreground)]">
                <Link
                  href={`/patients/${patient.id}`}
                  className="hover:text-[color:var(--color-brand-magenta)]"
                >
                  {patient.firstName} {patient.lastName}
                  <span className="ml-2 font-mono text-[10px]">
                    {formatPatientId(patient.id)}
                  </span>
                </Link>
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
                {physician?.name && (
                  <>
                    <span>·</span>
                    <span>
                      <UserIcon className="mr-1 inline size-3" />
                      {physician.name}
                      {physician.specialty ? ` · ${physician.specialty}` : ""}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {criticalCount > 0 ? (
                <Badge variant="critical" className="gap-1 text-[10px]">
                  <AlertTriangle className="size-3" />
                  {criticalCount} critical
                </Badge>
              ) : abnormalCount > 0 ? (
                <Badge variant="warning" className="gap-1 text-[10px]">
                  <AlertTriangle className="size-3" />
                  {abnormalCount} abnormal
                </Badge>
              ) : (
                <Badge variant="success" className="gap-1 text-[10px]">
                  <CheckCircle2 className="size-3" />
                  All within range
                </Badge>
              )}
              {lab.panelLoincCode && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  LOINC {lab.panelLoincCode}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Critical alert banner */}
      {criticalCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{criticalCount} critical result{criticalCount === 1 ? "" : "s"}</AlertTitle>
          <AlertDescription>
            Review the highlighted rows below. Critical values warrant clinical
            attention before the patient leaves the encounter.
          </AlertDescription>
        </Alert>
      )}

      {/* Drug-Lab Interaction Alerts — FIRST thing doctor sees (safety) */}
      <DrugLabAlertsPanel labResultId={lab.id} />

      {/* AI narrative */}
      <NarrativePanel
        labResultId={lab.id}
        initial={persistedNarrative ?? null}
        results={results}
        patientName={patient.firstName}
      />

      {/* AI Medical Report (doctor + patient tabs) */}
      <NarrativeReportPanel labResultId={lab.id} />

      {/* Clinical Intelligence — cross-module analysis */}
      <IntelligencePanel labResultId={lab.id} />

      {/* Lab Comparison — side-by-side with previous panel */}
      <ComparisonPanel labResultId={lab.id} patientId={patient.id} />

      {/* Predictive Risk Assessment — 5 disease category scores */}
      <RiskAssessmentPanel patientId={patient.id} />

      {/* AI Differential Diagnosis */}
      <DifferentialDiagnosisPanel patientId={patient.id} labResultId={lab.id} />

      {/* Results visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
          <CardDescription>
            {results.length} test{results.length === 1 ? "" : "s"}. The bar shows
            where each value sits relative to its reference range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.map((r, i) => {
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
            const numeric = cls.numericValue;
            const low = cls.low;
            const high = cls.high;

            return (
              <div key={i} className="rounded-xl border border-[color:var(--color-border)] p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">{r.testName}</div>
                    {r.flag && (
                      <Badge variant={flagBadge[r.flag]} className="text-[10px]">
                        {r.flag.replace("_", " ")}
                      </Badge>
                    )}
                    {r.loincCode && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        LOINC {r.loincCode}
                      </Badge>
                    )}
                  </div>
                  <BiomarkerTrendChart
                    patientId={patient.id}
                    testName={r.testName}
                    unit={r.unit ?? null}
                    referenceLow={low}
                    referenceHigh={high}
                  />
                </div>

                {numeric != null && low != null && high != null ? (
                  <ResultRangeBar
                    value={numeric}
                    low={low}
                    high={high}
                    criticalLow={cls.criticalLow}
                    criticalHigh={cls.criticalHigh}
                    unit={r.unit ?? undefined}
                    flag={r.flag ?? null}
                  />
                ) : (
                  <div className="text-sm">
                    <strong className="tabular-nums">{String(r.value)}</strong>
                    {r.unit && (
                      <span className="ml-1 text-[color:var(--color-muted-foreground)]">
                        {r.unit}
                      </span>
                    )}
                    {r.referenceLow != null && r.referenceHigh != null && (
                      <span className="ml-3 text-[10px] text-[color:var(--color-muted-foreground)]">
                        Ref [{String(r.referenceLow)}–{String(r.referenceHigh)}]
                      </span>
                    )}
                  </div>
                )}

                {r.interpretation && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      {r.interpretation}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-3 text-[11px] text-[color:var(--color-muted-foreground)]">
        <AlertTriangle className="mr-1 inline size-3" />
        Reference ranges shown are screening defaults from MediLab&apos;s
        curated library. The reporting laboratory&apos;s printed values always
        take precedence. AI narrative is for clinical decision-support only;
        verify before sharing with patients.
      </div>
    </div>
  );
}

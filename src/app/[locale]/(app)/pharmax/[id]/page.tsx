import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Pill,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { getPrescriptionById } from "@/lib/queries/prescriptions";
import { formatClinicalDate, formatPatientId } from "@/lib/utils";
import type { Severity } from "@/lib/validations/prescription";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusVariant: Record<
  string,
  "info" | "warning" | "success" | "default" | "destructive"
> = {
  draft: "warning",
  active: "success",
  completed: "info",
  discontinued: "default",
  cancelled: "destructive",
};

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

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Prescription ${id.slice(0, 8)}` };
}

export default async function PrescriptionDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const row = await getPrescriptionById(id);
  if (!row) notFound();
  const { prescription: rx, patient, physician } = row;

  const session = await requireSession();
  if (session.ok) {
    void logAudit({
      actorId: session.user.id,
      action: "prescription.update", // closest existing action; "prescription.view" can be added later
      resourceType: "prescription",
      resourceId: rx.id,
      patientId: patient.id,
      metadata: { view: true },
    });
  }

  const interactions =
    (rx.interactions as Array<{
      severity: Severity;
      mechanism?: string;
      clinicalEffect?: string;
      recommendation?: string;
      evidenceSource?: string;
      interactingDrug?: string;
    }> | null) ?? [];

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
                Prescription
              </div>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight">
                <Pill className="size-5 text-[color:var(--color-brand-magenta)]" />
                {rx.drugName}
                {rx.brandName && (
                  <span className="text-base font-medium text-[color:var(--color-muted-foreground)]">
                    ({rx.brandName})
                  </span>
                )}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--color-muted-foreground)]">
                <span>{rx.dose}</span>
                <span>·</span>
                <span>{rx.frequency}</span>
                <span>·</span>
                <span className="capitalize">{rx.route}</span>
                {rx.duration && (
                  <>
                    <span>·</span>
                    <span>{rx.duration}</span>
                  </>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--color-muted-foreground)]">
                <Link
                  href={`/patients/${patient.id}`}
                  className="hover:text-[color:var(--color-brand-magenta)]"
                >
                  {patient.firstName} {patient.lastName}{" "}
                  <span className="font-mono text-[10px]">
                    {formatPatientId(patient.id)}
                  </span>
                </Link>
                <span>·</span>
                <span>By {physician?.name ?? "Unknown physician"}</span>
                <span>·</span>
                <span>{formatClinicalDate(rx.createdAt)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[rx.status] ?? "default"} className="text-[10px]">
                {rx.status}
              </Badge>
              {rx.severity && (
                <Badge variant={severityBadge[rx.severity]} className="gap-1 text-[10px]">
                  <ShieldAlert className="size-3" />
                  {rx.severity}
                </Badge>
              )}
              {rx.rxcui && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  RxCUI {rx.rxcui}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Instructions */}
      {rx.instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {rx.instructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Interactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-[color:var(--color-brand-magenta)]" />
            Safety analysis snapshot
          </CardTitle>
          <CardDescription>
            What the PharmaX three-layer check surfaced when this prescription
            was saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <Alert variant="success">
              <CheckCircle2 />
              <AlertTitle>No interactions flagged</AlertTitle>
              <AlertDescription>
                At the time of saving, the FDA-label evidence and AI analysis
                surfaced no co-prescribing concerns.
              </AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-2">
              {interactions.map((it, i) => (
                <li
                  key={i}
                  className={`rounded-lg border p-3 ${severityCls[it.severity]}`}
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
                    {it.interactingDrug ?? "—"}
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
        </CardContent>
      </Card>

      {/* Quantity & refills */}
      {(rx.quantity != null || rx.refills != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispensing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {rx.quantity != null && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Quantity
                </div>
                <div className="mt-1 font-semibold tabular-nums">{rx.quantity}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Refills
              </div>
              <div className="mt-1 font-semibold tabular-nums">{rx.refills ?? 0}</div>
            </div>
            {rx.atcCode && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  ATC
                </div>
                <div className="mt-1 font-mono text-sm">{rx.atcCode}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-3 text-[11px] text-[color:var(--color-muted-foreground)]">
        <AlertTriangle className="mr-1 inline size-3" />
        PharmaX is a clinical decision-support tool. It does not replace
        physician judgement. Always verify drug, dose, and route against
        primary references before dispensing.
      </div>
    </div>
  );
}

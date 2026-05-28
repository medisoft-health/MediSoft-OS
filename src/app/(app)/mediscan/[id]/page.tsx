import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ScanLine,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getScanById } from "@/lib/queries/scans";
import { calculateAge, formatClinicalDate, formatPatientId } from "@/lib/utils";
import type { Annotation, Severity } from "@/lib/validations/scan";

import { ScanDetailViewer } from "./_components/scan-detail-viewer";
import { ScanNarrativePanel } from "./_components/scan-narrative-panel";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

const sevBadge: Record<
  Severity,
  "info" | "warning" | "destructive" | "critical"
> = {
  low: "info",
  moderate: "warning",
  high: "destructive",
  critical: "critical",
};

const tqBadge: Record<string, "success" | "warning" | "destructive"> = {
  adequate: "success",
  limited: "warning",
  non_diagnostic: "destructive",
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Scan ${id.slice(0, 8)}` };
}

export default async function ScanDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const row = await getScanById(id);
  if (!row) notFound();
  const { scan, patient, physician } = row;

  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    void logAudit({
      actorId: session.user.id,
      action: "scan.view",
      resourceType: "scan",
      resourceId: scan.id,
      patientId: patient.id,
    });
  }

  // Decode findings & annotations back out of the JSONB.
  const allFindings =
    (scan.findings as Array<{
      location?: string;
      description: string;
      severity?: Severity;
      characteristics?: string;
    }> | null) ?? [];

  let annotations: Annotation[] = [];
  let patientSummary: string | null = null;
  const realFindings: typeof allFindings = [];
  for (const f of allFindings) {
    if (f.characteristics === "__annotations__") {
      try {
        const parsed = JSON.parse(f.description) as Annotation[];
        if (Array.isArray(parsed)) annotations = parsed;
      } catch {
        /* ignore corrupt annotation payload */
      }
    } else if (f.characteristics === "__patient_summary__") {
      patientSummary = f.description;
    } else {
      realFindings.push(f);
    }
  }

  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
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
                Scan
              </div>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight">
                <ScanLine className="size-5 text-[color:var(--color-brand-magenta)]" />
                {scan.bodyPart}
                <span className="text-base font-medium capitalize text-[color:var(--color-muted-foreground)]">
                  · {scan.scanType}
                </span>
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
                <span>
                  Study {formatClinicalDate(scan.studyDate ?? scan.createdAt)}
                </span>
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
              {scan.technicalQuality && (
                <Badge
                  variant={tqBadge[scan.technicalQuality] ?? "warning"}
                  className="text-[10px]"
                >
                  {scan.technicalQuality.replace("_", " ")}
                </Badge>
              )}
              {scan.modality && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {scan.modality}
                </Badge>
              )}
              {scan.studyInstanceUid && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  DICOM ✓
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Disclaimer */}
      <Alert variant="warning">
        <AlertTriangle />
        <AlertTitle>Required disclaimer</AlertTitle>
        <AlertDescription className="text-xs leading-relaxed">
          {scan.disclaimer}
        </AlertDescription>
      </Alert>

      {/* Image viewer (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Image</CardTitle>
          <CardDescription>
            Annotations saved with this scan are shown overlaid. Pan, zoom, and
            inspect — drawing is disabled in detail view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScanDetailViewer scanId={scan.id} annotations={annotations} />
        </CardContent>
      </Card>

      {/* AI report */}
      <ScanNarrativePanel
        physicianReport={scan.aiReport}
        patientSummary={patientSummary}
        impression={scan.aiImpression}
        recommendations={scan.aiRecommendations}
      />

      {/* Findings */}
      {realFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings</CardTitle>
            <CardDescription>
              Structured observations stored with this scan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {realFindings.map((f, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">
                      {f.location ? `${f.location} — ` : ""}
                      {f.description}
                    </div>
                    {f.severity && (
                      <Badge variant={sevBadge[f.severity]} className="text-[10px]">
                        {f.severity}
                      </Badge>
                    )}
                  </div>
                  {f.characteristics && (
                    <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                      {f.characteristics}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Empty findings encouragement */}
      {realFindings.length === 0 && (
        <Alert variant="info">
          <CheckCircle2 />
          <AlertTitle>No structured findings recorded</AlertTitle>
          <AlertDescription>
            The AI report above contains the narrative interpretation. Add
            structured findings on next read via /mediscan/new.
          </AlertDescription>
        </Alert>
      )}

      {/* Differential / recommendations */}
      {(scan.aiDifferentialDiagnosis || scan.aiRecommendations) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {scan.aiDifferentialDiagnosis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Differential diagnosis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {scan.aiDifferentialDiagnosis}
                </p>
              </CardContent>
            </Card>
          )}
          {scan.aiRecommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {scan.aiRecommendations}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

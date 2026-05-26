import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  Eye,
  FileText,
  HeartPulse,
  ListChecks,
  Stethoscope,
  UserIcon,
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

import { getEncounterById } from "@/lib/queries/encounters";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  calculateAge,
  formatClinicalDate,
  formatPatientId,
} from "@/lib/utils";

import { SignEncounterButton } from "./_components/sign-encounter-button";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusVariant: Record<
  string,
  "info" | "warning" | "success" | "default" | "destructive"
> = {
  in_progress: "info",
  awaiting_review: "warning",
  signed: "success",
  amended: "default",
  cancelled: "destructive",
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Encounter ${id.slice(0, 8)}` };
}

export default async function EncounterDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const row = await getEncounterById(id);
  if (!row) notFound();

  const { encounter: e, patient, physician } = row;

  // Audit view (fire-and-forget).
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    void logAudit({
      actorId: session.user.id,
      action: "encounter.view",
      resourceType: "encounter",
      resourceId: e.id,
      patientId: patient.id,
    });
  }

  const soap = (e.soapNote ?? null) as {
    subjective?: Record<string, string | undefined>;
    objective?: Record<string, string | undefined>;
    assessment?: {
      diagnoses?: Array<{
        description: string;
        icdCode?: string;
        icdDescription?: string;
        verified?: boolean;
      }>;
      differentialDiagnosis?: string;
      clinicalReasoning?: string;
    };
    plan?: Record<string, string | undefined>;
  } | null;

  const isSigned = e.status === "signed";
  const isDraft = e.status === "awaiting_review" || e.status === "in_progress";

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/patients/${patient.id}?tab=encounters`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          Back to {patientName}
        </Link>
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                Encounter
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">
                {patientName}{" "}
                <span className="font-mono text-base font-medium text-[color:var(--color-muted-foreground)]">
                  · {formatPatientId(patient.id)}
                </span>
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--color-muted-foreground)]">
                <span className="capitalize">
                  {e.encounterType ?? "outpatient"}
                </span>
                <span>·</span>
                <span>{formatClinicalDate(e.encounterDate)}</span>
                <span>·</span>
                <span>
                  <UserIcon className="mr-1 inline size-3" />
                  {physician?.name ?? "Unknown physician"}
                  {physician?.specialty ? ` · ${physician.specialty}` : ""}
                </span>
                <span>·</span>
                <span>
                  {age} yrs · <span className="capitalize">{patient.sex}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={statusVariant[e.status] ?? "default"}
                className="text-[10px]"
              >
                {e.status.replace("_", " ")}
              </Badge>
              {isSigned && (
                <Badge variant="success" className="gap-1 text-[10px]">
                  <BadgeCheck className="size-3" />
                  {e.signedAt ? formatClinicalDate(e.signedAt) : "Signed"}
                </Badge>
              )}
              {isDraft && <SignEncounterButton encounterId={e.id} />}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* SOAP sections */}
      {!soap ? (
        <Alert>
          <AlertTitle>No SOAP note attached</AlertTitle>
          <AlertDescription>
            This encounter does not have a structured note yet.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <SoapSectionCard
            title="Subjective"
            icon={Stethoscope}
            accent="text-[color:var(--color-brand-magenta)]"
          >
            <Field label="Chief complaint" value={soap.subjective?.chiefComplaint} />
            <Field
              label="History of present illness"
              value={soap.subjective?.historyOfPresentIllness}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Past medical history"
                value={soap.subjective?.pastMedicalHistory}
              />
              <Field
                label="Current medications"
                value={soap.subjective?.medications}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Allergies" value={soap.subjective?.allergies} />
              <Field
                label="Review of systems"
                value={soap.subjective?.reviewOfSystems}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Social history" value={soap.subjective?.socialHistory} />
              <Field label="Family history" value={soap.subjective?.familyHistory} />
            </div>
          </SoapSectionCard>

          <SoapSectionCard
            title="Objective"
            icon={HeartPulse}
            accent="text-[color:var(--color-brand-navy)]"
          >
            <Field label="Vital signs" value={soap.objective?.vitalSigns} />
            <Field
              label="Physical examination"
              value={soap.objective?.physicalExamination}
            />
            <Field
              label="Diagnostic results"
              value={soap.objective?.diagnosticResults}
            />
          </SoapSectionCard>

          <SoapSectionCard
            title="Assessment"
            icon={ListChecks}
            accent="text-[color:var(--color-brand-purple)]"
          >
            {soap.assessment?.diagnoses && soap.assessment.diagnoses.length > 0 ? (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Diagnoses
                </div>
                <ul className="mt-2 space-y-2">
                  {soap.assessment.diagnoses.map((d, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-start gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{d.description}</div>
                        {(d.icdCode || d.icdDescription) && (
                          <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
                            {d.icdCode && (
                              <span className="font-mono">ICD {d.icdCode}</span>
                            )}
                            {d.icdDescription && d.icdCode ? " · " : ""}
                            {d.icdDescription}
                          </div>
                        )}
                      </div>
                      {d.verified ? (
                        <Badge variant="success" className="text-[10px]">
                          <BadgeCheck className="size-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Unverified
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Field
              label="Differential diagnosis"
              value={soap.assessment?.differentialDiagnosis}
            />
            <Field
              label="Clinical reasoning"
              value={soap.assessment?.clinicalReasoning}
            />
          </SoapSectionCard>

          <SoapSectionCard
            title="Plan"
            icon={ClipboardList}
            accent="text-[color:var(--color-brand-cyan)]"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Diagnostic plan" value={soap.plan?.diagnosticPlan} />
              <Field label="Therapeutic plan" value={soap.plan?.therapeuticPlan} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Patient education"
                value={soap.plan?.patientEducation}
              />
              <Field label="Follow-up" value={soap.plan?.followUp} />
            </div>
          </SoapSectionCard>
        </>
      )}

      {/* Transcripts */}
      {(e.rawTranscript || e.correctedTranscript) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="size-4 text-[color:var(--color-muted-foreground)]" />
              Transcripts
            </CardTitle>
            <CardDescription>Stored for audit and reference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {e.rawTranscript && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  Raw transcript
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3 font-sans text-sm leading-relaxed">
                  {e.rawTranscript}
                </pre>
              </div>
            )}
            {e.correctedTranscript && (
              <>
                {e.rawTranscript && <Separator />}
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    Corrected transcript
                  </div>
                  <pre className="whitespace-pre-wrap rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3 font-sans text-sm leading-relaxed">
                    {e.correctedTranscript}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ICD codes summary */}
      {e.icdCodes && Array.isArray(e.icdCodes) && e.icdCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-[color:var(--color-muted-foreground)]" />
              ICD-11 codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {e.icdCodes.map((c, i) => (
                <Badge
                  key={i}
                  variant={c.verified ? "success" : "outline"}
                  className="font-mono text-[11px]"
                >
                  {c.code} · {c.description}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SoapSectionCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ElementType;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`size-4 ${accent}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!value || value.trim().length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
        {value}
      </div>
    </div>
  );
}

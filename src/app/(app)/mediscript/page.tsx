import Link from "next/link";
import { ArrowLeft, Mic, Plus, Sparkles } from "lucide-react";
import { desc, eq, isNull, sql, and } from "drizzle-orm";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { db } from "@/db";
import { encounters, patients } from "@/db/schema";
import { formatClinicalDate, formatPatientId } from "@/lib/utils";

export const metadata = {
  title: "MediScript",
};

interface RecentSessionRow {
  id: string;
  encounterDate: Date;
  status: typeof encounters.$inferSelect.status;
  encounterType: string | null;
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
}

async function listRecentSessions(limit = 8): Promise<RecentSessionRow[]> {
  // Inline query — small enough to live with the page; doesn't deserve its
  // own file under src/lib/queries until MediScript grows more views.
  const rows = await db
    .select({
      id: encounters.id,
      encounterDate: encounters.encounterDate,
      status: encounters.status,
      encounterType: encounters.encounterType,
      patientId: encounters.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(encounters)
    .innerJoin(patients, eq(encounters.patientId, patients.id))
    .where(and(isNull(encounters.deletedAt), isNull(patients.deletedAt)))
    .orderBy(desc(encounters.encounterDate))
    .limit(limit);
  return rows;
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

export default async function MediScriptPage() {
  const [recent, [{ count: total }]] = await Promise.all([
    listRecentSessions(8),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(encounters)
      .where(isNull(encounters.deletedAt)),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          Dashboard
        </Link>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
              Cognitive Clinical Observer
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              <span className="grad-text">MediScript</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[color:var(--color-muted-foreground)]">
              Record a consultation. Get a structured SOAP note, ICD-11 codes,
              and an audit-ready encounter — all reviewed and signed by you.
            </p>
          </div>
          <Link href="/mediscript/new">
            <Button variant="brand" size="md">
              <Plus className="size-4" />
              New session
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero CTA */}
      <Card className="overflow-hidden">
        <div className="h-1.5 grad-brand" aria-hidden />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 place-items-center rounded-2xl grad-pink-navy text-white">
                <Mic className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Start an encounter recording
                </h2>
                <p className="mt-1 max-w-lg text-sm text-[color:var(--color-muted-foreground)]">
                  Pick the patient, hit record, speak naturally. Pause and resume
                  whenever you like. The AI will draft a SOAP note for your
                  review.
                </p>
              </div>
            </div>
            <Link href="/mediscript/new">
              <Button variant="brand" size="lg">
                Begin <Sparkles className="size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent encounters</CardTitle>
              <CardDescription>
                {total === 0
                  ? "Nothing recorded yet — your sessions will appear here."
                  : `${total.toLocaleString()} encounter${total === 1 ? "" : "s"} in the system`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-2 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
                <Mic className="size-6" />
              </div>
              <p className="text-sm font-semibold">No encounters yet</p>
              <p className="max-w-md text-xs text-[color:var(--color-muted-foreground)]">
                Run your first MediScript session to build a structured patient
                record from voice.
              </p>
              <Link href="/mediscript/new">
                <Button variant="brand" size="sm">
                  Start the first session
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium">
                      {formatClinicalDate(r.encounterDate)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${r.patientId}?tab=encounters`}
                        className="hover:text-[color:var(--color-brand-magenta)]"
                      >
                        <span className="font-semibold">
                          {r.patientFirstName} {r.patientLastName}
                        </span>
                        <span className="ml-2 font-mono text-[11px] text-[color:var(--color-muted-foreground)]">
                          {formatPatientId(r.patientId)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {r.encounterType ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant[r.status] ?? "default"}
                        className="text-[10px]"
                      >
                        {r.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* What this module does */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What MediScript captures</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Bullet title="Browser-native recording">
            <code className="font-mono text-[10px]">MediaRecorder</code> + Web
            Audio. No app to install. Live waveform, pause and resume.
          </Bullet>
          <Bullet title="Structured SOAP output">
            Subjective, Objective, Assessment, Plan — typed JSON, FHIR-aligned,
            stored as <code className="font-mono text-[10px]">jsonb</code> for
            future querying.
          </Bullet>
          <Bullet title="ICD-11 mapping">
            Diagnoses are surfaced with WHO ICD-11 codes when available.
            Physician verifies before signing.
          </Bullet>
          <Bullet title="Doctor in the loop">
            Every word the AI writes goes through your review. Nothing is
            auto-signed.
          </Bullet>
        </CardContent>
      </Card>
    </div>
  );
}

function Bullet({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[color:var(--color-border)] p-4">
      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
        <Sparkles className="size-3.5" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs text-[color:var(--color-muted-foreground)]">
          {children}
        </div>
      </div>
    </div>
  );
}

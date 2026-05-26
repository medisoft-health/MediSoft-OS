import Link from "next/link";
import { ArrowLeft, Pill, Plus, ShieldAlert, Sparkles } from "lucide-react";

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

import {
  countPrescriptionsByStatus,
  listRecentPrescriptions,
} from "@/lib/queries/prescriptions";
import { formatClinicalDate, formatPatientId } from "@/lib/utils";

export const metadata = {
  title: "PharmaX",
};

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

const severityVariant: Record<
  string,
  "info" | "warning" | "destructive" | "critical"
> = {
  low: "info",
  moderate: "warning",
  high: "destructive",
  critical: "critical",
};

export default async function PharmaxPage() {
  const [recent, counts] = await Promise.all([
    listRecentPrescriptions(15),
    countPrescriptionsByStatus(),
  ]);

  const total =
    (counts.draft ?? 0) +
    (counts.active ?? 0) +
    (counts.completed ?? 0) +
    (counts.discontinued ?? 0) +
    (counts.cancelled ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
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
              Pharmacokinetic Guard
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              <span className="grad-text">PharmaX</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[color:var(--color-muted-foreground)]">
              Three-layer drug safety. RxNorm-normalized identification,
              FDA-label warnings, and a Gemini-written clinical summary —
              before you sign the prescription.
            </p>
          </div>
          <Link href="/pharmax/new">
            <Button variant="brand" size="md">
              <Plus className="size-4" />
              New prescription
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Active" value={counts.active ?? 0} tone="success" />
        <Kpi label="Drafts" value={counts.draft ?? 0} tone="warning" />
        <Kpi label="Completed" value={counts.completed ?? 0} tone="info" />
        <Kpi label="Total" value={total} tone="neutral" />
      </section>

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="h-1.5 grad-brand" aria-hidden />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 place-items-center rounded-2xl grad-pink-navy text-white">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Build a new prescription
                </h2>
                <p className="mt-1 max-w-lg text-sm text-[color:var(--color-muted-foreground)]">
                  Pick a patient, add drugs from RxNorm, edit dose / frequency /
                  route. The safety panel updates live as you go.
                </p>
              </div>
            </div>
            <Link href="/pharmax/new">
              <Button variant="brand" size="lg">
                Begin <Sparkles className="size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent prescriptions</CardTitle>
          <CardDescription>
            {total === 0
              ? "Nothing prescribed yet — your prescriptions will appear here."
              : `${total.toLocaleString()} prescription${total === 1 ? "" : "s"} in the system`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-2 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
                <Pill className="size-6" />
              </div>
              <p className="text-sm font-semibold">No prescriptions yet</p>
              <p className="max-w-md text-xs text-[color:var(--color-muted-foreground)]">
                Build your first prescription with PharmaX&apos;s three-layer
                safety check.
              </p>
              <Link href="/pharmax/new">
                <Button variant="brand" size="sm">
                  Build the first one
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                      {formatClinicalDate(r.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${r.patientId}`}
                        className="hover:text-[color:var(--color-brand-magenta)]"
                      >
                        <span className="font-semibold">
                          {r.patientFirstName} {r.patientLastName}
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-[color:var(--color-muted-foreground)]">
                          {formatPatientId(r.patientId)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/pharmax/${r.id}`}
                        className="text-sm font-semibold hover:text-[color:var(--color-brand-magenta)]"
                      >
                        {r.drugName}
                      </Link>
                      {r.brandName && (
                        <span className="ml-1 text-[10px] text-[color:var(--color-muted-foreground)]">
                          ({r.brandName})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.dose}
                      <span className="ml-2 text-[10px] text-[color:var(--color-muted-foreground)]">
                        {r.frequency} · {r.route}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant[r.status] ?? "default"}
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.severity ? (
                        <Badge
                          variant={severityVariant[r.severity] ?? "info"}
                          className="text-[10px]"
                        >
                          {r.severity}
                        </Badge>
                      ) : (
                        <span className="text-xs text-[color:var(--color-muted-foreground)]">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "info" | "neutral";
}) {
  const dot = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-sky-500",
    neutral: "bg-slate-400",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${dot}`} />
          <span className="text-xs text-[color:var(--color-muted-foreground)]">
            {label}
          </span>
        </div>
        <div className="mt-1.5 text-3xl font-black tabular-nums tracking-tight">
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

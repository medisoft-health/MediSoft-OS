import Link from "next/link";
import { ArrowLeft, Beaker, Plus, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  countLabsByCriticalFlag,
  listRecentLabs,
} from "@/lib/queries/labs";
import { formatClinicalDate, formatPatientId } from "@/lib/utils";

export const metadata = {
  title: "MediLab",
};

export default async function MedilabPage() {
  const [recent, counts] = await Promise.all([
    listRecentLabs(15),
    countLabsByCriticalFlag(),
  ]);

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
              Biomarker Narrative
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              <span className="grad-text">MediLab</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[color:var(--color-muted-foreground)]">
              Curated reference ranges, automatic flagging, and a Gemini-written
              narrative aimed at the audience you choose — physician or patient.
            </p>
          </div>
          <Link href="/medilab/new">
            <Button variant="brand" size="md">
              <Plus className="size-4" />
              New result
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-[color:var(--color-muted-foreground)]">Total results</div>
            <div className="mt-1.5 text-3xl font-black tabular-nums tracking-tight">
              {counts.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-[color:var(--color-muted-foreground)]">With critical flags</div>
            <div className="mt-1.5 text-3xl font-black tabular-nums tracking-tight">
              {counts.withCritical.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-[color:var(--color-muted-foreground)]">Critical rate</div>
            <div className="mt-1.5 text-3xl font-black tabular-nums tracking-tight">
              {counts.total > 0
                ? `${Math.round((counts.withCritical / counts.total) * 100)}%`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="h-1.5 grad-brand" aria-hidden />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 place-items-center rounded-2xl grad-pink-navy text-white">
                <Beaker className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Record a lab result
                </h2>
                <p className="mt-1 max-w-lg text-sm text-[color:var(--color-muted-foreground)]">
                  Pick a curated panel, type each value, watch the flags appear
                  live, save with one click.
                </p>
              </div>
            </div>
            <Link href="/medilab/new">
              <Button variant="brand" size="lg">
                Begin <Sparkles className="size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent results</CardTitle>
          <CardDescription>
            {counts.total === 0
              ? "Nothing recorded yet — saved lab panels will appear here."
              : `${counts.total.toLocaleString()} panel${counts.total === 1 ? "" : "s"} in the system`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-2 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
                <Beaker className="size-6" />
              </div>
              <p className="text-sm font-semibold">No lab results yet</p>
              <p className="max-w-md text-xs text-[color:var(--color-muted-foreground)]">
                Add the first panel — MediLab will flag abnormal values and can
                generate a dual-audience narrative.
              </p>
              <Link href="/medilab/new">
                <Button variant="brand" size="sm">
                  Add the first result
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Panel</TableHead>
                  <TableHead>Lab</TableHead>
                  <TableHead>Physician</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                      {formatClinicalDate(r.resultDate)}
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
                        href={`/medilab/${r.id}`}
                        className="font-semibold hover:text-[color:var(--color-brand-magenta)]"
                      >
                        {r.panelName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                      {r.laboratory ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.physicianName ?? "—"}
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

import Link from "next/link";
import { ArrowLeft, Plus, ScanLine, Sparkles } from "lucide-react";

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
  countScansByType,
  countScansTotalAndAi,
  listRecentScans,
} from "@/lib/queries/scans";
import { ModuleLogo } from "@/components/brand/module-logo";
import { formatClinicalDate, formatPatientId } from "@/lib/utils";

export const metadata = {
  title: "MediScan",
};

export default async function MediscanPage() {
  const [recent, byType, counts] = await Promise.all([
    listRecentScans(15),
    countScansByType(),
    countScansTotalAndAi(),
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
              Vision Intelligence
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              <ModuleLogo module="mediscan" height={40} />
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[color:var(--color-muted-foreground)]">
              AI-assisted reading of radiology and medical images. Doctor-
              friendly report, patient-friendly summary, both reviewed by you.
            </p>
          </div>
          <Link href="/mediscan/new">
            <Button variant="brand" size="md">
              <Plus className="size-4" />
              New scan
            </Button>
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total scans" value={counts.total} />
        <Kpi label="With AI report" value={counts.withAi} />
        <Kpi label="X-ray" value={byType.xray ?? 0} />
        <Kpi label="Other modalities" value={counts.total - (byType.xray ?? 0)} />
      </section>

      <Card className="overflow-hidden">
        <div className="h-1.5 grad-brand" aria-hidden />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 place-items-center rounded-2xl grad-pink-navy text-white">
                <ScanLine className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Read a new scan
                </h2>
                <p className="mt-1 max-w-lg text-sm text-[color:var(--color-muted-foreground)]">
                  Upload an X-ray, CT/MRI export, ultrasound, or pathology image.
                  Annotate. Get a dual-audience AI report. Save the encounter.
                </p>
              </div>
            </div>
            <Link href="/mediscan/new">
              <Button variant="brand" size="lg">
                Begin <Sparkles className="size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent scans</CardTitle>
          <CardDescription>
            {counts.total === 0
              ? "Nothing saved yet — your scans will appear here."
              : `${counts.total.toLocaleString()} scan${counts.total === 1 ? "" : "s"} in the system`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-2 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
                <ScanLine className="size-6" />
              </div>
              <p className="text-sm font-semibold">No scans yet</p>
              <p className="max-w-md text-xs text-[color:var(--color-muted-foreground)]">
                Upload the first image to build your imaging archive.
              </p>
              <Link href="/mediscan/new">
                <Button variant="brand" size="sm">
                  Add the first scan
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                      {formatClinicalDate(r.studyDate ?? r.createdAt)}
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
                        href={`/mediscan/${r.id}`}
                        className="font-semibold capitalize hover:text-[color:var(--color-brand-magenta)]"
                      >
                        {r.scanType}
                      </Link>
                      {r.modality && (
                        <span className="ml-2 text-[10px] text-[color:var(--color-muted-foreground)]">
                          {r.modality}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.bodyPart}</TableCell>
                    <TableCell>
                      {r.hasAiReport ? (
                        <Badge variant="success" className="text-[10px]">
                          AI report
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

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-[color:var(--color-muted-foreground)]">{label}</div>
        <div className="mt-1.5 text-3xl font-black tabular-nums tracking-tight">
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

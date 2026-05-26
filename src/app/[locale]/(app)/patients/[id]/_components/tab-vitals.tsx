import { HeartPulse } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  classifyBMI,
  classifyBP,
  classifyHR,
  classifyPain,
  classifyRR,
  classifySpO2,
  classifyTemp,
  toNumber,
} from "@/lib/validations/vitals";
import { formatClinicalDate } from "@/lib/utils";

import type { VitalRow } from "@/lib/queries/vitals";
import { RecordVitalsButton } from "./record-vitals-button";
import { VitalsTrendChart } from "./vitals-trend-chart";

interface Props {
  patientId: number;
  vitals: VitalRow[];
}

const flagBadgeVariant: Record<
  string,
  "success" | "warning" | "destructive" | "critical" | "info" | "default"
> = {
  normal: "success",
  borderline: "warning",
  high: "destructive",
  low: "info",
  critical: "critical",
};

export function TabVitals({ patientId, vitals }: Props) {
  const latest = vitals[0];

  if (!latest) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">No vitals recorded yet</div>
            <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
              Record the first reading to start building trend charts.
            </div>
          </div>
          <RecordVitalsButton patientId={patientId} variant="brand" size="sm" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Latest reading cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Latest reading</CardTitle>
            <CardDescription>
              Recorded {formatClinicalDate(latest.recordedAt)} · classification
              based on adult reference ranges.
            </CardDescription>
          </div>
          <RecordVitalsButton patientId={patientId} variant="brand" size="sm" icon="plus" label="New reading" />
        </CardHeader>
        <CardContent>
          <LatestGrid v={latest} />
        </CardContent>
      </Card>

      {/* Trends */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <VitalsTrendChart
          title="Blood pressure — Systolic"
          unit="mmHg"
          color="#E84A8A"
          refLow={90}
          refHigh={130}
          data={vitals
            .filter((v) => v.bloodPressureSystolic != null)
            .map((v) => ({
              recordedAt: v.recordedAt,
              value: v.bloodPressureSystolic!,
            }))}
        />
        <VitalsTrendChart
          title="Heart rate"
          unit="bpm"
          color="#1E3A8C"
          refLow={60}
          refHigh={100}
          data={vitals
            .filter((v) => v.heartRate != null)
            .map((v) => ({ recordedAt: v.recordedAt, value: v.heartRate! }))}
        />
        <VitalsTrendChart
          title="Temperature"
          unit="°C"
          color="#F5A04A"
          refLow={36}
          refHigh={37.5}
          data={vitals
            .map((v) => ({
              recordedAt: v.recordedAt,
              value: toNumber(v.temperature),
            }))
            .filter((d): d is { recordedAt: Date; value: number } => d.value != null)}
        />
        <VitalsTrendChart
          title="SpO₂"
          unit="%"
          color="#3FC4D9"
          refLow={95}
          data={vitals
            .filter((v) => v.spO2 != null)
            .map((v) => ({ recordedAt: v.recordedAt, value: v.spO2! }))}
        />
      </div>

      {/* History table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All readings</CardTitle>
          <CardDescription>{vitals.length} total · newest first</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>BP</TableHead>
                <TableHead>HR</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>SpO₂</TableHead>
                <TableHead>RR</TableHead>
                <TableHead>BMI</TableHead>
                <TableHead>Pain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vitals.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                    {formatClinicalDate(v.recordedAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {v.bloodPressureSystolic && v.bloodPressureDiastolic
                      ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {v.heartRate ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {toNumber(v.temperature) ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {v.spO2 ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {v.respiratoryRate ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {toNumber(v.bmi) ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {v.pain ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LatestGrid({ v }: { v: VitalRow }) {
  const temp = toNumber(v.temperature);
  const bmi = toNumber(v.bmi);

  const tiles = [
    {
      label: "Blood pressure",
      value:
        v.bloodPressureSystolic && v.bloodPressureDiastolic
          ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
          : null,
      unit: "mmHg",
      cls: classifyBP(v.bloodPressureSystolic, v.bloodPressureDiastolic),
    },
    {
      label: "Heart rate",
      value: v.heartRate ?? null,
      unit: "bpm",
      cls: classifyHR(v.heartRate),
    },
    {
      label: "Temperature",
      value: temp,
      unit: "°C",
      cls: classifyTemp(temp),
    },
    {
      label: "SpO₂",
      value: v.spO2 ?? null,
      unit: "%",
      cls: classifySpO2(v.spO2),
    },
    {
      label: "Respiratory rate",
      value: v.respiratoryRate ?? null,
      unit: "breaths/min",
      cls: classifyRR(v.respiratoryRate),
    },
    {
      label: "BMI",
      value: bmi,
      unit: "kg/m²",
      cls: classifyBMI(bmi),
    },
    {
      label: "Pain",
      value: v.pain ?? null,
      unit: "/10",
      cls: classifyPain(v.pain),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-xl border border-[color:var(--color-border)] p-4"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            {t.label}
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black tabular-nums tracking-tight">
              {t.value != null ? String(t.value) : "—"}
            </span>
            {t.value != null && (
              <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
                {t.unit}
              </span>
            )}
          </div>
          {t.cls && (
            <div className="mt-2">
              <Badge variant={flagBadgeVariant[t.cls.flag]} className="text-[9px]">
                {t.cls.label}
              </Badge>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

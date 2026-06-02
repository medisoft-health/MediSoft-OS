import { AlertTriangle, HeartPulse, Pill, Sparkles, Stethoscope } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  classifyBP,
  classifyBMI,
  classifyHR,
  classifySpO2,
  classifyTemp,
  toNumber,
} from "@/lib/validations/vitals";
import { formatClinicalDate } from "@/lib/utils";
import { RecordVitalsButton } from "./record-vitals-button";

import type { Patient } from "@/db/schema";
import type { VitalRow } from "@/lib/queries/vitals";
import type { PrescriptionRow } from "@/lib/queries/patient-detail";

interface Props {
  patient: Patient;
  latestVitals: VitalRow | null;
  recentPrescriptions: PrescriptionRow[];
}

const flagColor: Record<string, string> = {
  normal: "text-emerald-700",
  borderline: "text-amber-700",
  high: "text-orange-700",
  low: "text-sky-700",
  critical: "text-rose-700",
};

const sevColor: Record<string, "warning" | "destructive" | "critical" | "default"> = {
  mild: "default",
  moderate: "warning",
  severe: "destructive",
  "life-threatening": "critical",
};

export function TabOverview({ patient, latestVitals, recentPrescriptions }: Props) {
  const allergies =
    (patient.allergies as { substance: string; reaction?: string; severity?: string }[] | null) ??
    [];
  const conditions =
    (patient.chronicConditions as { description: string; icdCode?: string; onsetDate?: string }[] | null) ??
    [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {/* AI Medical Narrative — placeholder until Medical Intelligence is wired */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl grad-pink-navy text-white">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Clinical medical narrative</CardTitle>
                  <CardDescription className="text-[11px]">
                    Auto-generated clinical summary
                  </CardDescription>
                </div>
              </div>
              <Badge variant="info" className="text-[10px]">
                Coming soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Alert>
              <Sparkles />
              <AlertTitle>Medical Intelligence not yet configured</AlertTitle>
              <AlertDescription>
                Once your{" "}
                <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5 text-[11px]">
                  GOOGLE_GEMINI_API_KEY
                </code>{" "}
                is added to <code>.env.local</code>, this card will
                generate a structured medical narrative drawn from the full
                patient record.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-[color:var(--color-brand-navy)]" />
              <CardTitle className="text-base">Active conditions</CardTitle>
            </div>
            <CardDescription>
              Chronic / ongoing problems on the patient&apos;s record
            </CardDescription>
          </CardHeader>
          <CardContent>
            {conditions.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                No active conditions recorded.
              </p>
            ) : (
              <ul className="space-y-2">
                {conditions.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3"
                  >
                    <div>
                      <div className="text-sm font-semibold">{c.description}</div>
                      <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
                        {c.icdCode ? `ICD ${c.icdCode}` : "Unmapped"}
                        {c.onsetDate ? ` · Since ${formatClinicalDate(c.onsetDate)}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Prescriptions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="size-4 text-[color:var(--color-brand-magenta)]" />
                <CardTitle className="text-base">Recent prescriptions</CardTitle>
              </div>
              <span className="text-xs text-[color:var(--color-muted-foreground)]">
                {recentPrescriptions.length} total
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {recentPrescriptions.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                No prescriptions yet. PharmaX will add them here automatically.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentPrescriptions.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--color-border)] p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p.drugName}</div>
                      <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
                        {p.dose} · {p.frequency}
                      </div>
                    </div>
                    <Badge
                      variant={
                        p.status === "active"
                          ? "success"
                          : p.status === "draft"
                            ? "warning"
                            : "default"
                      }
                      className="text-[10px]"
                    >
                      {p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Latest vitals snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="size-4 text-[color:var(--color-brand-pink)]" />
                <CardTitle className="text-base">Latest vitals</CardTitle>
              </div>
              <RecordVitalsButton
                patientId={patient.id}
                variant="ghost"
                size="sm"
                label="Add"
                icon="plus"
              />
            </div>
            <CardDescription>
              {latestVitals
                ? `Recorded ${formatClinicalDate(latestVitals.recordedAt)}`
                : "No readings yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!latestVitals ? (
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                Record the first vitals reading to populate this card.
              </p>
            ) : (
              <VitalsSnapshot v={latestVitals} />
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <CardTitle className="text-base">Allergies</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {allergies.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                No known allergies.
              </p>
            ) : (
              <ul className="space-y-2">
                {allergies.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{a.substance}</div>
                      {a.reaction && (
                        <div className="truncate text-[11px] text-[color:var(--color-muted-foreground)]">
                          {a.reaction}
                        </div>
                      )}
                    </div>
                    {a.severity && (
                      <Badge
                        variant={sevColor[a.severity] ?? "default"}
                        className="text-[10px]"
                      >
                        {a.severity}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* History summary */}
        {(patient.medicalHistory || patient.familyHistory || patient.socialHistory) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {patient.medicalHistory && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    Medical
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{patient.medicalHistory}</p>
                </div>
              )}
              {patient.familyHistory && (
                <>
                  <Separator />
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                      Family
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{patient.familyHistory}</p>
                  </div>
                </>
              )}
              {patient.socialHistory && (
                <>
                  <Separator />
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                      Social
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{patient.socialHistory}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function VitalsSnapshot({ v }: { v: VitalRow }) {
  const temp = toNumber(v.temperature);
  const bmi = toNumber(v.bmi);
  const bp = classifyBP(v.bloodPressureSystolic, v.bloodPressureDiastolic);
  const hr = classifyHR(v.heartRate);
  const t = classifyTemp(temp);
  const o2 = classifySpO2(v.spO2);
  const bmiCls = classifyBMI(bmi);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        label="BP"
        value={
          v.bloodPressureSystolic && v.bloodPressureDiastolic
            ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
            : "—"
        }
        unit={v.bloodPressureSystolic ? "mmHg" : ""}
        tone={bp?.flag}
      />
      <Tile label="HR" value={v.heartRate ?? "—"} unit={v.heartRate ? "bpm" : ""} tone={hr?.flag} />
      <Tile label="Temp" value={temp ?? "—"} unit={temp ? "°C" : ""} tone={t?.flag} />
      <Tile label="SpO₂" value={v.spO2 ?? "—"} unit={v.spO2 ? "%" : ""} tone={o2?.flag} />
      {bmi != null && <Tile label="BMI" value={bmi} unit="kg/m²" tone={bmiCls?.flag} span={2} />}
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  tone,
  span = 1,
}: {
  label: string;
  value: number | string;
  unit: string;
  tone?: string;
  span?: 1 | 2;
}) {
  return (
    <div
      className={`rounded-xl border border-[color:var(--color-border)] p-3 ${span === 2 ? "col-span-2" : ""}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-xl font-black tabular-nums ${tone ? flagColor[tone] : ""}`}>
          {value}
        </span>
        {unit && <span className="text-[10px] text-[color:var(--color-muted-foreground)]">{unit}</span>}
      </div>
    </div>
  );
}

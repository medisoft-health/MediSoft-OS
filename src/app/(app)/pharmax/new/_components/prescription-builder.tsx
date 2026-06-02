"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Loader2,
  Pill,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PatientPicker, type PickedPatient } from "@/app/(app)/mediscript/_components/patient-picker";
import { DrugPicker } from "./drug-picker";
import { SafetyPanel } from "./safety-panel";

import { createPrescription } from "@/lib/actions/prescriptions";
import {
  ROUTE_OPTIONS,
  type PrescriptionDrugInput,
} from "@/lib/validations/prescription";
import { analyzeDrugSafetyClient } from "@/lib/pharmax/client";
import type { DrugSafetyResult } from "@/lib/ai/pharmax-analyzer";

interface InitialPatient {
  id: number;
  label: string;
  sublabel: string;
}

interface Props {
  initialPatient: InitialPatient | null;
}

interface DraftDrug extends PrescriptionDrugInput {
  /** Local-only UID for React key. */
  uid: string;
}

const newUid = () => Math.random().toString(36).slice(2, 10);

function blankDrug(seed?: Partial<PrescriptionDrugInput>): DraftDrug {
  return {
    uid: newUid(),
    drugName: "",
    brandName: "",
    rxcui: "",
    atcCode: "",
    dose: "",
    frequency: "",
    route: "oral",
    duration: "",
    instructions: "",
    quantity: undefined,
    refills: 0,
    ...seed,
  };
}

/** Common frequency shorthands surfaced via a dropdown for speed. */
const FREQUENCY_OPTIONS = [
  "Once daily",
  "BID (twice daily)",
  "TID (three times daily)",
  "QID (four times daily)",
  "Every 4 hours",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "PRN (as needed)",
  "Before meals",
  "After meals",
  "At bedtime",
  "Custom",
];

export function PrescriptionBuilder({ initialPatient }: Props) {
  const router = useRouter();
  const search = useSearchParams();

  const [patient, setPatient] = React.useState<PickedPatient | null>(initialPatient);
  const [drugs, setDrugs] = React.useState<DraftDrug[]>([]);
  const [analysis, setAnalysis] = React.useState<DrugSafetyResult | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Debounced safety analysis on drug-list change.
  React.useEffect(() => {
    const namedDrugs = drugs.filter((d) => d.drugName.trim().length >= 2);
    if (namedDrugs.length === 0) {
      setAnalysis(null);
      setAnalyzeError(null);
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const result = await analyzeDrugSafetyClient(
        {
          drugs: namedDrugs.map((d) => ({
            drugName: d.drugName.trim(),
            rxcui: d.rxcui?.trim() || undefined,
          })),
          patientId: patient?.id,
        },
        ctrl.signal,
      );
      if (result.kind === "ok") {
        setAnalysis(result.data);
      } else if (result.message !== "Cancelled") {
        setAnalyzeError(result.message);
      }
      setAnalyzing(false);
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // Re-run when drug identities or patient change. Avoid running on every
    // dose/route keystroke — that wouldn't change the safety picture.
  }, [
    drugs.map((d) => `${d.drugName}|${d.rxcui}`).join(";"),
    patient?.id,
  ]);  

  function addDrugFromRxNorm(c: {
    rxcui: string;
    name: string;
    tty: string;
  }) {
    setDrugs((prev) => [
      ...prev,
      blankDrug({
        drugName: c.name,
        rxcui: c.rxcui || "",
        // We'll let the user fill brand later if relevant.
      }),
    ]);
  }

  function updateDrug(uid: string, patch: Partial<PrescriptionDrugInput>) {
    setDrugs((prev) =>
      prev.map((d) => (d.uid === uid ? { ...d, ...patch } : d)),
    );
  }

  function removeDrug(uid: string) {
    setDrugs((prev) => prev.filter((d) => d.uid !== uid));
  }

  const canSubmit = !!patient && drugs.length > 0;

  async function handleSave(finalize: boolean) {
    if (!patient || drugs.length === 0) return;
    setSubmitting(true);
    try {
      const result = await createPrescription({
        patientId: patient.id,
        encounterId: search.get("encounterId") ?? undefined,
        drugs: drugs.map(({ uid: _uid, ...rest }) => rest),
        finalize,
      });
      if (!result.ok) {
        toast.error("Could not save prescription", { description: result.error });
        return;
      }
      toast.success(
        finalize
          ? `Prescription activated — ${result.data.ids.length} drug${result.data.ids.length === 1 ? "" : "s"}`
          : "Prescription saved as draft",
        {
          description: result.data.severity
            ? `Highest severity: ${result.data.severity}`
            : "No interactions flagged.",
        },
      );
      router.push(`/patients/${patient.id}?tab=encounters`);
      router.refresh();
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* ───── Builder column ───── */}
      <div className="space-y-6">
        {/* Patient picker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient</CardTitle>
            <CardDescription>
              Who is this prescription for? Search by name, ID, MRN, or phone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientPicker
              value={patient}
              onChange={setPatient}
              disabled={submitting}
            />
          </CardContent>
        </Card>

        {/* Drug picker + list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="size-4 text-[color:var(--color-brand-magenta)]" />
                Drugs
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {drugs.length} added
              </Badge>
            </div>
            <CardDescription>
              Pick a drug from RxNorm or type it manually. Safety analysis
              runs automatically after each change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <DrugPicker onPick={addDrugFromRxNorm} disabled={submitting} />

            {drugs.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                Add the first drug above. You can edit dose, frequency, and
                route after picking.
              </p>
            ) : (
              <ul className="space-y-3">
                {drugs.map((d, i) => (
                  <li key={d.uid}>
                    <DrugRow
                      index={i + 1}
                      drug={d}
                      onChange={(patch) => updateDrug(d.uid, patch)}
                      onRemove={() => removeDrug(d.uid)}
                      disabled={submitting}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Save actions */}
        <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-card)]/95 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8">
          <Link href="/pharmax">
            <Button variant="ghost" size="md" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              disabled={!canSubmit || submitting}
              onClick={() => handleSave(false)}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save as draft
                </>
              )}
            </Button>
            <Button
              variant="brand"
              size="md"
              disabled={!canSubmit || submitting}
              onClick={() => handleSave(true)}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Activating…
                </>
              ) : (
                <>
                  Activate prescription
                  <ChevronRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ───── Safety column ───── */}
      <SafetyPanel
        loading={analyzing}
        result={analysis}
        error={analyzeError}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// One drug row
// ─────────────────────────────────────────────────────────────────
interface DrugRowProps {
  index: number;
  drug: DraftDrug;
  onChange: (patch: Partial<PrescriptionDrugInput>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function DrugRow({ index, drug, onChange, onRemove, disabled }: DrugRowProps) {
  const isCustomFrequency =
    drug.frequency.length > 0 && !FREQUENCY_OPTIONS.includes(drug.frequency);

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-[10px]">
            #{index}
          </Badge>
          <div className="text-sm font-semibold">
            {drug.drugName || "Untitled drug"}
          </div>
          {drug.rxcui && (
            <Badge variant="outline" className="font-mono text-[10px]">
              RxCUI {drug.rxcui}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove drug"
          disabled={disabled}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Drug name *</Label>
          <Input
            value={drug.drugName}
            onChange={(e) => onChange({ drugName: e.target.value })}
            placeholder="Amoxicillin"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Brand</Label>
          <Input
            value={drug.brandName ?? ""}
            onChange={(e) => onChange({ brandName: e.target.value })}
            placeholder="Optional"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Dose *</Label>
          <Input
            value={drug.dose}
            onChange={(e) => onChange({ dose: e.target.value })}
            placeholder="500 mg"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Frequency *</Label>
          <Select
            value={isCustomFrequency ? "Custom" : drug.frequency || ""}
            onValueChange={(v) => onChange({ frequency: v === "Custom" ? "" : v })}
            disabled={disabled}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(drug.frequency === "" || isCustomFrequency) && (
            <Input
              value={isCustomFrequency ? drug.frequency : ""}
              onChange={(e) => onChange({ frequency: e.target.value })}
              placeholder="Custom frequency text"
              className="mt-1.5"
              disabled={disabled}
            />
          )}
        </div>
        <div>
          <Label>Route *</Label>
          <Select
            value={drug.route || "oral"}
            onValueChange={(v) => onChange({ route: v })}
            disabled={disabled}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUTE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Duration</Label>
          <Input
            value={drug.duration ?? ""}
            onChange={(e) => onChange({ duration: e.target.value })}
            placeholder="e.g. 7 days"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            min={0}
            value={drug.quantity ?? ""}
            onChange={(e) =>
              onChange({
                quantity:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Refills</Label>
          <Input
            type="number"
            min={0}
            max={99}
            value={drug.refills ?? 0}
            onChange={(e) =>
              onChange({ refills: Number(e.target.value || 0) })
            }
            disabled={disabled}
          />
        </div>
      </div>

      <div className="mt-3">
        <Label>Instructions</Label>
        <Textarea
          rows={2}
          value={drug.instructions ?? ""}
          onChange={(e) => onChange({ instructions: e.target.value })}
          placeholder="Take with food. Avoid alcohol. Etc."
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Unused but kept for future "show severity inline per drug" UI.
function _SeverityIndicator({ severity }: { severity: string | null }) {
  if (!severity) return null;
  return (
    <Badge variant="info" className="gap-1 text-[10px]">
      <ShieldAlert className="size-3" />
      {severity}
      <Check className="size-3" />
    </Badge>
  );
}

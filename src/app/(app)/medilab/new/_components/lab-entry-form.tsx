"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Beaker,
  ClipboardPaste,
  FileUp,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { PatientPicker, type PickedPatient } from "@/components/clinical/patient-picker";
import { extractLabFromFile } from "@/lib/medilab/client";
import {
  PANELS,
  type PanelSpec,
  type BiomarkerSpec,
  pickRange,
  findPanelByCategory,
  findBiomarkerByName,
} from "@/lib/medilab/biomarkers";
import {
  classifyResult,
  type LabFlag,
} from "@/lib/medilab/classify";
import { createLabResult } from "@/lib/actions/labs";
import { cn } from "@/lib/utils";

interface InitialPatient {
  id: number;
  label: string;
  sublabel: string;
  sex?: string | null;
  dateOfBirth?: string | null;
}

interface Props {
  initialPatient: InitialPatient | null;
}

interface RowDraft {
  uid: string;
  testName: string;
  loincCode: string;
  value: string; // string for free input; coerced on save
  unit: string;
  referenceLow: string;
  referenceHigh: string;
  interpretation: string;
  /** Computed live, not sent — server re-classifies. */
  liveFlag: LabFlag | null;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function rowFromBiomarker(b: BiomarkerSpec, sex?: "male" | "female"): RowDraft {
  const range = pickRange(b, sex);
  return {
    uid: uid(),
    testName: b.name,
    loincCode: b.loinc,
    value: "",
    unit: b.unit,
    referenceLow: range ? String(range.low) : "",
    referenceHigh: range ? String(range.high) : "",
    interpretation: "",
    liveFlag: null,
  };
}

function emptyRow(): RowDraft {
  return {
    uid: uid(),
    testName: "",
    loincCode: "",
    value: "",
    unit: "",
    referenceLow: "",
    referenceHigh: "",
    interpretation: "",
    liveFlag: null,
  };
}

export function LabEntryForm({ initialPatient }: Props) {
  const router = useRouter();
  const [patient, setPatient] = React.useState<PickedPatient | null>(
    initialPatient,
  );
  const [patientMeta] = React.useState<{
    sex?: "male" | "female";
    age?: number;
  }>(() => {
    const sex =
      initialPatient?.sex === "male" || initialPatient?.sex === "female"
        ? initialPatient.sex
        : undefined;
    const age = initialPatient?.dateOfBirth
      ? new Date().getFullYear() -
        new Date(initialPatient.dateOfBirth).getFullYear()
      : undefined;
    return { sex, age };
  });

  const [selectedPanelId, setSelectedPanelId] = React.useState<string | null>(null);
  const [panelName, setPanelName] = React.useState("");
  const [panelLoinc, setPanelLoinc] = React.useState("");
  const [laboratory, setLaboratory] = React.useState("");
  const [collectionDate, setCollectionDate] = React.useState("");
  const [rows, setRows] = React.useState<RowDraft[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const [showPaste, setShowPaste] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  const [extracting, setExtracting] = React.useState(false);
  const [extractPhase, setExtractPhase] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const extractTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleFileUpload(file: File | null) {
    if (!file) return;
    setExtracting(true);
    setExtractPhase("Uploading file...");

    // Show progress phases on timers
    extractTimerRef.current = setTimeout(
      () => setExtractPhase("Analyzing with AI..."),
      2000,
    );
    const timer2 = setTimeout(
      () => setExtractPhase("Extracting results..."),
      8000,
    );
    const timer3 = setTimeout(
      () => setExtractPhase("Still processing, please wait..."),
      30000,
    );

    try {
      const result = await extractLabFromFile(file);
      if (result.kind === "not_configured") {
        toast.error("AI extraction unavailable", {
          description: result.message,
        });
        return;
      }
      if (result.kind === "error") {
        toast.error("Extraction failed", { description: result.message });
        return;
      }
      const { data } = result;

      // ── BUG 2 FIX: Auto-detect panel from AI category ──────────
      const detectedPanel = findPanelByCategory(data.panelCategory ?? "");
      if (detectedPanel) {
        setSelectedPanelId(detectedPanel.id);
        setPanelName(detectedPanel.name);
        setPanelLoinc(detectedPanel.loinc ?? "");
      } else if (data.panelName) {
        setPanelName(data.panelName);
      } else {
        setPanelName(file.name.replace(/\.[^.]+$/, ""));
      }

      // ── BUG 3 FIX: Auto-fill lab + date from AI ────────────────
      if (data.laboratory && !laboratory) setLaboratory(data.laboratory);
      if (data.collectionDate && !collectionDate)
        setCollectionDate(data.collectionDate);

      // ── BUG 1 FIX: Map extracted results with values + enrich from biomarker library ──
      console.log("=== EXTRACTION DEBUG ===");
      console.log("Raw results from AI:", data.results.length);
      console.log("First 3 raw:", JSON.stringify(data.results.slice(0, 3).map((r) => ({ test: r.testName, val: r.value }))));

      const newRows: RowDraft[] = data.results.map((r) => {
        // Try to find a matching known biomarker for LOINC code + ref range enrichment
        const knownBio = findBiomarkerByName(r.testName);
        const enrichedRange = knownBio ? pickRange(knownBio, patientMeta.sex) : null;

        const row: RowDraft = {
          uid: uid(),
          testName: r.testName,
          loincCode: knownBio?.loinc ?? "",
          // CRITICAL: use the AI-extracted value — never empty
          value: r.value || "?",
          unit: r.unit || knownBio?.unit || "",
          referenceLow: r.referenceLow || (enrichedRange ? String(enrichedRange.low) : ""),
          referenceHigh: r.referenceHigh || (enrichedRange ? String(enrichedRange.high) : ""),
          interpretation: r.interpretation ?? "",
          liveFlag: null,
        };
        row.liveFlag = classify(row);
        return row;
      });
      // REPLACE all existing rows with extracted results (don't just append).
      // This prevents stale empty template rows from blocking save.
      console.log("Mapped rows:", newRows.length, "with values:", newRows.filter((r) => r.value.trim()).length);
      setRows(newRows);
      toast.success(
        `Extracted ${newRows.length} result${newRows.length === 1 ? "" : "s"} from ${file.name}`,
      );
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
      setExtracting(false);
      setExtractPhase("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function applyPanel(panel: PanelSpec | null) {
    if (!panel) {
      setSelectedPanelId(null);
      return;
    }
    setSelectedPanelId(panel.id);
    setPanelName(panel.name);
    setPanelLoinc(panel.loinc ?? "");
    setRows(panel.biomarkers.map((b) => rowFromBiomarker(b, patientMeta.sex)));
  }

  function classify(r: RowDraft): LabFlag | null {
    const cls = classifyResult({
      testName: r.testName,
      value: r.value,
      referenceLow: r.referenceLow,
      referenceHigh: r.referenceHigh,
      sex: patientMeta.sex ?? undefined,
      age: patientMeta.age,
    });
    return cls.flag;
  }

  function updateRow(uidKey: string, patch: Partial<RowDraft>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.uid !== uidKey) return r;
        const next = { ...r, ...patch };
        next.liveFlag = classify(next);
        return next;
      }),
    );
  }

  function removeRow(uidKey: string) {
    setRows((prev) => prev.filter((r) => r.uid !== uidKey));
  }

  function addBlankRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function applyPaste() {
    const text = pasteText.trim();
    if (!text) return;
    const lines = text.split(/\r?\n/);
    const parsed: RowDraft[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      // Try tab first (Excel default), then comma.
      const cells = line.includes("\t") ? line.split("\t") : line.split(",");
      const [
        testName = "",
        value = "",
        unit = "",
        referenceLow = "",
        referenceHigh = "",
      ] = cells.map((c) => c.trim());
      if (!testName) continue;
      // Skip header rows that look like "test,value,unit" etc.
      if (
        /^(test|name)$/i.test(testName) &&
        /^(value|result)$/i.test(value)
      ) {
        continue;
      }
      const row: RowDraft = {
        uid: uid(),
        testName,
        loincCode: "",
        value,
        unit,
        referenceLow,
        referenceHigh,
        interpretation: "",
        liveFlag: null,
      };
      row.liveFlag = classify(row);
      parsed.push(row);
    }
    if (parsed.length === 0) {
      toast.error("Could not parse anything from the pasted text");
      return;
    }
    setRows((prev) => [...prev, ...parsed]);
    setPasteText("");
    setShowPaste(false);
    toast.success(`Imported ${parsed.length} result${parsed.length === 1 ? "" : "s"}`);
  }

  // Button is always clickable if there's a patient and at least 1 row.
  // Detailed validation happens on click with clear error messages.
  const canSubmit = !!patient && rows.length > 0;

  async function handleSave() {
    // Debug: log state before validation so we can always trace save failures
    console.log("=== SAVE DEBUG ===");
    console.log("Patient:", patient?.id ?? "NONE");
    console.log("Panel:", panelName);
    console.log("Rows count:", rows.length);
    console.log("Rows with testName+value:", rows.filter((r) => r.testName.trim() && r.value.trim()).length);
    if (rows.length > 0 && rows.length <= 5) {
      console.log("All rows:", JSON.stringify(rows.map((r) => ({ test: r.testName, val: r.value }))));
    } else if (rows.length > 5) {
      console.log("First 3:", JSON.stringify(rows.slice(0, 3).map((r) => ({ test: r.testName, val: r.value }))));
      console.log("Last 2:", JSON.stringify(rows.slice(-2).map((r) => ({ test: r.testName, val: r.value }))));
    }

    if (!patient) {
      toast.error("Select a patient first");
      return;
    }
    if (rows.length === 0) {
      toast.error("Add at least one result row");
      return;
    }

    // Auto-fill panel name if empty
    if (!panelName.trim()) {
      setPanelName("Lab Results");
    }

    // Filter out empty rows (no test name or value)
    const validRows = rows.filter(
      (r) => r.testName.trim().length > 0 && r.value.trim().length > 0,
    );
    if (validRows.length === 0) {
      toast.error("All result rows are empty — enter at least one test value");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createLabResult({
        patientId: patient.id,
        panelName: panelName.trim() || "Lab Results",
        panelLoincCode: panelLoinc.trim() || undefined,
        laboratory: laboratory.trim() || undefined,
        collectionDate: collectionDate || undefined,
        results: validRows.map((r) => ({
          testName: r.testName.trim(),
          loincCode: r.loincCode.trim() || undefined,
          value: r.value.trim(),
          unit: r.unit.trim() || undefined,
          referenceLow:
            r.referenceLow.trim() === "" ? undefined : r.referenceLow.trim(),
          referenceHigh:
            r.referenceHigh.trim() === "" ? undefined : r.referenceHigh.trim(),
          interpretation:
            r.interpretation.trim() === "" ? undefined : r.interpretation.trim(),
        })),
      });

      if (!result.ok) {
        toast.error("Could not save", { description: result.error });
        return;
      }
      toast.success("Lab results saved", {
        description:
          result.data.criticalCount > 0
            ? `${result.data.criticalCount} critical flag${result.data.criticalCount === 1 ? "" : "s"} recorded`
            : "No critical flags",
      });
      router.push(`/medilab/${result.data.id}`);
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
    <div className="space-y-6">
      {/* Patient */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient</CardTitle>
          <CardDescription>Search and pick the patient.</CardDescription>
        </CardHeader>
        <CardContent>
          <PatientPicker
            value={patient}
            onChange={setPatient}
            disabled={submitting}
          />
        </CardContent>
      </Card>

      {/* Panel / meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Panel</CardTitle>
          <CardDescription>
            Pick a curated panel to pre-fill the result rows, or type a custom
            panel name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Use a curated panel</Label>
              <Select
                value={selectedPanelId ?? ""}
                onValueChange={(v) =>
                  applyPanel(PANELS.find((p) => p.id === v) ?? null)
                }
                disabled={submitting}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {PANELS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Panel name *</Label>
              <Input
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
                placeholder="e.g. Complete Blood Count"
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Panel LOINC</Label>
              <Input
                value={panelLoinc}
                onChange={(e) => setPanelLoinc(e.target.value)}
                placeholder="Optional"
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Laboratory</Label>
              <Input
                value={laboratory}
                onChange={(e) => setLaboratory(e.target.value)}
                placeholder="e.g. Saudi Diagnostics Lab"
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Collection date</Label>
              <Input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Beaker className="size-4 text-[color:var(--color-brand-magenta)]" />
              Results
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="brand"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting || extracting}
              >
                {extracting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {extractPhase || "Processing..."}
                  </>
                ) : (
                  <>
                    <FileUp className="size-4" />
                    Upload lab report
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPaste((s) => !s)}
                disabled={submitting}
              >
                <ClipboardPaste className="size-4" />
                Paste from CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBlankRow}
                disabled={submitting}
              >
                <Plus className="size-4" />
                Add row
              </Button>
            </div>
          </div>
          <CardDescription>
            Upload a PDF, photo, Excel, or CSV lab report — AI extracts the
            results automatically. Or enter values manually. Live colour-coded
            against the reference range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {showPaste && (
            <Alert variant="info">
              <ClipboardPaste />
              <AlertTitle>Paste tab- or comma-separated values</AlertTitle>
              <AlertDescription className="space-y-3">
                <div className="text-[11px]">
                  Format per line: <code>testName, value, unit, refLow, refHigh</code>.
                  Empty fields are OK.
                </div>
                <Textarea
                  rows={6}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Hemoglobin\t13.2\tg/dL\t13.5\t17.5\nGlucose\t92\tmg/dL\t70\t99`}
                  className="font-mono text-xs"
                  disabled={submitting}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="brand" onClick={applyPaste} disabled={submitting}>
                    Import {pasteText ? "rows" : ""}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowPaste(false);
                      setPasteText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {rows.length === 0 ? (
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              No results yet. Pick a panel above, paste from CSV, or click
              &ldquo;Add row&rdquo;.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.uid}>
                  <ResultRow
                    row={r}
                    onChange={(p) => updateRow(r.uid, p)}
                    onRemove={() => removeRow(r.uid)}
                    disabled={submitting}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-card)]/95 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <Button
          variant="brand"
          size="md"
          disabled={!canSubmit || submitting}
          onClick={handleSave}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save lab result
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Result row
// ─────────────────────────────────────────────────────────────────
const flagCls: Record<LabFlag, string> = {
  normal: "border-emerald-200 bg-emerald-50",
  low: "border-sky-200 bg-sky-50",
  high: "border-orange-200 bg-orange-50",
  critical_low: "border-rose-300 bg-rose-100",
  critical_high: "border-rose-300 bg-rose-100",
};

const flagBadge: Record<LabFlag, "success" | "info" | "warning" | "critical"> = {
  normal: "success",
  low: "info",
  high: "warning",
  critical_low: "critical",
  critical_high: "critical",
};

function ResultRow({
  row,
  onChange,
  onRemove,
  disabled,
}: {
  row: RowDraft;
  onChange: (patch: Partial<RowDraft>) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        row.liveFlag ? flagCls[row.liveFlag] : "border-[color:var(--color-border)] bg-[color:var(--color-muted)]/20",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">
            {row.testName || "Untitled test"}
          </div>
          {row.liveFlag && (
            <Badge variant={flagBadge[row.liveFlag]} className="text-[10px]">
              {row.liveFlag.replace("_", " ")}
            </Badge>
          )}
          {row.loincCode && (
            <Badge variant="outline" className="font-mono text-[10px]">
              LOINC {row.loincCode}
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove row"
          disabled={disabled}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_80px_1fr_1fr]">
        <Input
          value={row.testName}
          onChange={(e) => onChange({ testName: e.target.value })}
          placeholder="Test name"
          disabled={disabled}
        />
        <Input
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Value"
          inputMode="decimal"
          disabled={disabled}
        />
        <Input
          value={row.unit}
          onChange={(e) => onChange({ unit: e.target.value })}
          placeholder="Unit"
          disabled={disabled}
        />
        <Input
          value={row.referenceLow}
          onChange={(e) => onChange({ referenceLow: e.target.value })}
          placeholder="Ref low"
          inputMode="decimal"
          disabled={disabled}
        />
        <Input
          value={row.referenceHigh}
          onChange={(e) => onChange({ referenceHigh: e.target.value })}
          placeholder="Ref high"
          inputMode="decimal"
          disabled={disabled}
        />
      </div>
      <Input
        value={row.interpretation}
        onChange={(e) => onChange({ interpretation: e.target.value })}
        placeholder="Optional interpretation"
        className="mt-2 text-xs"
        disabled={disabled}
      />
    </div>
  );
}

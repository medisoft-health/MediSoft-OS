"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Save,
  ScanLine,
  Sparkles,
  Upload,
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PatientPicker, type PickedPatient } from "@/app/(app)/mediscript/_components/patient-picker";
import { ScanImageViewer } from "@/components/mediscan/scan-image-viewer";
import {
  REQUIRED_DISCLAIMER,
  SCAN_TYPE_OPTIONS,
  type Annotation,
  type ScanType,
  type Severity,
} from "@/lib/validations/scan";
import {
  analyzeScanImage,
  uploadScanImage,
  type AnalyzeClientResult,
} from "@/lib/mediscan/client";
import { createScan } from "@/lib/actions/scans";
import type { VisionOutput } from "@/lib/mediscan/vision";
import { cn } from "@/lib/utils";

interface InitialPatient {
  id: number;
  label: string;
  sublabel: string;
}

interface Props {
  initialPatient: InitialPatient | null;
}

const SCAN_TYPE_LABEL: Record<ScanType, string> = {
  xray: "X-ray",
  ct: "CT",
  mri: "MRI",
  ultrasound: "Ultrasound",
  mammography: "Mammography",
  pathology: "Pathology",
  other: "Other",
};

export function ScanBuilder({ initialPatient }: Props) {
  const router = useRouter();
  const search = useSearchParams();

  const [patient, setPatient] = React.useState<PickedPatient | null>(initialPatient);
  const [scanType, setScanType] = React.useState<ScanType>("xray");
  const [bodyPart, setBodyPart] = React.useState("");
  const [studyDate, setStudyDate] = React.useState("");
  const [clinicalQuestion, setClinicalQuestion] = React.useState("");

  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const [annotations, setAnnotations] = React.useState<Annotation[]>([]);

  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<VisionOutput | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [analysisNotConfigured, setAnalysisNotConfigured] = React.useState(false);

  const [saving, setSaving] = React.useState(false);
  const [storageNotConfigured, setStorageNotConfigured] = React.useState(false);

  // Cleanup preview URL on unmount / new file.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickFile(f: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
    setAnnotations([]);
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisNotConfigured(false);
  }

  async function runAnalysis() {
    if (!file || !bodyPart.trim()) return;
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisNotConfigured(false);
    setAnalysis(null);

    const result: AnalyzeClientResult = await analyzeScanImage({
      file,
      scanType,
      bodyPart: bodyPart.trim(),
      patientId: patient?.id,
      clinicalQuestion: clinicalQuestion.trim() || undefined,
    });

    if (result.kind === "ok") {
      setAnalysis(result.data);
      toast.success("Image analyzed", {
        description: `${result.data.findings.length} finding${result.data.findings.length === 1 ? "" : "s"} surfaced`,
      });
    } else if (result.kind === "not_configured") {
      setAnalysisNotConfigured(true);
    } else {
      setAnalysisError(result.message);
      toast.error("Analysis failed", { description: result.message });
    }
    setAnalyzing(false);
  }

  async function handleSave() {
    if (!patient || !file || !bodyPart.trim()) return;
    setSaving(true);
    setStorageNotConfigured(false);

    try {
      // 1) Upload image
      const up = await uploadScanImage({ patientId: patient.id, file });
      if (up.kind === "not_configured") {
        setStorageNotConfigured(true);
        toast.error("Supabase Storage not configured", {
          description: "Cannot persist the scan. Configure storage to save.",
        });
        setSaving(false);
        return;
      }
      if (up.kind === "error") {
        toast.error("Upload failed", { description: up.message });
        setSaving(false);
        return;
      }

      // 2) Create scan row
      const result = await createScan({
        patientId: patient.id,
        scanType,
        bodyPart: bodyPart.trim(),
        studyDate: studyDate || undefined,
        imageStorageKey: up.storageKey,
        imageStorageUrl: up.publicUrl ?? undefined,
        mimeType: file.type || undefined,
        fileSizeBytes: file.size,
        findings: analysis?.findings ?? [],
        annotations,
        aiReport: analysis?.physicianReport ?? "",
        aiImpression: analysis?.impression ?? "",
        aiDifferentialDiagnosis: analysis?.differentialDiagnosis ?? "",
        aiRecommendations: analysis?.recommendations ?? "",
        aiPatientSummary: analysis?.patientSummary ?? "",
        technicalQuality: analysis?.technicalQuality ?? undefined,
        disclaimer: REQUIRED_DISCLAIMER,
      });

      if (!result.ok) {
        toast.error("Could not save scan", { description: result.error });
        setSaving(false);
        return;
      }

      toast.success("Scan saved");
      router.push(`/mediscan/${result.data.id}`);
      router.refresh();
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
      setSaving(false);
    }
  }

  const canAnalyze = !!file && !!bodyPart.trim();
  const canSave = !!patient && !!file && !!bodyPart.trim() && !storageNotConfigured;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* ── Builder column ── */}
      <div className="space-y-6">
        {/* Patient */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient</CardTitle>
            <CardDescription>
              Optional context. Improves AI accuracy when provided.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientPicker value={patient} onChange={setPatient} disabled={saving} />
          </CardContent>
        </Card>

        {/* Scan metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Modality *</Label>
                <Select
                  value={scanType}
                  onValueChange={(v) => setScanType(v as ScanType)}
                  disabled={saving}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCAN_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {SCAN_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Body part / region *</Label>
                <Input
                  value={bodyPart}
                  onChange={(e) => setBodyPart(e.target.value)}
                  placeholder="e.g. Chest, Right knee, Abdomen"
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Study date</Label>
                <Input
                  type="date"
                  value={studyDate}
                  onChange={(e) => setStudyDate(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Clinical question</Label>
                <Input
                  value={clinicalQuestion}
                  onChange={(e) => setClinicalQuestion(e.target.value)}
                  placeholder="What are we trying to rule out?"
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image upload + viewer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="size-4 text-[color:var(--color-brand-magenta)]" />
              Image
            </CardTitle>
            <CardDescription>
              JPEG, PNG, or WebP. Up to 15 MB. Image stays in-browser until you
              click Save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!previewUrl ? (
              <UploadDropZone onPick={pickFile} />
            ) : (
              <>
                <ScanImageViewer
                  imageUrl={previewUrl}
                  annotations={annotations}
                  onChange={setAnnotations}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => pickFile(null)}
                    disabled={saving}
                  >
                    Replace image
                  </Button>
                  {file && (
                    <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                      {file.name} · {(file.size / 1024).toFixed(0)} KB ·{" "}
                      {file.type || "unknown"}
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save bar */}
        <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-card)]/95 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8">
          <Link href="/mediscan">
            <Button variant="ghost" size="md" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="brand"
            size="md"
            disabled={!canSave || saving}
            onClick={handleSave}
            title={
              !patient
                ? "Pick a patient"
                : !file
                  ? "Upload an image"
                  : !bodyPart.trim()
                    ? "Enter the body part"
                    : storageNotConfigured
                      ? "Storage not configured"
                      : undefined
            }
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save scan
              </>
            )}
          </Button>
        </div>

        {storageNotConfigured && (
          <Alert variant="info">
            <AlertCircle />
            <AlertTitle>Supabase Storage not configured</AlertTitle>
            <AlertDescription>
              Set{" "}
              <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and{" "}
              <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              in <code>.env.local</code>, create a <code>scans</code> bucket,
              then retry. AI analysis still works without storage — only Save is
              gated.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── AI panel ── */}
      <div className="space-y-4 lg:sticky lg:top-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-[color:var(--color-brand-magenta)]" />
                AI analysis
              </CardTitle>
              <Button
                variant="brand"
                size="sm"
                onClick={runAnalysis}
                disabled={!canAnalyze || analyzing || saving}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing…
                  </>
                ) : analysis ? (
                  <>
                    <ScanLine className="size-4" /> Re-analyze
                  </>
                ) : (
                  <>
                    <ScanLine className="size-4" /> Analyze image
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysisNotConfigured && (
              <Alert variant="info">
                <Sparkles />
                <AlertTitle>Gemini not configured</AlertTitle>
                <AlertDescription>
                  Set{" "}
                  <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5">
                    GOOGLE_GEMINI_API_KEY
                  </code>{" "}
                  in <code>.env.local</code> to enable image analysis. You can
                  still save the scan and annotate manually.
                </AlertDescription>
              </Alert>
            )}

            {analysisError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Analysis failed</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
            )}

            {!analysis && !analyzing && !analysisError && !analysisNotConfigured && (
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                Upload an image and enter the body part, then click{" "}
                <strong>Analyze image</strong> to get an AI-drafted report.
              </p>
            )}

            {analyzing && (
              <div className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
                <Loader2 className="size-4 animate-spin" /> Asking Gemini…
              </div>
            )}

            {analysis && <AnalysisDisplay analysis={analysis} />}
          </CardContent>
        </Card>

        {/* Mandatory disclaimer */}
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>Required disclaimer</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed">
            {REQUIRED_DISCLAIMER}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────
function UploadDropZone({ onPick }: { onPick: (f: File) => void }) {
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Unsupported file type", {
        description: "PR-7 accepts JPEG, PNG, and WebP only.",
      });
      return;
    }
    onPick(f);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        over
          ? "border-[color:var(--color-brand-pink)] bg-[color:var(--color-brand-pink)]/5"
          : "border-[color:var(--color-border)] hover:border-[color:var(--color-brand-pink)]/50 hover:bg-[color:var(--color-muted)]/30",
      )}
    >
      <div className="grid size-12 place-items-center rounded-2xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
        <Upload className="size-5" />
      </div>
      <div>
        <div className="text-sm font-semibold">Upload an image</div>
        <div className="text-xs text-[color:var(--color-muted-foreground)]">
          Drag & drop or click to browse. JPEG / PNG / WebP. Max 15 MB.
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

const sevBadge: Record<Severity, "info" | "warning" | "destructive" | "critical"> = {
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

function AnalysisDisplay({ analysis }: { analysis: VisionOutput }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={tqBadge[analysis.technicalQuality] ?? "warning"} className="text-[10px]">
          Image quality: {analysis.technicalQuality.replace("_", " ")}
        </Badge>
        <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
          {analysis.findings.length} finding{analysis.findings.length === 1 ? "" : "s"}
        </span>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          Impression
        </div>
        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{analysis.impression}</p>
      </div>

      {analysis.findings.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            Findings
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {analysis.findings.map((f, i) => (
              <li key={i} className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold">
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
                  <p className="mt-1 text-[11px] text-[color:var(--color-muted-foreground)]">
                    {f.characteristics}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-lg border border-[color:var(--color-border)] p-2">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          Differential / recommendations
        </summary>
        <div className="mt-2 space-y-2 text-xs">
          {analysis.differentialDiagnosis && (
            <div>
              <div className="font-semibold">Differential</div>
              <p className="mt-0.5 whitespace-pre-wrap">{analysis.differentialDiagnosis}</p>
            </div>
          )}
          {analysis.recommendations && (
            <div>
              <div className="font-semibold">Recommendations</div>
              <p className="mt-0.5 whitespace-pre-wrap">{analysis.recommendations}</p>
            </div>
          )}
        </div>
      </details>

      <div className="rounded-lg border border-dashed border-[color:var(--color-border)] p-2 text-[11px]">
        <CheckCircle2 className="mr-1 inline size-3 text-emerald-600" />
        Findings will be saved alongside the scan when you click Save.
      </div>
    </div>
  );
}

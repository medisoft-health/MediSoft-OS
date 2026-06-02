"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardEdit,
  ExternalLink,
  FileCheck,
  Loader2,
  Mic,
  Sparkles,
  User as UserIcon,
  XCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { PatientPicker, type PickedPatient } from "@/components/clinical/patient-picker";
import { AudioRecorder } from "@/components/mediscript/audio-recorder";
import { PatientBriefing } from "@/components/mediscript/patient-briefing";
import { TranscriptReview } from "@/components/mediscript/transcript-review";
import { SoapForm } from "./soap-form";
import { createEncounter } from "@/lib/actions/encounters";
import type {
  EncounterCreateInput,
  SoapNoteInput,
} from "@/lib/validations/encounter";
import {
  generateSoapFromTranscript,
  transcribeAudio,
  type SoapResult,
  type TranscribeResult,
} from "@/lib/mediscript/client";
import { formatPatientId, cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Patient", icon: UserIcon },
  { id: 2, label: "Record", icon: Mic },
  { id: 3, label: "Review", icon: ClipboardEdit },
  { id: 4, label: "Save", icon: FileCheck },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface InitialPatient {
  id: number;
  label: string;
  sublabel: string;
}

interface Props {
  initialPatient: InitialPatient | null;
}

interface CapturedAudio {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

interface SaveResult {
  id: string;
  status: string;
  signed: boolean;
}

// AI pipeline state — drives the loading UI between steps 2 and 3.
interface SoapMeta {
  model: string;
  diagnosisCount: number;
  icdVerifiedCount: number;
  whoIcdConfigured: boolean;
}

type PipelineState =
  | { kind: "idle" }
  | { kind: "transcribing" }
  | { kind: "correcting"; rawTranscript: string }
  | { kind: "generating"; transcript: string }
  | {
      kind: "done";
      transcript: string;
      soap: SoapNoteInput;
      meta: SoapMeta;
    }
  | {
      kind: "manual";
      /** Either "skipped" or "fallback after AI failed". */
      reason: "skipped" | "transcribe_unavailable" | "soap_unavailable" | "error";
      transcript?: string;
      message?: string;
    };

export function SessionWizard({ initialPatient }: Props) {
  const router = useRouter();
  const search = useSearchParams();

  const [step, setStep] = React.useState<StepId>(initialPatient ? 2 : 1);
  const [patient, setPatient] = React.useState<PickedPatient | null>(initialPatient);
  const [audio, setAudio] = React.useState<CapturedAudio | null>(null);
  const [pipeline, setPipeline] = React.useState<PipelineState>({ kind: "idle" });
  const [saveResult, setSaveResult] = React.useState<SaveResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[]> | undefined
  >(undefined);

  // ── SOAP generation from transcript ────────────────────────────────
  const generateSoap = React.useCallback(
    async (transcript: string, hint: string) => {
      setPipeline({ kind: "generating", transcript });

      const s: SoapResult = await generateSoapFromTranscript(transcript, hint);
      if (s.kind === "not_configured") {
        setPipeline({
          kind: "manual",
          reason: "soap_unavailable",
          transcript,
          message: s.message,
        });
        return;
      }
      if (s.kind === "error") {
        toast.error("Clinical SOAP generation failed", { description: s.message });
        setPipeline({
          kind: "manual",
          reason: "error",
          transcript,
          message: s.message,
        });
        return;
      }

      setPipeline({
        kind: "done",
        transcript,
        soap: s.soapNote,
        meta: s.meta,
      });
      toast.success("Clinical draft ready", {
        description: `Drafted ${s.meta.diagnosisCount} diagnoses · ${s.meta.icdVerifiedCount} ICD-verified`,
      });
    },
    [],
  );

  // ── AI pipeline (transcribe → correct → SOAP) ─────────────────────
  const runAIPipeline = React.useCallback(
    async (a: CapturedAudio, hint: string) => {
      setPipeline({ kind: "transcribing" });

      const t: TranscribeResult = await transcribeAudio(a.blob, a.mimeType);

      if (t.kind === "not_configured") {
        setPipeline({
          kind: "manual",
          reason: "transcribe_unavailable",
          message: t.message,
        });
        return;
      }
      if (t.kind === "error") {
        toast.error("Transcription failed", { description: t.message });
        setPipeline({
          kind: "manual",
          reason: "error",
          message: t.message,
        });
        return;
      }

      // Show transcript correction step
      setPipeline({ kind: "correcting", rawTranscript: t.transcript });
    },
    [],
  );

  // ── Handle transcript correction acceptance ────────────────────────
  const handleCorrectionAccept = React.useCallback(
    (correctedTranscript: string) => {
      if (!patient) return;
      generateSoap(correctedTranscript, `${patient.label} · ${patient.sublabel}`);
    },
    [patient, generateSoap],
  );

  const handleCorrectionSkip = React.useCallback(() => {
    if (!patient) return;
    if (pipeline.kind === "correcting") {
      generateSoap(pipeline.rawTranscript, `${patient.label} · ${patient.sublabel}`);
    }
  }, [patient, pipeline, generateSoap]);

  // ── Step 2 → 3 transition ───────────────────────────────────────
  const continueFromRecord = React.useCallback(
    async (skip: boolean) => {
      if (!patient) return;
      if (skip || !audio) {
        setPipeline({ kind: "manual", reason: "skipped" });
        setStep(3);
        return;
      }
      setStep(3);
      await runAIPipeline(audio, `${patient.label} · ${patient.sublabel}`);
    },
    [audio, patient, runAIPipeline],
  );

  // ── Save action ─────────────────────────────────────────────────
  const handleSave = React.useCallback(
    async (input: EncounterCreateInput) => {
      setSubmitting(true);
      setFormError(null);
      setFieldErrors(undefined);
      try {
        const result = await createEncounter(input);
        if (!result.ok) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors);
          return;
        }
        setSaveResult({
          id: result.data.id,
          status: result.data.status,
          signed: input.sign,
        });
        setStep(4);
        toast.success(
          input.sign ? "Encounter signed" : "Encounter saved as draft",
          {
            description: input.sign
              ? "The record is now part of the patient's signed history."
              : "You can sign it later from the encounter detail page.",
          },
        );
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        setFormError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <Stepper current={step} onJump={(s) => s < step && setStep(s)} />

      {step === 1 && (
        <StepPatient
          patient={patient}
          onChange={setPatient}
          onContinue={() => setStep(2)}
          urlPatientId={search.get("patientId")}
        />
      )}

      {step === 2 && patient && (
        <StepRecord
          patient={patient}
          audio={audio}
          setAudio={setAudio}
          onBack={() => setStep(1)}
          onSkip={() => continueFromRecord(true)}
          onContinue={() => continueFromRecord(false)}
        />
      )}

      {step === 3 && patient && (
        <StepReview
          patient={patient}
          pipeline={pipeline}
          onCorrectionAccept={handleCorrectionAccept}
          onCorrectionSkip={handleCorrectionSkip}
          onRetryAI={() => audio && runAIPipeline(audio, `${patient.label} · ${patient.sublabel}`)}
          onBack={() => setStep(2)}
          onSave={handleSave}
          submitting={submitting}
          formError={formError}
          fieldErrors={fieldErrors}
        />
      )}

      {step === 4 && patient && saveResult && (
        <StepSuccess
          patient={patient}
          encounterId={saveResult.id}
          signed={saveResult.signed}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stepper
// ─────────────────────────────────────────────────────────────────
function Stepper({
  current,
  onJump,
}: {
  current: StepId;
  onJump: (s: StepId) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((s, i) => {
        const isDone = s.id < current;
        const isActive = s.id === current;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => isDone && onJump(s.id)}
              disabled={!isDone}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive &&
                  "border-[color:var(--color-brand-pink)] bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]",
                isDone &&
                  "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                !isActive &&
                  !isDone &&
                  "border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)] cursor-default",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[10px] font-bold",
                  isActive && "bg-[color:var(--color-brand-pink)] text-white",
                  isDone && "bg-emerald-500 text-white",
                  !isActive &&
                    !isDone &&
                    "border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-muted-foreground)]",
                )}
              >
                {isDone ? <Check className="size-3" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              <Icon className="size-3.5 sm:hidden" />
            </button>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  s.id < current ? "bg-emerald-300" : "bg-[color:var(--color-border)]",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 1: Patient
// ─────────────────────────────────────────────────────────────────
function StepPatient({
  patient,
  onChange,
  onContinue,
  urlPatientId,
}: {
  patient: PickedPatient | null;
  onChange: (p: PickedPatient | null) => void;
  onContinue: () => void;
  urlPatientId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Who is this encounter for?</CardTitle>
        <CardDescription>
          Start by selecting the patient. You can search by name, MS-XXXXXX
          code, National ID, MRN, or phone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <PatientPicker value={patient} onChange={onChange} />

        {urlPatientId && !patient && (
          <p className="text-xs text-[color:var(--color-muted-foreground)]">
            URL referenced patient id <code>{urlPatientId}</code> but no
            matching record was found. Please pick a patient manually.
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Link href="/mediscript">
            <Button variant="ghost" size="md">
              Cancel
            </Button>
          </Link>
          <Button
            variant="brand"
            size="md"
            disabled={!patient}
            onClick={onContinue}
          >
            Continue <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 2: Record
// ─────────────────────────────────────────────────────────────────
function StepRecord({
  patient,
  audio,
  setAudio,
  onBack,
  onSkip,
  onContinue,
}: {
  patient: PickedPatient;
  audio: CapturedAudio | null;
  setAudio: (a: CapturedAudio | null) => void;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Record the consultation</CardTitle>
            <CardDescription>
              Speak naturally. Medical Intelligence will transcribe and draft the
              SOAP note in the next step.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Patient: {patient.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Patient Clinical Summary — shows allergies, conditions, meds */}
        <PatientBriefing patientId={patient.id} />

        <AudioRecorder
          onCapture={(blob, durationMs, mimeType) => {
            setAudio({ blob, durationMs, mimeType });
            toast.success("Recording captured", {
              description: `${(blob.size / 1024).toFixed(0)} KB · ${Math.round(durationMs / 1000)} s`,
            });
          }}
        />

        <Alert variant="info">
          <AlertTitle>Where does this audio go?</AlertTitle>
          <AlertDescription>
            Your recording is transcribed using a 3-tier Medical Intelligence
            system: Clinical Speech Recognition (optimized for Arabic dialects)
            → Medical Terminology Engine → Advanced Speech Processing. The audio
            stays in your browser — only the transcript is saved.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="md" onClick={onBack}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={onSkip}
              title="Skip recording — type the SOAP note manually"
            >
              Skip & enter manually
            </Button>
            <Button
              variant="brand"
              size="md"
              disabled={!audio}
              onClick={onContinue}
            >
              Transcribe & draft SOAP
              <Sparkles className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 3: AI pipeline + Review (the SOAP form)
// ─────────────────────────────────────────────────────────────────
function StepReview({
  patient,
  pipeline,
  onCorrectionAccept,
  onCorrectionSkip,
  onRetryAI,
  onBack,
  onSave,
  submitting,
  formError,
  fieldErrors,
}: {
  patient: PickedPatient;
  pipeline: PipelineState;
  onCorrectionAccept: (correctedTranscript: string) => void;
  onCorrectionSkip: () => void;
  onRetryAI: () => void;
  onBack: () => void;
  onSave: (input: EncounterCreateInput) => Promise<void> | void;
  submitting: boolean;
  formError: string | null;
  fieldErrors?: Record<string, string[]>;
}) {
  // Pipeline still running — render progress.
  if (pipeline.kind === "transcribing" || pipeline.kind === "generating") {
    return <AIPipelineProgress phase={pipeline.kind} />;
  }

  // Transcript correction step — show corrections before SOAP generation
  if (pipeline.kind === "correcting") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transcript Review</CardTitle>
          <CardDescription>
            Medical Intelligence has reviewed the transcript for accuracy.
            Review the suggested corrections before generating the SOAP note.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TranscriptReview
            rawTranscript={pipeline.rawTranscript}
            patientId={patient.id}
            onAccept={onCorrectionAccept}
            onSkip={onCorrectionSkip}
          />
        </CardContent>
      </Card>
    );
  }

  // Resolve the props for the SoapForm.
  let initialSoap: SoapNoteInput | undefined;
  let rawTranscript: string | undefined;
  let banner: React.ReactNode = null;

  if (pipeline.kind === "done") {
    initialSoap = pipeline.soap;
    rawTranscript = pipeline.transcript;
    banner = (
      <Alert variant="success">
        <Sparkles />
        <AlertTitle>Clinical draft ready</AlertTitle>
        <AlertDescription>
          Drafted from a {pipeline.transcript.length.toLocaleString()}-character
          transcript ·{" "}
          {pipeline.meta.diagnosisCount} diagnos
          {pipeline.meta.diagnosisCount === 1 ? "is" : "es"} ·{" "}
          {pipeline.meta.whoIcdConfigured
            ? `${pipeline.meta.icdVerifiedCount} ICD-11 verified by WHO`
            : "ICD-11 codes generated by Medical Intelligence"}
          . Review each field before signing.
        </AlertDescription>
      </Alert>
    );
  } else if (pipeline.kind === "manual") {
    rawTranscript = pipeline.transcript;
    if (pipeline.reason === "transcribe_unavailable") {
      banner = (
        <Alert variant="info">
          <AlertTitle>Transcription not configured</AlertTitle>
          <AlertDescription>
            {pipeline.message ?? "No transcription service is configured."} Enter the
            SOAP note manually, or contact your system administrator to enable
            the Medical Intelligence speech recognition service.
          </AlertDescription>
        </Alert>
      );
    } else if (pipeline.reason === "soap_unavailable") {
      banner = (
        <Alert variant="info">
          <AlertTitle>Medical Intelligence Engine not configured</AlertTitle>
          <AlertDescription>
            Transcription completed but SOAP generation is unavailable. The
            transcript is pre-loaded below — fill in the structured note
            manually, or contact your system administrator to enable the
            Clinical Documentation Engine.
          </AlertDescription>
        </Alert>
      );
    } else if (pipeline.reason === "error") {
      banner = (
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>Analysis pipeline failed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{pipeline.message ?? "Unexpected error."}</span>
            <Button variant="outline" size="sm" onClick={onRetryAI}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    // "skipped" — no banner; the form just shows up empty as designed.
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Review &amp; sign</CardTitle>
        <CardDescription>
          Every field below is editable. Nothing is saved until you click Save
          or Save &amp; sign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {banner}
        <SoapForm
          patientId={patient.id}
          patientLabel={patient.label}
          rawTranscript={rawTranscript}
          initialSoap={initialSoap}
          onSave={onSave}
          onBack={onBack}
          submitting={submitting}
          formError={formError}
          fieldErrors={fieldErrors}
        />
      </CardContent>
    </Card>
  );
}

function AIPipelineProgress({
  phase,
}: {
  phase: "transcribing" | "generating";
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
        <div className="relative">
          <div className="size-16 rounded-2xl grad-pink-navy opacity-20" />
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="size-7 animate-spin text-[color:var(--color-brand-magenta)]" />
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight">
            {phase === "transcribing"
              ? "Transcribing audio…"
              : "Drafting SOAP note…"}
          </h3>
          <p className="max-w-sm text-sm text-[color:var(--color-muted-foreground)]">
            {phase === "transcribing"
              ? "Transcribing your recording (Medical Intelligence → Clinical Speech Recognition)."
              : "Medical Intelligence Engine is generating a structured SOAP note from the transcript."}
          </p>
        </div>

        <PhaseTimeline phase={phase} />
      </CardContent>
    </Card>
  );
}

function PhaseTimeline({ phase }: { phase: "transcribing" | "generating" }) {
  const items = [
    {
      key: "transcribing" as const,
      label: "Transcribe (Clinical Speech Recognition)",
      done: phase === "generating",
      active: phase === "transcribing",
    },
    {
      key: "generating" as const,
      label: "Generate SOAP + verify ICD-11",
      done: false,
      active: phase === "generating",
    },
  ];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {items.map((it, i) => (
        <React.Fragment key={it.key}>
          <li
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              it.done && "border-emerald-300 bg-emerald-50 text-emerald-800",
              it.active &&
                "border-[color:var(--color-brand-pink)] bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]",
              !it.done &&
                !it.active &&
                "border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)]",
            )}
          >
            {it.done ? (
              <Check className="size-3" />
            ) : it.active ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <span className="size-2 rounded-full bg-current opacity-40" />
            )}
            {it.label}
          </li>
          {i < items.length - 1 && (
            <span className="h-px w-4 bg-[color:var(--color-border)]" />
          )}
        </React.Fragment>
      ))}
    </ol>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 4: Success
// ─────────────────────────────────────────────────────────────────
function StepSuccess({
  patient,
  encounterId,
  signed,
}: {
  patient: PickedPatient;
  encounterId: string;
  signed: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div
          className={cn(
            "grid size-16 place-items-center rounded-2xl",
            signed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]",
          )}
        >
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight">
            {signed ? "Encounter signed" : "Draft saved"}
          </h3>
          <p className="max-w-md text-sm text-[color:var(--color-muted-foreground)]">
            {signed ? (
              <>
                The encounter is now part of{" "}
                <span className="font-semibold">{patient.label}</span>&apos;s
                signed history.
              </>
            ) : (
              <>
                Saved as a draft for{" "}
                <span className="font-semibold">{patient.label}</span>. You can
                sign it later from the encounter detail page.
              </>
            )}
          </p>
          <p className="text-[11px] font-mono text-[color:var(--color-muted-foreground)]">
            Encounter ID: {encounterId.slice(0, 8)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href={`/encounters/${encounterId}`}>
            <Button variant="brand" size="md">
              Open encounter <ExternalLink className="size-4" />
            </Button>
          </Link>
          <Link href={`/patients/${patient.id}?tab=encounters`}>
            <Button variant="outline" size="md">
              Back to {formatPatientId(patient.id)}
            </Button>
          </Link>
          <Link href="/mediscript/new">
            <Button variant="ghost" size="md">
              Start another session
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";
import {
  useForm,
  useFieldArray,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type FieldErrors,
} from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import {
  AlertCircle,
  Bookmark,
  ChevronLeft,
  ClipboardList,
  Eye,
  HeartPulse,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  ENCOUNTER_TYPE_OPTIONS,
  encounterCreateSchema,
  type EncounterCreateInput,
} from "@/lib/validations/encounter";
import { emptySoapNote } from "@/lib/encounter-soap";
import { cn } from "@/lib/utils";
import { OrderSuggestionsPanel } from "@/components/mediscript/order-suggestions-panel";
import { BillingCodesPanel } from "@/components/mediscript/billing-codes-panel";

interface Props {
  patientId: number;
  patientLabel: string;
  rawTranscript?: string;
  /** Pre-populated SOAP (will come from AI in PR-4c). */
  initialSoap?: EncounterCreateInput["soapNote"];
  /**
   * Called when the form's "Save" or "Save & Sign" button is pressed.
   * Receives the validated input. Parent owns the actual server-action call.
   */
  onSave: (input: EncounterCreateInput) => Promise<void> | void;
  onBack?: () => void;
  /** When true, disables all inputs (e.g. while the parent submits). */
  submitting?: boolean;
  /** Surfaced form-level error from the server action. */
  formError?: string | null;
  /** Per-field server errors (path.dotted form). */
  fieldErrors?: Record<string, string[]>;
  /** Pre-selected encounter type from Step 1. */
  initialEncounterType?: EncounterCreateInput["encounterType"];
}

export function SoapForm({
  patientId,
  patientLabel,
  rawTranscript,
  initialSoap,
  initialEncounterType,
  onSave,
  onBack,
  submitting,
  formError,
  fieldErrors,
}: Props) {
  const form = useForm<EncounterCreateInput>({
    resolver: safeZodResolver(encounterCreateSchema),
    mode: "onSubmit",
    defaultValues: {
      patientId,
      encounterType: initialEncounterType ?? "outpatient",
      rawTranscript: rawTranscript ?? "",
      correctedTranscript: "",
      soapNote: initialSoap ?? emptySoapNote(),
      sign: false,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const diagnoses = useFieldArray({
    control,
    name: "soapNote.assessment.diagnoses",
  });

  // Apply server fieldErrors to RHF when they arrive.
  React.useEffect(() => {
    if (!fieldErrors) return;
    for (const [path, msgs] of Object.entries(fieldErrors)) {
      form.setError(path as keyof EncounterCreateInput, {
        type: "server",
        message: msgs[0],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors]);

  const submitAction = (sign: boolean) =>
    handleSubmit((values) => {
      onSave({ ...values, sign });
    });

  const encType = watch("encounterType");

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => e.preventDefault() /* explicit-button submit */}
    >
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Meta */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Encounter metadata</CardTitle>
              <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                For: <span className="font-semibold">{patientLabel}</span>
              </p>
            </div>
            <Badge variant="info" className="text-[10px]">
              Draft · unsigned
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Encounter type</Label>
              <Select
                value={encType}
                onValueChange={(v) =>
                  setValue(
                    "encounterType",
                    v as EncounterCreateInput["encounterType"],
                    { shouldValidate: false },
                  )
                }
                disabled={submitting}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENCOUNTER_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcript */}
      {(rawTranscript || true) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="size-4 text-[color:var(--color-muted-foreground)]" />
              Transcript
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Optional · stored for audit
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="rawTranscript">
                Raw transcript
                <span className="ml-2 font-normal normal-case tracking-normal text-[color:var(--color-muted-foreground)]">
                  (what the microphone heard)
                </span>
              </Label>
              <Textarea
                id="rawTranscript"
                rows={3}
                {...register("rawTranscript")}
                disabled={submitting}
                placeholder="Auto-populated by speech-to-text. You can also paste a transcript manually."
              />
            </div>
            <div>
              <Label htmlFor="correctedTranscript">
                Corrected transcript
                <span className="ml-2 font-normal normal-case tracking-normal text-[color:var(--color-muted-foreground)]">
                  (your edits)
                </span>
              </Label>
              <Textarea
                id="correctedTranscript"
                rows={3}
                {...register("correctedTranscript")}
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subjective */}
      <SoapSection
        title="Subjective"
        icon={Stethoscope}
        accent="text-[color:var(--color-brand-magenta)]"
      >
        <TextField
          label="Chief complaint"
          name="soapNote.subjective.chiefComplaint"
          register={register}
          errors={errors}
          rows={2}
          disabled={submitting}
        />
        <TextField
          label="History of present illness"
          name="soapNote.subjective.historyOfPresentIllness"
          register={register}
          errors={errors}
          rows={4}
          disabled={submitting}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Past medical history"
            name="soapNote.subjective.pastMedicalHistory"
            register={register}
            errors={errors}
            rows={3}
            disabled={submitting}
          />
          <TextField
            label="Current medications"
            name="soapNote.subjective.medications"
            register={register}
            errors={errors}
            rows={3}
            disabled={submitting}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Allergies"
            name="soapNote.subjective.allergies"
            register={register}
            errors={errors}
            rows={2}
            disabled={submitting}
          />
          <TextField
            label="Review of systems"
            name="soapNote.subjective.reviewOfSystems"
            register={register}
            errors={errors}
            rows={2}
            disabled={submitting}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Social history"
            name="soapNote.subjective.socialHistory"
            register={register}
            errors={errors}
            rows={2}
            disabled={submitting}
          />
          <TextField
            label="Family history"
            name="soapNote.subjective.familyHistory"
            register={register}
            errors={errors}
            rows={2}
            disabled={submitting}
          />
        </div>
      </SoapSection>

      {/* Objective */}
      <SoapSection
        title="Objective"
        icon={HeartPulse}
        accent="text-[color:var(--color-brand-navy)]"
      >
        <TextField
          label="Vital signs"
          name="soapNote.objective.vitalSigns"
          register={register}
          errors={errors}
          rows={2}
          disabled={submitting}
        />
        <TextField
          label="Physical examination"
          name="soapNote.objective.physicalExamination"
          register={register}
          errors={errors}
          rows={4}
          disabled={submitting}
        />
        <TextField
          label="Diagnostic results"
          name="soapNote.objective.diagnosticResults"
          register={register}
          errors={errors}
          rows={3}
          disabled={submitting}
        />
      </SoapSection>

      {/* Assessment + diagnoses field array */}
      <SoapSection
        title="Assessment"
        icon={ListChecks}
        accent="text-[color:var(--color-brand-purple)]"
      >
        <div className="rounded-xl border border-[color:var(--color-border)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-[10px]">Diagnoses</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                diagnoses.append({
                  description: "",
                  icdCode: "",
                  icdDescription: "",
                  verified: false,
                })
              }
              disabled={submitting}
            >
              <Plus className="size-4" /> Add diagnosis
            </Button>
          </div>
          {diagnoses.fields.length === 0 ? (
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              No diagnoses recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {diagnoses.fields.map((field, i) => (
                <DiagnosisRow
                  key={field.id}
                  index={i}
                  register={register}
                  control={control}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                  onRemove={() => diagnoses.remove(i)}
                  disabled={submitting}
                />
              ))}
            </div>
          )}
        </div>
        <TextField
          label="Differential diagnosis"
          name="soapNote.assessment.differentialDiagnosis"
          register={register}
          errors={errors}
          rows={3}
          disabled={submitting}
        />
        <TextField
          label="Clinical reasoning"
          name="soapNote.assessment.clinicalReasoning"
          register={register}
          errors={errors}
          rows={3}
          disabled={submitting}
        />
      </SoapSection>

      {/* Plan */}
      <SoapSection
        title="Plan"
        icon={ClipboardList}
        accent="text-[color:var(--color-brand-cyan)]"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Diagnostic plan"
            name="soapNote.plan.diagnosticPlan"
            register={register}
            errors={errors}
            rows={3}
            disabled={submitting}
          />
          <TextField
            label="Therapeutic plan"
            name="soapNote.plan.therapeuticPlan"
            register={register}
            errors={errors}
            rows={3}
            disabled={submitting}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Patient education"
            name="soapNote.plan.patientEducation"
            register={register}
            errors={errors}
            rows={3}
            disabled={submitting}
          />
          <TextField
            label="Follow-up"
            name="soapNote.plan.followUp"
            register={register}
            errors={errors}
            rows={3}
            disabled={submitting}
          />
        </div>
      </SoapSection>

      {/* ── Post-SOAP Intelligence ─────────────────────────────────── */}
      <Separator />
      <div className="space-y-4">
        <OrderSuggestionsPanel
          soapNote={watch("soapNote") as EncounterCreateInput["soapNote"]}
          patientId={patientId}
          patientContext={patientLabel}
          onCreatePrescription={(rx) => {
            const params = new URLSearchParams({
              patientId: String(patientId),
              drug: rx.drugName,
              dose: rx.dose,
              frequency: rx.frequency,
              route: rx.route,
              duration: rx.duration,
              instructions: rx.instructions,
            });
            window.open(`/pharmax/new?${params.toString()}`, "_blank");
          }}
          onCreateLabOrder={(lab) => {
            const params = new URLSearchParams({
              patientId: String(patientId),
              panel: lab.panelName,
              priority: lab.priority,
              fasting: String(lab.fasting ?? false),
            });
            window.open(`/medilab/new?${params.toString()}`, "_blank");
          }}
          onCreateImagingOrder={(img) => {
            const params = new URLSearchParams({
              patientId: String(patientId),
              type: img.scanType,
              bodyPart: img.bodyPart,
              modality: img.modality,
              priority: img.priority,
              contrast: String(img.contrastRequired ?? false),
            });
            window.open(`/mediscan/new?${params.toString()}`, "_blank");
          }}
          onCreateReferral={(ref) => {
            const params = new URLSearchParams({
              patientId: String(patientId),
              specialty: ref.specialty,
              reason: ref.reason,
              urgency: ref.urgency,
              question: ref.clinicalQuestion,
            });
            window.open(`/referrals/new?${params.toString()}`, "_blank");
          }}
          onScheduleFollowUp={(fu) => {
            const params = new URLSearchParams({
              patientId: String(patientId),
              timeframe: fu.timeframe,
              type: fu.appointmentType,
              reason: fu.reason,
            });
            window.open(`/appointments/new?${params.toString()}`, "_blank");
          }}
        />
        <BillingCodesPanel
          soapNote={watch("soapNote") as EncounterCreateInput["soapNote"]}
          encounterType={encType}
          patientContext={patientLabel}
        />
      </div>

      <Separator />

      {/* Actions */}
      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-card)]/95 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onBack}
          disabled={submitting}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={submitAction(false)}
            disabled={submitting}
            title="Save without signing — you can sign later from the encounter detail page"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save draft
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="brand"
            size="md"
            onClick={submitAction(true)}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing…
              </>
            ) : (
              <>
                <Bookmark className="size-4" />
                Save &amp; sign
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="flex items-center gap-1.5 text-[11px] text-[color:var(--color-muted-foreground)]">
        <Sparkles className="size-3" />
        Signing this encounter attaches your identity and a timestamp to the
        record. Amendments require an explicit amendment workflow (coming in a
        later compliance PR).
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────
function SoapSection({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ElementType;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={cn("size-4", accent)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

interface TextFieldProps {
  label: string;
  name: string;
  register: UseFormRegister<EncounterCreateInput>;
  errors: FieldErrors<EncounterCreateInput>;
  rows?: number;
  disabled?: boolean;
}

function TextField({ label, name, register, errors, rows = 2, disabled }: TextFieldProps) {
  const id = `f-${name.replace(/\./g, "-")}`;
  // Pull the error message via path traversal; RHF nests errors by shape.
  const msg = name.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors) as { message?: string } | undefined;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={rows}
        {...register(name as Parameters<typeof register>[0])}
        aria-invalid={!!msg}
        disabled={disabled}
        className={msg?.message ? "border-[color:var(--color-destructive)]" : undefined}
      />
      {msg?.message && (
        <p className="mt-1 text-xs text-[color:var(--color-destructive)]">
          {msg.message}
        </p>
      )}
    </div>
  );
}

interface DiagnosisRowProps {
  index: number;
  register: UseFormRegister<EncounterCreateInput>;
  control: Control<EncounterCreateInput>;
  setValue: UseFormSetValue<EncounterCreateInput>;
  watch: (name: string) => unknown;
  errors: FieldErrors<EncounterCreateInput>;
  onRemove: () => void;
  disabled?: boolean;
}

function DiagnosisRow({
  index,
  register,
  setValue,
  watch,
  errors,
  onRemove,
  disabled,
}: DiagnosisRowProps) {
  const verified =
    (watch(`soapNote.assessment.diagnoses.${index}.verified`) as boolean | undefined) ??
    false;

  // path-traverse for error
  const descErr =
    errors.soapNote?.assessment?.diagnoses?.[index]?.description?.message;

  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3 sm:grid-cols-[1.5fr_120px_1.5fr_100px_auto]">
      <Input
        placeholder="Diagnosis (e.g. Acute pharyngitis)"
        {...register(`soapNote.assessment.diagnoses.${index}.description`)}
        aria-invalid={!!descErr}
        disabled={disabled}
        className={descErr ? "border-[color:var(--color-destructive)]" : undefined}
      />
      <Input
        placeholder="ICD-11"
        {...register(`soapNote.assessment.diagnoses.${index}.icdCode`)}
        disabled={disabled}
      />
      <Input
        placeholder="ICD description (auto-filled in PR-4c)"
        {...register(`soapNote.assessment.diagnoses.${index}.icdDescription`)}
        disabled={disabled}
      />
      <label className="flex h-10 items-center gap-2 rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 text-xs">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) =>
            setValue(
              `soapNote.assessment.diagnoses.${index}.verified`,
              e.target.checked,
              { shouldValidate: false },
            )
          }
          disabled={disabled}
          className="accent-[color:var(--color-brand-pink)]"
        />
        Verified
      </label>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Remove diagnosis"
        disabled={disabled}
      >
        <Trash2 className="size-4" />
      </Button>
      {descErr && (
        <p className="col-span-full text-xs text-[color:var(--color-destructive)]">
          {descErr}
        </p>
      )}
    </div>
  );
}

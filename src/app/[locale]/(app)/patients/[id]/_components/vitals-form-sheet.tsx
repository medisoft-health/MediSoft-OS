"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler, type UseFormRegisterReturn } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { toast } from "sonner";
import { Loader2, AlertCircle, Activity, Check } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  classifyBMI,
  classifyBP,
  classifyHR,
  classifyPain,
  classifyRR,
  classifySpO2,
  classifyTemp,
  computeBMI,
  vitalsCreateSchema,
  type VitalClassification,
  type VitalsCreateInput,
} from "@/lib/validations/vitals";
import { recordVitals } from "@/lib/actions/vitals";
import { cn } from "@/lib/utils";

interface Props {
  patientId: number;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const flagColors: Record<string, string> = {
  normal: "text-emerald-700 bg-emerald-50 border-emerald-200",
  borderline: "text-amber-700 bg-amber-50 border-amber-200",
  high: "text-orange-700 bg-orange-50 border-orange-200",
  low: "text-sky-700 bg-sky-50 border-sky-200",
  critical: "text-rose-700 bg-rose-100 border-rose-300 font-semibold",
};

export function VitalsFormSheet({ patientId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<VitalsCreateInput>({
    resolver: safeZodResolver(vitalsCreateSchema),
    mode: "onSubmit",
    defaultValues: {
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
    reset,
  } = form;

  React.useEffect(() => {
    if (!open) {
      reset();
      setFormError(null);
      setSubmitting(false);
    }
  }, [open, reset]);

  const w = watch();
  // Live classifications for color-coding
  const bp = classifyBP(w.bloodPressureSystolic, w.bloodPressureDiastolic);
  const hr = classifyHR(w.heartRate);
  const temp = classifyTemp(w.temperature);
  const spo2 = classifySpO2(w.spO2);
  const rr = classifyRR(w.respiratoryRate);
  const pain = classifyPain(w.pain);

  const bmi = computeBMI(w.weightKg, w.heightCm);
  const bmiCls = classifyBMI(bmi);

  const onSubmit: SubmitHandler<VitalsCreateInput> = async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await recordVitals(patientId, values);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) {
          for (const [k, msgs] of Object.entries(result.fieldErrors)) {
            setError(k as keyof VitalsCreateInput, {
              type: "server",
              message: msgs[0],
            });
          }
        }
        return;
      }
      toast.success("Vitals recorded", {
        description: "The new reading has been saved.",
      });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-xl flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b border-[color:var(--color-border)] px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Activity className="size-5 text-[color:var(--color-brand-magenta)]" />
            Record vitals
          </SheetTitle>
          <SheetDescription>
            Values flagged against adult reference ranges. Leave any field blank
            if not measured.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
          noValidate
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {/* Blood pressure */}
            <Section title="Blood pressure" cls={bp}>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Systolic"
                  suffix="mmHg"
                  step={1}
                  register={register("bloodPressureSystolic", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  error={errors.bloodPressureSystolic?.message}
                  placeholder="120"
                />
                <NumberField
                  label="Diastolic"
                  suffix="mmHg"
                  step={1}
                  register={register("bloodPressureDiastolic", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  error={errors.bloodPressureDiastolic?.message}
                  placeholder="80"
                />
              </div>
            </Section>

            <Section title="Heart rate" cls={hr}>
              <NumberField
                label="HR"
                suffix="bpm"
                step={1}
                register={register("heartRate", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                error={errors.heartRate?.message}
                placeholder="72"
              />
            </Section>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Section title="Temperature" cls={temp}>
                <NumberField
                  label="Temp"
                  suffix="°C"
                  step={0.1}
                  register={register("temperature", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  error={errors.temperature?.message}
                  placeholder="36.8"
                />
              </Section>
              <Section title="SpO₂" cls={spo2}>
                <NumberField
                  label="Oxygen sat"
                  suffix="%"
                  step={1}
                  register={register("spO2", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  error={errors.spO2?.message}
                  placeholder="98"
                />
              </Section>
            </div>

            <Section title="Respiratory rate" cls={rr}>
              <NumberField
                label="RR"
                suffix="breaths/min"
                step={1}
                register={register("respiratoryRate", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                error={errors.respiratoryRate?.message}
                placeholder="16"
              />
            </Section>

            <div className="rounded-xl border border-[color:var(--color-border)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-[10px]">Body measurements</Label>
                {bmi != null && (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      bmiCls && flagColors[bmiCls.flag],
                    )}
                  >
                    BMI {bmi} {bmiCls ? `· ${bmiCls.label}` : ""}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Weight"
                  suffix="kg"
                  step={0.1}
                  register={register("weightKg", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  error={errors.weightKg?.message}
                  placeholder="70"
                />
                <NumberField
                  label="Height"
                  suffix="cm"
                  step={0.5}
                  register={register("heightCm", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                  error={errors.heightCm?.message}
                  placeholder="175"
                />
              </div>
            </div>

            <Section title="Pain" cls={pain}>
              <NumberField
                label="Pain (0–10)"
                suffix="/10"
                step={1}
                register={register("pain", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                error={errors.pain?.message}
                placeholder="0"
              />
            </Section>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Position, exertion level, cuff size, anything else worth noting…"
                {...register("notes")}
                disabled={submitting}
              />
            </div>
          </div>

          <SheetFooter className="border-t border-[color:var(--color-border)] bg-[color:var(--color-card)] px-6 py-4">
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="brand" size="md" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Save vitals <Check className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────
// Small subcomponents
// ─────────────────────────────────────────────────────────────────
function Section({
  title,
  children,
  cls,
}: {
  title: string;
  children: React.ReactNode;
  cls?: VitalClassification | null;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <Label className="text-[10px]">{title}</Label>
        {cls && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              flagColors[cls.flag],
            )}
          >
            {cls.label}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  suffix?: string;
  step?: number;
  placeholder?: string;
  register: UseFormRegisterReturn;
  error?: string;
}

function NumberField({
  label,
  suffix,
  step,
  placeholder,
  register,
  error,
}: NumberFieldProps) {
  return (
    <div>
      <Label className="font-normal normal-case tracking-normal">{label}</Label>
      <div className="relative mt-1.5">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          placeholder={placeholder}
          {...register}
          aria-invalid={!!error}
          className={cn(suffix && "pr-12", error && "border-[color:var(--color-destructive)]")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[color:var(--color-muted-foreground)]">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-[color:var(--color-destructive)]">{error}</p>
      )}
    </div>
  );
}

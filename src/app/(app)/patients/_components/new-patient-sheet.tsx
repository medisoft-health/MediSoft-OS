"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  User as UserIcon,
  Shield,
  HeartPulse,
  Check,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  ALLERGY_SEVERITY,
  BLOOD_TYPE_OPTIONS,
  SEX_OPTIONS,
  patientCreateSchema,
  type PatientCreateInput,
} from "@/lib/validations/patient";
import { createPatient } from "@/lib/actions/patients";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const STEPS = [
  { id: 1, label: "Demographics", icon: UserIcon },
  { id: 2, label: "Insurance", icon: Shield },
  { id: 3, label: "Medical background", icon: HeartPulse },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/** Fields validated when "Next" is clicked on each step. */
const STEP_FIELDS: Record<StepId, (keyof PatientCreateInput)[]> = {
  1: [
    "firstName",
    "lastName",
    "firstNameAr",
    "lastNameAr",
    "dateOfBirth",
    "sex",
    "bloodType",
    "saudiId",
    "mrn",
    "phone",
    "email",
    "address",
    "emergencyContact",
  ],
  2: ["insuranceProvider", "insuranceId"],
  3: [
    "allergies",
    "chronicConditions",
    "medicalHistory",
    "familyHistory",
    "socialHistory",
  ],
};

export function NewPatientSheet({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [step, setStep] = React.useState<StepId>(1);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<PatientCreateInput>({
    resolver: safeZodResolver(patientCreateSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      firstNameAr: "",
      lastNameAr: "",
      dateOfBirth: "",
      sex: "male",
      bloodType: "unknown",
      saudiId: "",
      mrn: "",
      phone: "",
      email: "",
      address: { city: "", region: "", country: "Saudi Arabia" },
      emergencyContact: { name: "", relationship: "", phone: "" },
      insuranceProvider: "",
      insuranceId: "",
      allergies: [],
      chronicConditions: [],
      medicalHistory: "",
      familyHistory: "",
      socialHistory: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    trigger,
    setError,
    reset,
    setValue,
    watch,
  } = form;

  const allergies = useFieldArray({ control, name: "allergies" });
  const conditions = useFieldArray({ control, name: "chronicConditions" });

  const resetAll = React.useCallback(() => {
    reset();
    setStep(1);
    setFormError(null);
    setSubmitting(false);
  }, [reset]);

  // When sheet closes, reset state for next open.
  React.useEffect(() => {
    if (!open) resetAll();
  }, [open, resetAll]);

  const handleNext = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (ok && step < 3) setStep((step + 1) as StepId);
  };

  const handleBack = () => {
    setFormError(null);
    if (step > 1) setStep((step - 1) as StepId);
  };

  const onSubmit: SubmitHandler<PatientCreateInput> = async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await createPatient(values);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) {
          for (const [k, msgs] of Object.entries(result.fieldErrors)) {
            setError(k as keyof PatientCreateInput, {
              type: "server",
              message: msgs[0],
            });
          }
        }
        return;
      }
      toast.success("Patient created", {
        description: `Record saved successfully.`,
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

  const sexValue = watch("sex");
  const bloodValue = watch("bloodType");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-[color:var(--color-border)] px-6 py-4">
          <SheetTitle>New patient</SheetTitle>
          <SheetDescription>
            Capture the essentials. You can refine the record later from the
            patient&apos;s detail page.
          </SheetDescription>
        </SheetHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 px-6 py-3">
          {STEPS.map((s, idx) => {
            const isDone = s.id < step;
            const isActive = s.id === step;
            const Icon = s.icon;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive &&
                      "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]",
                    isDone &&
                      "text-[color:var(--color-foreground)] hover:bg-[color:var(--color-card)]",
                    !isActive &&
                      !isDone &&
                      "text-[color:var(--color-muted-foreground)] cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[10px] font-bold",
                      isActive &&
                        "bg-[color:var(--color-brand-pink)] text-white",
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
                {idx < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "h-px flex-1 transition-colors",
                      s.id < step
                        ? "bg-emerald-300"
                        : "bg-[color:var(--color-border)]",
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
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

            {/* ───── Step 1: Demographics ───── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First name *</Label>
                    <Input
                      id="firstName"
                      autoComplete="given-name"
                      {...register("firstName")}
                      aria-invalid={!!errors.firstName}
                      disabled={submitting}
                    />
                    <FieldError msg={errors.firstName?.message} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      {...register("lastName")}
                      aria-invalid={!!errors.lastName}
                      disabled={submitting}
                    />
                    <FieldError msg={errors.lastName?.message} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstNameAr">
                      First name (Arabic){" "}
                      <span className="font-normal normal-case tracking-normal text-[color:var(--color-muted-foreground)]">
                        — optional
                      </span>
                    </Label>
                    <Input
                      id="firstNameAr"
                      dir="rtl"
                      lang="ar"
                      {...register("firstNameAr")}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastNameAr">
                      Last name (Arabic){" "}
                      <span className="font-normal normal-case tracking-normal text-[color:var(--color-muted-foreground)]">
                        — optional
                      </span>
                    </Label>
                    <Input
                      id="lastNameAr"
                      dir="rtl"
                      lang="ar"
                      {...register("lastNameAr")}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="dateOfBirth">Date of birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth")}
                      aria-invalid={!!errors.dateOfBirth}
                      disabled={submitting}
                    />
                    <FieldError msg={errors.dateOfBirth?.message} />
                  </div>
                  <div>
                    <Label>Sex *</Label>
                    <Select
                      value={sexValue}
                      onValueChange={(v) =>
                        setValue("sex", v as PatientCreateInput["sex"], {
                          shouldValidate: false,
                        })
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEX_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Blood type</Label>
                    <Select
                      value={bloodValue}
                      onValueChange={(v) =>
                        setValue("bloodType", v as PatientCreateInput["bloodType"], {
                          shouldValidate: false,
                        })
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_TYPE_OPTIONS.map((bt) => (
                          <SelectItem key={bt} value={bt}>
                            {bt === "unknown" ? "Unknown" : bt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="saudiId">National ID / Iqama</Label>
                    <Input
                      id="saudiId"
                      inputMode="numeric"
                      {...register("saudiId")}
                      aria-invalid={!!errors.saudiId}
                      disabled={submitting}
                    />
                    <FieldError msg={errors.saudiId?.message} />
                  </div>
                  <div>
                    <Label htmlFor="mrn">MRN (clinic-issued)</Label>
                    <Input
                      id="mrn"
                      {...register("mrn")}
                      aria-invalid={!!errors.mrn}
                      disabled={submitting}
                    />
                    <FieldError msg={errors.mrn?.message} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+966 5X XXX XXXX"
                      {...register("phone")}
                      disabled={submitting}
                    />
                    <FieldError msg={errors.phone?.message} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register("email")}
                      disabled={submitting}
                    />
                    <FieldError msg={errors.email?.message} />
                  </div>
                </div>

                <fieldset className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    Address
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="addrCity">City</Label>
                      <Input
                        id="addrCity"
                        {...register("address.city")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addrRegion">Region</Label>
                      <Input
                        id="addrRegion"
                        {...register("address.region")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addrCountry">Country</Label>
                      <Input
                        id="addrCountry"
                        {...register("address.country")}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    Emergency contact
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="emerName">Name</Label>
                      <Input
                        id="emerName"
                        {...register("emergencyContact.name")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emerRel">Relationship</Label>
                      <Input
                        id="emerRel"
                        {...register("emergencyContact.relationship")}
                        placeholder="Spouse, parent, sibling…"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emerPhone">Phone</Label>
                      <Input
                        id="emerPhone"
                        type="tel"
                        {...register("emergencyContact.phone")}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </fieldset>
              </div>
            )}

            {/* ───── Step 2: Insurance ───── */}
            {step === 2 && (
              <div className="space-y-5">
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  Insurance is optional. NPHIES integration will arrive in a later
                  phase — for now we capture provider + policy number for the
                  prescription billing flow.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="insuranceProvider">Provider</Label>
                    <Input
                      id="insuranceProvider"
                      {...register("insuranceProvider")}
                      placeholder="e.g. Bupa Arabia, Tawuniya"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="insuranceId">Policy / member ID</Label>
                    <Input
                      id="insuranceId"
                      {...register("insuranceId")}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ───── Step 3: Medical background ───── */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Allergies */}
                <fieldset className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                      Allergies
                    </legend>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        allergies.append({ substance: "", reaction: "", severity: "mild" })
                      }
                      disabled={submitting}
                    >
                      <Plus className="size-4" /> Add allergy
                    </Button>
                  </div>
                  {allergies.fields.length === 0 ? (
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      No known allergies recorded.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {allergies.fields.map((field, i) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3 sm:grid-cols-[1fr_1fr_140px_auto]"
                        >
                          <Input
                            placeholder="Substance (e.g. Penicillin)"
                            {...register(`allergies.${i}.substance` as const)}
                            disabled={submitting}
                          />
                          <Input
                            placeholder="Reaction (e.g. Rash)"
                            {...register(`allergies.${i}.reaction` as const)}
                            disabled={submitting}
                          />
                          <select
                            {...register(`allergies.${i}.severity` as const)}
                            className="h-10 rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 text-sm"
                            disabled={submitting}
                          >
                            {ALLERGY_SEVERITY.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => allergies.remove(i)}
                            aria-label="Remove allergy"
                            disabled={submitting}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </fieldset>

                {/* Chronic conditions */}
                <fieldset className="rounded-xl border border-[color:var(--color-border)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                      Chronic conditions
                    </legend>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        conditions.append({ description: "", icdCode: "", onsetDate: "" })
                      }
                      disabled={submitting}
                    >
                      <Plus className="size-4" /> Add condition
                    </Button>
                  </div>
                  {conditions.fields.length === 0 ? (
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      No chronic conditions recorded.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {conditions.fields.map((field, i) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3 sm:grid-cols-[1.5fr_140px_140px_auto]"
                        >
                          <Input
                            placeholder="Condition (e.g. Type 2 Diabetes)"
                            {...register(`chronicConditions.${i}.description` as const)}
                            disabled={submitting}
                          />
                          <Input
                            placeholder="ICD-11"
                            {...register(`chronicConditions.${i}.icdCode` as const)}
                            disabled={submitting}
                          />
                          <Input
                            type="date"
                            {...register(`chronicConditions.${i}.onsetDate` as const)}
                            disabled={submitting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => conditions.remove(i)}
                            aria-label="Remove condition"
                            disabled={submitting}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </fieldset>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="medicalHistory">Medical history</Label>
                    <Textarea
                      id="medicalHistory"
                      rows={3}
                      placeholder="Past surgeries, hospitalisations, significant findings…"
                      {...register("medicalHistory")}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="familyHistory">Family history</Label>
                    <Textarea
                      id="familyHistory"
                      rows={3}
                      placeholder="Cardiovascular, oncologic, hereditary conditions…"
                      {...register("familyHistory")}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="socialHistory">Social history</Label>
                    <Textarea
                      id="socialHistory"
                      rows={3}
                      placeholder="Smoking, alcohol, occupation, lifestyle…"
                      {...register("socialHistory")}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-[color:var(--color-border)] bg-[color:var(--color-card)] px-6 py-4">
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={step === 1 || submitting}
              >
                <ChevronLeft className="size-4" /> Back
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  variant="brand"
                  size="md"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button type="submit" variant="brand" size="md" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Create patient <Check className="size-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[color:var(--color-destructive)]">{msg}</p>;
}

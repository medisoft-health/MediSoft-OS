"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { toast } from "sonner";
import { Loader2, AlertCircle, Mail, Lock, User, Stethoscope, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { authClient } from "@/lib/auth-client";
import { signupSchema, SPECIALTY_OPTIONS, type SignupInput } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: safeZodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      specialty: undefined,
      licenseNumber: "",
    },
  });

  const onSubmit = async (values: SignupInput) => {
    setFormError(null);
    setSubmitting(true);
    try {
      // Note: `role` is intentionally NOT sent — server config marks it
      // input: false. New users default to "physician".
      const { error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        // Additional fields wired in src/lib/auth.ts → user.additionalFields
        specialty: values.specialty ?? null,
        licenseNumber: values.licenseNumber?.trim() || null,
      } as Parameters<typeof authClient.signUp.email>[0]);

      if (error) {
        setFormError(error.message ?? "Could not create your account");
        return;
      }

      // Better-Auth's autoSignIn is enabled, so the cookie is already set.
      toast.success("Welcome to MediSoft", {
        description: "Your account is ready. Taking you to the dashboard…",
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || isSubmitting;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="lockup" className="mb-6" />
          <h1 className="text-2xl font-black tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            Start your clinical workspace in less than a minute
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-[color:var(--color-destructive)]/20 bg-[color:var(--color-destructive)]/10 px-3 py-2.5 text-sm text-[color:var(--color-destructive)]"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <div className="relative mt-1.5">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Dr. Sarah Mansour"
                className={cn("pl-9", errors.name && "border-[color:var(--color-destructive)]")}
                aria-invalid={!!errors.name}
                disabled={isLoading}
                {...register("name")}
              />
            </div>
            {errors.name && (
              <p className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="sarah.mansour@medisoft.health"
                className={cn("pl-9", errors.email && "border-[color:var(--color-destructive)]")}
                aria-invalid={!!errors.email}
                disabled={isLoading}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <div className="relative mt-1.5">
                <Stethoscope className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                <select
                  id="specialty"
                  defaultValue=""
                  disabled={isLoading}
                  className={cn(
                    "flex h-10 w-full appearance-none rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] pl-9 pr-3 py-2 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1 focus-visible:border-transparent",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    errors.specialty && "border-[color:var(--color-destructive)]",
                  )}
                  aria-invalid={!!errors.specialty}
                  {...register("specialty")}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {SPECIALTY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {errors.specialty && (
                <p className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                  {errors.specialty.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="licenseNumber">
                License number{" "}
                <span className="font-normal normal-case tracking-normal text-[color:var(--color-muted-foreground)]">
                  (optional)
                </span>
              </Label>
              <div className="relative mt-1.5">
                <FileText className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                <Input
                  id="licenseNumber"
                  type="text"
                  placeholder="SCFHS-12345"
                  className="pl-9"
                  disabled={isLoading}
                  {...register("licenseNumber")}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 12 characters"
                  className={cn(
                    "pl-9",
                    errors.password && "border-[color:var(--color-destructive)]",
                  )}
                  aria-invalid={!!errors.password}
                  disabled={isLoading}
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm</Label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className={cn(
                    "pl-9",
                    errors.confirmPassword && "border-[color:var(--color-destructive)]",
                  )}
                  aria-invalid={!!errors.confirmPassword}
                  disabled={isLoading}
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
            By creating an account you agree to MediSoft&apos;s clinical-use
            terms. Your data is encrypted in transit and at rest.
          </p>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="mt-1 w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[color:var(--color-muted-foreground)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[color:var(--color-brand-magenta)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>

      <div aria-hidden className="h-1 w-full grad-brand" />
    </Card>
  );
}

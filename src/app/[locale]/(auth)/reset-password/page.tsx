"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: safeZodResolver(resetPasswordSchema),
    mode: "onSubmit",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    if (!token) {
      setFormError("Invalid or expired reset link. Please request a new one.");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: values.password,
          token,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data?.message ?? "Failed to reset password. The link may have expired.");
        return;
      }

      setResetSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // No token — show error state
  if (!token && !resetSuccess) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <Logo variant="lockup" className="mb-6" />

            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="size-8 text-amber-600" />
            </div>

            <h1 className="text-2xl font-black tracking-tight">Invalid reset link</h1>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)] max-w-sm">
              This password reset link is invalid or has expired. Please request a new one.
            </p>

            <div className="mt-8 w-full space-y-3">
              <Link href="/forgot-password" className="block">
                <Button variant="brand" size="lg" className="w-full">
                  Request new reset link
                </Button>
              </Link>
              <Link href="/login" className="block">
                <Button variant="outline" size="lg" className="w-full">
                  <ArrowLeft className="size-4" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
        <div aria-hidden className="h-1 w-full grad-brand" />
      </Card>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <Logo variant="lockup" className="mb-6" />

            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
              <ShieldCheck className="size-8 text-green-600" />
            </div>

            <h1 className="text-2xl font-black tracking-tight">Password reset!</h1>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>

            <div className="mt-8 w-full">
              <Link href="/login" className="block">
                <Button variant="brand" size="lg" className="w-full">
                  Sign in with new password
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
        <div aria-hidden className="h-1 w-full grad-brand" />
      </Card>
    );
  }

  // Reset form
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-8 sm:p-10">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="lockup" className="mb-6" />
          <h1 className="text-2xl font-black tracking-tight">Set new password</h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            Your new password must be at least 12 characters
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
            <Label htmlFor="password">New password</Label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••••"
                className={cn(
                  "pl-9 pr-10",
                  errors.password && "border-[color:var(--color-destructive)]",
                )}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={submitting}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••••"
                className={cn(
                  "pl-9 pr-10",
                  errors.confirmPassword && "border-[color:var(--color-destructive)]",
                )}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
                disabled={submitting}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="confirm-error" className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="mt-2 w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Resetting password…
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </Link>
        </div>
      </CardContent>

      {/* Brand accent strip */}
      <div aria-hidden className="h-1 w-full grad-brand" />
    </Card>
  );
}

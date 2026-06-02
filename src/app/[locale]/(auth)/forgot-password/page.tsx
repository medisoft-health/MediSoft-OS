"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { Loader2, AlertCircle, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [emailSent, setEmailSent] = React.useState(false);
  const [sentToEmail, setSentToEmail] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: safeZodResolver(forgotPasswordSchema),
    mode: "onSubmit",
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          redirectTo: "/reset-password",
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to send reset email");
      }
      setSentToEmail(values.email);
      setEmailSent(true);
    } catch (err) {
      // Better Auth always returns success for security (no email enumeration)
      // So we show success even if the email doesn't exist
      setSentToEmail(values.email);
      setEmailSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <Logo variant="lockup" className="mb-6" />

            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>

            <h1 className="text-2xl font-black tracking-tight">{t("checkYourEmail")}</h1>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)] max-w-sm">
              {t("resetLinkSentTo")}{" "}
              <span className="font-semibold text-[color:var(--color-foreground)]">
                {sentToEmail}
              </span>
            </p>
            <p className="mt-3 text-xs text-[color:var(--color-muted-foreground)]">
              {t("checkSpam")}
            </p>

            <div className="mt-8 w-full space-y-3">
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                onClick={() => {
                  setEmailSent(false);
                  setFormError(null);
                }}
              >
                {t("sendAgain")}
              </Button>
              <Link href="/login" className="block">
                <Button variant="outline" size="lg" className="w-full">
                  <ArrowLeft className="size-4" />
                  {t("backToSignIn")}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
        <div aria-hidden className="h-1 w-full grad-brand" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-8 sm:p-10">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="lockup" className="mb-6" />
          <h1 className="text-2xl font-black tracking-tight">{t("forgotPasswordTitle")}</h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            {t("forgotPasswordSubtitle")}
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
            <Label htmlFor="email">{t("emailAddressLabel")}</Label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="medisoft2022@gmail.com"
                className={cn("pl-9", errors.email && "border-[color:var(--color-destructive)]")}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={submitting}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                {errors.email.message}
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
                {t("sendingResetLink")}
              </>
            ) : (
              t("sendResetLink")
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToSignIn")}
          </Link>
        </div>
      </CardContent>

      {/* Brand accent strip */}
      <div aria-hidden className="h-1 w-full grad-brand" />
    </Card>
  );
}

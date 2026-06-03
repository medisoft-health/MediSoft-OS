"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { toast } from "sonner";
import { Loader2, AlertCircle, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("Auth");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const errorRef = React.useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: safeZodResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setFormError(error.message ?? t("invalidEmailOrPassword"));
        return;
      }

      toast.success(t("signedIn"), {
        description: t("redirectingToDashboard"),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("somethingWentWrong");
      setFormError(message);
    }
  };

  // Focus the error alert when it appears so screen readers announce it
  React.useEffect(() => {
    if (formError && errorRef.current) {
      errorRef.current.focus();
    }
  }, [formError]);

  const isLoading = isSubmitting;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-8 sm:p-10">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[color:var(--color-muted-foreground)] transition-colors hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          {t("backToPortalSelection")}
        </Link>

        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="lockup" className="mb-6" />
          <h1 className="text-2xl font-black tracking-tight">{t("physicianPortal")}</h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            {t("signInSubtitle")}
          </p>
        </div>

        {formError && (
          <div
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="mb-5 flex items-start gap-2 rounded-xl border border-[color:var(--color-destructive)]/20 bg-[color:var(--color-destructive)]/10 px-3 py-2.5 text-sm text-[color:var(--color-destructive)] outline-none"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="email">{t("emailAddress")}</Label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="doctor@example.com"
                className={cn("ps-9", errors.email && "border-[color:var(--color-destructive)]")}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={isLoading}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-xs text-[color:var(--color-destructive)]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href="/forgot-password"
                className="rounded-md px-1.5 py-1 text-xs font-medium text-[color:var(--color-brand-magenta)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]"
              >
                {t("forgot")}
              </Link>
            </div>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className={cn(
                  "ps-9 pe-10",
                  errors.password && "border-[color:var(--color-destructive)]",
                )}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={isLoading}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] transition-colors"
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                className="mt-1.5 text-xs text-[color:var(--color-destructive)]"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="mt-2 w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("signingIn")}
              </>
            ) : (
              t("signIn")
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[color:var(--color-muted-foreground)]">
          {t("newToMediSoft")}{" "}
          <Link
            href="/signup"
            className="font-semibold text-[color:var(--color-brand-magenta)] hover:underline"
          >
            {t("createAnAccount")}
          </Link>
        </p>
      </CardContent>

      {/* Brand accent strip */}
      <div aria-hidden className="h-1 w-full grad-brand" />
    </Card>
  );
}

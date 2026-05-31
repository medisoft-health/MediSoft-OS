"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { toast } from "sonner";
import { Loader2, AlertCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

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
    setSubmitting(true);
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setFormError(error.message ?? "Invalid email or password");
        return;
      }

      toast.success("Signed in", {
        description: "Redirecting to your dashboard…",
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
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="lockup" className="mb-6" />
          <h1 className="text-2xl font-black tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            Sign in to continue to your clinical workspace
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
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[color:var(--color-brand-magenta)] hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className={cn(
                  "pl-9 pr-10",
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
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
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[color:var(--color-muted-foreground)]">
          New to MediSoft?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[color:var(--color-brand-magenta)] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </CardContent>

      {/* Brand accent strip */}
      <div aria-hidden className="h-1 w-full grad-brand" />
    </Card>
  );
}

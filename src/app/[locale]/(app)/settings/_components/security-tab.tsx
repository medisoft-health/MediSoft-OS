"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { toast } from "sonner";
import { AlertCircle, KeyRound, Loader2, ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations/settings";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SecurityTab() {
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: safeZodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = form;

  const onSubmit = async (values: ChangePasswordInput) => {
    setFormError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (result.error) {
        setFormError(
          result.error.message ?? "Could not change password. Check your current password.",
        );
        return;
      }

      setSuccess(true);
      reset();
      toast.success("Password changed", {
        description: "Your new password is now active.",
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unexpected error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-[color:var(--color-brand-magenta)]" />
            Change password
          </CardTitle>
          <CardDescription>
            Your password must be at least 12 characters (healthcare-grade).
            After changing, all other sessions remain active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-4">
              <ShieldCheck />
              <AlertDescription>
                Password changed successfully.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register("currentPassword")}
                aria-invalid={!!errors.currentPassword}
                disabled={submitting}
              />
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-[color:var(--color-destructive)]">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 12 characters"
                  {...register("newPassword")}
                  aria-invalid={!!errors.newPassword}
                  disabled={submitting}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-[color:var(--color-destructive)]">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmNewPassword")}
                  aria-invalid={!!errors.confirmNewPassword}
                  disabled={submitting}
                />
                {errors.confirmNewPassword && (
                  <p className="mt-1 text-xs text-[color:var(--color-destructive)]">
                    {errors.confirmNewPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="brand" size="md" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Updating…
                  </>
                ) : (
                  "Change password"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
          <CardDescription>
            Not yet available. 2FA will be added in a future compliance update
            alongside Nafath IAM integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" disabled>
            Enable 2FA (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { toast } from "sonner";
import { Loader2, Save, Mail, BadgeCheck, Shield } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validations/settings";
import { SPECIALTY_OPTIONS } from "@/lib/validations/auth";
import { updateProfile } from "@/lib/actions/settings";
import type { UserProfile } from "@/lib/queries/user";
import { formatClinicalDate } from "@/lib/utils";

interface Props {
  user: UserProfile;
}

export function ProfileTab({ user }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<ProfileUpdateInput>({
    resolver: safeZodResolver(profileUpdateSchema),
    defaultValues: {
      name: user.name,
      specialty: (user.specialty as ProfileUpdateInput["specialty"]) ?? "",
      licenseNumber: user.licenseNumber ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = form;

  const specialtyValue = watch("specialty");

  const onSubmit = async (values: ProfileUpdateInput) => {
    setSubmitting(true);
    try {
      const result = await updateProfile(values);
      if (!result.ok) {
        toast.error("Could not save", { description: result.error });
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Read-only identity card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            Your email and role are managed by your administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Email
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="size-4 text-[color:var(--color-muted-foreground)]" />
                <span className="font-medium">{user.email}</span>
                {user.emailVerified ? (
                  <Badge variant="success" className="text-[10px]">
                    <BadgeCheck className="size-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px]">
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Role
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Shield className="size-4 text-[color:var(--color-muted-foreground)]" />
                <Badge variant="info" className="capitalize text-[10px]">
                  {user.role}
                </Badge>
              </div>
            </div>
            {user.saudiId && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  National ID
                </div>
                <div className="mt-1 font-mono text-sm">{user.saudiId}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Member since
              </div>
              <div className="mt-1">{formatClinicalDate(user.createdAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Update your display name, specialty, and license number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <Label htmlFor="name">Full name *</Label>
              <Input
                id="name"
                {...register("name")}
                aria-invalid={!!errors.name}
                disabled={submitting}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-[color:var(--color-destructive)]">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Specialty</Label>
                <Select
                  value={specialtyValue || "__none__"}
                  onValueChange={(v) =>
                    setValue(
                      "specialty",
                      v === "__none__"
                        ? ""
                        : (v as ProfileUpdateInput["specialty"]),
                      { shouldDirty: true },
                    )
                  }
                  disabled={submitting}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {SPECIALTY_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="license">License number</Label>
                <Input
                  id="license"
                  {...register("licenseNumber")}
                  placeholder="SCFHS-12345"
                  disabled={submitting}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-end gap-2">
              <Button
                type="submit"
                variant="brand"
                size="md"
                disabled={!isDirty || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="size-4" /> Save changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

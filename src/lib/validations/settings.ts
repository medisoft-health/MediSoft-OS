import { z } from "zod";
import { SPECIALTY_OPTIONS } from "./auth";

/**
 * Settings / profile validation schemas — aligned with the users table
 * columns in src/db/schema.ts.
 */

export const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  specialty: z.enum(SPECIALTY_OPTIONS).optional().or(z.literal("")),
  licenseNumber: z.string().max(80).optional().or(z.literal("")),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(12, "New password must be at least 12 characters")
      .max(128),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const THEME_OPTIONS = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_OPTIONS)[number];

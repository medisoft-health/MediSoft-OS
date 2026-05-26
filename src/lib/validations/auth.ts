import { z } from "zod";

/**
 * Auth validation schemas — shared between the client forms and
 * any server actions that need to re-validate inputs.
 *
 * Password rules match Better-Auth server config (12 char minimum,
 * see src/lib/auth.ts).
 */

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Emergency Medicine",
  "Family Medicine",
  "Internal Medicine",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Radiology",
  "Surgery",
  "Urology",
  "Other",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
export const SPECIALTY_OPTIONS = SPECIALTIES;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(12, "Password must be at least 12 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(200),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128, "Password must be no more than 128 characters"),
    confirmPassword: z.string(),
    specialty: z.enum(SPECIALTIES, { message: "Select your specialty" }).optional(),
    licenseNumber: z
      .string()
      .max(80, "License number is too long")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

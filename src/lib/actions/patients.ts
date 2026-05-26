"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import {
  patientCreateSchema,
  type PatientCreateInput,
} from "@/lib/validations/patient";
import { findPatientByIdentifier } from "@/lib/queries/patients";

/**
 * Server actions for patient mutations. Every action:
 *   1) Validates the input against Zod
 *   2) Verifies an authenticated session
 *   3) Performs the DB write
 *   4) Writes an audit_log entry
 *   5) Revalidates the relevant Next.js cache paths
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

interface CreatePatientSuccess {
  id: number;
}

/**
 * Create a new patient. Returns the integer id of the new row.
 *
 * Form fields are normalised (empty strings → null) before insert.
 * Duplicate saudiId or mrn returns a friendly error rather than the
 * raw DB unique-constraint violation.
 */
export async function createPatient(
  raw: unknown,
): Promise<ActionResult<CreatePatientSuccess>> {
  const session = await requireSession();
  if (!session.ok) {
    return { ok: false, error: "You must be signed in to create a patient." };
  }
  const user = session.user;

  const parsed = patientCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const input: PatientCreateInput = parsed.data;

  // Normalise empty strings → null for nullable columns.
  const emptyToNull = (v: string | undefined | null) =>
    v && v.trim().length > 0 ? v.trim() : null;

  const saudiId = emptyToNull(input.saudiId);
  const mrn = emptyToNull(input.mrn);

  // Friendlier dup-check (also avoids burning an id from the serial sequence
  // when the insert would have failed anyway).
  if (saudiId || mrn) {
    const dup = await findPatientByIdentifier(saudiId, mrn);
    if (dup) {
      return {
        ok: false,
        error: `A patient already exists with this ${dup.field === "saudiId" ? "National ID" : "MRN"}.`,
        fieldErrors: {
          [dup.field]:
            dup.field === "saudiId"
              ? ["This National ID is already in use."]
              : ["This MRN is already in use."],
        },
      };
    }
  }

  try {
    const [inserted] = await db
      .insert(patients)
      .values({
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        firstNameAr: emptyToNull(input.firstNameAr),
        lastNameAr: emptyToNull(input.lastNameAr),
        dateOfBirth: input.dateOfBirth,
        sex: input.sex,
        bloodType: input.bloodType,
        saudiId,
        mrn,
        phone: emptyToNull(input.phone),
        email: emptyToNull(input.email),
        address: input.address ?? null,
        emergencyContact: input.emergencyContact ?? null,
        insuranceProvider: emptyToNull(input.insuranceProvider),
        insuranceId: emptyToNull(input.insuranceId),
        allergies: input.allergies.length > 0 ? input.allergies : null,
        chronicConditions:
          input.chronicConditions.length > 0 ? input.chronicConditions : null,
        medicalHistory: emptyToNull(input.medicalHistory),
        familyHistory: emptyToNull(input.familyHistory),
        socialHistory: emptyToNull(input.socialHistory),
        createdById: user.id,
      })
      .returning({ id: patients.id });

    if (!inserted) {
      return { ok: false, error: "Could not save the patient. Please try again." };
    }

    await logAudit({
      actorId: user.id,
      action: "patient.create",
      resourceType: "patient",
      resourceId: inserted.id,
      patientId: inserted.id,
      metadata: {
        firstName: input.firstName,
        lastName: input.lastName,
        sex: input.sex,
      },
    });

    revalidatePath("/patients");
    revalidatePath("/");

    return { ok: true, data: { id: inserted.id } };
  } catch (err) {
    console.error("[patient.create] failed", err);
    const message =
      err instanceof Error && err.message ? err.message : "Unexpected database error";
    return { ok: false, error: message };
  }
}

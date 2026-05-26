"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, vitals } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import {
  computeBMI,
  vitalsCreateSchema,
  type VitalsCreateInput,
} from "@/lib/validations/vitals";

export type VitalsActionResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Record a new vitals reading for a patient.
 *
 *   1) Verify session.
 *   2) Verify patient exists (and is not soft-deleted).
 *   3) Validate input.
 *   4) Compute BMI if height + weight are present.
 *   5) INSERT into vitals.
 *   6) Audit log entry.
 *   7) Revalidate `/patients/[id]`.
 */
export async function recordVitals(
  patientId: number,
  raw: unknown,
): Promise<VitalsActionResult> {
  const session = await requireSession();
  if (!session.ok) {
    return { ok: false, error: "You must be signed in to record vitals." };
  }
  const user = session.user;

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return { ok: false, error: "Invalid patient." };
  }

  // Confirm the patient actually exists & is not deleted.
  const [pat] = await db
    .select({ id: patients.id, deletedAt: patients.deletedAt })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);
  if (!pat || pat.deletedAt) {
    return { ok: false, error: "Patient not found." };
  }

  const parsed = vitalsCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    let formError = "Please correct the highlighted fields.";
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key === "") {
        // The "at least one measurement" refine.
        formError = issue.message;
      } else {
        (fieldErrors[key] ??= []).push(issue.message);
      }
    }
    return { ok: false, error: formError, fieldErrors };
  }

  const v: VitalsCreateInput = parsed.data;

  // BMI auto-compute when both height & weight are present.
  const bmi = computeBMI(v.weightKg, v.heightCm);

  try {
    const [inserted] = await db
      .insert(vitals)
      .values({
        patientId,
        physicianId: user.id,
        bloodPressureSystolic: v.bloodPressureSystolic ?? null,
        bloodPressureDiastolic: v.bloodPressureDiastolic ?? null,
        heartRate: v.heartRate ?? null,
        respiratoryRate: v.respiratoryRate ?? null,
        // Drizzle's `decimal` column expects a string at insert time.
        temperature: v.temperature != null ? String(v.temperature) : null,
        spO2: v.spO2 ?? null,
        weightKg: v.weightKg != null ? String(v.weightKg) : null,
        heightCm: v.heightCm != null ? String(v.heightCm) : null,
        bmi: bmi != null ? String(bmi) : null,
        pain: v.pain ?? null,
        notes: v.notes && v.notes.length > 0 ? v.notes : null,
      })
      .returning({ id: vitals.id });

    if (!inserted) {
      return { ok: false, error: "Could not save vitals. Please try again." };
    }

    await logAudit({
      actorId: user.id,
      action: "vitals.record",
      resourceType: "vital",
      resourceId: inserted.id,
      patientId,
      metadata: {
        bp: v.bloodPressureSystolic && v.bloodPressureDiastolic
          ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
          : null,
        hr: v.heartRate ?? null,
        temp: v.temperature ?? null,
        spO2: v.spO2 ?? null,
        bmi,
      },
    });

    revalidatePath(`/patients/${patientId}`);

    return { ok: true, data: { id: inserted.id } };
  } catch (err) {
    console.error("[vitals.record] failed", err);
    const message =
      err instanceof Error && err.message ? err.message : "Unexpected database error";
    return { ok: false, error: message };
  }
}

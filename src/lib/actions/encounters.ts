"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { encounters, patients } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import {
  encounterCreateSchema,
  encounterSignSchema,
  type EncounterCreateInput,
} from "@/lib/validations/encounter";
import { isSoapNoteNonEmpty } from "@/lib/encounter-soap";

export type EncounterActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Create a new encounter from a MediScript session.
 *
 *   1) Verify session.
 *   2) Verify the patient exists (and is not soft-deleted).
 *   3) Validate inputs.
 *   4) Reject empty SOAP notes (defensive — UI already gates this).
 *   5) INSERT encounter (status = `signed` if `sign:true`, else `awaiting_review`).
 *   6) Audit log entry.
 *   7) Revalidate the patient detail + MediScript pages.
 */
export async function createEncounter(
  raw: unknown,
): Promise<EncounterActionResult<{ id: string; status: string }>> {
  const session = await requireSession();
  if (!session.ok) {
    return { ok: false, error: "You must be signed in to save an encounter." };
  }
  const user = session.user;

  const parsed = encounterCreateSchema.safeParse(raw);
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

  const input: EncounterCreateInput = parsed.data;

  if (!isSoapNoteNonEmpty(input.soapNote)) {
    return {
      ok: false,
      error:
        "The SOAP note is empty. Please record at least a chief complaint, " +
        "assessment, or plan before saving.",
    };
  }

  // Confirm the patient still exists.
  const [pat] = await db
    .select({ id: patients.id, deletedAt: patients.deletedAt })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);
  if (!pat || pat.deletedAt) {
    return { ok: false, error: "Patient not found." };
  }

  const willSign = input.sign;
  const status = willSign ? "signed" : "awaiting_review";

  // Extract diagnoses → icd_codes JSONB (typed in the schema).
  const icdCodes = input.soapNote.assessment.diagnoses
    .filter((d) => d.icdCode && d.icdCode.trim().length > 0)
    .map((d) => ({
      code: d.icdCode!.trim(),
      description: d.icdDescription ?? d.description,
      verified: d.verified ?? false,
    }));

  try {
    const [inserted] = await db
      .insert(encounters)
      .values({
        patientId: input.patientId,
        physicianId: user.id,
        encounterType: input.encounterType,
        status,
        rawTranscript:
          input.rawTranscript && input.rawTranscript.length > 0
            ? input.rawTranscript
            : null,
        correctedTranscript:
          input.correctedTranscript && input.correctedTranscript.length > 0
            ? input.correctedTranscript
            : null,
        soapNote: input.soapNote,
        icdCodes: icdCodes.length > 0 ? icdCodes : null,
        signedAt: willSign ? new Date() : null,
        signedById: willSign ? user.id : null,
      })
      .returning({ id: encounters.id, status: encounters.status });

    if (!inserted) {
      return { ok: false, error: "Could not save the encounter." };
    }

    await logAudit({
      actorId: user.id,
      action: willSign ? "encounter.sign" : "encounter.create",
      resourceType: "encounter",
      resourceId: inserted.id,
      patientId: input.patientId,
      metadata: {
        encounterType: input.encounterType,
        status: inserted.status,
        diagnosisCount: input.soapNote.assessment.diagnoses.length,
        icdCount: icdCodes.length,
        hasTranscript: !!input.rawTranscript,
      },
    });

    revalidatePath(`/patients/${input.patientId}`);
    revalidatePath("/mediscript");
    revalidatePath("/");

    return { ok: true, data: { id: inserted.id, status: inserted.status } };
  } catch (err) {
    console.error("[encounter.create] failed", err);
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Unexpected database error";
    return { ok: false, error: message };
  }
}

/**
 * Sign a previously-saved encounter (status `awaiting_review` → `signed`).
 *
 * Only the physician who created the encounter can sign it. (Co-signing
 * and amendments will land in a later compliance PR.)
 */
export async function signEncounter(
  raw: unknown,
): Promise<EncounterActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session.ok) {
    return { ok: false, error: "You must be signed in to sign an encounter." };
  }
  const user = session.user;

  const parsed = encounterSignSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid encounter id." };
  }
  const { encounterId } = parsed.data;

  const [enc] = await db
    .select({
      id: encounters.id,
      patientId: encounters.patientId,
      physicianId: encounters.physicianId,
      status: encounters.status,
      deletedAt: encounters.deletedAt,
    })
    .from(encounters)
    .where(eq(encounters.id, encounterId))
    .limit(1);

  if (!enc || enc.deletedAt) {
    return { ok: false, error: "Encounter not found." };
  }
  if (enc.physicianId !== user.id) {
    return {
      ok: false,
      error: "Only the originating physician can sign this encounter.",
    };
  }
  if (enc.status === "signed") {
    return { ok: false, error: "This encounter is already signed." };
  }
  if (enc.status === "cancelled") {
    return { ok: false, error: "Cancelled encounters cannot be signed." };
  }

  try {
    await db
      .update(encounters)
      .set({
        status: "signed",
        signedAt: new Date(),
        signedById: user.id,
      })
      .where(and(eq(encounters.id, encounterId), isNull(encounters.deletedAt)));

    await logAudit({
      actorId: user.id,
      action: "encounter.sign",
      resourceType: "encounter",
      resourceId: encounterId,
      patientId: enc.patientId,
    });

    revalidatePath(`/encounters/${encounterId}`);
    revalidatePath(`/patients/${enc.patientId}`);

    return { ok: true, data: { id: encounterId } };
  } catch (err) {
    console.error("[encounter.sign] failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unexpected database error",
    };
  }
}

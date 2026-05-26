"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, prescriptions } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import {
  prescriptionCreateSchema,
  type InteractionItem,
  type PrescriptionCreateInput,
  type Severity,
} from "@/lib/validations/prescription";
import { analyzeDrugSafety } from "@/lib/ai/pharmax-analyzer";

export type PrescriptionActionResult =
  | { ok: true; data: { ids: string[]; severity: Severity | null } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Save a multi-drug prescription as a batch.
 *
 * Pipeline:
 *   1) Verify session.
 *   2) Validate inputs.
 *   3) Verify the patient still exists.
 *   4) Re-run the safety analyzer server-side so the interaction snapshot
 *      we persist matches what the doctor saw (and isn't tampered with
 *      from the client).
 *   5) INSERT one prescription row per drug, attaching the relevant
 *      interactions filtered for that drug.
 *   6) Audit log a single `prescription.create` entry per drug.
 *   7) revalidatePath the patient detail + PharmaX pages.
 */
export async function createPrescription(
  raw: unknown,
): Promise<PrescriptionActionResult> {
  const session = await requireSession();
  if (!session.ok) {
    return { ok: false, error: "You must be signed in to save a prescription." };
  }
  const user = session.user;

  const parsed = prescriptionCreateSchema.safeParse(raw);
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

  const input: PrescriptionCreateInput = parsed.data;

  // Verify the patient still exists / is not soft-deleted.
  const [pat] = await db
    .select({
      id: patients.id,
      deletedAt: patients.deletedAt,
      allergies: patients.allergies,
      chronicConditions: patients.chronicConditions,
      dateOfBirth: patients.dateOfBirth,
      sex: patients.sex,
    })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);
  if (!pat || pat.deletedAt) {
    return { ok: false, error: "Patient not found." };
  }

  // ── Re-run server-side safety analysis ─────────────────────────
  let interactions: InteractionItem[] = [];
  let highestSeverity: Severity | null = null;
  try {
    const analysis = await analyzeDrugSafety({
      drugs: input.drugs.map((d) => ({
        drugName: d.drugName,
        rxcui: d.rxcui || null,
      })),
      patientContext: {
        age:
          pat.dateOfBirth
            ? new Date().getFullYear() - new Date(pat.dateOfBirth).getFullYear()
            : undefined,
        sex: pat.sex,
        allergies: Array.isArray(pat.allergies)
          ? (pat.allergies as { substance?: string }[])
              .map((a) => a.substance)
              .filter((s): s is string => !!s)
          : [],
        chronicConditions: Array.isArray(pat.chronicConditions)
          ? (pat.chronicConditions as { description?: string }[])
              .map((c) => c.description)
              .filter((s): s is string => !!s)
          : [],
      },
    });
    interactions = analysis.interactions;
    highestSeverity = analysis.highestSeverity;
  } catch (err) {
    console.warn("[prescription.create] analyzer failed (non-fatal)", err);
  }

  const status: typeof prescriptions.$inferInsert.status = input.finalize
    ? "active"
    : "draft";

  // ── INSERT batch ───────────────────────────────────────────────
  const inserted: string[] = [];
  try {
    for (const drug of input.drugs) {
      // For each drug, attach interactions whose `interactingDrug` mentions it.
      const drugInteractions = interactions.filter((it) => {
        if (!it.interactingDrug) return false;
        return it.interactingDrug
          .toLowerCase()
          .includes(drug.drugName.trim().toLowerCase());
      });
      const drugSeverity =
        drugInteractions.length === 0
          ? null
          : drugInteractions.reduce<Severity | null>((acc, it) => {
              if (!acc) return it.severity;
              const rank = { low: 0, moderate: 1, high: 2, critical: 3 } as const;
              return rank[acc] >= rank[it.severity] ? acc : it.severity;
            }, null);

      const [row] = await db
        .insert(prescriptions)
        .values({
          patientId: input.patientId,
          physicianId: user.id,
          encounterId: input.encounterId && input.encounterId.length > 0 ? input.encounterId : null,
          drugName: drug.drugName.trim(),
          brandName: drug.brandName && drug.brandName.trim() ? drug.brandName.trim() : null,
          rxcui: drug.rxcui && drug.rxcui.trim() ? drug.rxcui.trim() : null,
          atcCode: drug.atcCode && drug.atcCode.trim() ? drug.atcCode.trim() : null,
          dose: drug.dose.trim(),
          frequency: drug.frequency.trim(),
          route: drug.route.trim(),
          duration: drug.duration && drug.duration.trim() ? drug.duration.trim() : null,
          instructions:
            drug.instructions && drug.instructions.trim() ? drug.instructions.trim() : null,
          quantity: drug.quantity ?? null,
          refills: drug.refills ?? 0,
          interactions: drugInteractions.length > 0 ? drugInteractions : null,
          severity: drugSeverity,
          status,
        })
        .returning({ id: prescriptions.id });

      if (row) {
        inserted.push(row.id);
        await logAudit({
          actorId: user.id,
          action: "prescription.create",
          resourceType: "prescription",
          resourceId: row.id,
          patientId: input.patientId,
          metadata: {
            drugName: drug.drugName,
            rxcui: drug.rxcui ?? null,
            severity: drugSeverity,
            interactionCount: drugInteractions.length,
            status,
          },
        });
      }
    }
  } catch (err) {
    console.error("[prescription.create] failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unexpected database error",
    };
  }

  revalidatePath(`/patients/${input.patientId}`);
  revalidatePath("/pharmax");
  revalidatePath("/");

  return {
    ok: true,
    data: { ids: inserted, severity: highestSeverity },
  };
}

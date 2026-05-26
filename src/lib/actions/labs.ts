"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { labResults, patients } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import {
  labCreateSchema,
  type LabCreateInput,
} from "@/lib/validations/lab";
import { classifyResult } from "@/lib/medilab/classify";

export type LabActionResult =
  | {
      ok: true;
      data: { id: string; criticalCount: number };
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Save a lab result panel.
 *
 *   1) Verify session.
 *   2) Validate inputs.
 *   3) Verify patient.
 *   4) Auto-classify each result with the curated reference library
 *      (overriding only when the user did NOT supply a flag).
 *   5) Build `critical_flags` JSONB from the classified flags.
 *   6) INSERT.
 *   7) Audit log.
 *   8) revalidatePath.
 */
export async function createLabResult(
  raw: unknown,
): Promise<LabActionResult> {
  const session = await requireSession();
  if (!session.ok) {
    return { ok: false, error: "You must be signed in to save lab results." };
  }
  const user = session.user;

  const parsed = labCreateSchema.safeParse(raw);
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

  const input: LabCreateInput = parsed.data;

  const [pat] = await db
    .select({
      id: patients.id,
      sex: patients.sex,
      dateOfBirth: patients.dateOfBirth,
      deletedAt: patients.deletedAt,
    })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);
  if (!pat || pat.deletedAt) {
    return { ok: false, error: "Patient not found." };
  }

  const age = pat.dateOfBirth
    ? new Date().getFullYear() - new Date(pat.dateOfBirth).getFullYear()
    : undefined;
  const sex =
    pat.sex === "male" || pat.sex === "female" ? pat.sex : "any";

  // Classify and decorate each result with a flag (if not already provided).
  const enrichedResults = input.results.map((r) => {
    const cls = classifyResult({
      testName: r.testName,
      value: r.value,
      referenceLow: r.referenceLow,
      referenceHigh: r.referenceHigh,
      sex,
      age,
    });
    const flag =
      r.flag ??
      (cls.flag === "critical_low" || cls.flag === "critical_high"
        ? cls.flag
        : cls.flag === "low" || cls.flag === "high"
          ? cls.flag
          : cls.flag === "normal"
            ? "normal"
            : undefined);

    // Persist the resolved range only when the user didn't supply one and
    // the library provided values. This is how the detail page renders
    // band positions even after the library is updated later.
    const referenceLow =
      r.referenceLow ?? (cls.low != null ? cls.low : undefined);
    const referenceHigh =
      r.referenceHigh ?? (cls.high != null ? cls.high : undefined);

    return {
      testName: r.testName.trim(),
      loincCode: r.loincCode && r.loincCode.trim() ? r.loincCode.trim() : undefined,
      value: r.value,
      unit: r.unit && r.unit.trim() ? r.unit.trim() : undefined,
      referenceLow,
      referenceHigh,
      flag,
      interpretation:
        r.interpretation && r.interpretation.trim()
          ? r.interpretation.trim()
          : undefined,
    };
  });

  const criticalFlags = enrichedResults
    .filter((r) => r.flag === "critical_low" || r.flag === "critical_high")
    .map((r) => ({
      testName: r.testName,
      value: String(r.value),
      severity: "critical" as const,
    }));

  try {
    const [inserted] = await db
      .insert(labResults)
      .values({
        patientId: input.patientId,
        physicianId: user.id,
        encounterId:
          input.encounterId && input.encounterId.length > 0
            ? input.encounterId
            : null,
        panelName: input.panelName.trim(),
        panelLoincCode:
          input.panelLoincCode && input.panelLoincCode.trim()
            ? input.panelLoincCode.trim()
            : null,
        collectionDate:
          input.collectionDate && input.collectionDate.length > 0
            ? new Date(input.collectionDate)
            : null,
        laboratory:
          input.laboratory && input.laboratory.trim()
            ? input.laboratory.trim()
            : null,
        results: enrichedResults,
        criticalFlags: criticalFlags.length > 0 ? criticalFlags : null,
      })
      .returning({ id: labResults.id });

    if (!inserted) {
      return { ok: false, error: "Could not save the lab result." };
    }

    await logAudit({
      actorId: user.id,
      action: "lab.create",
      resourceType: "lab_result",
      resourceId: inserted.id,
      patientId: input.patientId,
      metadata: {
        panelName: input.panelName,
        resultCount: input.results.length,
        criticalCount: criticalFlags.length,
        laboratory: input.laboratory ?? null,
      },
    });

    revalidatePath(`/patients/${input.patientId}`);
    revalidatePath("/medilab");
    revalidatePath("/");

    return {
      ok: true,
      data: { id: inserted.id, criticalCount: criticalFlags.length },
    };
  } catch (err) {
    console.error("[lab.create] failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unexpected database error",
    };
  }
}

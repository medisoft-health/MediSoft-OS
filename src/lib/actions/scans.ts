"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, scans } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import {
  REQUIRED_DISCLAIMER,
  scanCreateSchema,
  type Annotation,
  type ScanCreateInput,
} from "@/lib/validations/scan";

export type ScanActionResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Save a new scan record.
 *
 * Pre-requisite: the image has already been uploaded to storage by the
 * client (the storage helper is server-only but called from a route
 * handler before this action). The client passes the resulting
 * `imageStorageKey` here.
 *
 *   1) Verify session.
 *   2) Validate inputs (the schema enforces a present disclaimer).
 *   3) Verify the patient exists.
 *   4) INSERT with the mandatory disclaimer (defensive — overwrite if
 *      the client somehow omitted it).
 *   5) Audit log `scan.create`.
 *   6) revalidatePath.
 */
export async function createScan(
  raw: unknown,
): Promise<ScanActionResult> {
  const session = await requireSession();
  if (!session.ok) {
    return { ok: false, error: "You must be signed in to save a scan." };
  }
  const user = session.user;

  const parsed = scanCreateSchema.safeParse(raw);
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

  const input: ScanCreateInput = parsed.data;

  const [pat] = await db
    .select({ id: patients.id, deletedAt: patients.deletedAt })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);
  if (!pat || pat.deletedAt) {
    return { ok: false, error: "Patient not found." };
  }

  // Annotations are persisted alongside findings as a single JSONB.
  // The schema's `findings` column is an Array<Finding>; we wrap any
  // user annotations as a synthetic finding row so we don't add a new
  // column. The detail page reads `findings` and pulls annotations
  // back out via the `kind === "annotation"` marker.
  const findingsForDb: Array<{
    location?: string;
    description: string;
    severity?: "low" | "moderate" | "high" | "critical";
    characteristics?: string;
  }> = input.findings.map((f) => ({
    location: f.location,
    description: f.description,
    severity: f.severity,
    characteristics: f.characteristics,
  }));

  // Annotation payload stored as a sentinel finding entry. UI looks for
  // characteristics === "__annotations__" and parses the description JSON.
  if (input.annotations.length > 0) {
    findingsForDb.push({
      description: JSON.stringify(input.annotations satisfies Annotation[]),
      characteristics: "__annotations__",
    });
  }

  // Patient summary stored as a sentinel finding entry. The schema's
  // `aiReport` text column is reserved for the physician-style report,
  // so the patient-friendly text is parked here until a future column
  // gets added (no migration required for PR-7).
  if (input.aiPatientSummary && input.aiPatientSummary.trim().length > 0) {
    findingsForDb.push({
      description: input.aiPatientSummary.trim(),
      characteristics: "__patient_summary__",
    });
  }
  try {
    const [inserted] = await db
      .insert(scans)
      .values({
        patientId: input.patientId,
        physicianId: user.id,
        encounterId:
          input.encounterId && input.encounterId.length > 0
            ? input.encounterId
            : null,
        scanType: input.scanType,
        bodyPart: input.bodyPart.trim(),
        modality:
          input.modality && input.modality.trim() ? input.modality.trim() : null,
        studyInstanceUid:
          input.studyInstanceUid && input.studyInstanceUid.trim()
            ? input.studyInstanceUid.trim()
            : null,
        imageStorageKey: input.imageStorageKey,
        imageStorageUrl:
          input.imageStorageUrl && input.imageStorageUrl.trim()
            ? input.imageStorageUrl.trim()
            : null,
        mimeType:
          input.mimeType && input.mimeType.trim() ? input.mimeType.trim() : null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        findings: findingsForDb.length > 0 ? findingsForDb : null,
        aiReport: input.aiReport?.trim() || null,
        aiImpression: input.aiImpression?.trim() || null,
        aiDifferentialDiagnosis: input.aiDifferentialDiagnosis?.trim() || null,
        aiRecommendations: input.aiRecommendations?.trim() || null,
        technicalQuality: input.technicalQuality ?? null,
        // Enforce disclaimer text server-side regardless of client.
        disclaimer: input.disclaimer || REQUIRED_DISCLAIMER,
        studyDate:
          input.studyDate && input.studyDate.length > 0
            ? new Date(input.studyDate)
            : null,
      })
      .returning({ id: scans.id });

    if (!inserted) {
      return { ok: false, error: "Could not save the scan." };
    }

    await logAudit({
      actorId: user.id,
      action: "scan.create",
      resourceType: "scan",
      resourceId: inserted.id,
      patientId: input.patientId,
      metadata: {
        scanType: input.scanType,
        bodyPart: input.bodyPart,
        hasAiReport: !!input.aiReport,
        findingCount: input.findings.length,
        annotationCount: input.annotations.length,
      },
    });

    revalidatePath(`/patients/${input.patientId}`);
    revalidatePath("/mediscan");
    revalidatePath("/");

    return { ok: true, data: { id: inserted.id } };
  } catch (err) {
    console.error("[scan.create] failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unexpected database error",
    };
  }
}

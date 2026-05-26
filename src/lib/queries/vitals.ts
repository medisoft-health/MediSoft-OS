import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { vitals } from "@/db/schema";

/**
 * Vitals queries — patient-scoped reads.
 *
 * Note: vitals decimals (`temperature`, `weightKg`, `heightCm`, `bmi`) are
 * returned by postgres-js as strings. Callers should use `toNumber()` from
 * the validations module to coerce when needed.
 */

export type VitalRow = typeof vitals.$inferSelect;

/** All vitals for a patient, newest first. */
export async function listVitalsForPatient(
  patientId: number,
  limit = 50,
): Promise<VitalRow[]> {
  return db
    .select()
    .from(vitals)
    .where(eq(vitals.patientId, patientId))
    .orderBy(desc(vitals.recordedAt))
    .limit(limit);
}

/** Most recent single reading. */
export async function getLatestVitals(
  patientId: number,
): Promise<VitalRow | null> {
  const [row] = await db
    .select()
    .from(vitals)
    .where(eq(vitals.patientId, patientId))
    .orderBy(desc(vitals.recordedAt))
    .limit(1);
  return row ?? null;
}

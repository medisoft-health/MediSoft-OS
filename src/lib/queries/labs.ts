import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { labResults, patients, users } from "@/db/schema";

export type LabListRow = {
  id: string;
  panelName: string;
  resultDate: Date;
  collectionDate: Date | null;
  laboratory: string | null;
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
  physicianName: string | null;
};

export async function listRecentLabs(limit = 25): Promise<LabListRow[]> {
  return db
    .select({
      id: labResults.id,
      panelName: labResults.panelName,
      resultDate: labResults.resultDate,
      collectionDate: labResults.collectionDate,
      laboratory: labResults.laboratory,
      patientId: labResults.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      physicianName: users.name,
    })
    .from(labResults)
    .innerJoin(patients, eq(labResults.patientId, patients.id))
    .leftJoin(users, eq(labResults.physicianId, users.id))
    .where(and(isNull(labResults.deletedAt), isNull(patients.deletedAt)))
    .orderBy(desc(labResults.resultDate))
    .limit(limit);
}

export async function getLabResultById(id: string) {
  const [row] = await db
    .select({
      lab: labResults,
      patient: {
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        sex: patients.sex,
      },
      physician: {
        id: users.id,
        name: users.name,
        specialty: users.specialty,
      },
    })
    .from(labResults)
    .innerJoin(patients, eq(labResults.patientId, patients.id))
    .leftJoin(users, eq(labResults.physicianId, users.id))
    .where(and(eq(labResults.id, id), isNull(labResults.deletedAt)))
    .limit(1);
  return row ?? null;
}

export type LabResultDetail = NonNullable<
  Awaited<ReturnType<typeof getLabResultById>>
>;

/**
 * Pull historical values for a specific biomarker for a patient — used
 * by the trend chart.
 *
 * Note: results live inside a JSONB array. We hydrate every row and
 * extract on the server because labResults.id-per-row is the unit of
 * audit, and we want full type-safety in JS rather than ad-hoc SQL.
 */
export async function listBiomarkerHistory(
  patientId: number,
  testName: string,
  limit = 30,
): Promise<Array<{ resultDate: Date; value: number; unit: string | null; flag: string | null }>> {
  const rows = await db
    .select({
      results: labResults.results,
      resultDate: labResults.resultDate,
    })
    .from(labResults)
    .where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)))
    .orderBy(desc(labResults.resultDate))
    .limit(limit);

  const needle = testName.trim().toLowerCase();
  const points: Array<{
    resultDate: Date;
    value: number;
    unit: string | null;
    flag: string | null;
  }> = [];

  for (const row of rows) {
    if (!Array.isArray(row.results)) continue;
    for (const r of row.results as Array<{
      testName?: string;
      value?: number | string;
      unit?: string;
      flag?: string;
    }>) {
      if ((r.testName ?? "").toLowerCase() !== needle) continue;
      const num =
        typeof r.value === "number"
          ? r.value
          : Number(String(r.value ?? "").replace(/,/g, ""));
      if (!Number.isFinite(num)) continue;
      points.push({
        resultDate: row.resultDate,
        value: num,
        unit: r.unit ?? null,
        flag: r.flag ?? null,
      });
    }
  }

  return points.reverse(); // chronological ascending for the chart
}

/** Lab rows scoped to a single patient, newest first. */
export async function listLabsForPatient(patientId: number, limit = 50) {
  return db
    .select({
      id: labResults.id,
      panelName: labResults.panelName,
      resultDate: labResults.resultDate,
      collectionDate: labResults.collectionDate,
      laboratory: labResults.laboratory,
      criticalFlagCount: sql<number>`coalesce(jsonb_array_length(${labResults.criticalFlags}), 0)::int`,
    })
    .from(labResults)
    .where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)))
    .orderBy(desc(labResults.resultDate))
    .limit(limit);
}

export async function countLabsByCriticalFlag() {
  const rows = await db
    .select({
      withCritical: sql<number>`count(*) FILTER (WHERE jsonb_array_length(${labResults.criticalFlags}) > 0)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(labResults)
    .where(isNull(labResults.deletedAt));
  return { withCritical: rows[0]?.withCritical ?? 0, total: rows[0]?.total ?? 0 };
}

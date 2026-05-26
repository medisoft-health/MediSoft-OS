import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { patients, scans, users } from "@/db/schema";

export type ScanListRow = {
  id: string;
  scanType: typeof scans.$inferSelect.scanType;
  bodyPart: string;
  modality: string | null;
  studyDate: Date | null;
  createdAt: Date;
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
  physicianName: string | null;
  hasAiReport: boolean;
};

export async function listRecentScans(limit = 20): Promise<ScanListRow[]> {
  const rows = await db
    .select({
      id: scans.id,
      scanType: scans.scanType,
      bodyPart: scans.bodyPart,
      modality: scans.modality,
      studyDate: scans.studyDate,
      createdAt: scans.createdAt,
      patientId: scans.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      physicianName: users.name,
      aiReportLen: sql<number>`coalesce(length(${scans.aiReport}), 0)::int`,
    })
    .from(scans)
    .innerJoin(patients, eq(scans.patientId, patients.id))
    .leftJoin(users, eq(scans.physicianId, users.id))
    .where(and(isNull(scans.deletedAt), isNull(patients.deletedAt)))
    .orderBy(desc(sql`coalesce(${scans.studyDate}, ${scans.createdAt})`))
    .limit(limit);

  return rows.map(({ aiReportLen, ...rest }) => ({
    ...rest,
    hasAiReport: aiReportLen > 0,
  }));
}

export async function getScanById(id: string) {
  const [row] = await db
    .select({
      scan: scans,
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
    .from(scans)
    .innerJoin(patients, eq(scans.patientId, patients.id))
    .leftJoin(users, eq(scans.physicianId, users.id))
    .where(and(eq(scans.id, id), isNull(scans.deletedAt)))
    .limit(1);
  return row ?? null;
}

export type ScanDetail = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

export async function countScansByType() {
  const rows = await db
    .select({
      scanType: scans.scanType,
      n: sql<number>`count(*)::int`,
    })
    .from(scans)
    .where(isNull(scans.deletedAt))
    .groupBy(scans.scanType);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.scanType] = r.n;
  return out;
}

export async function countScansTotalAndAi() {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withAi: sql<number>`count(*) FILTER (WHERE length(coalesce(${scans.aiReport}, '')) > 0)::int`,
    })
    .from(scans)
    .where(isNull(scans.deletedAt));
  return { total: row?.total ?? 0, withAi: row?.withAi ?? 0 };
}

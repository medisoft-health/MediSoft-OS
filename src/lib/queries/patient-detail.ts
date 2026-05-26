import "server-only";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  encounters,
  labResults,
  prescriptions,
  scans,
  users,
  vitals,
} from "@/db/schema";

/**
 * Read-side queries for the patient detail page.
 *
 * Each is scoped to a single patient id and respects soft-delete.
 */

export type EncounterRow = {
  id: string;
  encounterDate: Date;
  encounterType: string | null;
  status: typeof encounters.$inferSelect.status;
  physicianName: string | null;
  signedAt: Date | null;
};

export async function listEncountersForPatient(
  patientId: number,
  limit = 50,
): Promise<EncounterRow[]> {
  const rows = await db
    .select({
      id: encounters.id,
      encounterDate: encounters.encounterDate,
      encounterType: encounters.encounterType,
      status: encounters.status,
      signedAt: encounters.signedAt,
      physicianName: users.name,
    })
    .from(encounters)
    .leftJoin(users, eq(encounters.physicianId, users.id))
    .where(
      and(eq(encounters.patientId, patientId), isNull(encounters.deletedAt)),
    )
    .orderBy(desc(encounters.encounterDate))
    .limit(limit);
  return rows;
}

export type PrescriptionRow = {
  id: string;
  drugName: string;
  dose: string;
  frequency: string;
  status: typeof prescriptions.$inferSelect.status;
  createdAt: Date;
};

export async function listPrescriptionsForPatient(
  patientId: number,
  limit = 20,
): Promise<PrescriptionRow[]> {
  return db
    .select({
      id: prescriptions.id,
      drugName: prescriptions.drugName,
      dose: prescriptions.dose,
      frequency: prescriptions.frequency,
      status: prescriptions.status,
      createdAt: prescriptions.createdAt,
    })
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.patientId, patientId),
        isNull(prescriptions.deletedAt),
      ),
    )
    .orderBy(desc(prescriptions.createdAt))
    .limit(limit);
}

export type LabRow = {
  id: string;
  panelName: string;
  resultDate: Date;
  laboratory: string | null;
};

export async function listLabResultsForPatient(
  patientId: number,
  limit = 20,
): Promise<LabRow[]> {
  return db
    .select({
      id: labResults.id,
      panelName: labResults.panelName,
      resultDate: labResults.resultDate,
      laboratory: labResults.laboratory,
    })
    .from(labResults)
    .where(
      and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)),
    )
    .orderBy(desc(labResults.resultDate))
    .limit(limit);
}

export type ScanRow = {
  id: string;
  scanType: typeof scans.$inferSelect.scanType;
  bodyPart: string;
  studyDate: Date | null;
};

export async function listScansForPatient(
  patientId: number,
  limit = 20,
): Promise<ScanRow[]> {
  return db
    .select({
      id: scans.id,
      scanType: scans.scanType,
      bodyPart: scans.bodyPart,
      studyDate: scans.studyDate,
    })
    .from(scans)
    .where(and(eq(scans.patientId, patientId), isNull(scans.deletedAt)))
    .orderBy(desc(sql`coalesce(${scans.studyDate}, ${scans.createdAt})`))
    .limit(limit);
}

/**
 * Unified audit feed for the patient — used by the "Timeline" tab.
 */
export type TimelineItem = {
  id: number;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: Date;
  actorName: string | null;
};

export async function listPatientTimeline(
  patientId: number,
  limit = 50,
): Promise<TimelineItem[]> {
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      createdAt: auditLog.createdAt,
      actorName: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(eq(auditLog.patientId, patientId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
  return rows;
}

/**
 * Quick aggregate for the patient header / overview "stats" row.
 */
export async function getPatientAggregates(patientId: number) {
  const [enc, rx, lab, scn, vit] = await Promise.all([
    db
      .select({ v: sql<number>`count(*)::int` })
      .from(encounters)
      .where(
        and(eq(encounters.patientId, patientId), isNull(encounters.deletedAt)),
      ),
    db
      .select({ v: sql<number>`count(*)::int` })
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.patientId, patientId),
          isNull(prescriptions.deletedAt),
          or(
            eq(prescriptions.status, "active"),
            eq(prescriptions.status, "draft"),
          )!,
        ),
      ),
    db
      .select({ v: sql<number>`count(*)::int` })
      .from(labResults)
      .where(
        and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)),
      ),
    db
      .select({ v: sql<number>`count(*)::int` })
      .from(scans)
      .where(and(eq(scans.patientId, patientId), isNull(scans.deletedAt))),
    db
      .select({ v: sql<number>`count(*)::int` })
      .from(vitals)
      .where(eq(vitals.patientId, patientId)),
  ]);

  return {
    encounters: enc[0]?.v ?? 0,
    activePrescriptions: rx[0]?.v ?? 0,
    labResults: lab[0]?.v ?? 0,
    scans: scn[0]?.v ?? 0,
    vitals: vit[0]?.v ?? 0,
  };
}

import "server-only";
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  encounters,
  patients,
  prescriptions,
} from "@/db/schema";

/**
 * Dashboard aggregate queries. All run in parallel from the dashboard
 * page via Promise.all().
 */

export interface DashboardStats {
  todayEncounters: number;
  activePatients: number;
  pendingPrescriptions: number;
  criticalAlerts: number;
}

/**
 * Returns the four KPI numbers for the dashboard.
 * Encounters "today" uses the server's local day boundary (UTC in DB).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const startOfToday = sql<Date>`date_trunc('day', now())`;
  const startOfTomorrow = sql<Date>`date_trunc('day', now()) + interval '1 day'`;

  const [
    [todayEncountersRow],
    [activePatientsRow],
    [pendingRxRow],
    [criticalRxRow],
  ] = await Promise.all([
    db
      .select({ v: count() })
      .from(encounters)
      .where(
        and(
          isNull(encounters.deletedAt),
          gte(encounters.encounterDate, startOfToday as unknown as Date),
          lt(encounters.encounterDate, startOfTomorrow as unknown as Date),
        ),
      ),
    db
      .select({ v: count() })
      .from(patients)
      .where(isNull(patients.deletedAt)),
    db
      .select({ v: count() })
      .from(prescriptions)
      .where(
        and(isNull(prescriptions.deletedAt), eq(prescriptions.status, "draft")),
      ),
    db
      .select({ v: count() })
      .from(prescriptions)
      .where(
        and(
          isNull(prescriptions.deletedAt),
          eq(prescriptions.severity, "critical"),
        ),
      ),
  ]);

  return {
    todayEncounters: todayEncountersRow?.v ?? 0,
    activePatients: activePatientsRow?.v ?? 0,
    pendingPrescriptions: pendingRxRow?.v ?? 0,
    criticalAlerts: criticalRxRow?.v ?? 0,
  };
}

export interface RecentActivityItem {
  id: number;
  action: string;
  resourceType: string;
  resourceId: string | null;
  patientId: number | null;
  createdAt: Date;
  actorId: string | null;
  patientFirstName: string | null;
  patientLastName: string | null;
}

/**
 * Last N audit-log entries. Used by the dashboard's "Recent activity" feed.
 * Joins patient names so the UI can show "Viewed patient Ahmed Mostafa" instead
 * of the raw "patient · 1" identifier.
 */
export async function getRecentActivity(limit = 10): Promise<RecentActivityItem[]> {
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      patientId: auditLog.patientId,
      createdAt: auditLog.createdAt,
      actorId: auditLog.actorId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(auditLog)
    .leftJoin(patients, eq(auditLog.patientId, patients.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
  return rows;
}

export interface TodayEncounterItem {
  id: string;
  patientId: number;
  encounterDate: Date;
  encounterType: string | null;
  status: string;
  patientFirstName: string;
  patientLastName: string;
}

/** Today's encounters with patient names joined in. */
export async function getTodayEncounters(): Promise<TodayEncounterItem[]> {
  const startOfToday = sql<Date>`date_trunc('day', now())`;
  const startOfTomorrow = sql<Date>`date_trunc('day', now()) + interval '1 day'`;

  const rows = await db
    .select({
      id: encounters.id,
      patientId: encounters.patientId,
      encounterDate: encounters.encounterDate,
      encounterType: encounters.encounterType,
      status: encounters.status,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(encounters)
    .innerJoin(patients, eq(encounters.patientId, patients.id))
    .where(
      and(
        isNull(encounters.deletedAt),
        gte(encounters.encounterDate, startOfToday as unknown as Date),
        lt(encounters.encounterDate, startOfTomorrow as unknown as Date),
      ),
    )
    .orderBy(encounters.encounterDate);

  return rows;
}

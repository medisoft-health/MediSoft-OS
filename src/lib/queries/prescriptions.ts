import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { prescriptions, patients, users } from "@/db/schema";

/**
 * Prescription read queries used by the PharmaX views and the patient
 * detail page. All respect soft-delete.
 */

export type PrescriptionListRow = {
  id: string;
  drugName: string;
  brandName: string | null;
  dose: string;
  frequency: string;
  route: string;
  status: typeof prescriptions.$inferSelect.status;
  severity: typeof prescriptions.$inferSelect.severity;
  createdAt: Date;
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
  physicianName: string | null;
};

export async function listRecentPrescriptions(
  limit = 25,
): Promise<PrescriptionListRow[]> {
  return db
    .select({
      id: prescriptions.id,
      drugName: prescriptions.drugName,
      brandName: prescriptions.brandName,
      dose: prescriptions.dose,
      frequency: prescriptions.frequency,
      route: prescriptions.route,
      status: prescriptions.status,
      severity: prescriptions.severity,
      createdAt: prescriptions.createdAt,
      patientId: prescriptions.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      physicianName: users.name,
    })
    .from(prescriptions)
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .leftJoin(users, eq(prescriptions.physicianId, users.id))
    .where(and(isNull(prescriptions.deletedAt), isNull(patients.deletedAt)))
    .orderBy(desc(prescriptions.createdAt))
    .limit(limit);
}

export async function getPrescriptionById(id: string) {
  const [row] = await db
    .select({
      prescription: prescriptions,
      patient: {
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        sex: patients.sex,
        allergies: patients.allergies,
        chronicConditions: patients.chronicConditions,
      },
      physician: {
        id: users.id,
        name: users.name,
        specialty: users.specialty,
      },
    })
    .from(prescriptions)
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .leftJoin(users, eq(prescriptions.physicianId, users.id))
    .where(and(eq(prescriptions.id, id), isNull(prescriptions.deletedAt)))
    .limit(1);
  return row ?? null;
}

export type PrescriptionDetail = NonNullable<
  Awaited<ReturnType<typeof getPrescriptionById>>
>;

export async function countPrescriptionsByStatus() {
  const rows = await db
    .select({
      status: prescriptions.status,
      n: sql<number>`count(*)::int`,
    })
    .from(prescriptions)
    .where(isNull(prescriptions.deletedAt))
    .groupBy(prescriptions.status);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r.n;
  return out;
}

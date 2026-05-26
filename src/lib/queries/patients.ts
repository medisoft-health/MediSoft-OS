import "server-only";
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import type { PatientListFilters } from "@/lib/validations/patient";

/**
 * Patient queries — typed Drizzle wrappers used by Server Components.
 * All queries respect soft-delete (`deletedAt IS NULL`).
 */

export const PATIENTS_PAGE_SIZE = 20;

/** A trimmed row shape for list views — avoid pulling big JSONB fields. */
export type PatientListRow = {
  id: number;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  dateOfBirth: string; // ISO date string (DATE column)
  sex: "male" | "female" | "other" | "unknown";
  bloodType: string | null;
  phone: string | null;
  insuranceProvider: string | null;
  insuranceId: string | null;
  updatedAt: Date;
  createdAt: Date;
};

interface ListPatientsResult {
  rows: PatientListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Paginated patient list with search and filters.
 *
 * Search matches: firstName, lastName, firstNameAr, lastNameAr, saudiId,
 * mrn, phone (case-insensitive). Filters: sex, bloodType.
 *
 * **Index coverage** (see src/db/schema.ts):
 *   - `patients_name_idx` (last_name, first_name)  → name-led search
 *   - `patients_phone_idx` (phone)                 → phone-led search
 *   - `patients_saudi_id_idx` (saudi_id, UNIQUE)   → ID-led exact-match
 *   - `patients_mrn_idx` (mrn, UNIQUE)             → MRN exact-match
 *
 * **Scaling note**: ILIKE with `%query%` is index-friendly only when
 * the query has a non-wildcard prefix. Past ~50k rows we should add a
 * `pg_trgm` GIN index for true substring search:
 *
 *   CREATE EXTENSION IF NOT EXISTS pg_trgm;
 *   CREATE INDEX patients_name_trgm_idx ON patients
 *     USING gin ((last_name || ' ' || first_name) gin_trgm_ops);
 *
 * The current schema is fine for clinic-scale (<5k patients/site).
 */
export async function listPatients(
  filters: PatientListFilters,
): Promise<ListPatientsResult> {
  const conditions = [isNull(patients.deletedAt)];

  if (filters.q) {
    const needle = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(patients.firstName, needle),
        ilike(patients.lastName, needle),
        ilike(patients.firstNameAr, needle),
        ilike(patients.lastNameAr, needle),
        ilike(patients.saudiId, needle),
        ilike(patients.mrn, needle),
        ilike(patients.phone, needle),
      )!,
    );
  }

  if (filters.sex) conditions.push(eq(patients.sex, filters.sex));
  if (filters.bloodType) conditions.push(eq(patients.bloodType, filters.bloodType));

  const where = and(...conditions);

  // Sort key
  const orderBy =
    filters.sort === "name"
      ? [asc(patients.lastName), asc(patients.firstName)]
      : filters.sort === "oldest"
        ? [asc(patients.createdAt)]
        : [desc(patients.updatedAt)];

  const offset = (filters.page - 1) * PATIENTS_PAGE_SIZE;

  // Run COUNT and SELECT in parallel for efficiency.
  const [rowsRaw, totalRows] = await Promise.all([
    db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        firstNameAr: patients.firstNameAr,
        lastNameAr: patients.lastNameAr,
        dateOfBirth: patients.dateOfBirth,
        sex: patients.sex,
        bloodType: patients.bloodType,
        phone: patients.phone,
        insuranceProvider: patients.insuranceProvider,
        insuranceId: patients.insuranceId,
        updatedAt: patients.updatedAt,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(where)
      .orderBy(...orderBy)
      .limit(PATIENTS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(patients).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PATIENTS_PAGE_SIZE));

  return {
    rows: rowsRaw as PatientListRow[],
    total,
    page: filters.page,
    pageSize: PATIENTS_PAGE_SIZE,
    totalPages,
  };
}

/** Quick lookup for ID-based fetches. Returns null if not found / soft-deleted. */
export async function getPatientById(id: number) {
  const [row] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
    .limit(1);
  return row ?? null;
}

/** Count of patients matching the soft-delete filter. */
export async function countActivePatients(): Promise<number> {
  const [r] = await db
    .select({ value: count() })
    .from(patients)
    .where(isNull(patients.deletedAt));
  return r?.value ?? 0;
}

/**
 * Lightweight existence check used during patient creation to detect duplicates
 * on `saudiId` or `mrn` (both have unique indexes; this gives a friendlier error).
 */
export async function findPatientByIdentifier(
  saudiId: string | null,
  mrn: string | null,
): Promise<{ id: number; field: "saudiId" | "mrn" } | null> {
  if (!saudiId && !mrn) return null;

  const orClauses = [];
  if (saudiId) orClauses.push(eq(patients.saudiId, saudiId));
  if (mrn) orClauses.push(eq(patients.mrn, mrn));

  const [row] = await db
    .select({ id: patients.id, saudiId: patients.saudiId, mrn: patients.mrn })
    .from(patients)
    .where(and(or(...orClauses), isNull(patients.deletedAt)))
    .limit(1);

  if (!row) return null;
  if (saudiId && row.saudiId === saudiId) return { id: row.id, field: "saudiId" };
  if (mrn && row.mrn === mrn) return { id: row.id, field: "mrn" };
  return { id: row.id, field: "saudiId" };
}

/** Raw SQL helper used by the dashboard's "today's encounters" tile. */
export function dateIsTodayUtc() {
  return sql`(date_trunc('day', now() at time zone 'utc')) = (date_trunc('day', encounter_date at time zone 'utc'))`;
}

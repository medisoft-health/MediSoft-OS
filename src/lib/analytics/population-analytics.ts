import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Population Health Analytics — clinic-wide data aggregation.
 *
 * All queries use raw SQL for complex aggregations.
 * Results are cached for 5 minutes to reduce DB load.
 */

// Simple in-memory cache (5 minute TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Promise.resolve(hit.data as T);
  return fn().then((data) => { cache.set(key, { data, ts: Date.now() }); return data; });
}

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface ClinicOverview {
  totalPatients: number;
  totalEncounters: number;
  totalLabResults: number;
  activePrescriptions: number;
  newPatientsThisMonth: number;
  encountersThisMonth: number;
  encountersLastMonth: number;
  encounterGrowthPercent: number;
}

export interface DemographicBreakdown {
  genderDistribution: { male: number; female: number; other: number };
  ageGroups: Array<{ range: string; count: number; percentage: number }>;
}

export interface DiagnosisAnalytics {
  chronicConditions: Array<{ condition: string; patientCount: number; percentage: number }>;
}

export interface MedicationAnalytics {
  topMedications: Array<{ name: string; prescriptionCount: number; activeCount: number }>;
}

export interface EncounterTrends {
  monthly: Array<{ month: string; count: number }>;
  averagePerDay: number;
}

export interface LabAnalytics {
  totalThisMonth: number;
  abnormalRate: number;
}

export interface FullAnalytics {
  overview: ClinicOverview;
  demographics: DemographicBreakdown;
  diagnoses: DiagnosisAnalytics;
  medications: MedicationAnalytics;
  encounters: EncounterTrends;
  labs: LabAnalytics;
}

// ─────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────

export async function getClinicOverview(): Promise<ClinicOverview> {
  return cached("overview", async () => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [result] = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM patients WHERE deleted_at IS NULL) as total_patients,
        (SELECT count(*)::int FROM encounters WHERE deleted_at IS NULL) as total_encounters,
        (SELECT count(*)::int FROM lab_results WHERE deleted_at IS NULL) as total_labs,
        (SELECT count(*)::int FROM prescriptions WHERE status = 'active' AND deleted_at IS NULL) as active_rx,
        (SELECT count(*)::int FROM patients WHERE created_at >= ${thisMonthStart} AND deleted_at IS NULL) as new_patients_month,
        (SELECT count(*)::int FROM encounters WHERE encounter_date >= ${thisMonthStart} AND deleted_at IS NULL) as enc_this_month,
        (SELECT count(*)::int FROM encounters WHERE encounter_date >= ${lastMonthStart} AND encounter_date <= ${lastMonthEnd} AND deleted_at IS NULL) as enc_last_month
    `);

    const r = result as Record<string, number>;
    const thisMonth = r.enc_this_month ?? 0;
    const lastMonth = r.enc_last_month ?? 0;
    const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

    return {
      totalPatients: r.total_patients ?? 0,
      totalEncounters: r.total_encounters ?? 0,
      totalLabResults: r.total_labs ?? 0,
      activePrescriptions: r.active_rx ?? 0,
      newPatientsThisMonth: r.new_patients_month ?? 0,
      encountersThisMonth: thisMonth,
      encountersLastMonth: lastMonth,
      encounterGrowthPercent: growth,
    };
  });
}

export async function getDemographicBreakdown(): Promise<DemographicBreakdown> {
  return cached("demographics", async () => {
    const genderRows = await db.execute(sql`
      SELECT sex, count(*)::int as cnt FROM patients WHERE deleted_at IS NULL GROUP BY sex
    `);
    const gender = { male: 0, female: 0, other: 0 };
    for (const row of genderRows as unknown as Array<{ sex: string; cnt: number }>) {
      if (row.sex === "male") gender.male = row.cnt;
      else if (row.sex === "female") gender.female = row.cnt;
      else gender.other += row.cnt;
    }

    const total = gender.male + gender.female + gender.other || 1;
    const ageRows = await db.execute(sql`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM age(date_of_birth)) < 19 THEN '0-18'
          WHEN EXTRACT(YEAR FROM age(date_of_birth)) < 31 THEN '19-30'
          WHEN EXTRACT(YEAR FROM age(date_of_birth)) < 46 THEN '31-45'
          WHEN EXTRACT(YEAR FROM age(date_of_birth)) < 61 THEN '46-60'
          ELSE '61+'
        END as age_range,
        count(*)::int as cnt
      FROM patients WHERE deleted_at IS NULL AND date_of_birth IS NOT NULL
      GROUP BY age_range ORDER BY age_range
    `);

    const ageGroups = (ageRows as unknown as Array<{ age_range: string; cnt: number }>).map((r) => ({
      range: r.age_range,
      count: r.cnt,
      percentage: Math.round((r.cnt / total) * 100),
    }));

    return { genderDistribution: gender, ageGroups };
  });
}

export async function getDiagnosisAnalytics(): Promise<DiagnosisAnalytics> {
  return cached("diagnoses", async () => {
    // Extract chronic conditions from patients table JSONB
    const rows = await db.execute(sql`
      SELECT elem->>'description' as condition, count(*)::int as cnt
      FROM patients, jsonb_array_elements(chronic_conditions) as elem
      WHERE deleted_at IS NULL AND chronic_conditions IS NOT NULL
      GROUP BY condition ORDER BY cnt DESC LIMIT 10
    `);

    const total = (rows as unknown as Array<{ cnt: number }>).reduce((s, r) => s + r.cnt, 0) || 1;
    const chronicConditions = (rows as unknown as Array<{ condition: string; cnt: number }>).map((r) => ({
      condition: r.condition,
      patientCount: r.cnt,
      percentage: Math.round((r.cnt / total) * 100),
    }));

    return { chronicConditions };
  });
}

export async function getMedicationAnalytics(): Promise<MedicationAnalytics> {
  return cached("medications", async () => {
    const rows = await db.execute(sql`
      SELECT drug_name as name,
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'active')::int as active
      FROM prescriptions WHERE deleted_at IS NULL
      GROUP BY drug_name ORDER BY active DESC LIMIT 10
    `);

    return {
      topMedications: (rows as unknown as Array<{ name: string; total: number; active: number }>).map((r) => ({
        name: r.name,
        prescriptionCount: r.total,
        activeCount: r.active,
      })),
    };
  });
}

export async function getEncounterTrends(months = 6): Promise<EncounterTrends> {
  return cached(`encounters-${months}`, async () => {
    const rows = await db.execute(sql`
      SELECT to_char(encounter_date, 'YYYY-MM') as month, count(*)::int as cnt
      FROM encounters
      WHERE deleted_at IS NULL AND encounter_date >= now() - make_interval(months => ${months})
      GROUP BY month ORDER BY month
    `);

    const monthly = (rows as unknown as Array<{ month: string; cnt: number }>).map((r) => ({
      month: r.month,
      count: r.cnt,
    }));

    const totalDays = months * 30;
    const totalEnc = monthly.reduce((s, m) => s + m.count, 0);
    const averagePerDay = totalDays > 0 ? Math.round((totalEnc / totalDays) * 10) / 10 : 0;

    return { monthly, averagePerDay };
  });
}

export async function getLabAnalytics(): Promise<LabAnalytics> {
  return cached("labs", async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [result] = await db.execute(sql`
      SELECT
        count(*)::int as total_this_month
      FROM lab_results
      WHERE deleted_at IS NULL AND result_date >= ${monthStart}
    `);

    return {
      totalThisMonth: (result as Record<string, number>).total_this_month ?? 0,
      abnormalRate: 0, // Would require parsing JSONB results — simplified
    };
  });
}

export async function getFullAnalytics(): Promise<FullAnalytics> {
  const [overview, demographics, diagnoses, medications, encounters, labs] = await Promise.all([
    getClinicOverview(),
    getDemographicBreakdown(),
    getDiagnosisAnalytics(),
    getMedicationAnalytics(),
    getEncounterTrends(6),
    getLabAnalytics(),
  ]);
  return { overview, demographics, diagnoses, medications, encounters, labs };
}

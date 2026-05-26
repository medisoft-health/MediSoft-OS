import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  encounters,
  labResults,
  patients,
  prescriptions,
  scans,
  vitals,
} from "@/db/schema";
import { calculateAge } from "@/lib/utils";

/**
 * Cross-module patient context for the Clinical Intelligence Engine.
 *
 * Fetches the FULL patient picture across all modules in parallel:
 *   - Demographics + medical history
 *   - Lab result history (all panels, all results)
 *   - Recent encounters (MediScript SOAP notes)
 *   - Active medications (PharmaX prescriptions)
 *   - Recent imaging (MediScan reports)
 *   - Latest vitals
 *
 * This is the data backbone for the AI prompt — the more context Gemini
 * gets, the better the cross-correlation insights.
 */

export interface PatientFullContext {
  demographics: {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    sex: string;
    bloodType: string | null;
    allergies: Array<{ substance: string; reaction?: string; severity?: string }>;
    chronicConditions: Array<{ description: string; icdCode?: string; onsetDate?: string }>;
    medicalHistory: string | null;
    familyHistory: string | null;
    socialHistory: string | null;
  };

  labHistory: Array<{
    id: string;
    panelName: string;
    resultDate: Date;
    laboratory: string | null;
    results: Array<{
      testName: string;
      value: number | string;
      unit?: string;
      referenceLow?: number | string;
      referenceHigh?: number | string;
      flag?: string;
    }>;
  }>;

  recentEncounters: Array<{
    id: string;
    encounterDate: Date;
    encounterType: string | null;
    status: string;
    soapNote: unknown; // SoapNote JSONB
  }>;

  activeMedications: Array<{
    id: string;
    drugName: string;
    dose: string;
    frequency: string;
    route: string;
    status: string;
    startDate: string | null;
    interactions: unknown; // JSONB
  }>;

  recentScans: Array<{
    id: string;
    scanType: string;
    bodyPart: string;
    studyDate: Date | null;
    aiReport: string | null;
    aiImpression: string | null;
    findings: unknown; // JSONB
  }>;

  latestVitals: {
    bloodPressureSystolic: number | null;
    bloodPressureDiastolic: number | null;
    heartRate: number | null;
    temperature: string | null; // decimal → string from DB
    spO2: number | null;
    weightKg: string | null;
    heightCm: string | null;
    bmi: string | null;
    recordedAt: Date;
  } | null;
}

/**
 * Fetch full patient context across all modules. Runs 6 queries in
 * parallel for speed.
 */
export async function getPatientFullContext(
  patientId: number,
): Promise<PatientFullContext | null> {
  // Get the patient first — abort if not found
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
    .limit(1);

  if (!patient) return null;

  // Parallel fetch across all modules
  const [labHistory, recentEncounters, activeMeds, recentScanRows, latestVitalRow] =
    await Promise.all([
      // All lab results for this patient (last 20 panels)
      db
        .select({
          id: labResults.id,
          panelName: labResults.panelName,
          resultDate: labResults.resultDate,
          laboratory: labResults.laboratory,
          results: labResults.results,
        })
        .from(labResults)
        .where(
          and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)),
        )
        .orderBy(desc(labResults.resultDate))
        .limit(20),

      // Recent encounters (last 10)
      db
        .select({
          id: encounters.id,
          encounterDate: encounters.encounterDate,
          encounterType: encounters.encounterType,
          status: encounters.status,
          soapNote: encounters.soapNote,
        })
        .from(encounters)
        .where(
          and(eq(encounters.patientId, patientId), isNull(encounters.deletedAt)),
        )
        .orderBy(desc(encounters.encounterDate))
        .limit(10),

      // Active + draft prescriptions
      db
        .select({
          id: prescriptions.id,
          drugName: prescriptions.drugName,
          dose: prescriptions.dose,
          frequency: prescriptions.frequency,
          route: prescriptions.route,
          status: prescriptions.status,
          startDate: prescriptions.startDate,
          interactions: prescriptions.interactions,
        })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.patientId, patientId),
            isNull(prescriptions.deletedAt),
          ),
        )
        .orderBy(desc(prescriptions.createdAt))
        .limit(20),

      // Recent scans (last 5)
      db
        .select({
          id: scans.id,
          scanType: scans.scanType,
          bodyPart: scans.bodyPart,
          studyDate: scans.studyDate,
          aiReport: scans.aiReport,
          aiImpression: scans.aiImpression,
          findings: scans.findings,
        })
        .from(scans)
        .where(
          and(eq(scans.patientId, patientId), isNull(scans.deletedAt)),
        )
        .orderBy(desc(scans.createdAt))
        .limit(5),

      // Latest vitals
      db
        .select({
          bloodPressureSystolic: vitals.bloodPressureSystolic,
          bloodPressureDiastolic: vitals.bloodPressureDiastolic,
          heartRate: vitals.heartRate,
          temperature: vitals.temperature,
          spO2: vitals.spO2,
          weightKg: vitals.weightKg,
          heightCm: vitals.heightCm,
          bmi: vitals.bmi,
          recordedAt: vitals.recordedAt,
        })
        .from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.recordedAt))
        .limit(1),
    ]);

  return {
    demographics: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: calculateAge(patient.dateOfBirth),
      sex: patient.sex,
      bloodType: patient.bloodType,
      allergies: (patient.allergies as PatientFullContext["demographics"]["allergies"]) ?? [],
      chronicConditions:
        (patient.chronicConditions as PatientFullContext["demographics"]["chronicConditions"]) ?? [],
      medicalHistory: patient.medicalHistory,
      familyHistory: patient.familyHistory,
      socialHistory: patient.socialHistory,
    },
    labHistory: labHistory.map((l) => ({
      ...l,
      results: (l.results ?? []) as PatientFullContext["labHistory"][number]["results"],
    })),
    recentEncounters,
    activeMedications: activeMeds,
    recentScans: recentScanRows,
    latestVitals: latestVitalRow[0] ?? null,
  };
}

import "server-only";
import { db } from "@/db";
import { patientEvents } from "@/db/schema";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Patient Events Recorder — Server-Side Automatic Event Recording
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This module provides a server-side helper to automatically record patient
 * events whenever data is created/updated across ANY module.
 *
 * Unlike the client-side `usePatientEvents` hook (which requires user
 * interaction), this recorder is called directly from server actions
 * (encounters.ts, prescriptions.ts, labs.ts, scans.ts, vitals.ts) to ensure
 * EVERY clinical event is captured in the unified timeline — even if the
 * doctor doesn't use the patient context selector.
 *
 * This is the backbone of MediSoft's "Living Medical Record" — every action
 * automatically enriches the patient's comprehensive history.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type EventCategory =
  | "clinical"
  | "medication"
  | "lab"
  | "imaging"
  | "vitals"
  | "nutrition"
  | "exercise"
  | "wellness"
  | "social"
  | "education"
  | "system";

export interface PatientEventInput {
  patientId: number;
  category: EventCategory;
  eventType: string;
  source: string;
  title: string;
  titleEn?: string;
  description?: string;
  data?: Record<string, unknown>;
  numericValue?: string | number;
  numericUnit?: string;
  recordedById?: string;
  eventDate?: Date;
}

/**
 * Record a patient event to the unified timeline.
 * This is fire-and-forget — failures are logged but never thrown.
 * Called from server actions after successful DB operations.
 */
export async function recordPatientEvent(input: PatientEventInput): Promise<void> {
  try {
    await db.insert(patientEvents).values({
      patientId: input.patientId,
      category: input.category,
      eventType: input.eventType,
      source: input.source,
      title: input.title,
      titleEn: input.titleEn ?? null,
      description: input.description ?? null,
      data: input.data ?? null,
      numericValue: input.numericValue != null ? String(input.numericValue) : null,
      numericUnit: input.numericUnit ?? null,
      recordedById: input.recordedById ?? null,
      eventDate: input.eventDate ?? new Date(),
    });
  } catch (err) {
    // Never throw — event recording must not break the main flow
    console.error("[patient-events-recorder] Failed to record event:", {
      patientId: input.patientId,
      eventType: input.eventType,
      source: input.source,
      error: err,
    });
  }
}

/**
 * Record multiple patient events in a single batch.
 */
export async function recordPatientEvents(inputs: PatientEventInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(patientEvents).values(
      inputs.map((input) => ({
        patientId: input.patientId,
        category: input.category,
        eventType: input.eventType,
        source: input.source,
        title: input.title,
        titleEn: input.titleEn ?? null,
        description: input.description ?? null,
        data: input.data ?? null,
        numericValue: input.numericValue != null ? String(input.numericValue) : null,
        numericUnit: input.numericUnit ?? null,
        recordedById: input.recordedById ?? null,
        eventDate: input.eventDate ?? new Date(),
      })),
    );
  } catch (err) {
    console.error("[patient-events-recorder] Failed to record batch events:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-built event recorders for each module
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record when a new clinical encounter is created (MediScript).
 */
export async function recordEncounterEvent(params: {
  patientId: number;
  encounterId: string;
  encounterType: string;
  chiefComplaint?: string;
  status: string;
  actorId?: string;
}): Promise<void> {
  const typeLabel = params.encounterType === "follow_up" ? "متابعة" : params.encounterType === "new" ? "جديدة" : "عيادة";
  await recordPatientEvent({
    patientId: params.patientId,
    category: "clinical",
    eventType: "encounter_created",
    source: "mediscript",
    title: `زيارة ${typeLabel}${params.chiefComplaint ? ` — ${params.chiefComplaint}` : ""}`,
    titleEn: `${params.encounterType ?? "Visit"} encounter${params.chiefComplaint ? ` — ${params.chiefComplaint}` : ""}`,
    description: params.chiefComplaint ? `الشكوى الرئيسية: ${params.chiefComplaint}` : undefined,
    data: {
      encounterId: params.encounterId,
      encounterType: params.encounterType,
      status: params.status,
    },
    recordedById: params.actorId,
  });
}

/**
 * Record when an encounter is signed (finalized).
 */
export async function recordEncounterSignedEvent(params: {
  patientId: number;
  encounterId: string;
  diagnoses?: string[];
  actorId?: string;
}): Promise<void> {
  await recordPatientEvent({
    patientId: params.patientId,
    category: "clinical",
    eventType: "encounter_signed",
    source: "mediscript",
    title: `تم توقيع الزيارة${params.diagnoses?.length ? ` — ${params.diagnoses.slice(0, 2).join("، ")}` : ""}`,
    titleEn: `Encounter signed${params.diagnoses?.length ? ` — ${params.diagnoses.slice(0, 2).join(", ")}` : ""}`,
    data: {
      encounterId: params.encounterId,
      diagnoses: params.diagnoses,
    },
    recordedById: params.actorId,
  });
}

/**
 * Record when a prescription is created (PharmaX).
 */
export async function recordPrescriptionEvent(params: {
  patientId: number;
  prescriptionId: string;
  drugName: string;
  dose: string;
  frequency: string;
  route: string;
  status: string;
  interactions?: unknown;
  actorId?: string;
}): Promise<void> {
  const hasInteractions = Array.isArray(params.interactions) && params.interactions.length > 0;
  await recordPatientEvent({
    patientId: params.patientId,
    category: "medication",
    eventType: "prescription_created",
    source: "pharmax",
    title: `وصف ${params.drugName} ${params.dose}`,
    titleEn: `Prescribed ${params.drugName} ${params.dose}`,
    description: `${params.frequency} — ${params.route}${hasInteractions ? " ⚠️ تفاعلات مكتشفة" : ""}`,
    data: {
      prescriptionId: params.prescriptionId,
      drugName: params.drugName,
      dose: params.dose,
      frequency: params.frequency,
      route: params.route,
      status: params.status,
      hasInteractions,
    },
    recordedById: params.actorId,
  });
}

/**
 * Record when lab results are uploaded/created (MediLab).
 */
export async function recordLabEvent(params: {
  patientId: number;
  labResultId: string;
  panelName: string;
  laboratory?: string;
  totalTests: number;
  abnormalCount: number;
  criticalFindings?: string[];
  actorId?: string;
}): Promise<void> {
  const severity = params.criticalFindings?.length
    ? "حرج"
    : params.abnormalCount > 0
      ? "غير طبيعي"
      : "طبيعي";
  await recordPatientEvent({
    patientId: params.patientId,
    category: "lab",
    eventType: "lab_result_added",
    source: "medilab",
    title: `تحليل ${params.panelName} — ${severity}`,
    titleEn: `Lab: ${params.panelName} — ${params.abnormalCount} abnormal of ${params.totalTests}`,
    description: params.criticalFindings?.length
      ? `⚠️ نتائج حرجة: ${params.criticalFindings.join("، ")}`
      : params.abnormalCount > 0
        ? `${params.abnormalCount} نتيجة غير طبيعية من ${params.totalTests}`
        : `كل النتائج طبيعية (${params.totalTests} تحليل)`,
    data: {
      labResultId: params.labResultId,
      panelName: params.panelName,
      laboratory: params.laboratory,
      totalTests: params.totalTests,
      abnormalCount: params.abnormalCount,
      criticalFindings: params.criticalFindings,
    },
    numericValue: params.abnormalCount,
    numericUnit: "abnormal_results",
    recordedById: params.actorId,
  });
}

/**
 * Record when a scan/imaging is analyzed (MediScan).
 */
export async function recordScanEvent(params: {
  patientId: number;
  scanId: string;
  scanType: string;
  bodyPart: string;
  aiImpression?: string;
  urgency?: string;
  actorId?: string;
}): Promise<void> {
  await recordPatientEvent({
    patientId: params.patientId,
    category: "imaging",
    eventType: "scan_analyzed",
    source: "mediscan",
    title: `${params.scanType} — ${params.bodyPart}`,
    titleEn: `${params.scanType} ${params.bodyPart} analyzed`,
    description: params.aiImpression ? params.aiImpression.slice(0, 200) : undefined,
    data: {
      scanId: params.scanId,
      scanType: params.scanType,
      bodyPart: params.bodyPart,
      urgency: params.urgency,
    },
    recordedById: params.actorId,
  });
}

/**
 * Record when vitals are measured.
 */
export async function recordVitalsEvent(params: {
  patientId: number;
  vitalId: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  spO2?: number;
  weightKg?: number;
  bmi?: number;
  actorId?: string;
}): Promise<void> {
  const parts: string[] = [];
  if (params.bloodPressureSystolic) parts.push(`BP: ${params.bloodPressureSystolic}/${params.bloodPressureDiastolic ?? "?"}`);
  if (params.heartRate) parts.push(`HR: ${params.heartRate}`);
  if (params.temperature) parts.push(`Temp: ${params.temperature}°C`);
  if (params.spO2) parts.push(`SpO2: ${params.spO2}%`);
  if (params.bmi) parts.push(`BMI: ${params.bmi}`);

  await recordPatientEvent({
    patientId: params.patientId,
    category: "vitals",
    eventType: "vitals_recorded",
    source: "vitals",
    title: `قياسات حيوية — ${parts.join(" • ")}`,
    titleEn: `Vitals: ${parts.join(" • ")}`,
    data: {
      vitalId: params.vitalId,
      bp: params.bloodPressureSystolic ? `${params.bloodPressureSystolic}/${params.bloodPressureDiastolic}` : null,
      hr: params.heartRate,
      temp: params.temperature,
      spo2: params.spO2,
      weight: params.weightKg,
      bmi: params.bmi,
    },
    recordedById: params.actorId,
  });
}

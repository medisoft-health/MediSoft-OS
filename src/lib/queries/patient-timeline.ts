import "server-only";
import { and, desc, eq, isNull, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { encounters, labResults, prescriptions, scans, vitals } from "@/db/schema";

/**
 * Patient Clinical Timeline — aggregates ALL clinical events into a
 * chronological timeline with type-specific metadata.
 */

export interface TimelineEvent {
  id: string;
  type: "lab" | "encounter" | "prescription" | "scan" | "vital" | "milestone";
  date: Date;
  title: string;
  titleEn: string;
  subtitle: string | null;
  icon: string;
  color: string;
  metadata: Record<string, unknown>;
  detailUrl: string | null;
}

export interface TimelineResult {
  events: TimelineEvent[];
  totalEvents: number;
  hasMore: boolean;
}

export async function getPatientTimeline(
  patientId: number,
  options?: {
    limit?: number;
    offset?: number;
    types?: string[];
    from?: Date;
    to?: Date;
  },
): Promise<TimelineResult> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const typeFilter = options?.types;

  const events: TimelineEvent[] = [];

  // Fetch all event types in parallel
  const [labRows, encounterRows, rxRows, scanRows, vitalRows] = await Promise.all([
    (!typeFilter || typeFilter.includes("lab")) ? db.select({
      id: labResults.id,
      panelName: labResults.panelName,
      resultDate: labResults.resultDate,
      laboratory: labResults.laboratory,
      results: labResults.results,
    }).from(labResults).where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt))).orderBy(desc(labResults.resultDate)).limit(100) : Promise.resolve([]),

    (!typeFilter || typeFilter.includes("encounter")) ? db.select({
      id: encounters.id,
      encounterDate: encounters.encounterDate,
      encounterType: encounters.encounterType,
      status: encounters.status,
      soapNote: encounters.soapNote,
    }).from(encounters).where(and(eq(encounters.patientId, patientId), isNull(encounters.deletedAt))).orderBy(desc(encounters.encounterDate)).limit(100) : Promise.resolve([]),

    (!typeFilter || typeFilter.includes("prescription")) ? db.select({
      id: prescriptions.id,
      drugName: prescriptions.drugName,
      dose: prescriptions.dose,
      status: prescriptions.status,
      startDate: prescriptions.startDate,
      createdAt: prescriptions.createdAt,
    }).from(prescriptions).where(and(eq(prescriptions.patientId, patientId), isNull(prescriptions.deletedAt))).orderBy(desc(prescriptions.createdAt)).limit(100) : Promise.resolve([]),

    (!typeFilter || typeFilter.includes("scan")) ? db.select({
      id: scans.id,
      scanType: scans.scanType,
      bodyPart: scans.bodyPart,
      studyDate: scans.studyDate,
      aiImpression: scans.aiImpression,
    }).from(scans).where(and(eq(scans.patientId, patientId), isNull(scans.deletedAt))).orderBy(desc(scans.studyDate)).limit(50) : Promise.resolve([]),

    (!typeFilter || typeFilter.includes("vital")) ? db.select({
      id: vitals.id,
      recordedAt: vitals.recordedAt,
      bloodPressureSystolic: vitals.bloodPressureSystolic,
      bloodPressureDiastolic: vitals.bloodPressureDiastolic,
      heartRate: vitals.heartRate,
      temperature: vitals.temperature,
      bmi: vitals.bmi,
    }).from(vitals).where(eq(vitals.patientId, patientId)).orderBy(desc(vitals.recordedAt)).limit(50) : Promise.resolve([]),
  ]);

  // Transform labs
  for (const l of labRows) {
    const results = (l.results ?? []) as Array<{ flag?: string }>;
    const abnCount = results.filter((r) => r.flag && r.flag !== "normal").length;
    events.push({
      id: `lab-${l.id}`,
      type: "lab",
      date: l.resultDate ?? new Date(),
      title: `تحليل ${l.panelName}`,
      titleEn: l.panelName,
      subtitle: l.laboratory ? `مختبر ${l.laboratory}` : null,
      icon: "FlaskConical",
      color: "blue-500",
      metadata: { panelName: l.panelName, abnormalCount: abnCount, totalTests: results.length },
      detailUrl: `/medilab/${l.id}`,
    });
  }

  // Transform encounters
  for (const e of encounterRows) {
    const soap = e.soapNote as { subjective?: { chiefComplaint?: string } } | null;
    events.push({
      id: `enc-${e.id}`,
      type: "encounter",
      date: e.encounterDate ?? new Date(),
      title: e.encounterType === "follow_up" ? "زيارة متابعة" : e.encounterType === "new" ? "زيارة جديدة" : "زيارة عيادة",
      titleEn: e.encounterType ?? "Visit",
      subtitle: soap?.subjective?.chiefComplaint ? `الشكوى: ${soap.subjective.chiefComplaint}` : null,
      icon: "Stethoscope",
      color: "purple-500",
      metadata: { encounterType: e.encounterType, chiefComplaint: soap?.subjective?.chiefComplaint, status: e.status },
      detailUrl: `/mediscript/${e.id}`,
    });
  }

  // Transform prescriptions
  for (const rx of rxRows) {
    const date = rx.startDate ? new Date(rx.startDate) : rx.createdAt;
    const statusAr = rx.status === "active" ? "بدأ" : rx.status === "completed" ? "اكتمل" : rx.status === "discontinued" ? "أوقف" : rx.status;
    events.push({
      id: `rx-${rx.id}`,
      type: "prescription",
      date,
      title: `${statusAr} ${rx.drugName} ${rx.dose}`,
      titleEn: `${rx.drugName} ${rx.dose}`,
      subtitle: null,
      icon: "Pill",
      color: "green-500",
      metadata: { drugName: rx.drugName, dose: rx.dose, status: rx.status },
      detailUrl: null,
    });
  }

  // Transform scans
  for (const s of scanRows) {
    events.push({
      id: `scan-${s.id}`,
      type: "scan",
      date: s.studyDate ?? new Date(),
      title: `${s.scanType} — ${s.bodyPart}`,
      titleEn: `${s.scanType} ${s.bodyPart}`,
      subtitle: s.aiImpression ? s.aiImpression.slice(0, 80) + "..." : null,
      icon: "ScanLine",
      color: "indigo-500",
      metadata: { scanType: s.scanType, bodyPart: s.bodyPart, impression: s.aiImpression },
      detailUrl: `/mediscan/${s.id}`,
    });
  }

  // Transform vitals
  for (const v of vitalRows) {
    const parts: string[] = [];
    if (v.bloodPressureSystolic) parts.push(`BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic ?? "?"}`);
    if (v.heartRate) parts.push(`HR: ${v.heartRate}`);
    if (v.bmi) parts.push(`BMI: ${v.bmi}`);
    events.push({
      id: `vital-${v.id}`,
      type: "vital",
      date: v.recordedAt,
      title: "قياسات حيوية",
      titleEn: "Vital Signs",
      subtitle: parts.join(" • ") || null,
      icon: "Activity",
      color: "teal-500",
      metadata: { bp: v.bloodPressureSystolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : null, hr: v.heartRate, bmi: v.bmi },
      detailUrl: null,
    });
  }

  // Filter by date range
  let filtered = events;
  if (options?.from) filtered = filtered.filter((e) => e.date >= options.from!);
  if (options?.to) filtered = filtered.filter((e) => e.date <= options.to!);

  // Sort by date descending
  filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalEvents = filtered.length;
  const paged = filtered.slice(offset, offset + limit);

  return {
    events: paged,
    totalEvents,
    hasMore: offset + limit < totalEvents,
  };
}

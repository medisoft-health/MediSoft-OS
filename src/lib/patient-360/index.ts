import "server-only";
import { db } from "@/db";
import {
  patients,
  encounters,
  prescriptions,
  labResults,
  scans,
  vitals,
  patientEvents,
} from "@/db/schema";
import { eq, and, isNull, desc, gte, lte, sql, asc } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL, decodeAllStrings } from "@/lib/ai/gemini";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Patient360Summary {
  executiveSummary: string;
  executiveSummaryEn: string;
  healthScore: number;
  healthScoreLabel: string;
  keyFindings: Array<{
    category: string;
    finding: string;
    findingEn: string;
    severity: "info" | "warning" | "critical";
    recommendation: string;
    recommendationEn: string;
  }>;
  activeProblems: string[];
  currentMedications: string[];
  recentActivity: {
    lastVisit: string | null;
    totalEncounters: number;
    totalLabs: number;
    totalScans: number;
    totalEvents: number;
  };
  patientProfile: {
    age: number;
    sex: string;
    bloodType: string;
    allergies: string[];
    chronicConditions: string[];
  };
  generatedAt: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  unit: string;
  label?: string;
  source?: string;
  isAbnormal?: boolean;
}

export interface TrendSeries {
  id: string;
  name: string;
  nameEn: string;
  unit: string;
  category: "vitals" | "lab" | "body_composition" | "exercise" | "nutrition";
  data: TrendDataPoint[];
  normalRange?: { min: number; max: number };
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
  latestValue: number | null;
  changePercent: number | null;
}

export interface LabComparison {
  panelName: string;
  tests: Array<{
    testName: string;
    unit: string;
    previousValue: number | null;
    previousDate: string | null;
    currentValue: number | null;
    currentDate: string | null;
    change: number | null;
    changePercent: number | null;
    direction: "up" | "down" | "stable" | "new";
    isAbnormal: boolean;
    normalRange: { min: number; max: number } | null;
    interpretation: string;
    interpretationEn: string;
  }>;
  aiAnalysis: string;
  aiAnalysisEn: string;
}

export interface RiskPrediction {
  overallRisk: "low" | "moderate" | "high" | "critical";
  overallScore: number;
  risks: Array<{
    id: string;
    name: string;
    nameEn: string;
    category: string;
    score: number;
    level: "low" | "moderate" | "high" | "critical";
    factors: string[];
    factorsEn: string[];
    recommendation: string;
    recommendationEn: string;
    timeframe: string;
    evidence: string[];
  }>;
  protectiveFactors: Array<{
    factor: string;
    factorEn: string;
    impact: string;
  }>;
  generatedAt: string;
}

export interface SmartAlert {
  id: string;
  type: "abnormal_lab" | "drug_interaction" | "missed_followup" | "vital_trend" | "overdue_screening" | "medication_adherence" | "pattern_detected";
  severity: "info" | "warning" | "critical";
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  actionRequired: boolean;
  suggestedAction: string;
  suggestedActionEn: string;
  relatedEventIds: number[];
  createdAt: string;
  expiresAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Calculate Age
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AI Executive Summary Generator
// ═══════════════════════════════════════════════════════════════════════════════

export async function generatePatient360Summary(patientId: number): Promise<Patient360Summary | null> {
  // Fetch patient data
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
    .limit(1);

  if (!patient) return null;

  // Parallel fetch all related data
  const [
    recentEncounters,
    activeMeds,
    recentLabs,
    recentScans,
    latestVitalsRow,
    eventCount,
  ] = await Promise.all([
    db.select().from(encounters)
      .where(and(eq(encounters.patientId, patientId), isNull(encounters.deletedAt)))
      .orderBy(desc(encounters.encounterDate))
      .limit(10),
    db.select().from(prescriptions)
      .where(and(eq(prescriptions.patientId, patientId), isNull(prescriptions.deletedAt)))
      .orderBy(desc(prescriptions.createdAt))
      .limit(20),
    db.select().from(labResults)
      .where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)))
      .orderBy(desc(labResults.resultDate))
      .limit(10),
    db.select().from(scans)
      .where(and(eq(scans.patientId, patientId), isNull(scans.deletedAt)))
      .orderBy(desc(scans.createdAt))
      .limit(5),
    db.select().from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.recordedAt))
      .limit(1),
    db.select({ count: sql<number>`count(*)` }).from(patientEvents)
      .where(and(eq(patientEvents.patientId, patientId), isNull(patientEvents.deletedAt))),
  ]);

  const age = calculateAge(patient.dateOfBirth);
  const allergies = (patient.allergies as Array<{ substance: string }>) ?? [];
  const conditions = (patient.chronicConditions as Array<{ description: string; icdCode?: string }>) ?? [];

  // Build context for AI
  const contextData = {
    demographics: {
      age,
      sex: patient.sex,
      bloodType: patient.bloodType,
      allergies: allergies.map(a => a.substance),
      chronicConditions: conditions.map(c => c.description),
      medicalHistory: patient.medicalHistory,
      familyHistory: patient.familyHistory,
    },
    encounters: recentEncounters.map(e => ({
      date: e.encounterDate,
      type: e.encounterType,
      status: e.status,
      soap: e.soapNote,
    })),
    medications: activeMeds.map(m => ({
      drug: m.drugName,
      dose: m.dose,
      frequency: m.frequency,
      status: m.status,
    })),
    labs: recentLabs.map(l => ({
      panel: l.panelName,
      date: l.resultDate,
      results: l.results,
      criticalFlags: l.criticalFlags,
    })),
    scans: recentScans.map(s => ({
      type: s.scanType,
      bodyPart: s.bodyPart,
      date: s.studyDate,
      impression: s.aiImpression,
    })),
    latestVitals: latestVitalsRow[0] ?? null,
  };

  // Generate AI summary
  const gemini = getGeminiClient();
  let aiSummary: Patient360Summary;

  if (gemini) {
    try {
      const prompt = `أنت طبيب استشاري خبير تقوم بمراجعة الملف الطبي الشامل لمريض. قم بإنشاء ملخص تنفيذي شامل.

بيانات المريض:
${JSON.stringify(contextData, null, 2)}

أنشئ ملخصاً تنفيذياً بصيغة JSON التالية:
{
  "executiveSummary": "ملخص شامل بالعربية (3-5 جمل) يوضح الحالة العامة للمريض والنقاط المهمة",
  "executiveSummaryEn": "Same summary in English",
  "healthScore": <number 0-100>,
  "healthScoreLabel": "ممتاز|جيد|متوسط|يحتاج اهتمام",
  "keyFindings": [
    {
      "category": "clinical|medication|lab|imaging|vitals",
      "finding": "النتيجة بالعربية",
      "findingEn": "Finding in English",
      "severity": "info|warning|critical",
      "recommendation": "التوصية بالعربية",
      "recommendationEn": "Recommendation in English"
    }
  ],
  "activeProblems": ["المشاكل النشطة بالعربية"],
  "currentMedications": ["الأدوية الحالية"]
}

قواعد:
- كن دقيقاً طبياً
- اذكر أي نتائج حرجة أو تفاعلات دوائية
- قيّم الصحة العامة بناءً على كل البيانات المتاحة
- إذا لم تكن هناك بيانات كافية، اذكر ذلك`;

      const result = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.3, responseMimeType: "application/json" },
      });

      const text = result.text ?? "{}";
      const parsed = decodeAllStrings(JSON.parse(text));

      aiSummary = {
        ...parsed,
        recentActivity: {
          lastVisit: recentEncounters[0]?.encounterDate?.toISOString() ?? null,
          totalEncounters: recentEncounters.length,
          totalLabs: recentLabs.length,
          totalScans: recentScans.length,
          totalEvents: Number(eventCount[0]?.count ?? 0),
        },
        patientProfile: {
          age,
          sex: patient.sex,
          bloodType: patient.bloodType ?? "unknown",
          allergies: allergies.map(a => a.substance),
          chronicConditions: conditions.map(c => c.description),
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[Patient360] AI Summary generation failed:", err);
      aiSummary = buildFallbackSummary(patient, age, allergies, conditions, recentEncounters, activeMeds, recentLabs, recentScans, latestVitalsRow[0], eventCount);
    }
  } else {
    aiSummary = buildFallbackSummary(patient, age, allergies, conditions, recentEncounters, activeMeds, recentLabs, recentScans, latestVitalsRow[0], eventCount);
  }

  return aiSummary;
}

function buildFallbackSummary(
  patient: any, age: number, allergies: any[], conditions: any[],
  encounters: any[], meds: any[], labs: any[], scans: any[],
  latestVitals: any, eventCount: any[]
): Patient360Summary {
  const score = Math.min(100, 70 + (encounters.length > 2 ? 5 : 0) + (labs.length > 0 ? 5 : 0) - (conditions.length * 3));
  return {
    executiveSummary: `مريض ${patient.sex === "male" ? "ذكر" : "أنثى"} بعمر ${age} سنة. ${conditions.length > 0 ? `يعاني من ${conditions.map((c: any) => c.description).join("، ")}.` : "لا توجد أمراض مزمنة مسجلة."} ${meds.length > 0 ? `يتناول ${meds.length} أدوية حالياً.` : ""} ${labs.length > 0 ? `آخر تحليل: ${labs[0].panelName}.` : ""}`,
    executiveSummaryEn: `${patient.sex === "male" ? "Male" : "Female"} patient, ${age} years old. ${conditions.length > 0 ? `Has ${conditions.map((c: any) => c.description).join(", ")}.` : "No chronic conditions recorded."} ${meds.length > 0 ? `Currently on ${meds.length} medications.` : ""} ${labs.length > 0 ? `Latest lab: ${labs[0].panelName}.` : ""}`,
    healthScore: score,
    healthScoreLabel: score >= 85 ? "ممتاز" : score >= 70 ? "جيد" : score >= 50 ? "متوسط" : "يحتاج اهتمام",
    keyFindings: [],
    activeProblems: conditions.map((c: any) => c.description),
    currentMedications: meds.map((m: any) => `${m.drugName} ${m.dose}`),
    recentActivity: {
      lastVisit: encounters[0]?.encounterDate?.toISOString() ?? null,
      totalEncounters: encounters.length,
      totalLabs: labs.length,
      totalScans: scans.length,
      totalEvents: Number(eventCount[0]?.count ?? 0),
    },
    patientProfile: {
      age,
      sex: patient.sex,
      bloodType: patient.bloodType ?? "unknown",
      allergies: allergies.map((a: any) => a.substance),
      chronicConditions: conditions.map((c: any) => c.description),
    },
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Trend Analysis Engine
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPatientTrends(
  patientId: number,
  options?: { from?: Date; to?: Date; categories?: string[] }
): Promise<TrendSeries[]> {
  const trends: TrendSeries[] = [];

  // Fetch vitals history
  const vitalsHistory = await db
    .select()
    .from(vitals)
    .where(eq(vitals.patientId, patientId))
    .orderBy(asc(vitals.recordedAt))
    .limit(100);

  // Blood Pressure Systolic
  const bpSystolicData = vitalsHistory
    .filter(v => v.bloodPressureSystolic != null)
    .map(v => ({
      date: v.recordedAt.toISOString(),
      value: v.bloodPressureSystolic!,
      unit: "mmHg",
      isAbnormal: v.bloodPressureSystolic! > 140 || v.bloodPressureSystolic! < 90,
    }));

  if (bpSystolicData.length > 0) {
    trends.push({
      id: "bp_systolic",
      name: "ضغط الدم الانقباضي",
      nameEn: "Systolic Blood Pressure",
      unit: "mmHg",
      category: "vitals",
      data: bpSystolicData,
      normalRange: { min: 90, max: 140 },
      trend: calculateTrend(bpSystolicData.map(d => d.value)),
      latestValue: bpSystolicData[bpSystolicData.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(bpSystolicData.map(d => d.value)),
    });
  }

  // Blood Pressure Diastolic
  const bpDiastolicData = vitalsHistory
    .filter(v => v.bloodPressureDiastolic != null)
    .map(v => ({
      date: v.recordedAt.toISOString(),
      value: v.bloodPressureDiastolic!,
      unit: "mmHg",
      isAbnormal: v.bloodPressureDiastolic! > 90 || v.bloodPressureDiastolic! < 60,
    }));

  if (bpDiastolicData.length > 0) {
    trends.push({
      id: "bp_diastolic",
      name: "ضغط الدم الانبساطي",
      nameEn: "Diastolic Blood Pressure",
      unit: "mmHg",
      category: "vitals",
      data: bpDiastolicData,
      normalRange: { min: 60, max: 90 },
      trend: calculateTrend(bpDiastolicData.map(d => d.value)),
      latestValue: bpDiastolicData[bpDiastolicData.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(bpDiastolicData.map(d => d.value)),
    });
  }

  // Heart Rate
  const hrData = vitalsHistory
    .filter(v => v.heartRate != null)
    .map(v => ({
      date: v.recordedAt.toISOString(),
      value: v.heartRate!,
      unit: "bpm",
      isAbnormal: v.heartRate! > 100 || v.heartRate! < 60,
    }));

  if (hrData.length > 0) {
    trends.push({
      id: "heart_rate",
      name: "معدل ضربات القلب",
      nameEn: "Heart Rate",
      unit: "bpm",
      category: "vitals",
      data: hrData,
      normalRange: { min: 60, max: 100 },
      trend: calculateTrend(hrData.map(d => d.value)),
      latestValue: hrData[hrData.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(hrData.map(d => d.value)),
    });
  }

  // SpO2
  const spo2Data = vitalsHistory
    .filter(v => v.spO2 != null)
    .map(v => ({
      date: v.recordedAt.toISOString(),
      value: v.spO2!,
      unit: "%",
      isAbnormal: v.spO2! < 95,
    }));

  if (spo2Data.length > 0) {
    trends.push({
      id: "spo2",
      name: "تشبع الأكسجين",
      nameEn: "Oxygen Saturation",
      unit: "%",
      category: "vitals",
      data: spo2Data,
      normalRange: { min: 95, max: 100 },
      trend: calculateTrend(spo2Data.map(d => d.value)),
      latestValue: spo2Data[spo2Data.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(spo2Data.map(d => d.value)),
    });
  }

  // Weight
  const weightData = vitalsHistory
    .filter(v => v.weightKg != null)
    .map(v => ({
      date: v.recordedAt.toISOString(),
      value: parseFloat(v.weightKg!),
      unit: "kg",
    }));

  if (weightData.length > 0) {
    trends.push({
      id: "weight",
      name: "الوزن",
      nameEn: "Weight",
      unit: "kg",
      category: "vitals",
      data: weightData,
      trend: calculateTrend(weightData.map(d => d.value)),
      latestValue: weightData[weightData.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(weightData.map(d => d.value)),
    });
  }

  // BMI
  const bmiData = vitalsHistory
    .filter(v => v.bmi != null)
    .map(v => ({
      date: v.recordedAt.toISOString(),
      value: parseFloat(v.bmi!),
      unit: "kg/m²",
      isAbnormal: parseFloat(v.bmi!) > 30 || parseFloat(v.bmi!) < 18.5,
    }));

  if (bmiData.length > 0) {
    trends.push({
      id: "bmi",
      name: "مؤشر كتلة الجسم",
      nameEn: "BMI",
      unit: "kg/m²",
      category: "vitals",
      data: bmiData,
      normalRange: { min: 18.5, max: 25 },
      trend: calculateTrend(bmiData.map(d => d.value)),
      latestValue: bmiData[bmiData.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(bmiData.map(d => d.value)),
    });
  }

  // Lab Trends — extract numeric values from lab results
  const labHistory = await db
    .select()
    .from(labResults)
    .where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)))
    .orderBy(asc(labResults.resultDate))
    .limit(50);

  // Group lab tests by name for trend tracking
  const labTestMap = new Map<string, TrendDataPoint[]>();
  for (const lab of labHistory) {
    const results = (lab.results ?? []) as Array<{
      testName: string;
      value: string | number;
      unit?: string;
      normalRange?: { min?: number; max?: number };
      status?: string;
    }>;
    for (const test of results) {
      const numVal = typeof test.value === "number" ? test.value : parseFloat(test.value);
      if (isNaN(numVal)) continue;

      const key = test.testName;
      if (!labTestMap.has(key)) labTestMap.set(key, []);
      labTestMap.get(key)!.push({
        date: lab.resultDate.toISOString(),
        value: numVal,
        unit: test.unit ?? "",
        isAbnormal: test.status === "abnormal" || test.status === "critical",
      });
    }
  }

  // Only include lab tests with 2+ data points for trending
  for (const [testName, dataPoints] of labTestMap) {
    if (dataPoints.length < 2) continue;
    trends.push({
      id: `lab_${testName.replace(/\s+/g, "_").toLowerCase()}`,
      name: testName,
      nameEn: testName,
      unit: dataPoints[0]?.unit ?? "",
      category: "lab",
      data: dataPoints,
      trend: calculateTrend(dataPoints.map(d => d.value)),
      latestValue: dataPoints[dataPoints.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(dataPoints.map(d => d.value)),
    });
  }

  // Body Composition from patient_events (MediSport)
  const bodyCompEvents = await db
    .select()
    .from(patientEvents)
    .where(and(
      eq(patientEvents.patientId, patientId),
      eq(patientEvents.eventType, "body_composition"),
      isNull(patientEvents.deletedAt),
    ))
    .orderBy(asc(patientEvents.eventDate))
    .limit(50);

  const muscleMassData: TrendDataPoint[] = [];
  const fatPercentData: TrendDataPoint[] = [];

  for (const evt of bodyCompEvents) {
    const data = evt.data as Record<string, unknown> | null;
    if (!data) continue;
    if (typeof data.muscleMass === "number") {
      muscleMassData.push({
        date: evt.eventDate.toISOString(),
        value: data.muscleMass as number,
        unit: "kg",
      });
    }
    if (typeof data.fatPercent === "number") {
      fatPercentData.push({
        date: evt.eventDate.toISOString(),
        value: data.fatPercent as number,
        unit: "%",
      });
    }
  }

  if (muscleMassData.length > 0) {
    trends.push({
      id: "muscle_mass",
      name: "الكتلة العضلية",
      nameEn: "Muscle Mass",
      unit: "kg",
      category: "body_composition",
      data: muscleMassData,
      trend: calculateTrend(muscleMassData.map(d => d.value)),
      latestValue: muscleMassData[muscleMassData.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(muscleMassData.map(d => d.value)),
    });
  }

  if (fatPercentData.length > 0) {
    trends.push({
      id: "fat_percent",
      name: "نسبة الدهون",
      nameEn: "Body Fat Percentage",
      unit: "%",
      category: "body_composition",
      data: fatPercentData,
      trend: calculateTrend(fatPercentData.map(d => d.value)),
      latestValue: fatPercentData[fatPercentData.length - 1]?.value ?? null,
      changePercent: calculateChangePercent(fatPercentData.map(d => d.value)),
    });
  }

  return trends;
}

function calculateTrend(values: number[]): "improving" | "stable" | "worsening" | "insufficient_data" {
  if (values.length < 3) return "insufficient_data";
  const recent = values.slice(-3);
  const earlier = values.slice(0, 3);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  if (Math.abs(change) < 5) return "stable";
  // For most metrics, lower is not necessarily better — return generic direction
  return change > 0 ? "improving" : "worsening";
}

function calculateChangePercent(values: number[]): number | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return null;
  return Math.round(((last - first) / first) * 100 * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Lab Comparison Engine
// ═══════════════════════════════════════════════════════════════════════════════

export async function compareLabResults(
  patientId: number,
  currentLabId?: string,
  previousLabId?: string
): Promise<LabComparison[]> {
  // Fetch all labs for this patient
  const allLabs = await db
    .select()
    .from(labResults)
    .where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)))
    .orderBy(desc(labResults.resultDate))
    .limit(20);

  if (allLabs.length < 2) return [];

  // Group by panel name and compare consecutive results
  const panelGroups = new Map<string, typeof allLabs>();
  for (const lab of allLabs) {
    const key = lab.panelName;
    if (!panelGroups.has(key)) panelGroups.set(key, []);
    panelGroups.get(key)!.push(lab);
  }

  const comparisons: LabComparison[] = [];

  for (const [panelName, panels] of panelGroups) {
    if (panels.length < 2) continue;

    const current = panels[0]; // most recent
    const previous = panels[1]; // second most recent

    const currentResults = (current.results ?? []) as Array<{
      testName: string;
      value: string | number;
      unit?: string;
      normalRange?: { min?: number; max?: number };
      status?: string;
    }>;
    const previousResults = (previous.results ?? []) as Array<{
      testName: string;
      value: string | number;
      unit?: string;
      normalRange?: { min?: number; max?: number };
      status?: string;
    }>;

    const tests: LabComparison["tests"] = [];

    for (const curr of currentResults) {
      const currVal = typeof curr.value === "number" ? curr.value : parseFloat(curr.value);
      if (isNaN(currVal)) continue;

      const prev = previousResults.find(p => p.testName === curr.testName);
      const prevVal = prev ? (typeof prev.value === "number" ? prev.value : parseFloat(prev.value)) : null;

      let change: number | null = null;
      let changePercent: number | null = null;
      let direction: "up" | "down" | "stable" | "new" = "new";

      if (prevVal !== null && !isNaN(prevVal)) {
        change = currVal - prevVal;
        changePercent = prevVal !== 0 ? Math.round((change / prevVal) * 100 * 10) / 10 : null;
        if (Math.abs(change) < 0.01) direction = "stable";
        else direction = change > 0 ? "up" : "down";
      }

      const normalRange = curr.normalRange
        ? { min: curr.normalRange.min ?? 0, max: curr.normalRange.max ?? 999 }
        : null;

      const isAbnormal = normalRange
        ? currVal < normalRange.min || currVal > normalRange.max
        : curr.status === "abnormal" || curr.status === "critical";

      tests.push({
        testName: curr.testName,
        unit: curr.unit ?? "",
        previousValue: prevVal !== null && !isNaN(prevVal) ? prevVal : null,
        previousDate: previous.resultDate?.toISOString() ?? null,
        currentValue: currVal,
        currentDate: current.resultDate?.toISOString() ?? null,
        change,
        changePercent,
        direction,
        isAbnormal,
        normalRange,
        interpretation: isAbnormal ? "خارج المعدل الطبيعي" : "ضمن المعدل الطبيعي",
        interpretationEn: isAbnormal ? "Outside normal range" : "Within normal range",
      });
    }

    if (tests.length === 0) continue;

    // Generate AI analysis for comparison
    let aiAnalysis = "";
    let aiAnalysisEn = "";

    const gemini = getGeminiClient();
    if (gemini && tests.length > 0) {
      try {
        const prompt = `أنت طبيب مختبرات خبير. قارن بين نتائج التحاليل التالية وقدم تحليلاً موجزاً:

Panel: ${panelName}
التاريخ السابق: ${previous.resultDate?.toISOString()?.split("T")[0]}
التاريخ الحالي: ${current.resultDate?.toISOString()?.split("T")[0]}

النتائج:
${tests.map(t => `${t.testName}: ${t.previousValue ?? "N/A"} → ${t.currentValue} ${t.unit} (${t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : "→"} ${t.changePercent ?? 0}%)`).join("\n")}

أجب بصيغة JSON:
{"aiAnalysis": "تحليل موجز بالعربية (2-3 جمل)", "aiAnalysisEn": "Brief analysis in English (2-3 sentences)"}`;

        const result = await gemini.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { temperature: 0.3, responseMimeType: "application/json" },
        });

        const parsed = decodeAllStrings(JSON.parse(result.text ?? "{}"));
        aiAnalysis = parsed.aiAnalysis ?? "";
        aiAnalysisEn = parsed.aiAnalysisEn ?? "";
      } catch (err) {
        console.error("[Patient360] Lab comparison AI failed:", err);
      }
    }

    comparisons.push({
      panelName,
      tests,
      aiAnalysis: aiAnalysis || `مقارنة ${tests.length} تحليل بين ${previous.resultDate?.toISOString()?.split("T")[0]} و ${current.resultDate?.toISOString()?.split("T")[0]}`,
      aiAnalysisEn: aiAnalysisEn || `Comparison of ${tests.length} tests between ${previous.resultDate?.toISOString()?.split("T")[0]} and ${current.resultDate?.toISOString()?.split("T")[0]}`,
    });
  }

  return comparisons;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Risk Prediction Engine
// ═══════════════════════════════════════════════════════════════════════════════

export async function predictPatientRisks(patientId: number): Promise<RiskPrediction | null> {
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
    .limit(1);

  if (!patient) return null;

  // Fetch comprehensive data
  const [allVitals, allLabs, allMeds, allEvents] = await Promise.all([
    db.select().from(vitals).where(eq(vitals.patientId, patientId)).orderBy(desc(vitals.recordedAt)).limit(20),
    db.select().from(labResults).where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt))).orderBy(desc(labResults.resultDate)).limit(10),
    db.select().from(prescriptions).where(and(eq(prescriptions.patientId, patientId), isNull(prescriptions.deletedAt))).limit(30),
    db.select().from(patientEvents).where(and(eq(patientEvents.patientId, patientId), isNull(patientEvents.deletedAt))).orderBy(desc(patientEvents.eventDate)).limit(100),
  ]);

  const age = calculateAge(patient.dateOfBirth);
  const conditions = (patient.chronicConditions as Array<{ description: string; icdCode?: string }>) ?? [];
  const allergies = (patient.allergies as Array<{ substance: string }>) ?? [];

  const gemini = getGeminiClient();
  if (!gemini) {
    return buildFallbackRiskPrediction(patient, age, conditions, allVitals, allLabs, allMeds, allEvents);
  }

  try {
    const prompt = `أنت طبيب وقائي خبير. بناءً على البيانات التالية، قم بتقييم المخاطر الصحية للمريض:

المريض: ${patient.sex === "male" ? "ذكر" : "أنثى"}, ${age} سنة
فصيلة الدم: ${patient.bloodType}
الأمراض المزمنة: ${conditions.map(c => c.description).join(", ") || "لا يوجد"}
الحساسية: ${allergies.map(a => a.substance).join(", ") || "لا يوجد"}
عدد الأدوية: ${allMeds.length}
آخر ضغط دم: ${allVitals[0]?.bloodPressureSystolic ?? "N/A"}/${allVitals[0]?.bloodPressureDiastolic ?? "N/A"}
آخر BMI: ${allVitals[0]?.bmi ?? "N/A"}
عدد التحاليل: ${allLabs.length}
عدد الأحداث المسجلة: ${allEvents.length}
التمارين (آخر 30 يوم): ${allEvents.filter(e => e.category === "exercise" && new Date(e.eventDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}

أجب بصيغة JSON:
{
  "overallRisk": "low|moderate|high|critical",
  "overallScore": <0-100, where 0=no risk, 100=critical>,
  "risks": [
    {
      "id": "risk_id",
      "name": "اسم الخطر بالعربية",
      "nameEn": "Risk name in English",
      "category": "cardiovascular|metabolic|renal|hepatic|respiratory|musculoskeletal|mental|cancer|general",
      "score": <0-100>,
      "level": "low|moderate|high|critical",
      "factors": ["عامل خطر 1", "عامل خطر 2"],
      "factorsEn": ["Risk factor 1", "Risk factor 2"],
      "recommendation": "التوصية بالعربية",
      "recommendationEn": "Recommendation in English",
      "timeframe": "3 أشهر|6 أشهر|سنة|5 سنوات",
      "evidence": ["الدليل العلمي"]
    }
  ],
  "protectiveFactors": [
    {"factor": "عامل حماية", "factorEn": "Protective factor", "impact": "التأثير"}
  ]
}`;

    const result = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.3, responseMimeType: "application/json" },
    });

    const parsed = decodeAllStrings(JSON.parse(result.text ?? "{}"));
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
    } as RiskPrediction;
  } catch (err) {
    console.error("[Patient360] Risk prediction AI failed:", err);
    return buildFallbackRiskPrediction(patient, age, conditions, allVitals, allLabs, allMeds, allEvents);
  }
}

function buildFallbackRiskPrediction(
  patient: any, age: number, conditions: any[],
  allVitals: any[], allLabs: any[], allMeds: any[], allEvents: any[]
): RiskPrediction {
  const risks: RiskPrediction["risks"] = [];

  // Basic risk assessment based on available data
  if (age > 45 && patient.sex === "male") {
    risks.push({
      id: "cv_age",
      name: "خطر أمراض القلب والأوعية الدموية",
      nameEn: "Cardiovascular Disease Risk",
      category: "cardiovascular",
      score: 35,
      level: "moderate",
      factors: ["العمر فوق 45", "ذكر"],
      factorsEn: ["Age over 45", "Male"],
      recommendation: "فحص دوري للقلب وضغط الدم",
      recommendationEn: "Regular cardiac and blood pressure screening",
      timeframe: "سنة",
      evidence: ["Framingham Risk Score guidelines"],
    });
  }

  if (allVitals[0]?.bmi && parseFloat(allVitals[0].bmi) > 30) {
    risks.push({
      id: "obesity",
      name: "خطر السمنة والأمراض المرتبطة",
      nameEn: "Obesity-Related Disease Risk",
      category: "metabolic",
      score: 45,
      level: "moderate",
      factors: [`BMI: ${allVitals[0].bmi}`],
      factorsEn: [`BMI: ${allVitals[0].bmi}`],
      recommendation: "برنامج تغذية وتمارين رياضية",
      recommendationEn: "Nutrition and exercise program",
      timeframe: "6 أشهر",
      evidence: ["WHO obesity guidelines"],
    });
  }

  const overallScore = risks.length > 0
    ? Math.round(risks.reduce((sum, r) => sum + r.score, 0) / risks.length)
    : 15;

  return {
    overallRisk: overallScore > 70 ? "critical" : overallScore > 50 ? "high" : overallScore > 30 ? "moderate" : "low",
    overallScore,
    risks,
    protectiveFactors: allEvents.filter(e => e.category === "exercise").length > 5
      ? [{ factor: "نشاط رياضي منتظم", factorEn: "Regular physical activity", impact: "يقلل المخاطر بنسبة 20-30%" }]
      : [],
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Smart Alerts Engine
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateSmartAlerts(patientId: number): Promise<SmartAlert[]> {
  const alerts: SmartAlert[] = [];

  // Fetch data for alert generation
  const [recentLabs, recentVitals, activeMeds, recentEvents, encounters_list] = await Promise.all([
    db.select().from(labResults)
      .where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)))
      .orderBy(desc(labResults.resultDate)).limit(5),
    db.select().from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.recordedAt)).limit(10),
    db.select().from(prescriptions)
      .where(and(eq(prescriptions.patientId, patientId), isNull(prescriptions.deletedAt)))
      .limit(20),
    db.select().from(patientEvents)
      .where(and(eq(patientEvents.patientId, patientId), isNull(patientEvents.deletedAt)))
      .orderBy(desc(patientEvents.eventDate)).limit(50),
    db.select().from(encounters)
      .where(and(eq(encounters.patientId, patientId), isNull(encounters.deletedAt)))
      .orderBy(desc(encounters.encounterDate)).limit(5),
  ]);

  // Alert 1: Abnormal lab results
  for (const lab of recentLabs) {
    const criticalFlags = (lab.criticalFlags ?? []) as Array<{ testName: string; value: string; severity: string }>;
    if (criticalFlags.length > 0) {
      alerts.push({
        id: `lab_critical_${lab.id}`,
        type: "abnormal_lab",
        severity: "critical",
        title: `نتائج حرجة في ${lab.panelName}`,
        titleEn: `Critical results in ${lab.panelName}`,
        description: `${criticalFlags.length} نتيجة حرجة: ${criticalFlags.map(f => f.testName).join("، ")}`,
        descriptionEn: `${criticalFlags.length} critical results: ${criticalFlags.map(f => f.testName).join(", ")}`,
        actionRequired: true,
        suggestedAction: "مراجعة النتائج الحرجة واتخاذ إجراء فوري",
        suggestedActionEn: "Review critical results and take immediate action",
        relatedEventIds: [],
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Alert 2: Drug interactions
  const medsWithInteractions = activeMeds.filter(m => {
    const interactions = m.interactions as unknown;
    return Array.isArray(interactions) && interactions.length > 0;
  });
  if (medsWithInteractions.length > 0) {
    alerts.push({
      id: `drug_interaction_${Date.now()}`,
      type: "drug_interaction",
      severity: "warning",
      title: `تفاعلات دوائية محتملة (${medsWithInteractions.length} دواء)`,
      titleEn: `Potential drug interactions (${medsWithInteractions.length} medications)`,
      description: `الأدوية: ${medsWithInteractions.map(m => m.drugName).join("، ")}`,
      descriptionEn: `Medications: ${medsWithInteractions.map(m => m.drugName).join(", ")}`,
      actionRequired: true,
      suggestedAction: "مراجعة التفاعلات الدوائية في PharmaX",
      suggestedActionEn: "Review drug interactions in PharmaX",
      relatedEventIds: [],
      createdAt: new Date().toISOString(),
    });
  }

  // Alert 3: Missed follow-up
  if (encounters_list.length > 0) {
    const lastVisit = encounters_list[0].encounterDate;
    if (lastVisit) {
      const daysSince = Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 90) {
        alerts.push({
          id: `missed_followup_${Date.now()}`,
          type: "missed_followup",
          severity: "warning",
          title: `لم تتم متابعة منذ ${daysSince} يوم`,
          titleEn: `No follow-up for ${daysSince} days`,
          description: `آخر زيارة كانت بتاريخ ${new Date(lastVisit).toLocaleDateString("ar-EG")}. يُنصح بمتابعة دورية.`,
          descriptionEn: `Last visit was on ${new Date(lastVisit).toLocaleDateString("en-US")}. Regular follow-up recommended.`,
          actionRequired: false,
          suggestedAction: "جدولة موعد متابعة",
          suggestedActionEn: "Schedule a follow-up appointment",
          relatedEventIds: [],
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // Alert 4: Vital signs trend
  if (recentVitals.length >= 3) {
    const recentBP = recentVitals.filter(v => v.bloodPressureSystolic != null).slice(0, 3);
    if (recentBP.length >= 3) {
      const avgSystolic = recentBP.reduce((sum, v) => sum + (v.bloodPressureSystolic ?? 0), 0) / recentBP.length;
      if (avgSystolic > 140) {
        alerts.push({
          id: `bp_high_${Date.now()}`,
          type: "vital_trend",
          severity: "warning",
          title: "ارتفاع مستمر في ضغط الدم",
          titleEn: "Persistent elevated blood pressure",
          description: `متوسط ضغط الدم الانقباضي في آخر 3 قراءات: ${Math.round(avgSystolic)} mmHg`,
          descriptionEn: `Average systolic BP in last 3 readings: ${Math.round(avgSystolic)} mmHg`,
          actionRequired: true,
          suggestedAction: "تقييم علاج ضغط الدم ومراجعة الأدوية",
          suggestedActionEn: "Evaluate blood pressure treatment and review medications",
          relatedEventIds: [],
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // Alert 5: Pattern detection — exercise decline
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const recentExercise = recentEvents.filter(e => e.category === "exercise" && new Date(e.eventDate) > thirtyDaysAgo).length;
  const previousExercise = recentEvents.filter(e => e.category === "exercise" && new Date(e.eventDate) > sixtyDaysAgo && new Date(e.eventDate) <= thirtyDaysAgo).length;

  if (previousExercise > 5 && recentExercise < 2) {
    alerts.push({
      id: `exercise_decline_${Date.now()}`,
      type: "pattern_detected",
      severity: "info",
      title: "انخفاض في النشاط الرياضي",
      titleEn: "Decline in physical activity",
      description: `النشاط الرياضي انخفض من ${previousExercise} مرة الشهر الماضي إلى ${recentExercise} هذا الشهر`,
      descriptionEn: `Physical activity decreased from ${previousExercise} times last month to ${recentExercise} this month`,
      actionRequired: false,
      suggestedAction: "تشجيع المريض على استئناف النشاط الرياضي",
      suggestedActionEn: "Encourage patient to resume physical activity",
      relatedEventIds: [],
      createdAt: new Date().toISOString(),
    });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Cumulative Medical Intelligence
// ═══════════════════════════════════════════════════════════════════════════════

export interface CumulativeInsight {
  id: string;
  type: "correlation" | "prediction" | "recommendation" | "pattern";
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  confidence: number;
  evidence: string[];
  relatedCategories: string[];
  actionable: boolean;
}

export async function generateCumulativeInsights(patientId: number): Promise<CumulativeInsight[]> {
  // Fetch all events for pattern analysis
  const allEvents = await db
    .select()
    .from(patientEvents)
    .where(and(eq(patientEvents.patientId, patientId), isNull(patientEvents.deletedAt)))
    .orderBy(asc(patientEvents.eventDate))
    .limit(500);

  if (allEvents.length < 5) return [];

  const gemini = getGeminiClient();
  if (!gemini) return [];

  // Prepare event summary for AI
  const eventSummary = {
    totalEvents: allEvents.length,
    categories: {} as Record<string, number>,
    timespan: {
      first: allEvents[0]?.eventDate.toISOString(),
      last: allEvents[allEvents.length - 1]?.eventDate.toISOString(),
    },
    recentEvents: allEvents.slice(-20).map(e => ({
      category: e.category,
      type: e.eventType,
      title: e.title,
      date: e.eventDate.toISOString().split("T")[0],
      numericValue: e.numericValue,
      numericUnit: e.numericUnit,
    })),
  };

  for (const evt of allEvents) {
    eventSummary.categories[evt.category] = (eventSummary.categories[evt.category] || 0) + 1;
  }

  try {
    const prompt = `أنت نظام ذكاء طبي تراكمي. بناءً على سجل الأحداث الطبية التالي، اكتشف أنماطاً وعلاقات وقدم توصيات مخصصة.

ملخص السجل:
${JSON.stringify(eventSummary, null, 2)}

اكتشف:
1. علاقات بين الأحداث (مثل: تمرين → تحسن تحليل)
2. أنماط زمنية (مثل: تدهور في فصل معين)
3. توصيات مبنية على التاريخ الكامل
4. تنبؤات (مثل: بناءً على الأنماط، المريض قد يحتاج فحص معين)

أجب بصيغة JSON:
{
  "insights": [
    {
      "id": "insight_1",
      "type": "correlation|prediction|recommendation|pattern",
      "title": "العنوان بالعربية",
      "titleEn": "Title in English",
      "description": "الوصف بالعربية",
      "descriptionEn": "Description in English",
      "confidence": <0.0-1.0>,
      "evidence": ["الدليل 1"],
      "relatedCategories": ["clinical", "lab"],
      "actionable": true
    }
  ]
}

قواعد:
- كن دقيقاً وعلمياً
- لا تختلق بيانات غير موجودة
- ركز على الأنماط القابلة للتنفيذ
- أعطِ 3-7 insights بحد أقصى`;

    const result = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.4, responseMimeType: "application/json" },
    });

    const parsed = decodeAllStrings(JSON.parse(result.text ?? '{"insights":[]}'));
    return (parsed.insights ?? []) as CumulativeInsight[];
  } catch (err) {
    console.error("[Patient360] Cumulative insights AI failed:", err);
    return [];
  }
}

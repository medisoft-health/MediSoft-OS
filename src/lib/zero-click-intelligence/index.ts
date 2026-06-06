import "server-only";
import { db } from "@/db";
import {
  patients,
  encounters,
  prescriptions,
  labResults,
  vitals,
  appointments,
  patientAlerts,
} from "@/db/schema";
import { eq, and, isNull, desc, gte, lte, sql, asc, lt } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ═══════════════════════════════════════════════════════════════════════════════
// Zero-Click Clinical Intelligence Engine
// "The doctor doesn't search — the system understands and delivers."
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsightPriority = "critical" | "high" | "medium" | "low";
export type InsightCategory =
  | "overdue_screening"
  | "medication_response"
  | "insurance_alert"
  | "lab_trend"
  | "vital_trend"
  | "follow_up_needed"
  | "drug_interaction"
  | "preventive_care"
  | "lifestyle_risk"
  | "appointment_gap";

export interface ClinicalInsight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  actionLabel: string;
  actionLabelEn: string;
  actionRoute?: string;
  icon: string;
  color: string;
  evidence: string;
  evidenceEn: string;
  generatedAt: string;
  expiresAt?: string;
  dismissed?: boolean;
}

export interface ZeroClickReport {
  patientId: number;
  patientName: string;
  insights: ClinicalInsight[];
  healthScore: number;
  riskLevel: "critical" | "high" | "moderate" | "low" | "optimal";
  lastAnalyzed: string;
  nextRecommendedVisit: string | null;
  aiSummary: string;
  aiSummaryEn: string;
}

// ─── Screening Protocols ─────────────────────────────────────────────────────

interface ScreeningProtocol {
  name: string;
  nameEn: string;
  labTest: string;
  intervalMonths: number;
  conditions: string[];
  ageMin?: number;
  ageMax?: number;
  sex?: "male" | "female";
}

const SCREENING_PROTOCOLS: ScreeningProtocol[] = [
  {
    name: "فحص السكر التراكمي (HbA1c)",
    nameEn: "HbA1c Screening",
    labTest: "HbA1c",
    intervalMonths: 3,
    conditions: ["diabetes", "type 2 diabetes", "type 1 diabetes", "سكري"],
  },
  {
    name: "فحص وظائف الكلى",
    nameEn: "Kidney Function Test",
    labTest: "creatinine",
    intervalMonths: 6,
    conditions: ["diabetes", "hypertension", "ضغط", "سكري", "kidney"],
  },
  {
    name: "فحص الدهون (Lipid Profile)",
    nameEn: "Lipid Profile",
    labTest: "cholesterol",
    intervalMonths: 6,
    conditions: ["hyperlipidemia", "cardiovascular", "دهون", "كوليسترول"],
  },
  {
    name: "فحص الغدة الدرقية (TSH)",
    nameEn: "Thyroid Function (TSH)",
    labTest: "TSH",
    intervalMonths: 12,
    conditions: ["hypothyroidism", "hyperthyroidism", "thyroid", "غدة درقية"],
  },
  {
    name: "فحص فيتامين D",
    nameEn: "Vitamin D Level",
    labTest: "vitamin D",
    intervalMonths: 6,
    conditions: ["vitamin D deficiency", "osteoporosis", "فيتامين د"],
  },
  {
    name: "فحص PSA",
    nameEn: "PSA Screening",
    labTest: "PSA",
    intervalMonths: 12,
    conditions: [],
    ageMin: 50,
    sex: "male",
  },
  {
    name: "فحص CBC الدوري",
    nameEn: "Routine CBC",
    labTest: "CBC",
    intervalMonths: 6,
    conditions: ["anemia", "أنيميا", "فقر دم"],
  },
  {
    name: "فحص وظائف الكبد",
    nameEn: "Liver Function Test",
    labTest: "ALT",
    intervalMonths: 6,
    conditions: ["hepatitis", "fatty liver", "كبد"],
  },
];

// ─── Medication Response Rules ───────────────────────────────────────────────

interface MedicationResponseRule {
  medication: string[];
  monitorLab: string;
  expectedImprovement: string;
  timeframeMonths: number;
  failureThreshold?: number;
}

const MEDICATION_RESPONSE_RULES: MedicationResponseRule[] = [
  {
    medication: ["metformin", "ميتفورمين", "glucophage"],
    monitorLab: "HbA1c",
    expectedImprovement: "HbA1c should decrease by 1-1.5% within 3 months",
    timeframeMonths: 3,
    failureThreshold: 7.5,
  },
  {
    medication: ["atorvastatin", "rosuvastatin", "أتورفاستاتين", "lipitor", "crestor"],
    monitorLab: "LDL",
    expectedImprovement: "LDL should decrease by 30-50% within 6 weeks",
    timeframeMonths: 2,
    failureThreshold: 130,
  },
  {
    medication: ["amlodipine", "lisinopril", "losartan", "أملوديبين"],
    monitorLab: "blood_pressure",
    expectedImprovement: "BP should reach <140/90 within 4-8 weeks",
    timeframeMonths: 2,
  },
  {
    medication: ["levothyroxine", "euthyrox", "ليفوثيروكسين"],
    monitorLab: "TSH",
    expectedImprovement: "TSH should normalize (0.5-4.5) within 6-8 weeks",
    timeframeMonths: 2,
  },
];

// ─── Core Engine ─────────────────────────────────────────────────────────────

export async function generateZeroClickInsights(
  patientId: number
): Promise<ZeroClickReport> {
  // Fetch all patient data in parallel
  const [patient, recentLabs, recentVitals, recentEncounters, recentPrescriptions, upcomingAppointments] =
    await Promise.all([
      db.query.patients.findFirst({
        where: and(eq(patients.id, patientId), isNull(patients.deletedAt)),
      }),
      db
        .select()
        .from(labResults)
        .where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)))
        .orderBy(desc(labResults.resultDate))
        .limit(50),
      db
        .select()
        .from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.recordedAt))
        .limit(30),
      db
        .select()
        .from(encounters)
        .where(and(eq(encounters.patientId, patientId), isNull(encounters.deletedAt)))
        .orderBy(desc(encounters.encounterDate))
        .limit(20),
      db
        .select()
        .from(prescriptions)
        .where(and(eq(prescriptions.patientId, patientId), isNull(prescriptions.deletedAt)))
        .orderBy(desc(prescriptions.createdAt))
        .limit(30),
      db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, patientId),
            gte(appointments.scheduledAt, new Date())
          )
        )
        .orderBy(asc(appointments.scheduledAt))
        .limit(5),
    ]);

  if (!patient) {
    return {
      patientId,
      patientName: "Unknown",
      insights: [],
      healthScore: 0,
      riskLevel: "low",
      lastAnalyzed: new Date().toISOString(),
      nextRecommendedVisit: null,
      aiSummary: "",
      aiSummaryEn: "",
    };
  }

  const insights: ClinicalInsight[] = [];

  // ── 1. Overdue Screening Detection ──
  const patientConditions = [
    ...((patient.chronicConditions || []) as any[]).map((c: any) => typeof c === 'string' ? c : c?.description || ''),
    ...((patient.allergies || []) as any[]).map((a: any) => typeof a === 'string' ? a : a?.substance || ''),
    patient.medicalHistory || "",
  ]
    .join(" ")
    .toLowerCase();

  const patientAge = patient.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(patient.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  for (const protocol of SCREENING_PROTOCOLS) {
    // Check if protocol applies to this patient
    const conditionMatch =
      protocol.conditions.length === 0 ||
      protocol.conditions.some((c) => patientConditions.includes(c.toLowerCase()));
    const ageMatch =
      (!protocol.ageMin || (patientAge && patientAge >= protocol.ageMin)) &&
      (!protocol.ageMax || (patientAge && patientAge <= protocol.ageMax));
    const sexMatch = !protocol.sex || patient.sex === protocol.sex;

    if (!conditionMatch || !ageMatch || !sexMatch) continue;

    // Find last relevant lab
    const lastLab = recentLabs.find((l) =>
      l.panelName?.toLowerCase().includes(protocol.labTest.toLowerCase()) ||
      (l.results as any[])?.some((r: any) => r.testName?.toLowerCase().includes(protocol.labTest.toLowerCase()))
    );

    if (lastLab) {
      const lastDate = new Date(lastLab.resultDate || lastLab.createdAt);
      const monthsSince = Math.floor(
        (Date.now() - lastDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );

      if (monthsSince >= protocol.intervalMonths) {
        insights.push({
          id: `overdue-${protocol.labTest}-${patientId}`,
          category: "overdue_screening",
          priority: monthsSince >= protocol.intervalMonths * 2 ? "high" : "medium",
          title: `${protocol.name} متأخر — آخر فحص منذ ${monthsSince} شهر`,
          titleEn: `${protocol.nameEn} overdue — last done ${monthsSince} months ago`,
          description: `آخر نتيجة: ${((lastLab.results as any[])?.[0]?.value) || "N/A"} ${((lastLab.results as any[])?.[0]?.unit) || ""} بتاريخ ${lastDate.toLocaleDateString("ar-EG")}. المطلوب كل ${protocol.intervalMonths} أشهر.`,
          descriptionEn: `Last result: ${((lastLab.results as any[])?.[0]?.value) || "N/A"} ${((lastLab.results as any[])?.[0]?.unit) || ""} on ${lastDate.toLocaleDateString("en-US")}. Required every ${protocol.intervalMonths} months.`,
          actionLabel: "اطلب الفحص الآن",
          actionLabelEn: "Order test now",
          actionRoute: "/medilab",
          icon: "🔬",
          color: monthsSince >= protocol.intervalMonths * 2 ? "red" : "amber",
          evidence: `Based on clinical guidelines for ${protocol.conditions.join(", ") || "preventive screening"}`,
          evidenceEn: `Based on clinical guidelines for ${protocol.conditions.join(", ") || "preventive screening"}`,
          generatedAt: new Date().toISOString(),
        });
      }
    } else if (protocol.conditions.some((c) => patientConditions.includes(c.toLowerCase()))) {
      // Patient has the condition but NEVER had this test
      insights.push({
        id: `never-tested-${protocol.labTest}-${patientId}`,
        category: "overdue_screening",
        priority: "high",
        title: `${protocol.name} — لم يُجرَ أبداً`,
        titleEn: `${protocol.nameEn} — Never performed`,
        description: `المريض لديه ${protocol.conditions[0]} ولم يُجرِ هذا الفحص من قبل.`,
        descriptionEn: `Patient has ${protocol.conditions[0]} but this test was never performed.`,
        actionLabel: "اطلب الفحص",
        actionLabelEn: "Order test",
        actionRoute: "/medilab",
        icon: "⚠️",
        color: "red",
        evidence: `Standard of care requires ${protocol.nameEn} for patients with ${protocol.conditions[0]}`,
        evidenceEn: `Standard of care requires ${protocol.nameEn} for patients with ${protocol.conditions[0]}`,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  // ── 2. Medication Response Analysis ──
  for (const rule of MEDICATION_RESPONSE_RULES) {
    const matchingRx = recentPrescriptions.find((rx) =>
      rule.medication.some((med) =>
        (rx.drugName || "").toLowerCase().includes(med.toLowerCase())
      )
    );

    if (!matchingRx) continue;

    const rxDate = new Date(matchingRx.createdAt);
    const monthsOnMed = Math.floor(
      (Date.now() - rxDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );

    if (monthsOnMed < rule.timeframeMonths) continue;

    // Find labs after prescription
    const labsAfterRx = recentLabs.filter(
      (l) =>
        (l.panelName?.toLowerCase().includes(rule.monitorLab.toLowerCase()) ||
         (l.results as any[])?.some((r: any) => r.testName?.toLowerCase().includes(rule.monitorLab.toLowerCase()))) &&
        new Date(l.resultDate || l.createdAt) > rxDate
    );

    if (labsAfterRx.length === 0) {
      insights.push({
        id: `no-monitoring-${rule.monitorLab}-${patientId}`,
        category: "medication_response",
        priority: "high",
        title: `لا يوجد متابعة لـ ${matchingRx.drugName} — ${rule.monitorLab} لم يُفحص`,
        titleEn: `No monitoring for ${matchingRx.drugName} — ${rule.monitorLab} not checked`,
        description: `المريض على ${matchingRx.drugName} منذ ${monthsOnMed} شهر بدون فحص ${rule.monitorLab} للمتابعة.`,
        descriptionEn: `Patient on ${matchingRx.drugName} for ${monthsOnMed} months without ${rule.monitorLab} monitoring.`,
        actionLabel: "اطلب فحص المتابعة",
        actionLabelEn: "Order follow-up test",
        actionRoute: "/medilab",
        icon: "💊",
        color: "amber",
        evidence: rule.expectedImprovement,
        evidenceEn: rule.expectedImprovement,
        generatedAt: new Date().toISOString(),
      });
    } else if (rule.failureThreshold) {
      const latestLab = labsAfterRx[0];
      const matchingResult = (latestLab.results as any[])?.find((r: any) => r.testName?.toLowerCase().includes(rule.monitorLab.toLowerCase()));
      const labValue = parseFloat(String(matchingResult?.value || "0"));
      if (labValue > rule.failureThreshold) {
        insights.push({
          id: `poor-response-${rule.monitorLab}-${patientId}`,
          category: "medication_response",
          priority: "high",
          title: `${matchingRx.drugName} — استجابة غير كافية`,
          titleEn: `${matchingRx.drugName} — Inadequate response`,
          description: `${rule.monitorLab} = ${labValue} بعد ${monthsOnMed} شهر من العلاج. المتوقع: ${rule.expectedImprovement}`,
          descriptionEn: `${rule.monitorLab} = ${labValue} after ${monthsOnMed} months of treatment. Expected: ${rule.expectedImprovement}`,
          actionLabel: "راجع خطة العلاج",
          actionLabelEn: "Review treatment plan",
          actionRoute: "/pharmax",
          icon: "📉",
          color: "red",
          evidence: `Treatment failure: ${rule.monitorLab} above threshold (${rule.failureThreshold}) after adequate trial period`,
          evidenceEn: `Treatment failure: ${rule.monitorLab} above threshold (${rule.failureThreshold}) after adequate trial period`,
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── 3. Appointment Gap Detection ──
  const lastEncounter = recentEncounters[0];
  if (lastEncounter) {
    const monthsSinceVisit = Math.floor(
      (Date.now() - new Date(lastEncounter.encounterDate).getTime()) /
        (30 * 24 * 60 * 60 * 1000)
    );

    const hasChronicCondition =
      (patient.chronicConditions && patient.chronicConditions.length > 0) ||
      patientConditions.includes("diabetes") ||
      patientConditions.includes("hypertension");

    if (hasChronicCondition && monthsSinceVisit >= 3 && upcomingAppointments.length === 0) {
      insights.push({
        id: `appointment-gap-${patientId}`,
        category: "appointment_gap",
        priority: monthsSinceVisit >= 6 ? "high" : "medium",
        title: `لم يزر المريض العيادة منذ ${monthsSinceVisit} شهر — لا يوجد موعد قادم`,
        titleEn: `Patient hasn't visited in ${monthsSinceVisit} months — no upcoming appointment`,
        description: `المريض لديه حالات مزمنة تتطلب متابعة دورية. آخر زيارة: ${new Date(lastEncounter.encounterDate).toLocaleDateString("ar-EG")}`,
        descriptionEn: `Patient has chronic conditions requiring regular follow-up. Last visit: ${new Date(lastEncounter.encounterDate).toLocaleDateString("en-US")}`,
        actionLabel: "حدد موعد",
        actionLabelEn: "Schedule appointment",
        actionRoute: "/appointments",
        icon: "📅",
        color: "amber",
        evidence: "Chronic disease management requires visits every 3 months minimum",
        evidenceEn: "Chronic disease management requires visits every 3 months minimum",
        generatedAt: new Date().toISOString(),
      });
    }
  }

  // ── 4. Vital Signs Trend Alerts ──
  if (recentVitals.length >= 3) {
    const recentBP = recentVitals
      .filter((v) => v.bloodPressureSystolic && v.bloodPressureDiastolic)
      .slice(0, 5);

    if (recentBP.length >= 3) {
      const avgSystolic =
        recentBP.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / recentBP.length;
      const avgDiastolic =
        recentBP.reduce((sum, v) => sum + (v.bloodPressureDiastolic || 0), 0) / recentBP.length;

      if (avgSystolic >= 140 || avgDiastolic >= 90) {
        const isOnBPMed = recentPrescriptions.some((rx) =>
          ["amlodipine", "lisinopril", "losartan", "valsartan", "atenolol"].some(
            (med) => (rx.drugName || "").toLowerCase().includes(med)
          )
        );

        insights.push({
          id: `bp-trend-${patientId}`,
          category: "vital_trend",
          priority: avgSystolic >= 160 ? "critical" : "high",
          title: `ضغط الدم مرتفع باستمرار — متوسط ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)}`,
          titleEn: `Persistently elevated BP — average ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)}`,
          description: isOnBPMed
            ? "المريض على أدوية ضغط لكن القراءات لا تزال مرتفعة. قد يحتاج تعديل الجرعة أو إضافة دواء."
            : "المريض ليس على أدوية ضغط. يُنصح ببدء العلاج.",
          descriptionEn: isOnBPMed
            ? "Patient on antihypertensives but readings remain elevated. May need dose adjustment or additional agent."
            : "Patient not on antihypertensives. Consider initiating treatment.",
          actionLabel: isOnBPMed ? "عدّل الجرعة" : "ابدأ العلاج",
          actionLabelEn: isOnBPMed ? "Adjust dose" : "Start treatment",
          actionRoute: "/pharmax",
          icon: "❤️‍🩹",
          color: avgSystolic >= 160 ? "red" : "amber",
          evidence: `Average of last ${recentBP.length} readings: ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg`,
          evidenceEn: `Average of last ${recentBP.length} readings: ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg`,
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── 5. Insurance Expiry Alert ──
  if (patient.insuranceExpiry) {
    const expiryDate = new Date(patient.insuranceExpiry);
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      insights.push({
        id: `insurance-expiry-${patientId}`,
        category: "insurance_alert",
        priority: daysUntilExpiry <= 7 ? "high" : "medium",
        title: `التأمين ينتهي خلال ${daysUntilExpiry} يوم`,
        titleEn: `Insurance expires in ${daysUntilExpiry} days`,
        description: `تأمين المريض (${patient.insuranceProvider || "غير محدد"}) ينتهي في ${expiryDate.toLocaleDateString("ar-EG")}. بعض الأدوية قد لا تكون مغطاة.`,
        descriptionEn: `Patient insurance (${patient.insuranceProvider || "unspecified"}) expires on ${expiryDate.toLocaleDateString("en-US")}. Some medications may not be covered.`,
        actionLabel: "تنبيه المريض",
        actionLabelEn: "Notify patient",
        actionRoute: "/mediconnect",
        icon: "🛡️",
        color: daysUntilExpiry <= 7 ? "red" : "amber",
        evidence: `Insurance expiry: ${expiryDate.toISOString().split("T")[0]}`,
        evidenceEn: `Insurance expiry: ${expiryDate.toISOString().split("T")[0]}`,
        generatedAt: new Date().toISOString(),
      });
    } else if (daysUntilExpiry <= 0) {
      insights.push({
        id: `insurance-expired-${patientId}`,
        category: "insurance_alert",
        priority: "critical",
        title: "التأمين منتهي الصلاحية!",
        titleEn: "Insurance EXPIRED!",
        description: `تأمين المريض انتهى منذ ${Math.abs(daysUntilExpiry)} يوم. يجب التأكد من طريقة الدفع قبل وصف الأدوية.`,
        descriptionEn: `Patient insurance expired ${Math.abs(daysUntilExpiry)} days ago. Verify payment method before prescribing.`,
        actionLabel: "تحقق من التأمين",
        actionLabelEn: "Verify insurance",
        icon: "🚨",
        color: "red",
        evidence: `Insurance expired on ${expiryDate.toISOString().split("T")[0]}`,
        evidenceEn: `Insurance expired on ${expiryDate.toISOString().split("T")[0]}`,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  // ── 6. Preventive Care Reminders ──
  if (patientAge && patientAge >= 45 && patient.sex === "male") {
    const hasCardiacScreening = recentLabs.some(
      (l) =>
        l.panelName?.toLowerCase().includes("troponin") ||
        l.panelName?.toLowerCase().includes("ecg") ||
        l.panelName?.toLowerCase().includes("cardiac") ||
        l.panelName?.toLowerCase().includes("stress test") ||
        (l.results as any[])?.some((r: any) => r.testName?.toLowerCase().includes("troponin"))
    );
    if (!hasCardiacScreening) {
      insights.push({
        id: `cardiac-screening-${patientId}`,
        category: "preventive_care",
        priority: "medium",
        title: "فحص القلب الوقائي — لم يُجرَ",
        titleEn: "Cardiac screening — Not performed",
        description: `ذكر فوق 45 سنة بدون فحص قلب وقائي. يُنصح بعمل ECG + Lipid Profile.`,
        descriptionEn: `Male over 45 without cardiac screening. ECG + Lipid Profile recommended.`,
        actionLabel: "اطلب الفحوصات",
        actionLabelEn: "Order tests",
        actionRoute: "/medilab",
        icon: "🫀",
        color: "blue",
        evidence: "ACC/AHA guidelines recommend cardiac risk assessment for males >45",
        evidenceEn: "ACC/AHA guidelines recommend cardiac risk assessment for males >45",
        generatedAt: new Date().toISOString(),
      });
    }
  }

  // ── Sort insights by priority ──
  const priorityOrder: Record<InsightPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // ── Calculate Health Score ──
  const criticalCount = insights.filter((i) => i.priority === "critical").length;
  const highCount = insights.filter((i) => i.priority === "high").length;
  const mediumCount = insights.filter((i) => i.priority === "medium").length;

  let healthScore = 100;
  healthScore -= criticalCount * 20;
  healthScore -= highCount * 10;
  healthScore -= mediumCount * 5;
  healthScore = Math.max(0, Math.min(100, healthScore));

  const riskLevel: ZeroClickReport["riskLevel"] =
    healthScore >= 85
      ? "optimal"
      : healthScore >= 70
        ? "low"
        : healthScore >= 50
          ? "moderate"
          : healthScore >= 30
            ? "high"
            : "critical";

  // ── Generate AI Summary ──
  let aiSummary = "";
  let aiSummaryEn = "";

  if (insights.length > 0) {
    try {
      const client = getGeminiClient();
      const insightsSummary = insights
        .slice(0, 5)
        .map((i) => `- [${i.priority}] ${i.titleEn}: ${i.descriptionEn}`)
        .join("\n");

      const prompt = `You are a clinical decision support system. Based on these patient insights, provide a brief 2-sentence clinical summary in Arabic first, then English. Be concise and actionable.

Patient: ${patient.firstName} ${patient.lastName}, Age: ${patientAge || "unknown"}, Sex: ${patient.sex}
Chronic conditions: ${(patient.chronicConditions || []).join(", ") || "None documented"}

Key Insights:
${insightsSummary}

Format your response as:
AR: [Arabic summary]
EN: [English summary]`;

      const response = await client!.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });

      const text = response.text || "";
      const arMatch = text.match(/AR:\s*([\s\S]+?)(?=EN:|$)/);
      const enMatch = text.match(/EN:\s*([\s\S]+?)$/);
      aiSummary = arMatch?.[1]?.trim() || "";
      aiSummaryEn = enMatch?.[1]?.trim() || "";
    } catch {
      aiSummary = `تم اكتشاف ${insights.length} ملاحظة سريرية تحتاج انتباهك.`;
      aiSummaryEn = `${insights.length} clinical insights detected that require your attention.`;
    }
  } else {
    aiSummary = "لا توجد ملاحظات سريرية عاجلة. المريض في حالة مستقرة.";
    aiSummaryEn = "No urgent clinical insights. Patient is in stable condition.";
  }

  return {
    patientId,
    patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
    insights,
    healthScore,
    riskLevel,
    lastAnalyzed: new Date().toISOString(),
    nextRecommendedVisit: upcomingAppointments[0]
      ? new Date(upcomingAppointments[0].scheduledAt).toISOString()
      : null,
    aiSummary,
    aiSummaryEn,
  };
}

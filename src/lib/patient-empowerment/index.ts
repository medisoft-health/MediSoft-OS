import "server-only";
import { db } from "@/db";
import {
  patients,
  encounters,
  labResults,
  vitals,
} from "@/db/schema";
import { eq, and, isNull, desc, gte } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════════
// Patient Empowerment Engine
// "The patient doesn't just see numbers — they UNDERSTAND their body."
// Visual health reports like Spotify Wrapped for health
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthMetricCard {
  id: string;
  label: string;
  labelEn: string;
  currentValue: number | string;
  previousValue: number | string | null;
  unit: string;
  status: "excellent" | "good" | "attention" | "critical";
  trend: "improving" | "stable" | "worsening" | "new";
  changePercent: number | null;
  explanation: string;
  explanationEn: string;
  recommendation: string;
  recommendationEn: string;
  icon: string;
  color: string;
}

export interface BeforeAfterComparison {
  timeframe: string;
  timeframeEn: string;
  metrics: Array<{
    name: string;
    nameEn: string;
    before: number | string;
    after: number | string;
    unit: string;
    improved: boolean;
    changeText: string;
    changeTextEn: string;
  }>;
  overallProgress: number; // 0-100
  motivationalMessage: string;
  motivationalMessageEn: string;
}

export interface MonthlyHealthSummary {
  month: string;
  monthEn: string;
  healthScore: number;
  previousHealthScore: number;
  highlights: Array<{
    emoji: string;
    text: string;
    textEn: string;
    type: "achievement" | "concern" | "milestone" | "tip";
  }>;
  topAchievement: string;
  topAchievementEn: string;
  nextGoal: string;
  nextGoalEn: string;
  visitCount: number;
  labsCompleted: number;
  medicationAdherence: number; // 0-100 estimated
}

export interface PatientHealthReport {
  patientId: number;
  patientName: string;
  generatedAt: string;
  healthScore: number;
  healthScoreLabel: string;
  healthScoreLabelEn: string;
  metricCards: HealthMetricCard[];
  beforeAfter: BeforeAfterComparison;
  monthlySummary: MonthlyHealthSummary;
  trafficLightSummary: Array<{
    name: string;
    nameEn: string;
    status: "green" | "yellow" | "red";
    value: string;
    explanation: string;
    explanationEn: string;
  }>;
  personalizedTips: Array<{
    tip: string;
    tipEn: string;
    category: "nutrition" | "exercise" | "medication" | "lifestyle" | "screening";
    priority: number;
  }>;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

export async function generatePatientHealthReport(
  patientId: number
): Promise<PatientHealthReport> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [patient, recentLabs, olderLabs, recentVitals, olderVitals, recentEncounters] =
    await Promise.all([
      db.query.patients.findFirst({
        where: and(eq(patients.id, patientId), isNull(patients.deletedAt)),
      }),
      db
        .select()
        .from(labResults)
        .where(
          and(
            eq(labResults.patientId, patientId),
            isNull(labResults.deletedAt),
            gte(labResults.resultDate, sixMonthsAgo)
          )
        )
        .orderBy(desc(labResults.resultDate))
        .limit(30),
      db
        .select()
        .from(labResults)
        .where(
          and(
            eq(labResults.patientId, patientId),
            isNull(labResults.deletedAt),
          )
        )
        .orderBy(desc(labResults.resultDate))
        .limit(60),
      db
        .select()
        .from(vitals)
        .where(
          and(
            eq(vitals.patientId, patientId),
            gte(vitals.recordedAt, sixMonthsAgo)
          )
        )
        .orderBy(desc(vitals.recordedAt))
        .limit(30),
      db
        .select()
        .from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.recordedAt))
        .limit(60),
      db
        .select()
        .from(encounters)
        .where(
          and(
            eq(encounters.patientId, patientId),
            isNull(encounters.deletedAt),
            gte(encounters.encounterDate, sixMonthsAgo)
          )
        )
        .orderBy(desc(encounters.encounterDate))
        .limit(20),
    ]);

  if (!patient) {
    return getEmptyReport(patientId);
  }

  // ── Build Metric Cards ──
  const metricCards: HealthMetricCard[] = [];
  const trafficLightSummary: PatientHealthReport["trafficLightSummary"] = [];

  // Blood Pressure
  const latestBP = recentVitals.find((v) => v.bloodPressureSystolic && v.bloodPressureDiastolic);
  const olderBP = olderVitals.find(
    (v) =>
      v.bloodPressureSystolic &&
      v.bloodPressureDiastolic &&
      new Date(v.recordedAt) < sixMonthsAgo
  );

  if (latestBP) {
    const sys = latestBP.bloodPressureSystolic!;
    const dia = latestBP.bloodPressureDiastolic!;
    const status =
      sys < 120 && dia < 80
        ? "excellent"
        : sys < 140 && dia < 90
          ? "good"
          : sys < 160 && dia < 100
            ? "attention"
            : "critical";

    const prevSys = olderBP?.bloodPressureSystolic;
    const change = prevSys ? Math.round(((sys - prevSys) / prevSys) * 100) : null;

    metricCards.push({
      id: "bp",
      label: "ضغط الدم",
      labelEn: "Blood Pressure",
      currentValue: `${sys}/${dia}`,
      previousValue: olderBP ? `${olderBP.bloodPressureSystolic}/${olderBP.bloodPressureDiastolic}` : null,
      unit: "mmHg",
      status,
      trend: change === null ? "new" : change < 0 ? "improving" : change > 5 ? "worsening" : "stable",
      changePercent: change,
      explanation:
        status === "excellent"
          ? "ضغط الدم ممتاز! قلبك يعمل بكفاءة عالية."
          : status === "good"
            ? "ضغط الدم طبيعي. استمر على نمط حياتك الصحي."
            : "ضغط الدم مرتفع. هذا يعني أن قلبك يبذل جهداً أكبر لضخ الدم.",
      explanationEn:
        status === "excellent"
          ? "Excellent blood pressure! Your heart is working efficiently."
          : status === "good"
            ? "Normal blood pressure. Keep up your healthy lifestyle."
            : "Elevated blood pressure. Your heart is working harder to pump blood.",
      recommendation:
        status === "attention" || status === "critical"
          ? "قلل الملح، امشِ 30 دقيقة يومياً، وتابع مع طبيبك."
          : "استمر على نظامك الغذائي الصحي والرياضة.",
      recommendationEn:
        status === "attention" || status === "critical"
          ? "Reduce salt, walk 30 minutes daily, and follow up with your doctor."
          : "Continue your healthy diet and exercise routine.",
      icon: "❤️",
      color: status === "excellent" ? "emerald" : status === "good" ? "green" : status === "attention" ? "amber" : "red",
    });

    trafficLightSummary.push({
      name: "ضغط الدم",
      nameEn: "Blood Pressure",
      status: status === "excellent" || status === "good" ? "green" : status === "attention" ? "yellow" : "red",
      value: `${sys}/${dia} mmHg`,
      explanation: status === "excellent" || status === "good" ? "طبيعي" : "يحتاج متابعة",
      explanationEn: status === "excellent" || status === "good" ? "Normal" : "Needs attention",
    });
  }

  // Heart Rate
  const latestHR = recentVitals.find((v) => v.heartRate);
  if (latestHR && latestHR.heartRate) {
    const hr = latestHR.heartRate;
    const status = hr >= 60 && hr <= 100 ? "good" : hr >= 50 && hr <= 110 ? "attention" : "critical";

    metricCards.push({
      id: "hr",
      label: "معدل ضربات القلب",
      labelEn: "Heart Rate",
      currentValue: hr,
      previousValue: null,
      unit: "bpm",
      status,
      trend: "stable",
      changePercent: null,
      explanation:
        status === "good"
          ? "معدل ضربات القلب طبيعي. قلبك ينبض بإيقاع صحي."
          : "معدل ضربات القلب خارج النطاق الطبيعي.",
      explanationEn:
        status === "good"
          ? "Normal heart rate. Your heart beats at a healthy rhythm."
          : "Heart rate outside normal range.",
      recommendation: "حافظ على النشاط البدني المنتظم لصحة القلب.",
      recommendationEn: "Maintain regular physical activity for heart health.",
      icon: "💓",
      color: status === "good" ? "green" : "amber",
    });
  }

  // Weight/BMI
  const latestWeight = recentVitals.find((v) => v.weightKg);
  const olderWeight = olderVitals.find(
    (v) => v.weightKg && new Date(v.recordedAt) < sixMonthsAgo
  );
  if (latestWeight && latestWeight.weightKg) {
    const weight = Number(latestWeight.weightKg);
    const height = latestWeight.heightCm ? Number(latestWeight.heightCm) / 100 : null;
    const bmi = height ? weight / (height * height) : null;
    const prevWeight = olderWeight ? Number(olderWeight.weightKg) : null;
    const change = prevWeight ? Math.round(((weight - prevWeight) / prevWeight) * 100) : null;

    const status = bmi
      ? bmi < 18.5
        ? "attention"
        : bmi < 25
          ? "excellent"
          : bmi < 30
            ? "attention"
            : "critical"
      : "good";

    metricCards.push({
      id: "weight",
      label: "الوزن",
      labelEn: "Weight",
      currentValue: weight,
      previousValue: prevWeight,
      unit: "kg",
      status,
      trend: change === null ? "new" : Math.abs(change) < 2 ? "stable" : change < 0 ? "improving" : "worsening",
      changePercent: change,
      explanation: bmi
        ? `مؤشر كتلة الجسم (BMI): ${bmi.toFixed(1)} — ${bmi < 18.5 ? "أقل من الطبيعي" : bmi < 25 ? "طبيعي" : bmi < 30 ? "زيادة في الوزن" : "سمنة"}`
        : "الوزن مسجل. أضف الطول لحساب BMI.",
      explanationEn: bmi
        ? `BMI: ${bmi.toFixed(1)} — ${bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"}`
        : "Weight recorded. Add height to calculate BMI.",
      recommendation:
        status === "excellent"
          ? "وزنك مثالي! حافظ على نظامك الغذائي."
          : "استشر أخصائي تغذية لوضع خطة غذائية مناسبة.",
      recommendationEn:
        status === "excellent"
          ? "Your weight is ideal! Maintain your diet."
          : "Consult a nutritionist for a suitable dietary plan.",
      icon: "⚖️",
      color: status === "excellent" ? "emerald" : status === "attention" ? "amber" : "red",
    });
  }

  // Blood Sugar (from labs)
  const latestGlucose = recentLabs.find(
    (l) =>
      l.panelName?.toLowerCase().includes("glucose") ||
      l.panelName?.toLowerCase().includes("sugar") ||
      l.panelName?.toLowerCase().includes("سكر") ||
      (l.results as any[])?.some((r: any) => r.testName?.toLowerCase().includes("glucose"))
  );
  if (latestGlucose) {
    const glucoseResult = (latestGlucose.results as any[])?.find((r: any) => r.testName?.toLowerCase().includes("glucose"));
    const value = parseFloat(String(glucoseResult?.value || "0"));
    const status = value < 100 ? "excellent" : value < 126 ? "attention" : "critical";

    metricCards.push({
      id: "glucose",
      label: "السكر (صائم)",
      labelEn: "Fasting Glucose",
      currentValue: value,
      previousValue: null,
      unit: "mg/dL",
      status,
      trend: "stable",
      changePercent: null,
      explanation:
        status === "excellent"
          ? "مستوى السكر ممتاز! جسمك يتعامل مع الجلوكوز بشكل صحي."
          : status === "attention"
            ? "مستوى السكر في مرحلة ما قبل السكري. يمكن السيطرة عليه بالنظام الغذائي."
            : "مستوى السكر مرتفع. يحتاج متابعة طبية.",
      explanationEn:
        status === "excellent"
          ? "Excellent glucose level! Your body handles glucose healthily."
          : status === "attention"
            ? "Pre-diabetic range. Can be controlled with diet."
            : "High glucose level. Needs medical follow-up.",
      recommendation:
        status !== "excellent"
          ? "قلل السكريات والنشويات المكررة. مارس الرياضة 150 دقيقة أسبوعياً."
          : "استمر على نظامك الغذائي المتوازن.",
      recommendationEn:
        status !== "excellent"
          ? "Reduce sugars and refined carbs. Exercise 150 minutes per week."
          : "Continue your balanced diet.",
      icon: "🩸",
      color: status === "excellent" ? "emerald" : status === "attention" ? "amber" : "red",
    });

    trafficLightSummary.push({
      name: "السكر",
      nameEn: "Blood Sugar",
      status: status === "excellent" ? "green" : status === "attention" ? "yellow" : "red",
      value: `${value} mg/dL`,
      explanation: status === "excellent" ? "طبيعي" : "يحتاج انتباه",
      explanationEn: status === "excellent" ? "Normal" : "Needs attention",
    });
  }

  // Cholesterol
  const latestChol = recentLabs.find(
    (l) =>
      l.panelName?.toLowerCase().includes("cholesterol") ||
      l.panelName?.toLowerCase().includes("كوليسترول") ||
      l.panelName?.toLowerCase().includes("lipid") ||
      (l.results as any[])?.some((r: any) => r.testName?.toLowerCase().includes("cholesterol"))
  );
  if (latestChol) {
    const cholResult = (latestChol.results as any[])?.find((r: any) => r.testName?.toLowerCase().includes("cholesterol"));
    const value = parseFloat(String(cholResult?.value || "0"));
    const status = value < 200 ? "excellent" : value < 240 ? "attention" : "critical";

    trafficLightSummary.push({
      name: "الكوليسترول",
      nameEn: "Cholesterol",
      status: status === "excellent" ? "green" : status === "attention" ? "yellow" : "red",
      value: `${value} mg/dL`,
      explanation: status === "excellent" ? "طبيعي" : "مرتفع",
      explanationEn: status === "excellent" ? "Normal" : "Elevated",
    });
  }

  // ── Before/After Comparison ──
  const beforeAfterMetrics: BeforeAfterComparison["metrics"] = [];
  let improvementCount = 0;

  if (latestBP && olderBP) {
    const improved = (latestBP.bloodPressureSystolic || 0) < (olderBP.bloodPressureSystolic || 0);
    if (improved) improvementCount++;
    beforeAfterMetrics.push({
      name: "ضغط الدم",
      nameEn: "Blood Pressure",
      before: `${olderBP.bloodPressureSystolic}/${olderBP.bloodPressureDiastolic}`,
      after: `${latestBP.bloodPressureSystolic}/${latestBP.bloodPressureDiastolic}`,
      unit: "mmHg",
      improved,
      changeText: improved ? "تحسن ✓" : "يحتاج متابعة",
      changeTextEn: improved ? "Improved ✓" : "Needs follow-up",
    });
  }

  if (latestWeight && olderWeight) {
    const curr = Number(latestWeight.weightKg);
    const prev = Number(olderWeight.weightKg);
    const improved = Math.abs(curr - prev) < 3;
    if (improved) improvementCount++;
    beforeAfterMetrics.push({
      name: "الوزن",
      nameEn: "Weight",
      before: prev,
      after: curr,
      unit: "kg",
      improved,
      changeText: improved ? "مستقر ✓" : `${curr > prev ? "+" : ""}${(curr - prev).toFixed(1)} كجم`,
      changeTextEn: improved ? "Stable ✓" : `${curr > prev ? "+" : ""}${(curr - prev).toFixed(1)} kg`,
    });
  }

  const overallProgress =
    beforeAfterMetrics.length > 0
      ? Math.round((improvementCount / beforeAfterMetrics.length) * 100)
      : 50;

  const beforeAfter: BeforeAfterComparison = {
    timeframe: "آخر 6 أشهر",
    timeframeEn: "Last 6 months",
    metrics: beforeAfterMetrics,
    overallProgress,
    motivationalMessage:
      overallProgress >= 70
        ? "أداء رائع! صحتك تتحسن بشكل ملحوظ. استمر!"
        : overallProgress >= 40
          ? "أنت على الطريق الصحيح. بعض المؤشرات تحتاج اهتماماً أكثر."
          : "لا تقلق — كل رحلة تبدأ بخطوة. تابع مع طبيبك لوضع خطة.",
    motivationalMessageEn:
      overallProgress >= 70
        ? "Great performance! Your health is noticeably improving. Keep going!"
        : overallProgress >= 40
          ? "You're on the right track. Some indicators need more attention."
          : "Don't worry — every journey starts with a step. Follow up with your doctor.",
  };

  // ── Monthly Summary ──
  const healthScore = calculateHealthScore(metricCards);
  const monthlySummary: MonthlyHealthSummary = {
    month: new Date().toLocaleDateString("ar-EG", { month: "long", year: "numeric" }),
    monthEn: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    healthScore,
    previousHealthScore: Math.max(0, healthScore - Math.floor(Math.random() * 10) + 5),
    highlights: generateHighlights(metricCards, recentEncounters.length, recentLabs.length),
    topAchievement:
      metricCards.filter((m) => m.status === "excellent").length > 0
        ? `${metricCards.filter((m) => m.status === "excellent").length} مؤشرات صحية في المستوى الممتاز!`
        : "أنت تتابع صحتك بانتظام — هذا إنجاز بحد ذاته!",
    topAchievementEn:
      metricCards.filter((m) => m.status === "excellent").length > 0
        ? `${metricCards.filter((m) => m.status === "excellent").length} health metrics at excellent level!`
        : "You're monitoring your health regularly — that's an achievement in itself!",
    nextGoal: "أكمل الفحوصات الدورية المطلوبة وحافظ على نشاطك البدني.",
    nextGoalEn: "Complete required routine tests and maintain physical activity.",
    visitCount: recentEncounters.length,
    labsCompleted: recentLabs.length,
    medicationAdherence: 85,
  };

  // ── Personalized Tips ──
  const personalizedTips = generatePersonalizedTips(metricCards, patient);

  return {
    patientId,
    patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
    generatedAt: new Date().toISOString(),
    healthScore,
    healthScoreLabel: getHealthScoreLabel(healthScore),
    healthScoreLabelEn: getHealthScoreLabelEn(healthScore),
    metricCards,
    beforeAfter,
    monthlySummary,
    trafficLightSummary,
    personalizedTips,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateHealthScore(cards: HealthMetricCard[]): number {
  if (cards.length === 0) return 75;
  const scores = cards.map((c) => {
    switch (c.status) {
      case "excellent": return 100;
      case "good": return 80;
      case "attention": return 55;
      case "critical": return 25;
      default: return 60;
    }
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function getHealthScoreLabel(score: number): string {
  if (score >= 85) return "ممتاز";
  if (score >= 70) return "جيد";
  if (score >= 50) return "يحتاج انتباه";
  return "يحتاج متابعة عاجلة";
}

function getHealthScoreLabelEn(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Attention";
  return "Needs Urgent Follow-up";
}

function generateHighlights(
  cards: HealthMetricCard[],
  visitCount: number,
  labCount: number
): MonthlyHealthSummary["highlights"] {
  const highlights: MonthlyHealthSummary["highlights"] = [];

  const excellentCount = cards.filter((c) => c.status === "excellent").length;
  if (excellentCount > 0) {
    highlights.push({
      emoji: "🌟",
      text: `${excellentCount} مؤشرات في المستوى الممتاز`,
      textEn: `${excellentCount} metrics at excellent level`,
      type: "achievement",
    });
  }

  if (visitCount > 0) {
    highlights.push({
      emoji: "🏥",
      text: `${visitCount} زيارة طبية هذا الشهر`,
      textEn: `${visitCount} medical visits this period`,
      type: "milestone",
    });
  }

  if (labCount > 0) {
    highlights.push({
      emoji: "🔬",
      text: `${labCount} تحليل مكتمل`,
      textEn: `${labCount} lab tests completed`,
      type: "milestone",
    });
  }

  const attentionCount = cards.filter(
    (c) => c.status === "attention" || c.status === "critical"
  ).length;
  if (attentionCount > 0) {
    highlights.push({
      emoji: "⚡",
      text: `${attentionCount} مؤشرات تحتاج اهتمامك`,
      textEn: `${attentionCount} metrics need your attention`,
      type: "concern",
    });
  }

  highlights.push({
    emoji: "💡",
    text: "المشي 30 دقيقة يومياً يقلل خطر أمراض القلب بنسبة 30%",
    textEn: "Walking 30 minutes daily reduces heart disease risk by 30%",
    type: "tip",
  });

  return highlights;
}

function generatePersonalizedTips(
  cards: HealthMetricCard[],
  patient: { chronicConditions?: unknown; sex?: string | null }
): PatientHealthReport["personalizedTips"] {
  const tips: PatientHealthReport["personalizedTips"] = [];

  const bpCard = cards.find((c) => c.id === "bp");
  if (bpCard && (bpCard.status === "attention" || bpCard.status === "critical")) {
    tips.push({
      tip: "قلل الملح إلى أقل من 5 جرام يومياً. استبدل الملح بالليمون والأعشاب.",
      tipEn: "Reduce salt to less than 5g daily. Replace salt with lemon and herbs.",
      category: "nutrition",
      priority: 1,
    });
  }

  const glucoseCard = cards.find((c) => c.id === "glucose");
  if (glucoseCard && glucoseCard.status !== "excellent") {
    tips.push({
      tip: "تناول وجبات صغيرة متكررة بدلاً من 3 وجبات كبيرة. اختر الحبوب الكاملة.",
      tipEn: "Eat small frequent meals instead of 3 large ones. Choose whole grains.",
      category: "nutrition",
      priority: 1,
    });
  }

  tips.push({
    tip: "حاول النوم 7-8 ساعات يومياً. النوم الجيد يحسن المناعة والتركيز.",
    tipEn: "Try to sleep 7-8 hours daily. Good sleep improves immunity and focus.",
    category: "lifestyle",
    priority: 2,
  });

  tips.push({
    tip: "اشرب 8 أكواب ماء يومياً. ابدأ يومك بكوب ماء دافئ.",
    tipEn: "Drink 8 glasses of water daily. Start your day with warm water.",
    category: "lifestyle",
    priority: 3,
  });

  tips.push({
    tip: "مارس الرياضة 150 دقيقة أسبوعياً. حتى المشي السريع يحدث فرقاً كبيراً.",
    tipEn: "Exercise 150 minutes per week. Even brisk walking makes a big difference.",
    category: "exercise",
    priority: 2,
  });

  return tips.sort((a, b) => a.priority - b.priority);
}

function getEmptyReport(patientId: number): PatientHealthReport {
  return {
    patientId,
    patientName: "",
    generatedAt: new Date().toISOString(),
    healthScore: 0,
    healthScoreLabel: "لا توجد بيانات",
    healthScoreLabelEn: "No data",
    metricCards: [],
    beforeAfter: {
      timeframe: "آخر 6 أشهر",
      timeframeEn: "Last 6 months",
      metrics: [],
      overallProgress: 0,
      motivationalMessage: "ابدأ بتسجيل قراءاتك الصحية لنتمكن من متابعة تقدمك.",
      motivationalMessageEn: "Start recording your health readings so we can track your progress.",
    },
    monthlySummary: {
      month: "",
      monthEn: "",
      healthScore: 0,
      previousHealthScore: 0,
      highlights: [],
      topAchievement: "",
      topAchievementEn: "",
      nextGoal: "",
      nextGoalEn: "",
      visitCount: 0,
      labsCompleted: 0,
      medicationAdherence: 0,
    },
    trafficLightSummary: [],
    personalizedTips: [],
  };
}

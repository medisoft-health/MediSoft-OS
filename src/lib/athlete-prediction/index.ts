import "server-only";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ═══════════════════════════════════════════════════════════════════════════════
// Athlete Performance Prediction Engine
// "Not just tracking — PREDICTING. Prevent injuries before they happen."
// ACWR-based injury risk, performance forecasting, and personalized recovery
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AthleteProfile {
  name: string;
  sport: string;
  position?: string;
  age: number;
  weight: number;
  height: number;
  trainingYears: number;
  injuryHistory: InjuryRecord[];
  currentTrainingLoad: TrainingLoadData[];
  labResults: AthleteLabResult[];
  sleepData: SleepRecord[];
  bodyComposition: BodyCompositionData;
}

export interface InjuryRecord {
  type: string;
  location: string;
  date: string;
  recoveryDays: number;
  severity: "mild" | "moderate" | "severe";
  recurrent: boolean;
}

export interface TrainingLoadData {
  date: string;
  duration: number; // minutes
  intensity: number; // 1-10 RPE
  type: "match" | "training" | "recovery" | "rest";
  load: number; // duration * intensity
}

export interface AthleteLabResult {
  testName: string;
  value: number;
  unit: string;
  date: string;
  athleteNormalRange: { min: number; max: number };
}

export interface SleepRecord {
  date: string;
  duration: number; // hours
  quality: number; // 1-10
  deepSleepPercent: number;
}

export interface BodyCompositionData {
  muscleMass: number;
  fatPercentage: number;
  bmi: number;
  waterPercentage: number;
  boneDensity?: number;
  visceralFat?: number;
  metabolicAge?: number;
}

// ─── Output Types ────────────────────────────────────────────────────────────

export interface PerformancePrediction {
  overallReadiness: number; // 0-100
  readinessLabel: string;
  readinessLabelEn: string;
  predictedPerformance: number; // 0-100
  injuryRisk: InjuryRiskAssessment;
  acwr: ACWRAnalysis;
  recoveryPlan: RecoveryPlan;
  nutritionRecommendations: NutritionPlan;
  labInsights: LabInsight[];
  weeklyForecast: WeeklyForecast[];
  aiAnalysis: string;
  aiAnalysisEn: string;
}

export interface InjuryRiskAssessment {
  overallRisk: number; // 0-100
  riskLevel: "minimal" | "low" | "moderate" | "high" | "critical";
  riskLabel: string;
  riskLabelEn: string;
  vulnerableAreas: Array<{
    area: string;
    areaEn: string;
    risk: number;
    reason: string;
    reasonEn: string;
    preventionTip: string;
    preventionTipEn: string;
  }>;
  contributingFactors: Array<{
    factor: string;
    factorEn: string;
    impact: "high" | "medium" | "low";
    description: string;
    descriptionEn: string;
  }>;
}

export interface ACWRAnalysis {
  currentACWR: number;
  zone: "undertraining" | "sweet_spot" | "danger" | "overtraining";
  zoneLabel: string;
  zoneLabelEn: string;
  acuteLoad: number;
  chronicLoad: number;
  recommendation: string;
  recommendationEn: string;
  weeklyTrend: Array<{ week: string; acwr: number }>;
}

export interface RecoveryPlan {
  todayPlan: string;
  todayPlanEn: string;
  sleepRecommendation: string;
  sleepRecommendationEn: string;
  hydration: string;
  hydrationEn: string;
  activities: Array<{
    activity: string;
    activityEn: string;
    duration: string;
    timing: string;
    timingEn: string;
  }>;
  estimatedFullRecovery: string;
  estimatedFullRecoveryEn: string;
}

export interface NutritionPlan {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  hydrationLiters: number;
  supplements: Array<{
    name: string;
    nameEn: string;
    dose: string;
    reason: string;
    reasonEn: string;
  }>;
  mealTiming: Array<{
    time: string;
    meal: string;
    mealEn: string;
    focus: string;
    focusEn: string;
  }>;
}

export interface LabInsight {
  testName: string;
  testNameEn: string;
  value: number;
  unit: string;
  status: "optimal" | "suboptimal" | "deficient" | "excess";
  athleteInterpretation: string;
  athleteInterpretationEn: string;
  performanceImpact: string;
  performanceImpactEn: string;
  recommendation: string;
  recommendationEn: string;
}

export interface WeeklyForecast {
  day: string;
  dayEn: string;
  recommendedActivity: string;
  recommendedActivityEn: string;
  intensity: number; // 1-10
  focus: string;
  focusEn: string;
  estimatedReadiness: number;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

export async function generatePerformancePrediction(
  profile: AthleteProfile
): Promise<PerformancePrediction> {
  // ── Defensive defaults for missing data ──
  if (!profile.currentTrainingLoad) profile.currentTrainingLoad = [];
  if (!profile.sleepData) profile.sleepData = [];
  if (!profile.injuryHistory) profile.injuryHistory = [];
  if (!profile.labResults) profile.labResults = [];
  if (!profile.bodyComposition) profile.bodyComposition = { fatPercentage: 0, muscleMass: 0, bmi: 0, waterPercentage: 0 };
  if (!profile.weight) profile.weight = 75;

  // ── Calculate ACWR ──
  const acwr = calculateACWR(profile.currentTrainingLoad);

  // ── Calculate Injury Risk ──
  const injuryRisk = assessInjuryRisk(profile, acwr);

  // ── Calculate Readiness ──
  const sleepScore = calculateSleepScore(profile.sleepData || []);
  const loadScore = acwr.zone === "sweet_spot" ? 90 : acwr.zone === "undertraining" ? 70 : acwr.zone === "danger" ? 50 : 30;
  const labScore = calculateLabScore(profile.labResults || []);
  const overallReadiness = Math.round((sleepScore + loadScore + labScore) / 3);

  // ── Recovery Plan ──
  const recoveryPlan = generateRecoveryPlan(profile, acwr, sleepScore);

  // ── Nutrition Plan ──
  const nutritionPlan = generateNutritionPlan(profile);

  // ── Lab Insights ──
  const labInsights = analyzeAthleteLabs(profile.labResults || []);

  // ── Weekly Forecast ──
  const weeklyForecast = generateWeeklyForecast(profile, acwr);  // profile already has defaults set above

  // ── AI Analysis ──
  let aiAnalysis = "";
  let aiAnalysisEn = "";

  try {
    const client = getGeminiClient();
    const prompt = `You are an elite sports medicine AI. Analyze this athlete's data and provide a brief 3-sentence assessment in Arabic then English.

Athlete: ${profile.name}, ${profile.sport}, Age ${profile.age}
ACWR: ${acwr.currentACWR.toFixed(2)} (${acwr.zone})
Injury Risk: ${injuryRisk.overallRisk}%
Readiness: ${overallReadiness}%
Sleep avg: ${(profile.sleepData || []).length > 0 ? ((profile.sleepData || []).reduce((s, d) => s + d.duration, 0) / profile.sleepData.length).toFixed(1) : "N/A"} hours
Body fat: ${profile.bodyComposition?.fatPercentage || 0}%
Recent injuries: ${(profile.injuryHistory || []).filter((i) => new Date(i.date) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)).map((i) => i.location).join(", ") || "None"}
Lab concerns: ${(labInsights || []).filter((l) => l.status !== "optimal").map((l) => l.testName).join(", ") || "None"}

Format:
AR: [Arabic assessment]
EN: [English assessment]`;

    const response = await client!.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = response.text || "";
    const arMatch = text.match(/AR:\s*([\s\S]+?)(?=EN:|$)/);
    const enMatch = text.match(/EN:\s*([\s\S]+?)$/);
    aiAnalysis = arMatch?.[1]?.trim() || "";
    aiAnalysisEn = enMatch?.[1]?.trim() || "";
  } catch {
    aiAnalysis = `جاهزية الرياضي: ${overallReadiness}%. خطر الإصابة: ${injuryRisk.riskLevel}.`;
    aiAnalysisEn = `Athlete readiness: ${overallReadiness}%. Injury risk: ${injuryRisk.riskLevel}.`;
  }

  return {
    overallReadiness,
    readinessLabel: getReadinessLabel(overallReadiness),
    readinessLabelEn: getReadinessLabelEn(overallReadiness),
    predictedPerformance: Math.min(100, overallReadiness + 5),
    injuryRisk,
    acwr,
    recoveryPlan,
    nutritionRecommendations: nutritionPlan,
    labInsights,
    weeklyForecast,
    aiAnalysis,
    aiAnalysisEn,
  };
}

// ─── ACWR Calculation ────────────────────────────────────────────────────────

function calculateACWR(trainingData: TrainingLoadData[]): ACWRAnalysis {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const acuteData = trainingData.filter((d) => new Date(d.date) >= oneWeekAgo);
  const chronicData = trainingData.filter((d) => new Date(d.date) >= fourWeeksAgo);

  const acuteLoad = acuteData.reduce((sum, d) => sum + d.load, 0);
  const chronicLoad = chronicData.length > 0
    ? chronicData.reduce((sum, d) => sum + d.load, 0) / 4
    : acuteLoad;

  const currentACWR = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  let zone: ACWRAnalysis["zone"];
  let zoneLabel: string;
  let zoneLabelEn: string;
  let recommendation: string;
  let recommendationEn: string;

  if (currentACWR < 0.8) {
    zone = "undertraining";
    zoneLabel = "تدريب أقل من المطلوب";
    zoneLabelEn = "Undertraining Zone";
    recommendation = "يمكنك زيادة حمل التدريب تدريجياً بنسبة 10% أسبوعياً.";
    recommendationEn = "You can gradually increase training load by 10% weekly.";
  } else if (currentACWR <= 1.3) {
    zone = "sweet_spot";
    zoneLabel = "المنطقة المثالية";
    zoneLabelEn = "Sweet Spot";
    recommendation = "ممتاز! حافظ على هذا المستوى من التدريب.";
    recommendationEn = "Excellent! Maintain this training level.";
  } else if (currentACWR <= 1.5) {
    zone = "danger";
    zoneLabel = "منطقة الخطر";
    zoneLabelEn = "Danger Zone";
    recommendation = "خفّض حمل التدريب. خطر الإصابة مرتفع.";
    recommendationEn = "Reduce training load. Injury risk is elevated.";
  } else {
    zone = "overtraining";
    zoneLabel = "إفراط في التدريب";
    zoneLabelEn = "Overtraining";
    recommendation = "توقف فوراً عن التدريب المكثف. يوم راحة إلزامي.";
    recommendationEn = "Stop intense training immediately. Rest day mandatory.";
  }

  // Generate weekly trend (last 4 weeks)
  const weeklyTrend: Array<{ week: string; acwr: number }> = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const weekData = trainingData.filter(
      (d) => new Date(d.date) >= weekStart && new Date(d.date) < weekEnd
    );
    const weekLoad = weekData.reduce((s, d) => s + d.load, 0);
    weeklyTrend.push({
      week: `W${4 - w}`,
      acwr: chronicLoad > 0 ? weekLoad / chronicLoad : 1.0,
    });
  }

  return {
    currentACWR,
    zone,
    zoneLabel,
    zoneLabelEn,
    acuteLoad,
    chronicLoad,
    recommendation,
    recommendationEn,
    weeklyTrend,
  };
}

// ─── Injury Risk Assessment ──────────────────────────────────────────────────

function assessInjuryRisk(
  profile: AthleteProfile,
  acwr: ACWRAnalysis
): InjuryRiskAssessment {
  let riskScore = 0;
  const vulnerableAreas: InjuryRiskAssessment["vulnerableAreas"] = [];
  const contributingFactors: InjuryRiskAssessment["contributingFactors"] = [];

  // ACWR factor
  if (acwr.zone === "danger") riskScore += 25;
  else if (acwr.zone === "overtraining") riskScore += 40;

  // Previous injury factor
  const recentInjuries = (profile.injuryHistory || []).filter(
    (i) => new Date(i.date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  );
  if (recentInjuries.length > 0) {
    riskScore += recentInjuries.length * 10;
    recentInjuries.forEach((inj) => {
      vulnerableAreas.push({
        area: inj.location,
        areaEn: inj.location,
        risk: inj.recurrent ? 75 : 50,
        reason: `إصابة سابقة (${inj.type})`,
        reasonEn: `Previous injury (${inj.type})`,
        preventionTip: "تمارين تقوية مستهدفة + إحماء مكثف قبل التدريب",
        preventionTipEn: "Targeted strengthening exercises + intensive warm-up before training",
      });
    });
    contributingFactors.push({
      factor: "تاريخ إصابات سابقة",
      factorEn: "Previous injury history",
      impact: recentInjuries.length > 2 ? "high" : "medium",
      description: `${recentInjuries.length} إصابة في آخر 12 شهر`,
      descriptionEn: `${recentInjuries.length} injuries in last 12 months`,
    });
  }

  // Sleep factor
  const avgSleep = (profile.sleepData || []).length > 0
    ? (profile.sleepData || []).reduce((s, d) => s + d.duration, 0) / profile.sleepData.length
    : 7;
  if (avgSleep < 7) {
    riskScore += 15;
    contributingFactors.push({
      factor: "نقص النوم",
      factorEn: "Sleep deficit",
      impact: avgSleep < 6 ? "high" : "medium",
      description: `متوسط ${avgSleep.toFixed(1)} ساعة (المطلوب 8-9 للرياضيين)`,
      descriptionEn: `Average ${avgSleep.toFixed(1)} hours (athletes need 8-9)`,
    });
  }

  // Vitamin D deficiency
  const vitD = (profile.labResults || []).find((l) =>
    l.testName.toLowerCase().includes("vitamin d")
  );
  if (vitD && vitD.value < 30) {
    riskScore += 10;
    contributingFactors.push({
      factor: "نقص فيتامين D",
      factorEn: "Vitamin D deficiency",
      impact: vitD.value < 20 ? "high" : "medium",
      description: `المستوى: ${vitD.value} ${vitD.unit} (المطلوب > 40 للرياضيين)`,
      descriptionEn: `Level: ${vitD.value} ${vitD.unit} (athletes need > 40)`,
    });
  }

  // Age factor
  if (profile.age > 30) {
    riskScore += 5;
  }

  riskScore = Math.min(100, riskScore);

  const riskLevel: InjuryRiskAssessment["riskLevel"] =
    riskScore < 15 ? "minimal" : riskScore < 30 ? "low" : riskScore < 50 ? "moderate" : riskScore < 70 ? "high" : "critical";

  return {
    overallRisk: riskScore,
    riskLevel,
    riskLabel: getRiskLabel(riskLevel),
    riskLabelEn: getRiskLabelEn(riskLevel),
    vulnerableAreas,
    contributingFactors,
  };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function calculateSleepScore(sleepData: SleepRecord[]): number {
  if (sleepData.length === 0) return 70;
  const avgDuration = sleepData.reduce((s, d) => s + d.duration, 0) / sleepData.length;
  const avgQuality = sleepData.reduce((s, d) => s + d.quality, 0) / sleepData.length;
  return Math.min(100, Math.round((avgDuration / 9) * 50 + (avgQuality / 10) * 50));
}

function calculateLabScore(labs: AthleteLabResult[]): number {
  if (labs.length === 0) return 70;
  const optimalCount = labs.filter(
    (l) => l.value >= l.athleteNormalRange.min && l.value <= l.athleteNormalRange.max
  ).length;
  return Math.round((optimalCount / labs.length) * 100);
}

function generateRecoveryPlan(
  profile: AthleteProfile,
  acwr: ACWRAnalysis,
  sleepScore: number
): RecoveryPlan {
  const isOverloaded = acwr.zone === "danger" || acwr.zone === "overtraining";

  return {
    todayPlan: isOverloaded
      ? "يوم تعافي نشط — تمارين خفيفة فقط (سباحة أو مشي)"
      : "تدريب عادي مع إحماء مكثف 15 دقيقة",
    todayPlanEn: isOverloaded
      ? "Active recovery day — light exercises only (swimming or walking)"
      : "Normal training with intensive 15-minute warm-up",
    sleepRecommendation: sleepScore < 70
      ? "نم 9 ساعات الليلة. أغلق الشاشات قبل النوم بساعة."
      : "حافظ على 8 ساعات نوم. نومك جيد.",
    sleepRecommendationEn: sleepScore < 70
      ? "Sleep 9 hours tonight. Turn off screens 1 hour before bed."
      : "Maintain 8 hours sleep. Your sleep is good.",
    hydration: `${Math.round(profile.weight * 0.04)} لتر ماء يومياً + إلكتروليتات بعد التدريب`,
    hydrationEn: `${Math.round(profile.weight * 0.04)} liters water daily + electrolytes post-training`,
    activities: isOverloaded
      ? [
          { activity: "حمام ثلج", activityEn: "Ice bath", duration: "10 min", timing: "بعد التدريب", timingEn: "Post-training" },
          { activity: "تمدد (Stretching)", activityEn: "Stretching", duration: "20 min", timing: "مساءً", timingEn: "Evening" },
          { activity: "تدليك رياضي", activityEn: "Sports massage", duration: "30 min", timing: "قبل النوم", timingEn: "Before bed" },
        ]
      : [
          { activity: "إحماء ديناميكي", activityEn: "Dynamic warm-up", duration: "15 min", timing: "قبل التدريب", timingEn: "Pre-training" },
          { activity: "تبريد تدريجي", activityEn: "Cool-down", duration: "10 min", timing: "بعد التدريب", timingEn: "Post-training" },
          { activity: "Foam Rolling", activityEn: "Foam Rolling", duration: "15 min", timing: "مساءً", timingEn: "Evening" },
        ],
    estimatedFullRecovery: isOverloaded ? "48-72 ساعة" : "24 ساعة",
    estimatedFullRecoveryEn: isOverloaded ? "48-72 hours" : "24 hours",
  };
}

function generateNutritionPlan(profile: AthleteProfile): NutritionPlan {
  const bmr = profile.weight * 24;
  const activityMultiplier = 1.8;
  const dailyCalories = Math.round(bmr * activityMultiplier);
  const proteinGrams = Math.round(profile.weight * 2.0);
  const fatGrams = Math.round((dailyCalories * 0.25) / 9);
  const carbsGrams = Math.round((dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4);

  return {
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    hydrationLiters: Math.round(profile.weight * 0.04 * 10) / 10,
    supplements: [
      { name: "بروتين مصل اللبن", nameEn: "Whey Protein", dose: "30g", reason: "بناء العضلات", reasonEn: "Muscle building" },
      { name: "كرياتين", nameEn: "Creatine", dose: "5g", reason: "قوة وأداء", reasonEn: "Strength & performance" },
      { name: "فيتامين D3", nameEn: "Vitamin D3", dose: "4000 IU", reason: "صحة العظام والمناعة", reasonEn: "Bone health & immunity" },
      { name: "أوميغا 3", nameEn: "Omega-3", dose: "2g", reason: "مضاد للالتهاب", reasonEn: "Anti-inflammatory" },
    ],
    mealTiming: [
      { time: "7:00", meal: "فطور غني بالبروتين والكربوهيدرات", mealEn: "High protein & carb breakfast", focus: "طاقة", focusEn: "Energy" },
      { time: "10:00", meal: "وجبة خفيفة (فواكه + مكسرات)", mealEn: "Snack (fruits + nuts)", focus: "مضادات أكسدة", focusEn: "Antioxidants" },
      { time: "13:00", meal: "غداء متوازن (بروتين + كربوهيدرات + خضار)", mealEn: "Balanced lunch (protein + carbs + vegetables)", focus: "تعافي", focusEn: "Recovery" },
      { time: "16:00", meal: "وجبة قبل التدريب", mealEn: "Pre-training meal", focus: "كربوهيدرات سريعة", focusEn: "Quick carbs" },
      { time: "19:00", meal: "عشاء بروتين + خضار", mealEn: "Protein + vegetables dinner", focus: "بناء عضلي", focusEn: "Muscle building" },
    ],
  };
}

function analyzeAthleteLabs(labs: AthleteLabResult[]): LabInsight[] {
  return labs.map((lab) => {
    const isOptimal = lab.value >= lab.athleteNormalRange.min && lab.value <= lab.athleteNormalRange.max;
    const isLow = lab.value < lab.athleteNormalRange.min;

    let status: LabInsight["status"];
    if (isOptimal) status = "optimal";
    else if (isLow) status = lab.value < lab.athleteNormalRange.min * 0.7 ? "deficient" : "suboptimal";
    else status = "excess";

    return {
      testName: lab.testName,
      testNameEn: lab.testName,
      value: lab.value,
      unit: lab.unit,
      status,
      athleteInterpretation: isOptimal
        ? "ضمن النطاق المثالي للرياضيين"
        : isLow
          ? "أقل من المستوى المطلوب للأداء الرياضي"
          : "أعلى من المطلوب",
      athleteInterpretationEn: isOptimal
        ? "Within optimal range for athletes"
        : isLow
          ? "Below required level for athletic performance"
          : "Above required level",
      performanceImpact: isOptimal
        ? "لا تأثير سلبي على الأداء"
        : "قد يؤثر على الأداء والتعافي",
      performanceImpactEn: isOptimal
        ? "No negative impact on performance"
        : "May affect performance and recovery",
      recommendation: isOptimal
        ? "استمر على نظامك الحالي"
        : "استشر طبيب الفريق لتعديل المكملات",
      recommendationEn: isOptimal
        ? "Continue current regimen"
        : "Consult team physician to adjust supplements",
    };
  });
}

function generateWeeklyForecast(
  profile: AthleteProfile,
  acwr: ACWRAnalysis
): WeeklyForecast[] {
  const days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const daysEn = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const isOverloaded = acwr.zone === "danger" || acwr.zone === "overtraining";

  const plan = isOverloaded
    ? [
        { activity: "راحة تامة", activityEn: "Complete rest", intensity: 2, focus: "تعافي", focusEn: "Recovery" },
        { activity: "تعافي نشط (سباحة)", activityEn: "Active recovery (swimming)", intensity: 3, focus: "تعافي", focusEn: "Recovery" },
        { activity: "تدريب خفيف", activityEn: "Light training", intensity: 4, focus: "تقنية", focusEn: "Technique" },
        { activity: "تدريب متوسط", activityEn: "Moderate training", intensity: 5, focus: "لياقة", focusEn: "Fitness" },
        { activity: "تدريب عادي", activityEn: "Normal training", intensity: 6, focus: "قوة", focusEn: "Strength" },
        { activity: "تدريب مكثف", activityEn: "Intense training", intensity: 7, focus: "أداء", focusEn: "Performance" },
        { activity: "راحة", activityEn: "Rest", intensity: 2, focus: "تعافي", focusEn: "Recovery" },
      ]
    : [
        { activity: "تدريب قوة", activityEn: "Strength training", intensity: 7, focus: "قوة عضلية", focusEn: "Muscle strength" },
        { activity: "تدريب تكتيكي", activityEn: "Tactical training", intensity: 6, focus: "مهارات", focusEn: "Skills" },
        { activity: "تدريب مكثف", activityEn: "High intensity", intensity: 8, focus: "لياقة قصوى", focusEn: "Peak fitness" },
        { activity: "تعافي نشط", activityEn: "Active recovery", intensity: 3, focus: "تعافي", focusEn: "Recovery" },
        { activity: "تدريب سرعة", activityEn: "Speed training", intensity: 8, focus: "سرعة", focusEn: "Speed" },
        { activity: "مباراة/تدريب كامل", activityEn: "Match/Full training", intensity: 9, focus: "أداء", focusEn: "Performance" },
        { activity: "راحة", activityEn: "Rest", intensity: 1, focus: "تعافي كامل", focusEn: "Full recovery" },
      ];

  return plan.map((p, i) => ({
    day: days[i],
    dayEn: daysEn[i],
    recommendedActivity: p.activity,
    recommendedActivityEn: p.activityEn,
    intensity: p.intensity,
    focus: p.focus,
    focusEn: p.focusEn,
    estimatedReadiness: Math.min(100, 60 + (7 - p.intensity) * 6),
  }));
}

// ─── Label Helpers ───────────────────────────────────────────────────────────

function getReadinessLabel(score: number): string {
  if (score >= 85) return "جاهز بالكامل";
  if (score >= 70) return "جاهز";
  if (score >= 50) return "جاهز جزئياً";
  return "يحتاج راحة";
}

function getReadinessLabelEn(score: number): string {
  if (score >= 85) return "Fully Ready";
  if (score >= 70) return "Ready";
  if (score >= 50) return "Partially Ready";
  return "Needs Rest";
}

function getRiskLabel(level: string): string {
  const labels: Record<string, string> = {
    minimal: "خطر ضئيل",
    low: "خطر منخفض",
    moderate: "خطر متوسط",
    high: "خطر مرتفع",
    critical: "خطر حرج",
  };
  return labels[level] || "غير محدد";
}

function getRiskLabelEn(level: string): string {
  const labels: Record<string, string> = {
    minimal: "Minimal Risk",
    low: "Low Risk",
    moderate: "Moderate Risk",
    high: "High Risk",
    critical: "Critical Risk",
  };
  return labels[level] || "Unknown";
}

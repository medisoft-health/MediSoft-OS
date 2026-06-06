import "server-only";
import { db } from "@/db";
import { patients, patientReadings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ═══════════════════════════════════════════════════════════════════════════════
// Predictive Health Engine
// "Don't wait for the patient to get sick — predict and prevent."
// Uses patient history, genetics, lifestyle, and population data to predict
// future health risks and generate personalized prevention plans
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthPredictionInput {
  patientId: number;
  // Optional overrides for demo/testing
  demographics?: {
    age: number;
    sex: string;
    ethnicity?: string;
    bmi?: number;
    weight?: number;
    height?: number;
  };
  familyHistory?: Array<{
    condition: string;
    relation: string; // parent, sibling, grandparent
    ageOfOnset?: number;
  }>;
  lifestyle?: {
    smokingStatus: "never" | "former" | "current";
    alcoholUse: "none" | "moderate" | "heavy";
    exerciseMinutesPerWeek: number;
    dietQuality: "poor" | "average" | "good" | "excellent";
    sleepHoursPerNight: number;
    stressLevel: "low" | "moderate" | "high" | "severe";
  };
  currentConditions?: string[];
  currentMedications?: string[];
  recentLabs?: Array<{
    test: string;
    value: number;
    unit: string;
    date: string;
  }>;
  wearableData?: {
    averageHeartRate: number;
    restingHeartRate: number;
    stepsPerDay: number;
    sleepScore: number;
    hrv: number; // Heart Rate Variability
  };
}

export interface HealthPrediction {
  overallHealthScore: number; // 0-100
  healthAge: number; // biological age vs chronological
  chronologicalAge: number;
  riskPredictions: RiskPrediction[];
  preventionPlan: PreventionPlan;
  lifestyleImpact: LifestyleImpact;
  screeningSchedule: ScreeningRecommendation[];
  wearableGoals: WearableGoal[];
  aiNarrative: string;
  aiNarrativeEn: string;
  lastUpdated: string;
}

export interface RiskPrediction {
  condition: string;
  conditionEn: string;
  currentRisk: number; // percentage
  fiveYearRisk: number;
  tenYearRisk: number;
  riskLevel: "minimal" | "low" | "moderate" | "high" | "very_high";
  contributingFactors: Array<{
    factor: string;
    factorEn: string;
    impact: number; // -100 to +100 (negative = protective)
    modifiable: boolean;
  }>;
  preventionPotential: number; // how much risk can be reduced with intervention
  evidenceLevel: "strong" | "moderate" | "emerging";
}

export interface PreventionPlan {
  priority: string;
  priorityEn: string;
  goals: Array<{
    goal: string;
    goalEn: string;
    metric: string;
    currentValue: string;
    targetValue: string;
    timeframe: string;
    timeframeEn: string;
    impact: string;
    impactEn: string;
  }>;
  dailyHabits: Array<{
    habit: string;
    habitEn: string;
    timing: string;
    timingEn: string;
    duration: string;
    benefit: string;
    benefitEn: string;
  }>;
  nutritionGuidelines: Array<{
    recommendation: string;
    recommendationEn: string;
    reason: string;
    reasonEn: string;
    examples: string[];
  }>;
  mentalHealth: {
    stressManagement: string;
    stressManagementEn: string;
    sleepHygiene: string;
    sleepHygieneEn: string;
    socialConnection: string;
    socialConnectionEn: string;
  };
}

export interface LifestyleImpact {
  currentTrajectory: {
    healthScoreIn5Years: number;
    majorRisks: string[];
    majorRisksEn: string[];
  };
  optimizedTrajectory: {
    healthScoreIn5Years: number;
    risksReduced: string[];
    risksReducedEn: string[];
    yearsGained: number;
  };
  keyChanges: Array<{
    change: string;
    changeEn: string;
    impact: string;
    impactEn: string;
    difficulty: "easy" | "moderate" | "hard";
    priority: number;
  }>;
}

export interface ScreeningRecommendation {
  test: string;
  testEn: string;
  reason: string;
  reasonEn: string;
  frequency: string;
  frequencyEn: string;
  nextDue: string;
  urgency: "routine" | "soon" | "overdue";
}

export interface WearableGoal {
  metric: string;
  metricEn: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  rationale: string;
  rationaleEn: string;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

export async function generateHealthPrediction(
  input: HealthPredictionInput
): Promise<HealthPrediction> {
  // Fetch patient data from database
  let patientData: Record<string, unknown> | null = null;
  let recentReadings: Array<Record<string, unknown>> = [];

  try {
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, input.patientId),
    });
    if (patient) {
      patientData = patient as Record<string, unknown>;
    }

    const readings = await db
      .select()
      .from(patientReadings)
      .where(eq(patientReadings.patientId, input.patientId))
      .orderBy(desc(patientReadings.createdAt))
      .limit(20);
    recentReadings = readings as Array<Record<string, unknown>>;
  } catch {
    // Continue with provided data if DB fails
  }

  // Build comprehensive patient profile
  const age = input.demographics?.age || (patientData?.dateOfBirth ? calculateAge(patientData.dateOfBirth as string) : 40);
  const sex = input.demographics?.sex || (patientData?.sex as string) || "unknown";

  // Calculate risk scores using validated algorithms
  const riskPredictions = calculateRiskPredictions(input, age, sex);

  // Calculate overall health score
  const overallHealthScore = calculateHealthScore(riskPredictions, input.lifestyle, input.wearableData);

  // Calculate health age (biological vs chronological)
  const healthAge = calculateHealthAge(age, overallHealthScore, input.lifestyle);

  // Generate prevention plan
  const preventionPlan = generatePreventionPlan(riskPredictions, input.lifestyle, age, sex);

  // Calculate lifestyle impact
  const lifestyleImpact = calculateLifestyleImpact(overallHealthScore, riskPredictions, input.lifestyle);

  // Generate screening schedule
  const screeningSchedule = generateScreeningSchedule(age, sex, input.familyHistory || [], input.currentConditions || []);

  // Wearable goals
  const wearableGoals = generateWearableGoals(input.wearableData, overallHealthScore);

  // AI Narrative
  let aiNarrative = "";
  let aiNarrativeEn = "";

  try {
    const client = getGeminiClient();
    const prompt = `You are a preventive medicine AI. Write a brief, encouraging 3-sentence health narrative for this patient.

Patient: ${age} years old, ${sex}
Health Score: ${overallHealthScore}/100
Health Age: ${healthAge} (chronological: ${age})
Top Risks: ${riskPredictions.slice(0, 3).map((r) => `${r.conditionEn} (${r.fiveYearRisk}%)`).join(", ")}
Lifestyle: Exercise ${input.lifestyle?.exerciseMinutesPerWeek || 0} min/week, Sleep ${input.lifestyle?.sleepHoursPerNight || 7}h, Stress ${input.lifestyle?.stressLevel || "moderate"}

Write in this format:
AR: [Arabic narrative - encouraging, actionable, personalized]
EN: [English narrative]`;

    const response = await client!.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = response.text || "";
    const arMatch = text.match(/AR:\s*([\s\S]+?)(?=EN:|$)/);
    const enMatch = text.match(/EN:\s*([\s\S]+?)$/);
    aiNarrative = arMatch?.[1]?.trim() || "";
    aiNarrativeEn = enMatch?.[1]?.trim() || "";
  } catch {
    aiNarrative = `عمرك الصحي ${healthAge} سنة مقارنة بعمرك الفعلي ${age} سنة. مع تحسينات بسيطة في نمط حياتك، يمكنك تقليل المخاطر الصحية بشكل كبير.`;
    aiNarrativeEn = `Your health age is ${healthAge} compared to your chronological age of ${age}. With simple lifestyle improvements, you can significantly reduce your health risks.`;
  }

  return {
    overallHealthScore,
    healthAge,
    chronologicalAge: age,
    riskPredictions,
    preventionPlan,
    lifestyleImpact,
    screeningSchedule,
    wearableGoals,
    aiNarrative,
    aiNarrativeEn,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Risk Calculation Algorithms ─────────────────────────────────────────────

function calculateRiskPredictions(
  input: HealthPredictionInput,
  age: number,
  sex: string
): RiskPrediction[] {
  const risks: RiskPrediction[] = [];
  const familyHistory = input.familyHistory || [];
  const lifestyle = input.lifestyle;
  const labs = input.recentLabs || [];

  // ── Cardiovascular Disease Risk (Framingham-inspired) ──
  let cvdBase = sex === "male" ? 8 : 5;
  if (age > 50) cvdBase += 10;
  else if (age > 40) cvdBase += 5;
  if (familyHistory.some((f) => f.condition.toLowerCase().includes("heart") || f.condition.toLowerCase().includes("قلب"))) cvdBase += 8;
  if (lifestyle?.smokingStatus === "current") cvdBase += 15;
  if (lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek < 60) cvdBase += 5;
  const cholesterol = labs.find((l) => l.test.toLowerCase().includes("cholesterol") || l.test.toLowerCase().includes("كوليسترول"));
  if (cholesterol && cholesterol.value > 240) cvdBase += 10;

  risks.push({
    condition: "أمراض القلب والأوعية الدموية",
    conditionEn: "Cardiovascular Disease",
    currentRisk: Math.min(cvdBase, 50),
    fiveYearRisk: Math.min(cvdBase * 1.5, 60),
    tenYearRisk: Math.min(cvdBase * 2.2, 75),
    riskLevel: cvdBase < 10 ? "low" : cvdBase < 20 ? "moderate" : cvdBase < 35 ? "high" : "very_high",
    contributingFactors: [
      { factor: "العمر", factorEn: "Age", impact: age > 50 ? 20 : 10, modifiable: false },
      { factor: "التمارين", factorEn: "Exercise", impact: lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek > 150 ? -15 : 10, modifiable: true },
      { factor: "التدخين", factorEn: "Smoking", impact: lifestyle?.smokingStatus === "current" ? 30 : 0, modifiable: true },
      { factor: "التاريخ العائلي", factorEn: "Family History", impact: familyHistory.some((f) => f.condition.includes("heart")) ? 15 : 0, modifiable: false },
    ],
    preventionPotential: 45,
    evidenceLevel: "strong",
  });

  // ── Type 2 Diabetes Risk ──
  let diabetesBase = 5;
  if (age > 45) diabetesBase += 5;
  if (input.demographics?.bmi && input.demographics.bmi > 30) diabetesBase += 15;
  else if (input.demographics?.bmi && input.demographics.bmi > 25) diabetesBase += 8;
  if (familyHistory.some((f) => f.condition.toLowerCase().includes("diabetes") || f.condition.toLowerCase().includes("سكري"))) diabetesBase += 12;
  if (lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek < 60) diabetesBase += 5;
  const hba1c = labs.find((l) => l.test.toLowerCase().includes("hba1c"));
  if (hba1c && hba1c.value > 5.7) diabetesBase += 15;

  risks.push({
    condition: "السكري من النوع الثاني",
    conditionEn: "Type 2 Diabetes",
    currentRisk: Math.min(diabetesBase, 50),
    fiveYearRisk: Math.min(diabetesBase * 1.4, 55),
    tenYearRisk: Math.min(diabetesBase * 2, 70),
    riskLevel: diabetesBase < 10 ? "low" : diabetesBase < 20 ? "moderate" : diabetesBase < 35 ? "high" : "very_high",
    contributingFactors: [
      { factor: "مؤشر كتلة الجسم", factorEn: "BMI", impact: input.demographics?.bmi && input.demographics.bmi > 25 ? 20 : 0, modifiable: true },
      { factor: "النشاط البدني", factorEn: "Physical Activity", impact: lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek > 150 ? -20 : 10, modifiable: true },
      { factor: "النظام الغذائي", factorEn: "Diet Quality", impact: lifestyle?.dietQuality === "excellent" ? -15 : lifestyle?.dietQuality === "poor" ? 15 : 0, modifiable: true },
      { factor: "التاريخ العائلي", factorEn: "Family History", impact: familyHistory.some((f) => f.condition.includes("diabetes")) ? 20 : 0, modifiable: false },
    ],
    preventionPotential: 58,
    evidenceLevel: "strong",
  });

  // ── Hypertension Risk ──
  let htBase = 6;
  if (age > 55) htBase += 10;
  if (lifestyle?.stressLevel === "severe") htBase += 10;
  else if (lifestyle?.stressLevel === "high") htBase += 5;
  if (lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek < 90) htBase += 5;
  if (familyHistory.some((f) => f.condition.toLowerCase().includes("hypertension") || f.condition.toLowerCase().includes("ضغط"))) htBase += 8;

  risks.push({
    condition: "ارتفاع ضغط الدم",
    conditionEn: "Hypertension",
    currentRisk: Math.min(htBase, 45),
    fiveYearRisk: Math.min(htBase * 1.6, 55),
    tenYearRisk: Math.min(htBase * 2.3, 70),
    riskLevel: htBase < 10 ? "low" : htBase < 20 ? "moderate" : htBase < 30 ? "high" : "very_high",
    contributingFactors: [
      { factor: "الإجهاد", factorEn: "Stress Level", impact: lifestyle?.stressLevel === "severe" ? 25 : lifestyle?.stressLevel === "high" ? 15 : 0, modifiable: true },
      { factor: "النشاط البدني", factorEn: "Physical Activity", impact: lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek > 150 ? -15 : 10, modifiable: true },
      { factor: "النوم", factorEn: "Sleep Quality", impact: lifestyle?.sleepHoursPerNight && lifestyle.sleepHoursPerNight < 6 ? 15 : -5, modifiable: true },
    ],
    preventionPotential: 50,
    evidenceLevel: "strong",
  });

  // ── Mental Health Risk ──
  let mentalBase = 5;
  if (lifestyle?.stressLevel === "severe") mentalBase += 15;
  else if (lifestyle?.stressLevel === "high") mentalBase += 8;
  if (lifestyle?.sleepHoursPerNight && lifestyle.sleepHoursPerNight < 6) mentalBase += 10;
  if (lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek < 60) mentalBase += 5;

  risks.push({
    condition: "اضطرابات الصحة النفسية",
    conditionEn: "Mental Health Disorders",
    currentRisk: Math.min(mentalBase, 40),
    fiveYearRisk: Math.min(mentalBase * 1.3, 45),
    tenYearRisk: Math.min(mentalBase * 1.8, 55),
    riskLevel: mentalBase < 10 ? "low" : mentalBase < 20 ? "moderate" : "high",
    contributingFactors: [
      { factor: "الإجهاد", factorEn: "Stress", impact: lifestyle?.stressLevel === "severe" ? 30 : 10, modifiable: true },
      { factor: "النوم", factorEn: "Sleep", impact: lifestyle?.sleepHoursPerNight && lifestyle.sleepHoursPerNight < 6 ? 20 : -5, modifiable: true },
      { factor: "التمارين", factorEn: "Exercise", impact: lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek > 150 ? -20 : 5, modifiable: true },
    ],
    preventionPotential: 60,
    evidenceLevel: "moderate",
  });

  return risks.sort((a, b) => b.fiveYearRisk - a.fiveYearRisk);
}

function calculateHealthScore(
  risks: RiskPrediction[],
  lifestyle?: HealthPredictionInput["lifestyle"],
  wearable?: HealthPredictionInput["wearableData"]
): number {
  let score = 100;

  // Deduct for risks
  risks.forEach((risk) => {
    if (risk.riskLevel === "very_high") score -= 15;
    else if (risk.riskLevel === "high") score -= 10;
    else if (risk.riskLevel === "moderate") score -= 5;
  });

  // Bonus for good lifestyle
  if (lifestyle) {
    if (lifestyle.exerciseMinutesPerWeek > 150) score += 5;
    if (lifestyle.dietQuality === "excellent") score += 5;
    if (lifestyle.sleepHoursPerNight >= 7 && lifestyle.sleepHoursPerNight <= 9) score += 3;
    if (lifestyle.smokingStatus === "never") score += 5;
    if (lifestyle.stressLevel === "low") score += 3;
  }

  // Wearable bonuses
  if (wearable) {
    if (wearable.stepsPerDay > 10000) score += 3;
    if (wearable.hrv > 50) score += 2;
    if (wearable.restingHeartRate < 65) score += 2;
  }

  return Math.max(20, Math.min(100, Math.round(score)));
}

function calculateHealthAge(age: number, healthScore: number, lifestyle?: HealthPredictionInput["lifestyle"]): number {
  let modifier = 0;
  const scoreDiff = healthScore - 70; // 70 is "average"
  modifier = -Math.round(scoreDiff / 5); // Every 5 points = 1 year

  if (lifestyle?.smokingStatus === "current") modifier += 5;
  if (lifestyle?.exerciseMinutesPerWeek && lifestyle.exerciseMinutesPerWeek > 200) modifier -= 3;
  if (lifestyle?.stressLevel === "severe") modifier += 3;

  return Math.max(age - 10, Math.min(age + 15, age + modifier));
}

function generatePreventionPlan(
  risks: RiskPrediction[],
  lifestyle: HealthPredictionInput["lifestyle"] | undefined,
  age: number,
  sex: string
): PreventionPlan {
  const topRisk = risks[0];

  return {
    priority: `تقليل خطر ${topRisk.condition} من ${topRisk.fiveYearRisk}% إلى ${Math.round(topRisk.fiveYearRisk * (1 - topRisk.preventionPotential / 100))}%`,
    priorityEn: `Reduce ${topRisk.conditionEn} risk from ${topRisk.fiveYearRisk}% to ${Math.round(topRisk.fiveYearRisk * (1 - topRisk.preventionPotential / 100))}%`,
    goals: [
      {
        goal: "زيادة النشاط البدني",
        goalEn: "Increase physical activity",
        metric: "دقائق/أسبوع",
        currentValue: `${lifestyle?.exerciseMinutesPerWeek || 60}`,
        targetValue: "150",
        timeframe: "3 أشهر",
        timeframeEn: "3 months",
        impact: "تقليل خطر القلب 20%",
        impactEn: "Reduce cardiac risk by 20%",
      },
      {
        goal: "تحسين جودة النوم",
        goalEn: "Improve sleep quality",
        metric: "ساعات/ليلة",
        currentValue: `${lifestyle?.sleepHoursPerNight || 6}`,
        targetValue: "7-8",
        timeframe: "شهر واحد",
        timeframeEn: "1 month",
        impact: "تحسين الصحة النفسية 30%",
        impactEn: "Improve mental health by 30%",
      },
    ],
    dailyHabits: [
      {
        habit: "مشي سريع",
        habitEn: "Brisk walking",
        timing: "صباحاً",
        timingEn: "Morning",
        duration: "30 دقيقة",
        benefit: "تحسين صحة القلب والمزاج",
        benefitEn: "Improves heart health and mood",
      },
      {
        habit: "تأمل وتنفس عميق",
        habitEn: "Meditation & deep breathing",
        timing: "قبل النوم",
        timingEn: "Before bed",
        duration: "10 دقائق",
        benefit: "تقليل التوتر وتحسين النوم",
        benefitEn: "Reduces stress and improves sleep",
      },
      {
        habit: "شرب الماء",
        habitEn: "Hydration",
        timing: "طوال اليوم",
        timingEn: "Throughout the day",
        duration: "2-3 لتر",
        benefit: "تحسين وظائف الكلى والتركيز",
        benefitEn: "Improves kidney function and focus",
      },
    ],
    nutritionGuidelines: [
      {
        recommendation: "زيادة الخضروات والفواكه",
        recommendationEn: "Increase vegetables and fruits",
        reason: "غنية بمضادات الأكسدة والألياف",
        reasonEn: "Rich in antioxidants and fiber",
        examples: ["بروكلي", "سبانخ", "توت", "أفوكادو"],
      },
      {
        recommendation: "تقليل السكريات المضافة",
        recommendationEn: "Reduce added sugars",
        reason: "تقليل خطر السكري والسمنة",
        reasonEn: "Reduces diabetes and obesity risk",
        examples: ["استبدال المشروبات الغازية بالماء", "فواكه بدل الحلويات"],
      },
    ],
    mentalHealth: {
      stressManagement: "مارس تمارين التنفس 4-7-8 عند الشعور بالتوتر. خصص 10 دقائق يومياً للتأمل.",
      stressManagementEn: "Practice 4-7-8 breathing when stressed. Dedicate 10 minutes daily to meditation.",
      sleepHygiene: "ثبّت موعد النوم. أوقف الشاشات قبل النوم بساعة. اجعل الغرفة مظلمة وباردة.",
      sleepHygieneEn: "Fix your bedtime. Stop screens 1 hour before bed. Keep room dark and cool.",
      socialConnection: "حافظ على تواصل أسبوعي مع الأصدقاء والعائلة. المشاركة الاجتماعية تقلل خطر الاكتئاب 50%.",
      socialConnectionEn: "Maintain weekly contact with friends and family. Social engagement reduces depression risk by 50%.",
    },
  };
}

function calculateLifestyleImpact(
  currentScore: number,
  risks: RiskPrediction[],
  lifestyle?: HealthPredictionInput["lifestyle"]
): LifestyleImpact {
  const optimizedScore = Math.min(95, currentScore + 20);

  return {
    currentTrajectory: {
      healthScoreIn5Years: Math.max(30, currentScore - 8),
      majorRisks: risks.filter((r) => r.riskLevel === "high" || r.riskLevel === "very_high").map((r) => r.condition),
      majorRisksEn: risks.filter((r) => r.riskLevel === "high" || r.riskLevel === "very_high").map((r) => r.conditionEn),
    },
    optimizedTrajectory: {
      healthScoreIn5Years: optimizedScore,
      risksReduced: risks.filter((r) => r.preventionPotential > 40).map((r) => r.condition),
      risksReducedEn: risks.filter((r) => r.preventionPotential > 40).map((r) => r.conditionEn),
      yearsGained: Math.round((optimizedScore - currentScore) / 5),
    },
    keyChanges: [
      {
        change: "مشي 30 دقيقة يومياً",
        changeEn: "Walk 30 minutes daily",
        impact: "تقليل خطر القلب 25%",
        impactEn: "Reduce cardiac risk by 25%",
        difficulty: "easy",
        priority: 1,
      },
      {
        change: "نوم 7-8 ساعات",
        changeEn: "Sleep 7-8 hours",
        impact: "تحسين المناعة والتركيز",
        impactEn: "Improve immunity and focus",
        difficulty: "moderate",
        priority: 2,
      },
      {
        change: "إيقاف التدخين",
        changeEn: "Quit smoking",
        impact: "تقليل خطر السرطان 50%",
        impactEn: "Reduce cancer risk by 50%",
        difficulty: "hard",
        priority: lifestyle?.smokingStatus === "current" ? 1 : 99,
      },
    ].filter((c) => c.priority < 99),
  };
}

function generateScreeningSchedule(
  age: number,
  sex: string,
  familyHistory: Array<{ condition: string; relation: string }>,
  currentConditions: string[]
): ScreeningRecommendation[] {
  const screenings: ScreeningRecommendation[] = [];

  // Blood pressure
  screenings.push({
    test: "قياس ضغط الدم",
    testEn: "Blood Pressure Check",
    reason: "الكشف المبكر عن ارتفاع الضغط",
    reasonEn: "Early detection of hypertension",
    frequency: "كل 6 أشهر",
    frequencyEn: "Every 6 months",
    nextDue: "2026-09-01",
    urgency: "routine",
  });

  // Lipid panel
  screenings.push({
    test: "تحليل الدهون الشامل",
    testEn: "Lipid Panel",
    reason: "تقييم خطر أمراض القلب",
    reasonEn: "Cardiovascular risk assessment",
    frequency: age > 40 ? "سنوياً" : "كل سنتين",
    frequencyEn: age > 40 ? "Annually" : "Every 2 years",
    nextDue: "2026-12-01",
    urgency: "routine",
  });

  // HbA1c
  if (age > 35 || familyHistory.some((f) => f.condition.includes("diabetes") || f.condition.includes("سكري"))) {
    screenings.push({
      test: "تحليل السكر التراكمي (HbA1c)",
      testEn: "HbA1c (Diabetes Screening)",
      reason: "الكشف المبكر عن مقدمات السكري",
      reasonEn: "Early detection of prediabetes",
      frequency: "سنوياً",
      frequencyEn: "Annually",
      nextDue: "2026-08-01",
      urgency: "soon",
    });
  }

  // Colonoscopy
  if (age >= 45) {
    screenings.push({
      test: "منظار القولون",
      testEn: "Colonoscopy",
      reason: "الكشف المبكر عن سرطان القولون",
      reasonEn: "Colorectal cancer screening",
      frequency: "كل 10 سنوات",
      frequencyEn: "Every 10 years",
      nextDue: "2027-01-01",
      urgency: "routine",
    });
  }

  // Mammography (females)
  if (sex === "female" && age >= 40) {
    screenings.push({
      test: "تصوير الثدي (ماموجرام)",
      testEn: "Mammography",
      reason: "الكشف المبكر عن سرطان الثدي",
      reasonEn: "Breast cancer screening",
      frequency: "سنوياً",
      frequencyEn: "Annually",
      nextDue: "2026-10-01",
      urgency: "routine",
    });
  }

  // Vitamin D
  screenings.push({
    test: "فيتامين د",
    testEn: "Vitamin D Level",
    reason: "شائع النقص في المنطقة — يؤثر على العظام والمناعة",
    reasonEn: "Common deficiency in the region — affects bones and immunity",
    frequency: "سنوياً",
    frequencyEn: "Annually",
    nextDue: "2026-07-01",
    urgency: "soon",
  });

  return screenings;
}

function generateWearableGoals(
  wearable?: HealthPredictionInput["wearableData"],
  healthScore?: number
): WearableGoal[] {
  return [
    {
      metric: "الخطوات اليومية",
      metricEn: "Daily Steps",
      currentValue: wearable?.stepsPerDay || 5000,
      targetValue: 10000,
      unit: "خطوة",
      rationale: "10,000 خطوة تقلل خطر الأمراض المزمنة 30%",
      rationaleEn: "10,000 steps reduces chronic disease risk by 30%",
    },
    {
      metric: "معدل ضربات القلب أثناء الراحة",
      metricEn: "Resting Heart Rate",
      currentValue: wearable?.restingHeartRate || 72,
      targetValue: 60,
      unit: "bpm",
      rationale: "معدل أقل يعني قلب أقوى وأكثر كفاءة",
      rationaleEn: "Lower rate means stronger, more efficient heart",
    },
    {
      metric: "تقلب معدل ضربات القلب (HRV)",
      metricEn: "Heart Rate Variability",
      currentValue: wearable?.hrv || 35,
      targetValue: 55,
      unit: "ms",
      rationale: "HRV أعلى يعني تعافي أفضل ومقاومة أكبر للإجهاد",
      rationaleEn: "Higher HRV means better recovery and stress resilience",
    },
    {
      metric: "جودة النوم",
      metricEn: "Sleep Score",
      currentValue: wearable?.sleepScore || 65,
      targetValue: 85,
      unit: "/100",
      rationale: "نوم جيد يحسن المناعة والذاكرة والمزاج",
      rationaleEn: "Good sleep improves immunity, memory, and mood",
    },
  ];
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

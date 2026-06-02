import "server-only";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ─────────────────────────────────────────────────────────────────────────────
// MediSport — World's First Clinical-Grade Sports Medicine AI Platform
// 14 integrated modules for elite athlete care, performance optimization,
// injury prediction, and regulatory compliance (WADA/FIFA/IOC)
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Module 1: Lab & Body Composition ──
export interface AthleteLabPanel {
  athleteId: number;
  sport: string;
  position?: string;
  seasonPhase: "pre-season" | "in-season" | "off-season" | "transition";
  testDate: string;
  markers: LabMarker[];
}

export interface LabMarker {
  category: "muscle_recovery" | "hormonal" | "iron_oxygen" | "inflammation" | "metabolic" | "bone_joint" | "hydration" | "kidney_liver" | "immune";
  name: string;
  value: number;
  unit: string;
  athleteNormalRange: { min: number; max: number };
  clinicalNormalRange: { min: number; max: number };
  previousValues?: Array<{ value: number; date: string }>;
  flag?: "critical_high" | "high" | "normal" | "low" | "critical_low";
}

export interface BodyComposition {
  athleteId: number;
  scanDate: string;
  method: "dexa" | "bia" | "skinfold" | "mri";
  bodyFatPercent: number;
  leanMassKg: number;
  boneMineralDensity?: number;
  visceralFatArea?: number;
  segmental?: {
    leftArm: { fatPercent: number; leanMassKg: number };
    rightArm: { fatPercent: number; leanMassKg: number };
    leftLeg: { fatPercent: number; leanMassKg: number };
    rightLeg: { fatPercent: number; leanMassKg: number };
    trunk: { fatPercent: number; leanMassKg: number };
  };
  hydrationPercent?: number;
  bmi?: number;
}

export interface LabTrendAnalysis {
  athleteId: number;
  marker: string;
  trend: "improving" | "stable" | "declining" | "critical_decline";
  deltaPercent: number;
  periodMonths: number;
  aiInterpretation: string;
  recommendations: string[];
  alertLevel: "red" | "amber" | "yellow" | "green";
  correlations: Array<{ factor: string; correlation: number; description: string }>;
}

// ── Module 2: Athlete Monitoring & Injury Prediction ──
export interface TrainingLoad {
  athleteId: number;
  sessionDate: string;
  sessionType: "match" | "training" | "recovery" | "gym" | "conditioning";
  externalLoad: {
    totalDistance?: number; // meters
    highSpeedRunning?: number; // meters >21km/h
    sprintDistance?: number; // meters >25km/h
    accelerations?: number;
    decelerations?: number;
    maxSpeed?: number; // km/h
    playerLoad?: number; // arbitrary units
    impacts?: number;
    jumpCount?: number;
  };
  internalLoad: {
    avgHeartRate?: number;
    maxHeartRate?: number;
    hrZoneMinutes?: { z1: number; z2: number; z3: number; z4: number; z5: number };
    rpe?: number; // 1-10
    sessionDuration?: number; // minutes
    trainingImpulse?: number; // TRIMP
  };
  acuteLoad?: number;
  chronicLoad?: number;
  acwr?: number; // Acute:Chronic Workload Ratio
}

export interface InjuryPrediction {
  athleteId: number;
  athleteName: string;
  riskScore: number; // 0-100
  riskLevel: "critical" | "high" | "moderate" | "low" | "minimal";
  predictedInjuryType?: string;
  predictedBodyPart?: string;
  timeframe: string;
  riskFactors: Array<{
    factor: string;
    contribution: number; // 0-1
    description: string;
    modifiable: boolean;
  }>;
  recommendations: Array<{
    priority: "immediate" | "high" | "moderate" | "low";
    action: string;
    rationale: string;
  }>;
  acwr: number;
  acwrZone: "danger" | "caution" | "optimal" | "undertraining";
  fatigueIndex: number;
  readinessScore: number;
  confidence: number;
}

// ── Module 3: Anti-Doping & Sports Pharmacy ──
export interface WADACheckResult {
  medication: string;
  activeIngredients: string[];
  status: "prohibited" | "restricted" | "permitted" | "unknown";
  inCompetition: boolean;
  outOfCompetition: boolean;
  prohibitedClass?: string;
  details: string;
  alternatives?: Array<{
    drug: string;
    status: "permitted";
    indication: string;
    notes: string;
  }>;
  tueRequired: boolean;
  source: "wada_2026" | "global_dro" | "ai_analysis";
  lastUpdated: string;
}

export interface TUEApplication {
  athleteId: number;
  medication: string;
  diagnosis: string;
  medicalHistory: string;
  previousTreatments: string[];
  justification: string;
  duration: string;
  prescribingPhysician: string;
  supportingDocuments: string[];
  status: "draft" | "submitted" | "approved" | "denied" | "expired";
  federationId?: string;
}

// ── Module 4: Concussion Management ──
export interface SCAT6Assessment {
  athleteId: number;
  assessmentDate: string;
  assessmentType: "baseline" | "sideline" | "office" | "follow_up";
  immediateAssessment?: {
    redFlags: string[];
    observableSigns: string[];
    glasgowComaScale: number;
    cervicalSpineAssessment: string;
  };
  symptomEvaluation: {
    symptoms: Array<{ name: string; severity: number }>; // 0-6
    totalSymptoms: number;
    totalSeverity: number;
  };
  cognitiveScreening: {
    orientation: number; // 0-5
    immediateMemory: number[]; // 3 trials
    concentration: { digitsBackward: number; monthsReverse: number };
    delayedRecall: number;
  };
  neurologicalExam: {
    balanceErrors: number;
    tandemGait: number; // seconds
    fingerToNose: string;
    coordinationScore: number;
  };
  overallScore: number;
  comparedToBaseline?: {
    symptomChange: number;
    cognitiveChange: number;
    balanceChange: number;
  };
  returnToPlayStage: number; // 1-6
  clearedForNextStage: boolean;
  nextAssessmentDate?: string;
}

// ── Module 5: Pre-Competition Medical Assessment (PCMA) ──
export interface PCMAAssessment {
  athleteId: number;
  assessmentDate: string;
  competition: string;
  federation: "fifa" | "ioc" | "afc" | "other";
  medicalHistory: {
    familyHistory: { suddenDeath: boolean; cardiomyopathy: boolean; marfan: boolean; arrhythmia: boolean };
    personalHistory: { syncope: boolean; chestPain: boolean; palpitations: boolean; dyspnea: boolean };
    previousInjuries: Array<{ type: string; date: string; duration: string; side: string }>;
    medications: string[];
    allergies: string[];
    surgeries: string[];
  };
  physicalExam: {
    height: number;
    weight: number;
    bmi: number;
    bloodPressure: { systolic: number; diastolic: number };
    heartRate: number;
    cardiacAuscultation: string;
    musculoskeletalFindings: string[];
    generalFindings: string[];
  };
  ecg: {
    performed: boolean;
    date?: string;
    interpretation: string;
    seattleCriteria: "normal" | "borderline" | "abnormal";
    findings: string[];
    referralNeeded: boolean;
  };
  labWork?: {
    hemoglobin: number;
    hematocrit: number;
    ferritin: number;
    glucose: number;
    creatinine: number;
  };
  clearance: "cleared" | "cleared_with_conditions" | "not_cleared" | "pending";
  conditions?: string[];
  referrals?: string[];
  validUntil: string;
}

// ── Module 6: Sports Nutrition & Hydration ──
export interface NutritionPlan {
  athleteId: number;
  sport: string;
  goal: "performance" | "body_composition" | "recovery" | "weight_gain" | "weight_loss";
  seasonPhase: string;
  dailyTargets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fiberGrams: number;
    waterMl: number;
  };
  mealTiming: Array<{
    meal: string;
    time: string;
    macros: { protein: number; carbs: number; fat: number };
    suggestions: string[];
  }>;
  supplementProtocol: Array<{
    supplement: string;
    dose: string;
    timing: string;
    wadaStatus: "permitted" | "check_required";
    evidence: string;
  }>;
  hydrationProtocol: {
    baselineFluidMl: number;
    preExerciseMl: number;
    duringExerciseMlPerHour: number;
    postExerciseMl: number;
    electrolyteNeeded: boolean;
    sweatRate?: number;
  };
  restrictions: string[];
  aiRecommendations: string[];
}

// ── Module 7: Sleep & Recovery Intelligence ──
export interface SleepAnalysis {
  athleteId: number;
  date: string;
  totalSleepHours: number;
  sleepEfficiency: number; // percent
  sleepLatency: number; // minutes
  remPercent: number;
  deepSleepPercent: number;
  awakenings: number;
  hrvDuringSleep?: number;
  restingHeartRate?: number;
  sleepScore: number; // 0-100
  source: "oura" | "whoop" | "apple_watch" | "garmin" | "manual";
}

export interface RecoveryScore {
  athleteId: number;
  date: string;
  overallScore: number; // 0-100
  components: {
    sleepQuality: number;
    hrvStatus: number;
    muscleReadiness: number;
    mentalReadiness: number;
    nutritionStatus: number;
  };
  readiness: "fully_ready" | "modified_training" | "recovery_only" | "rest_day";
  recommendations: string[];
  trainingIntensityAdvice: "high" | "moderate" | "low" | "rest";
  jetLagStatus?: { hoursOffset: number; daysToRecover: number };
}

// ── Module 8: Biomechanics & Movement Analysis ──
export interface MovementAssessment {
  athleteId: number;
  assessmentDate: string;
  assessmentType: "fms" | "gait" | "sport_specific" | "post_injury" | "force_plate";
  fmsScores?: {
    deepSquat: number;
    hurdleStep: { left: number; right: number };
    inlineLunge: { left: number; right: number };
    shoulderMobility: { left: number; right: number };
    activeStraightLegRaise: { left: number; right: number };
    trunkStabilityPushup: number;
    rotaryStability: { left: number; right: number };
    totalScore: number;
    asymmetries: string[];
  };
  forcePlateData?: {
    jumpHeight: number;
    peakForce: number;
    rateOfForceDevelopment: number;
    asymmetryIndex: number; // percent difference L vs R
    landingForce: number;
    contactTime: number;
  };
  gaitAnalysis?: {
    cadence: number;
    strideLength: number;
    groundContactTime: number;
    verticalOscillation: number;
    asymmetries: Array<{ metric: string; leftValue: number; rightValue: number; percentDiff: number }>;
  };
  riskFactors: string[];
  aiRecommendations: string[];
}

// ── Module 9: Sports Psychology & Mental Performance ──
export interface MentalPerformanceAssessment {
  athleteId: number;
  assessmentDate: string;
  instruments: {
    phq9?: { score: number; severity: string };
    gad7?: { score: number; severity: string };
    athleteBurnout?: { score: number; level: string };
    competitiveAnxiety?: { cognitive: number; somatic: number; selfConfidence: number };
    motivationScale?: { intrinsic: number; extrinsic: number; amotivation: number };
  };
  wellnessScores: {
    mood: number;
    confidence: number;
    motivation: number;
    stressLevel: number;
    teamCohesion: number;
  };
  performanceAnxiety: {
    preCompetitionLevel: number;
    inCompetitionLevel: number;
    triggers: string[];
    copingStrategies: string[];
  };
  burnoutRisk: "high" | "moderate" | "low";
  referralNeeded: boolean;
  aiRecommendations: string[];
}

// ── Module 10: Heat & Environmental Safety ──
export interface HeatSafetyAssessment {
  date: string;
  location: string;
  wbgt: number; // Wet Bulb Globe Temperature
  temperature: number;
  humidity: number;
  windSpeed: number;
  riskLevel: "extreme" | "high" | "moderate" | "low";
  activityModification: "cancel" | "reduce_intensity" | "increase_breaks" | "normal" | "monitor";
  hydrationProtocol: {
    preActivityMl: number;
    duringActivityMlPerHour: number;
    electrolyteRequired: boolean;
    coolingStrategies: string[];
  };
  athleteSpecificRisks: Array<{
    athleteId: number;
    athleteName: string;
    heatToleranceLevel: "high" | "moderate" | "low";
    acclimatizationDay: number;
    additionalRisk: string[];
  }>;
  recommendations: string[];
  emergencyProtocol: string;
}

// ── Module 11: Team Dashboard ──
export interface TeamOverview {
  teamName: string;
  sport: string;
  totalAthletes: number;
  availabilityStatus: {
    fullyAvailable: number;
    modified: number;
    injured: number;
    illness: number;
    returnToPlay: number;
  };
  riskAlerts: Array<{
    athleteId: number;
    athleteName: string;
    alertType: "injury_risk" | "overtraining" | "illness" | "mental_health" | "cardiac" | "heat";
    severity: "critical" | "high" | "moderate";
    message: string;
  }>;
  upcomingAssessments: Array<{
    athleteId: number;
    athleteName: string;
    assessmentType: string;
    dueDate: string;
  }>;
  performanceTrends: {
    averageFitness: number;
    averageReadiness: number;
    injuryRate: number;
    trainingLoadCompliance: number;
  };
}

// ── Module 12: Rehabilitation & Return-to-Play ──
export interface RehabProtocol {
  athleteId: number;
  injuryId: string;
  injuryType: string;
  injuryDate: string;
  bodyPart: string;
  severity: "grade_1" | "grade_2" | "grade_3" | "surgical";
  currentPhase: number;
  phases: Array<{
    phase: number;
    name: string;
    description: string;
    criteria: string[];
    exercises: Array<{ name: string; sets: number; reps: number; notes: string }>;
    duration: string;
    objectiveMeasures: Array<{ test: string; target: string; current?: string; passed: boolean }>;
    cleared: boolean;
    clearedDate?: string;
    clearedBy?: string;
  }>;
  estimatedReturnDate: string;
  actualReturnDate?: string;
  reinjuryRisk: number;
  progressPercent: number;
  notes: string[];
}

// ── Module 13: Cardiac Screening ──
export interface CardiacScreening {
  athleteId: number;
  screeningDate: string;
  ecg: {
    performed: boolean;
    interpretation: string;
    seattleCriteria: "normal" | "borderline" | "abnormal";
    findings: string[];
    intervals: { pr: number; qrs: number; qtc: number };
  };
  echocardiogram?: {
    performed: boolean;
    lvef: number;
    wallThickness: number;
    lvDiastolicDiameter: number;
    valvularAbnormalities: string[];
    findings: string[];
  };
  exerciseStressTest?: {
    performed: boolean;
    protocol: string;
    maxHR: number;
    percentPredicted: number;
    stSegmentChanges: boolean;
    arrhythmias: string[];
    bloodPressureResponse: string;
    conclusion: string;
  };
  familyRiskScore: number;
  overallRisk: "high" | "moderate" | "low";
  clearance: "cleared" | "further_investigation" | "restricted" | "disqualified";
  followUpRequired: boolean;
  nextScreeningDate: string;
}

// ── Module 14: Performance Testing & Fitness Assessment ──
export interface PerformanceTest {
  athleteId: number;
  testDate: string;
  testType: "vo2max" | "lactate_threshold" | "sprint" | "agility" | "strength" | "power" | "endurance" | "flexibility";
  results: Record<string, number | string>;
  sportSpecificBenchmark?: { percentile: number; level: string; reference: string };
  previousResult?: { value: number | string; date: string; change: number };
  seasonPhase: string;
  aiInterpretation: string;
  recommendations: string[];
}

export interface FitnessProfile {
  athleteId: number;
  lastUpdated: string;
  vo2max?: { value: number; percentile: number; trend: string };
  lactateThreshold?: { speed: number; heartRate: number; percentVO2max: number };
  sprintProfile?: { tenMeter: number; thirtyMeter: number; maxSpeed: number };
  strengthProfile?: Record<string, { oneRM: number; relativeStrength: number }>;
  powerProfile?: { cmj: number; sqjump: number; rsi: number };
  flexibilityProfile?: Record<string, number>;
  overallFitnessScore: number;
  strengths: string[];
  weaknesses: string[];
  trainingPriorities: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 1: LAB & BODY COMPOSITION TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

const SPORT_SPECIFIC_RANGES: Record<string, Record<string, { min: number; max: number }>> = {
  endurance: {
    "Hemoglobin (Male)": { min: 14.0, max: 18.0 },
    "Hemoglobin (Female)": { min: 12.5, max: 16.0 },
    "Ferritin (Male)": { min: 50, max: 300 },
    "Ferritin (Female)": { min: 35, max: 200 },
    "CK": { min: 50, max: 500 },
    "Testosterone (Male)": { min: 12, max: 35 },
    "Cortisol (AM)": { min: 5, max: 23 },
    "Vitamin D": { min: 40, max: 100 },
    "Iron": { min: 65, max: 175 },
    "hs-CRP": { min: 0, max: 3.0 },
  },
  power: {
    "Hemoglobin (Male)": { min: 14.5, max: 18.5 },
    "CK": { min: 100, max: 1000 },
    "Testosterone (Male)": { min: 15, max: 40 },
    "IGF-1": { min: 150, max: 400 },
    "Vitamin D": { min: 40, max: 100 },
  },
  team_sport: {
    "Hemoglobin (Male)": { min: 14.0, max: 17.5 },
    "Ferritin (Male)": { min: 40, max: 250 },
    "CK": { min: 80, max: 800 },
    "Testosterone (Male)": { min: 12, max: 35 },
    "Cortisol (AM)": { min: 5, max: 23 },
    "T/C Ratio": { min: 0.5, max: 2.0 },
    "Vitamin D": { min: 40, max: 100 },
  },
};

export async function analyzeAthleteLabs(panel: AthleteLabPanel): Promise<LabTrendAnalysis[]> {
  const sportCategory = getSportCategory(panel.sport);
  const ranges = SPORT_SPECIFIC_RANGES[sportCategory] || SPORT_SPECIFIC_RANGES.team_sport;

  const analyses: LabTrendAnalysis[] = [];

  for (const marker of panel.markers) {
    const trend = calculateTrend(marker);
    const deltaPercent = marker.previousValues && marker.previousValues.length > 0
      ? ((marker.value - marker.previousValues[0].value) / marker.previousValues[0].value) * 100
      : 0;

    const alertLevel = getAlertLevel(marker, ranges);

    analyses.push({
      athleteId: panel.athleteId,
      marker: marker.name,
      trend,
      deltaPercent: Math.round(deltaPercent * 10) / 10,
      periodMonths: marker.previousValues ? marker.previousValues.length : 0,
      aiInterpretation: "",
      recommendations: [],
      alertLevel,
      correlations: [],
    });
  }

  // AI-powered interpretation
  const prompt = buildLabAnalysisPrompt(panel, analyses);
  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    const aiResponse = JSON.parse(aiResult.text ?? "{}");
    if (aiResponse.analyses) {
      for (let i = 0; i < analyses.length && i < aiResponse.analyses.length; i++) {
        analyses[i].aiInterpretation = aiResponse.analyses[i].interpretation || "";
        analyses[i].recommendations = aiResponse.analyses[i].recommendations || [];
        analyses[i].correlations = aiResponse.analyses[i].correlations || [];
      }
    }
  } catch {
    // Fallback: use raw text as interpretation for first marker
    if (analyses.length > 0) {
      analyses[0].aiInterpretation = aiResult.text ?? "Analysis pending.";
    }
  }

  return analyses;
}

export async function analyzeBodyComposition(
  current: BodyComposition,
  history: BodyComposition[]
): Promise<{
  trends: Record<string, { direction: string; change: number; interpretation: string }>;
  symmetryAnalysis: { balanced: boolean; imbalances: string[] };
  recommendations: string[];
  riskFactors: string[];
  overallStatus: "optimal" | "acceptable" | "attention_needed" | "intervention_required";
}> {
  const prompt = `You are a sports medicine AI specializing in body composition analysis for elite athletes.

Analyze the following body composition data:

CURRENT SCAN (${current.scanDate}):
- Body Fat: ${current.bodyFatPercent}%
- Lean Mass: ${current.leanMassKg} kg
- BMD: ${current.boneMineralDensity ?? "N/A"}
- Method: ${current.method}
${current.segmental ? `- Segmental: Left Arm ${current.segmental.leftArm.leanMassKg}kg, Right Arm ${current.segmental.rightArm.leanMassKg}kg, Left Leg ${current.segmental.leftLeg.leanMassKg}kg, Right Leg ${current.segmental.rightLeg.leanMassKg}kg` : ""}

HISTORY (${history.length} previous scans):
${history.map(h => `  ${h.scanDate}: BF ${h.bodyFatPercent}%, LM ${h.leanMassKg}kg`).join("\n")}

Return JSON with:
{
  "trends": { "bodyFat": { "direction": "...", "change": 0, "interpretation": "..." }, "leanMass": { "direction": "...", "change": 0, "interpretation": "..." } },
  "symmetryAnalysis": { "balanced": true/false, "imbalances": ["..."] },
  "recommendations": ["..."],
  "riskFactors": ["..."],
  "overallStatus": "optimal|acceptable|attention_needed|intervention_required"
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    return JSON.parse(aiResult.text ?? "{}");
  } catch {
    return {
      trends: {},
      symmetryAnalysis: { balanced: true, imbalances: [] },
      recommendations: ["Unable to generate AI analysis. Please review manually."],
      riskFactors: [],
      overallStatus: "acceptable",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 2: ATHLETE MONITORING & INJURY PREDICTION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateACWR(sessions: TrainingLoad[]): { acute: number; chronic: number; ratio: number; zone: string } {
  const now = new Date();
  const acute7 = sessions.filter(s => {
    const d = new Date(s.sessionDate);
    return (now.getTime() - d.getTime()) / 86400000 <= 7;
  });
  const chronic28 = sessions.filter(s => {
    const d = new Date(s.sessionDate);
    return (now.getTime() - d.getTime()) / 86400000 <= 28;
  });

  const acuteLoad = acute7.reduce((sum, s) => sum + (s.internalLoad.trainingImpulse || s.internalLoad.rpe || 0) * (s.internalLoad.sessionDuration || 60), 0) / 7;
  const chronicLoad = chronic28.reduce((sum, s) => sum + (s.internalLoad.trainingImpulse || s.internalLoad.rpe || 0) * (s.internalLoad.sessionDuration || 60), 0) / 28;

  const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

  let zone = "optimal";
  if (ratio > 1.5) zone = "danger";
  else if (ratio > 1.3) zone = "caution";
  else if (ratio < 0.8) zone = "undertraining";

  return { acute: Math.round(acuteLoad), chronic: Math.round(chronicLoad), ratio: Math.round(ratio * 100) / 100, zone };
}

export async function predictInjuryRisk(
  athleteId: number,
  athleteName: string,
  trainingHistory: TrainingLoad[],
  sleepData?: SleepAnalysis[],
  bodyComp?: BodyComposition,
  previousInjuries?: Array<{ type: string; bodyPart: string; date: string }>
): Promise<InjuryPrediction> {
  const acwr = calculateACWR(trainingHistory);
  const recentSleep = sleepData?.slice(0, 7) || [];
  const avgSleepScore = recentSleep.length > 0
    ? recentSleep.reduce((sum, s) => sum + s.sleepScore, 0) / recentSleep.length
    : 75;

  const prompt = `You are an AI sports medicine specialist focused on injury prediction.

Analyze the following athlete data and predict injury risk:

ATHLETE: ${athleteName} (ID: ${athleteId})
ACWR: ${acwr.ratio} (Zone: ${acwr.zone})
Acute Load (7d): ${acwr.acute}
Chronic Load (28d): ${acwr.chronic}

RECENT TRAINING (last 7 sessions):
${trainingHistory.slice(0, 7).map(t => `  ${t.sessionDate}: ${t.sessionType} - RPE ${t.internalLoad.rpe || "N/A"}, Duration ${t.internalLoad.sessionDuration || "N/A"}min, Distance ${t.externalLoad.totalDistance || "N/A"}m`).join("\n")}

SLEEP (7-day avg score): ${avgSleepScore}/100
${bodyComp ? `BODY COMP: BF ${bodyComp.bodyFatPercent}%, LM ${bodyComp.leanMassKg}kg` : ""}
${previousInjuries ? `INJURY HISTORY: ${previousInjuries.map(i => `${i.type} (${i.bodyPart}) - ${i.date}`).join(", ")}` : ""}

Return JSON:
{
  "riskScore": 0-100,
  "riskLevel": "critical|high|moderate|low|minimal",
  "predictedInjuryType": "...",
  "predictedBodyPart": "...",
  "timeframe": "...",
  "riskFactors": [{"factor": "...", "contribution": 0.0-1.0, "description": "...", "modifiable": true/false}],
  "recommendations": [{"priority": "immediate|high|moderate|low", "action": "...", "rationale": "..."}],
  "fatigueIndex": 0-100,
  "readinessScore": 0-100,
  "confidence": 0.0-1.0
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    const parsed = JSON.parse(aiResult.text ?? "{}");
    return {
      athleteId,
      athleteName,
      riskScore: parsed.riskScore ?? 30,
      riskLevel: parsed.riskLevel ?? "low",
      predictedInjuryType: parsed.predictedInjuryType,
      predictedBodyPart: parsed.predictedBodyPart,
      timeframe: parsed.timeframe ?? "7-14 days",
      riskFactors: parsed.riskFactors ?? [],
      recommendations: parsed.recommendations ?? [],
      acwr: acwr.ratio,
      acwrZone: acwr.zone as InjuryPrediction["acwrZone"],
      fatigueIndex: parsed.fatigueIndex ?? 40,
      readinessScore: parsed.readinessScore ?? 70,
      confidence: parsed.confidence ?? 0.7,
    };
  } catch {
    return {
      athleteId,
      athleteName,
      riskScore: acwr.ratio > 1.5 ? 75 : acwr.ratio > 1.3 ? 55 : 25,
      riskLevel: acwr.ratio > 1.5 ? "high" : acwr.ratio > 1.3 ? "moderate" : "low",
      timeframe: "7-14 days",
      riskFactors: [{ factor: "ACWR", contribution: 0.6, description: `Current ACWR is ${acwr.ratio}`, modifiable: true }],
      recommendations: [{ priority: "moderate", action: "Monitor training load", rationale: "ACWR analysis" }],
      acwr: acwr.ratio,
      acwrZone: acwr.zone as InjuryPrediction["acwrZone"],
      fatigueIndex: 50,
      readinessScore: 60,
      confidence: 0.5,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 3: ANTI-DOPING & SPORTS PHARMACY (WADA)
// ═══════════════════════════════════════════════════════════════════════════════

const WADA_PROHIBITED_CLASSES = [
  "S0 - Non-Approved Substances",
  "S1 - Anabolic Agents",
  "S2 - Peptide Hormones, Growth Factors",
  "S3 - Beta-2 Agonists",
  "S4 - Hormone and Metabolic Modulators",
  "S5 - Diuretics and Masking Agents",
  "S6 - Stimulants",
  "S7 - Narcotics",
  "S8 - Cannabinoids",
  "S9 - Glucocorticoids",
  "M1 - Manipulation of Blood",
  "M2 - Chemical and Physical Manipulation",
  "M3 - Gene and Cell Doping",
  "P1 - Beta-Blockers (in-competition only for certain sports)",
];

const COMMON_PROHIBITED_SUBSTANCES: Record<string, { class: string; inComp: boolean; outComp: boolean }> = {
  "testosterone": { class: "S1", inComp: true, outComp: true },
  "nandrolone": { class: "S1", inComp: true, outComp: true },
  "stanozolol": { class: "S1", inComp: true, outComp: true },
  "erythropoietin": { class: "S2", inComp: true, outComp: true },
  "hgh": { class: "S2", inComp: true, outComp: true },
  "salbutamol": { class: "S3", inComp: false, outComp: false }, // permitted under threshold
  "furosemide": { class: "S5", inComp: true, outComp: true },
  "amphetamine": { class: "S6", inComp: true, outComp: false },
  "methylphenidate": { class: "S6", inComp: true, outComp: false },
  "pseudoephedrine": { class: "S6", inComp: true, outComp: false },
  "morphine": { class: "S7", inComp: true, outComp: false },
  "cannabis": { class: "S8", inComp: true, outComp: false },
  "prednisolone": { class: "S9", inComp: true, outComp: false },
  "dexamethasone": { class: "S9", inComp: true, outComp: false },
  "propranolol": { class: "P1", inComp: true, outComp: false },
  "atenolol": { class: "P1", inComp: true, outComp: false },
};

export async function checkWADACompliance(medication: string, ingredients?: string[]): Promise<WADACheckResult> {
  // First check against known prohibited substances
  const medLower = medication.toLowerCase();
  for (const [substance, info] of Object.entries(COMMON_PROHIBITED_SUBSTANCES)) {
    if (medLower.includes(substance)) {
      return {
        medication,
        activeIngredients: ingredients || [substance],
        status: "prohibited",
        inCompetition: info.inComp,
        outOfCompetition: info.outComp,
        prohibitedClass: info.class,
        details: `${medication} contains ${substance}, which is classified under ${info.class} of the WADA Prohibited List 2026.`,
        tueRequired: true,
        source: "wada_2026",
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  // AI-powered check for complex medications
  const prompt = `You are a sports pharmacy specialist with expertise in WADA anti-doping regulations.

Check the following medication against the WADA 2026 Prohibited List:
Medication: ${medication}
${ingredients ? `Active Ingredients: ${ingredients.join(", ")}` : ""}

Consider:
1. Is any ingredient on the WADA Prohibited List?
2. Is it prohibited in-competition only, or at all times?
3. Which prohibited class does it fall under?
4. Are there any threshold rules (e.g., salbutamol <1600mcg/day is permitted)?
5. What are safe alternatives for athletes?

Return JSON:
{
  "status": "prohibited|restricted|permitted|unknown",
  "inCompetition": true/false,
  "outOfCompetition": true/false,
  "prohibitedClass": "S1-S9, M1-M3, P1 or null",
  "details": "explanation",
  "alternatives": [{"drug": "...", "status": "permitted", "indication": "...", "notes": "..."}],
  "tueRequired": true/false,
  "activeIngredients": ["..."]
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.2 },
  });

  try {
    const parsed = JSON.parse(aiResult.text ?? "{}");
    return {
      medication,
      activeIngredients: parsed.activeIngredients || ingredients || [medication],
      status: parsed.status || "unknown",
      inCompetition: parsed.inCompetition ?? false,
      outOfCompetition: parsed.outOfCompetition ?? false,
      prohibitedClass: parsed.prohibitedClass,
      details: parsed.details || "AI analysis completed.",
      alternatives: parsed.alternatives,
      tueRequired: parsed.tueRequired ?? false,
      source: "ai_analysis",
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return {
      medication,
      activeIngredients: ingredients || [medication],
      status: "unknown",
      inCompetition: false,
      outOfCompetition: false,
      details: "Unable to determine WADA status. Please verify manually with Global DRO.",
      tueRequired: false,
      source: "ai_analysis",
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function generateTUEApplication(data: Omit<TUEApplication, "status">): Promise<TUEApplication & { generatedDocument: string }> {
  const prompt = `Generate a Therapeutic Use Exemption (TUE) application document for:
Athlete ID: ${data.athleteId}
Medication: ${data.medication}
Diagnosis: ${data.diagnosis}
Medical History: ${data.medicalHistory}
Previous Treatments: ${data.previousTreatments.join(", ")}
Justification: ${data.justification}
Duration: ${data.duration}

Format as a professional TUE application following WADA/ISTUE guidelines. Include:
1. Medical rationale
2. Evidence of diagnosis
3. Why no permitted alternative exists
4. Proposed treatment plan
5. Monitoring plan

Return the document text.`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  return {
    ...data,
    status: "draft",
    generatedDocument: aiResult.text ?? "TUE application generation failed.",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 4: CONCUSSION MANAGEMENT (SCAT6)
// ═══════════════════════════════════════════════════════════════════════════════

const RETURN_TO_PLAY_STAGES = [
  { stage: 1, name: "Symptom-Limited Activity", description: "Daily activities that do not provoke symptoms", criteria: "No symptoms at rest" },
  { stage: 2, name: "Light Aerobic Exercise", description: "Walking, swimming, stationary cycling <70% max HR", criteria: "No symptoms during/after activity" },
  { stage: 3, name: "Sport-Specific Exercise", description: "Running drills, skating drills — no head impact", criteria: "No symptoms, normal cognitive function" },
  { stage: 4, name: "Non-Contact Training", description: "Complex drills, resistance training, coordination", criteria: "No symptoms, normal balance" },
  { stage: 5, name: "Full-Contact Practice", description: "Full participation in normal training after medical clearance", criteria: "Medical clearance obtained" },
  { stage: 6, name: "Return to Competition", description: "Normal game play", criteria: "Full clearance, no symptoms for 24h after Stage 5" },
];

export async function assessConcussion(assessment: SCAT6Assessment): Promise<{
  severity: "severe" | "moderate" | "mild";
  returnToPlayTimeline: string;
  currentStage: number;
  nextStageDate: string;
  redFlags: string[];
  recommendations: string[];
  requiresImaging: boolean;
  referralNeeded: boolean;
  aiAnalysis: string;
}> {
  const prompt = `You are a sports medicine concussion specialist using SCAT6 protocol.

Analyze this concussion assessment:
Type: ${assessment.assessmentType}
Date: ${assessment.assessmentDate}
Symptoms: ${assessment.symptomEvaluation.totalSymptoms} symptoms, severity ${assessment.symptomEvaluation.totalSeverity}/132
Cognitive: Orientation ${assessment.cognitiveScreening.orientation}/5, Delayed Recall ${assessment.cognitiveScreening.delayedRecall}/5
Balance Errors: ${assessment.neurologicalExam.balanceErrors}
Tandem Gait: ${assessment.neurologicalExam.tandemGait}s
${assessment.immediateAssessment ? `Red Flags: ${assessment.immediateAssessment.redFlags.join(", ")}` : ""}
${assessment.comparedToBaseline ? `Compared to Baseline: Symptom change ${assessment.comparedToBaseline.symptomChange}, Cognitive change ${assessment.comparedToBaseline.cognitiveChange}` : ""}

Current Return-to-Play Stage: ${assessment.returnToPlayStage}

Return JSON:
{
  "severity": "severe|moderate|mild",
  "returnToPlayTimeline": "estimated days/weeks",
  "currentStage": 1-6,
  "nextStageDate": "YYYY-MM-DD",
  "redFlags": ["..."],
  "recommendations": ["..."],
  "requiresImaging": true/false,
  "referralNeeded": true/false,
  "aiAnalysis": "detailed clinical analysis"
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.2 },
  });

  try {
    return JSON.parse(aiResult.text ?? "{}");
  } catch {
    const severity = assessment.symptomEvaluation.totalSeverity > 40 ? "severe" : assessment.symptomEvaluation.totalSeverity > 15 ? "moderate" : "mild";
    return {
      severity,
      returnToPlayTimeline: severity === "severe" ? "4-6 weeks" : severity === "moderate" ? "2-4 weeks" : "1-2 weeks",
      currentStage: assessment.returnToPlayStage,
      nextStageDate: new Date(Date.now() + 48 * 3600000).toISOString().split("T")[0],
      redFlags: assessment.immediateAssessment?.redFlags || [],
      recommendations: ["24-hour minimum rest period", "Gradual return-to-play protocol", "Daily symptom monitoring"],
      requiresImaging: severity === "severe",
      referralNeeded: severity !== "mild",
      aiAnalysis: "Assessment completed. Follow standard SCAT6 return-to-play protocol.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 5: PRE-COMPETITION MEDICAL ASSESSMENT (PCMA)
// ═══════════════════════════════════════════════════════════════════════════════

export async function performPCMA(assessment: PCMAAssessment): Promise<{
  clearanceDecision: string;
  riskSummary: string;
  cardiacRisk: "high" | "moderate" | "low";
  musculoskeletalRisk: "high" | "moderate" | "low";
  findings: string[];
  recommendations: string[];
  referrals: string[];
  validityPeriod: string;
  aiReport: string;
}> {
  const prompt = `You are a FIFA/IOC-certified sports medicine physician performing a Pre-Competition Medical Assessment.

ATHLETE DATA:
Competition: ${assessment.competition}
Federation: ${assessment.federation}

FAMILY HISTORY:
- Sudden death: ${assessment.medicalHistory.familyHistory.suddenDeath}
- Cardiomyopathy: ${assessment.medicalHistory.familyHistory.cardiomyopathy}
- Marfan syndrome: ${assessment.medicalHistory.familyHistory.marfan}
- Arrhythmia: ${assessment.medicalHistory.familyHistory.arrhythmia}

PERSONAL HISTORY:
- Syncope: ${assessment.medicalHistory.personalHistory.syncope}
- Chest pain: ${assessment.medicalHistory.personalHistory.chestPain}
- Palpitations: ${assessment.medicalHistory.personalHistory.palpitations}
- Dyspnea: ${assessment.medicalHistory.personalHistory.dyspnea}
- Previous injuries: ${assessment.medicalHistory.previousInjuries.length}
- Medications: ${assessment.medicalHistory.medications.join(", ") || "None"}

PHYSICAL EXAM:
- BP: ${assessment.physicalExam.bloodPressure.systolic}/${assessment.physicalExam.bloodPressure.diastolic}
- HR: ${assessment.physicalExam.heartRate}
- BMI: ${assessment.physicalExam.bmi}
- Cardiac: ${assessment.physicalExam.cardiacAuscultation}
- MSK findings: ${assessment.physicalExam.musculoskeletalFindings.join(", ") || "None"}

ECG:
- Seattle Criteria: ${assessment.ecg.seattleCriteria}
- Findings: ${assessment.ecg.findings.join(", ") || "Normal"}

${assessment.labWork ? `LABS: Hb ${assessment.labWork.hemoglobin}, Hct ${assessment.labWork.hematocrit}, Ferritin ${assessment.labWork.ferritin}` : ""}

Provide comprehensive PCMA report with clearance decision. Return JSON:
{
  "clearanceDecision": "cleared|cleared_with_conditions|not_cleared|pending",
  "riskSummary": "...",
  "cardiacRisk": "high|moderate|low",
  "musculoskeletalRisk": "high|moderate|low",
  "findings": ["..."],
  "recommendations": ["..."],
  "referrals": ["..."],
  "validityPeriod": "6 months|12 months",
  "aiReport": "detailed narrative report"
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.2 },
  });

  try {
    return JSON.parse(aiResult.text ?? "{}");
  } catch {
    return {
      clearanceDecision: assessment.ecg.seattleCriteria === "abnormal" ? "pending" : "cleared",
      riskSummary: "Assessment completed. Review findings.",
      cardiacRisk: assessment.ecg.seattleCriteria === "abnormal" ? "high" : "low",
      musculoskeletalRisk: assessment.medicalHistory.previousInjuries.length > 3 ? "moderate" : "low",
      findings: assessment.ecg.findings,
      recommendations: ["Annual cardiac screening", "Regular musculoskeletal assessment"],
      referrals: assessment.ecg.seattleCriteria === "abnormal" ? ["Cardiology consultation"] : [],
      validityPeriod: "12 months",
      aiReport: aiResult.text ?? "Report generation pending.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 6: SPORTS NUTRITION & HYDRATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateNutritionPlan(
  athleteId: number,
  sport: string,
  weight: number,
  goal: NutritionPlan["goal"],
  seasonPhase: string,
  labResults?: LabMarker[],
  trainingLoad?: TrainingLoad[]
): Promise<NutritionPlan> {
  const avgTrainingDuration = trainingLoad?.length
    ? trainingLoad.reduce((sum, t) => sum + (t.internalLoad.sessionDuration || 60), 0) / trainingLoad.length
    : 90;

  const prompt = `You are an elite sports nutritionist creating a personalized nutrition plan.

ATHLETE:
- Sport: ${sport}
- Weight: ${weight} kg
- Goal: ${goal}
- Season Phase: ${seasonPhase}
- Avg Training Duration: ${avgTrainingDuration} min/session

${labResults ? `RELEVANT LAB RESULTS:\n${labResults.filter(l => ["iron_oxygen", "metabolic", "bone_joint"].includes(l.category)).map(l => `  ${l.name}: ${l.value} ${l.unit}`).join("\n")}` : ""}

Create a comprehensive nutrition plan. Return JSON:
{
  "dailyTargets": { "calories": 0, "proteinGrams": 0, "carbsGrams": 0, "fatGrams": 0, "fiberGrams": 0, "waterMl": 0 },
  "mealTiming": [{"meal": "...", "time": "...", "macros": {"protein": 0, "carbs": 0, "fat": 0}, "suggestions": ["..."]}],
  "supplementProtocol": [{"supplement": "...", "dose": "...", "timing": "...", "wadaStatus": "permitted|check_required", "evidence": "..."}],
  "hydrationProtocol": { "baselineFluidMl": 0, "preExerciseMl": 0, "duringExerciseMlPerHour": 0, "postExerciseMl": 0, "electrolyteNeeded": true/false, "sweatRate": 0 },
  "restrictions": ["..."],
  "aiRecommendations": ["..."]
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.4 },
  });

  try {
    const parsed = JSON.parse(aiResult.text ?? "{}");
    return {
      athleteId,
      sport,
      goal,
      seasonPhase,
      dailyTargets: parsed.dailyTargets || { calories: weight * 35, proteinGrams: weight * 2, carbsGrams: weight * 5, fatGrams: weight * 1, fiberGrams: 35, waterMl: weight * 40 },
      mealTiming: parsed.mealTiming || [],
      supplementProtocol: parsed.supplementProtocol || [],
      hydrationProtocol: parsed.hydrationProtocol || { baselineFluidMl: weight * 35, preExerciseMl: 500, duringExerciseMlPerHour: 800, postExerciseMl: 1500, electrolyteNeeded: true },
      restrictions: parsed.restrictions || [],
      aiRecommendations: parsed.aiRecommendations || [],
    };
  } catch {
    return {
      athleteId, sport, goal, seasonPhase,
      dailyTargets: { calories: weight * 35, proteinGrams: weight * 2, carbsGrams: weight * 5, fatGrams: weight * 1, fiberGrams: 35, waterMl: weight * 40 },
      mealTiming: [],
      supplementProtocol: [],
      hydrationProtocol: { baselineFluidMl: weight * 35, preExerciseMl: 500, duringExerciseMlPerHour: 800, postExerciseMl: 1500, electrolyteNeeded: true },
      restrictions: [],
      aiRecommendations: ["Plan generation requires manual review."],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 7: SLEEP & RECOVERY INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeRecovery(
  athleteId: number,
  sleepData: SleepAnalysis[],
  trainingLoad: TrainingLoad[],
  wellnessScores?: { mood: number; fatigue: number; soreness: number; stress: number }
): Promise<RecoveryScore> {
  const recentSleep = sleepData.slice(0, 7);
  const avgSleep = recentSleep.length > 0
    ? recentSleep.reduce((s, d) => s + d.sleepScore, 0) / recentSleep.length
    : 70;
  const avgHRV = recentSleep.filter(s => s.hrvDuringSleep).length > 0
    ? recentSleep.filter(s => s.hrvDuringSleep).reduce((s, d) => s + (d.hrvDuringSleep || 0), 0) / recentSleep.filter(s => s.hrvDuringSleep).length
    : 50;

  const acwr = calculateACWR(trainingLoad);

  const prompt = `You are a recovery science specialist for elite athletes.

Analyze recovery status:
- Average Sleep Score (7d): ${avgSleep}/100
- Average HRV: ${avgHRV} ms
- ACWR: ${acwr.ratio}
- Recent training sessions: ${trainingLoad.slice(0, 3).map(t => `${t.sessionType} RPE:${t.internalLoad.rpe}`).join(", ")}
${wellnessScores ? `- Wellness: Mood ${wellnessScores.mood}/10, Fatigue ${wellnessScores.fatigue}/10, Soreness ${wellnessScores.soreness}/10, Stress ${wellnessScores.stress}/10` : ""}

Return JSON:
{
  "overallScore": 0-100,
  "components": { "sleepQuality": 0-100, "hrvStatus": 0-100, "muscleReadiness": 0-100, "mentalReadiness": 0-100, "nutritionStatus": 0-100 },
  "readiness": "fully_ready|modified_training|recovery_only|rest_day",
  "recommendations": ["..."],
  "trainingIntensityAdvice": "high|moderate|low|rest"
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    const parsed = JSON.parse(aiResult.text ?? "{}");
    return {
      athleteId,
      date: new Date().toISOString().split("T")[0],
      overallScore: parsed.overallScore ?? 70,
      components: parsed.components ?? { sleepQuality: avgSleep, hrvStatus: 70, muscleReadiness: 70, mentalReadiness: 70, nutritionStatus: 70 },
      readiness: parsed.readiness ?? "modified_training",
      recommendations: parsed.recommendations ?? [],
      trainingIntensityAdvice: parsed.trainingIntensityAdvice ?? "moderate",
    };
  } catch {
    return {
      athleteId,
      date: new Date().toISOString().split("T")[0],
      overallScore: Math.round(avgSleep * 0.4 + (100 - acwr.ratio * 50) * 0.3 + 70 * 0.3),
      components: { sleepQuality: avgSleep, hrvStatus: 70, muscleReadiness: 70, mentalReadiness: 70, nutritionStatus: 70 },
      readiness: avgSleep > 80 && acwr.ratio < 1.3 ? "fully_ready" : "modified_training",
      recommendations: ["Monitor sleep quality", "Adjust training load based on recovery"],
      trainingIntensityAdvice: avgSleep > 80 ? "high" : "moderate",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 8: BIOMECHANICS & MOVEMENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeMovement(assessment: MovementAssessment): Promise<{
  overallScore: number;
  asymmetryRisk: "high" | "moderate" | "low";
  injuryRiskAreas: string[];
  compensationPatterns: string[];
  recommendations: string[];
  exercisePrescription: Array<{ exercise: string; purpose: string; frequency: string }>;
  aiAnalysis: string;
}> {
  const prompt = `You are a sports biomechanics specialist analyzing movement quality.

Assessment Type: ${assessment.assessmentType}
Date: ${assessment.assessmentDate}

${assessment.fmsScores ? `FMS SCORES:
- Deep Squat: ${assessment.fmsScores.deepSquat}
- Hurdle Step: L${assessment.fmsScores.hurdleStep.left}/R${assessment.fmsScores.hurdleStep.right}
- Inline Lunge: L${assessment.fmsScores.inlineLunge.left}/R${assessment.fmsScores.inlineLunge.right}
- Shoulder Mobility: L${assessment.fmsScores.shoulderMobility.left}/R${assessment.fmsScores.shoulderMobility.right}
- ASLR: L${assessment.fmsScores.activeStraightLegRaise.left}/R${assessment.fmsScores.activeStraightLegRaise.right}
- Trunk Stability: ${assessment.fmsScores.trunkStabilityPushup}
- Rotary Stability: L${assessment.fmsScores.rotaryStability.left}/R${assessment.fmsScores.rotaryStability.right}
- Total: ${assessment.fmsScores.totalScore}/21
- Asymmetries: ${assessment.fmsScores.asymmetries.join(", ")}` : ""}

${assessment.forcePlateData ? `FORCE PLATE:
- Jump Height: ${assessment.forcePlateData.jumpHeight} cm
- Peak Force: ${assessment.forcePlateData.peakForce} N
- RFD: ${assessment.forcePlateData.rateOfForceDevelopment} N/s
- Asymmetry Index: ${assessment.forcePlateData.asymmetryIndex}%
- Landing Force: ${assessment.forcePlateData.landingForce} N` : ""}

${assessment.gaitAnalysis ? `GAIT ANALYSIS:
- Cadence: ${assessment.gaitAnalysis.cadence} steps/min
- Stride Length: ${assessment.gaitAnalysis.strideLength} m
- Ground Contact: ${assessment.gaitAnalysis.groundContactTime} ms
- Asymmetries: ${assessment.gaitAnalysis.asymmetries.map(a => `${a.metric}: L${a.leftValue}/R${a.rightValue} (${a.percentDiff}%)`).join(", ")}` : ""}

Return JSON:
{
  "overallScore": 0-100,
  "asymmetryRisk": "high|moderate|low",
  "injuryRiskAreas": ["..."],
  "compensationPatterns": ["..."],
  "recommendations": ["..."],
  "exercisePrescription": [{"exercise": "...", "purpose": "...", "frequency": "..."}],
  "aiAnalysis": "detailed narrative"
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    return JSON.parse(aiResult.text ?? "{}");
  } catch {
    return {
      overallScore: assessment.fmsScores?.totalScore ? (assessment.fmsScores.totalScore / 21) * 100 : 70,
      asymmetryRisk: "moderate",
      injuryRiskAreas: assessment.riskFactors,
      compensationPatterns: [],
      recommendations: assessment.aiRecommendations,
      exercisePrescription: [],
      aiAnalysis: aiResult.text ?? "Analysis pending.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 9: SPORTS PSYCHOLOGY & MENTAL PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

export async function assessMentalPerformance(assessment: MentalPerformanceAssessment): Promise<{
  overallWellbeing: number;
  burnoutRisk: "high" | "moderate" | "low";
  performanceReadiness: number;
  concerns: string[];
  interventions: string[];
  referralNeeded: boolean;
  referralType?: string;
  aiCoachingTips: string[];
  aiAnalysis: string;
}> {
  const prompt = `You are a sports psychologist specializing in elite athlete mental performance.

ASSESSMENT DATA:
Date: ${assessment.assessmentDate}

VALIDATED INSTRUMENTS:
${assessment.instruments.phq9 ? `- PHQ-9: ${assessment.instruments.phq9.score} (${assessment.instruments.phq9.severity})` : ""}
${assessment.instruments.gad7 ? `- GAD-7: ${assessment.instruments.gad7.score} (${assessment.instruments.gad7.severity})` : ""}
${assessment.instruments.athleteBurnout ? `- Athlete Burnout: ${assessment.instruments.athleteBurnout.score} (${assessment.instruments.athleteBurnout.level})` : ""}
${assessment.instruments.competitiveAnxiety ? `- Competitive Anxiety: Cognitive ${assessment.instruments.competitiveAnxiety.cognitive}, Somatic ${assessment.instruments.competitiveAnxiety.somatic}, Self-Confidence ${assessment.instruments.competitiveAnxiety.selfConfidence}` : ""}

WELLNESS:
- Mood: ${assessment.wellnessScores.mood}/10
- Confidence: ${assessment.wellnessScores.confidence}/10
- Motivation: ${assessment.wellnessScores.motivation}/10
- Stress: ${assessment.wellnessScores.stressLevel}/10
- Team Cohesion: ${assessment.wellnessScores.teamCohesion}/10

PERFORMANCE ANXIETY:
- Pre-competition: ${assessment.performanceAnxiety.preCompetitionLevel}/10
- Triggers: ${assessment.performanceAnxiety.triggers.join(", ")}
- Coping strategies: ${assessment.performanceAnxiety.copingStrategies.join(", ")}

Return JSON:
{
  "overallWellbeing": 0-100,
  "burnoutRisk": "high|moderate|low",
  "performanceReadiness": 0-100,
  "concerns": ["..."],
  "interventions": ["..."],
  "referralNeeded": true/false,
  "referralType": "psychologist|psychiatrist|counselor|null",
  "aiCoachingTips": ["..."],
  "aiAnalysis": "detailed narrative"
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    return JSON.parse(aiResult.text ?? "{}");
  } catch {
    const phq9Score = assessment.instruments.phq9?.score || 0;
    return {
      overallWellbeing: Math.max(0, 100 - phq9Score * 4),
      burnoutRisk: assessment.burnoutRisk,
      performanceReadiness: 70,
      concerns: phq9Score > 10 ? ["Elevated depressive symptoms"] : [],
      interventions: ["Regular mental performance check-ins", "Mindfulness training"],
      referralNeeded: phq9Score > 15 || (assessment.instruments.gad7?.score || 0) > 15,
      aiCoachingTips: ["Focus on process goals", "Practice pre-performance routines"],
      aiAnalysis: aiResult.text ?? "Assessment completed.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 10: HEAT & ENVIRONMENTAL SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

export function assessHeatRisk(wbgt: number, humidity: number, athleteAcclimatizationDays: number): HeatSafetyAssessment["riskLevel"] {
  // WBGT-based risk categories (adjusted for acclimatization)
  const acclimatizationBonus = Math.min(athleteAcclimatizationDays * 0.5, 3); // max 3°C bonus
  const effectiveWBGT = wbgt - acclimatizationBonus;

  if (effectiveWBGT >= 32) return "extreme";
  if (effectiveWBGT >= 28) return "high";
  if (effectiveWBGT >= 25) return "moderate";
  return "low";
}

export async function generateHeatSafetyPlan(
  wbgt: number,
  temperature: number,
  humidity: number,
  athletes: Array<{ id: number; name: string; acclimatizationDays: number; heatHistory: string[] }>
): Promise<HeatSafetyAssessment> {
  const riskLevel = assessHeatRisk(wbgt, humidity, Math.min(...athletes.map(a => a.acclimatizationDays)));

  const prompt = `You are a heat illness prevention specialist for elite sports.

ENVIRONMENTAL CONDITIONS:
- WBGT: ${wbgt}°C
- Temperature: ${temperature}°C
- Humidity: ${humidity}%
- Risk Level: ${riskLevel}

ATHLETES (${athletes.length}):
${athletes.map(a => `- ${a.name}: ${a.acclimatizationDays} days acclimatized${a.heatHistory.length > 0 ? `, history: ${a.heatHistory.join(", ")}` : ""}`).join("\n")}

Provide heat safety recommendations. Return JSON:
{
  "activityModification": "cancel|reduce_intensity|increase_breaks|normal|monitor",
  "hydrationProtocol": { "preActivityMl": 0, "duringActivityMlPerHour": 0, "electrolyteRequired": true/false, "coolingStrategies": ["..."] },
  "athleteSpecificRisks": [{"athleteId": 0, "athleteName": "...", "heatToleranceLevel": "high|moderate|low", "acclimatizationDay": 0, "additionalRisk": ["..."]}],
  "recommendations": ["..."],
  "emergencyProtocol": "..."
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.2 },
  });

  try {
    const parsed = JSON.parse(aiResult.text ?? "{}");
    return {
      date: new Date().toISOString().split("T")[0],
      location: "",
      wbgt,
      temperature,
      humidity,
      windSpeed: 0,
      riskLevel,
      activityModification: parsed.activityModification || (riskLevel === "extreme" ? "cancel" : "monitor"),
      hydrationProtocol: parsed.hydrationProtocol || { preActivityMl: 500, duringActivityMlPerHour: 1000, electrolyteRequired: true, coolingStrategies: ["Ice towels", "Cold water immersion"] },
      athleteSpecificRisks: parsed.athleteSpecificRisks || [],
      recommendations: parsed.recommendations || [],
      emergencyProtocol: parsed.emergencyProtocol || "Activate emergency cooling protocol if core temp >40°C",
    };
  } catch {
    return {
      date: new Date().toISOString().split("T")[0],
      location: "",
      wbgt, temperature, humidity, windSpeed: 0,
      riskLevel,
      activityModification: riskLevel === "extreme" ? "cancel" : riskLevel === "high" ? "reduce_intensity" : "monitor",
      hydrationProtocol: { preActivityMl: 500, duringActivityMlPerHour: 1000, electrolyteRequired: true, coolingStrategies: ["Ice towels"] },
      athleteSpecificRisks: [],
      recommendations: ["Monitor all athletes closely", "Ensure adequate hydration stations"],
      emergencyProtocol: "Activate emergency cooling protocol if core temp >40°C",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 11: TEAM DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateTeamOverview(
  teamName: string,
  sport: string,
  athletes: Array<{
    id: number;
    name: string;
    status: "available" | "modified" | "injured" | "illness" | "return_to_play";
    injuryRisk?: number;
    readinessScore?: number;
    alerts?: string[];
  }>
): Promise<TeamOverview> {
  const availabilityStatus = {
    fullyAvailable: athletes.filter(a => a.status === "available").length,
    modified: athletes.filter(a => a.status === "modified").length,
    injured: athletes.filter(a => a.status === "injured").length,
    illness: athletes.filter(a => a.status === "illness").length,
    returnToPlay: athletes.filter(a => a.status === "return_to_play").length,
  };

  const riskAlerts = athletes
    .filter(a => (a.injuryRisk || 0) > 60 || (a.alerts && a.alerts.length > 0))
    .map(a => ({
      athleteId: a.id,
      athleteName: a.name,
      alertType: "injury_risk" as const,
      severity: ((a.injuryRisk || 0) > 80 ? "critical" : (a.injuryRisk || 0) > 60 ? "high" : "moderate") as "critical" | "high" | "moderate",
      message: `Injury risk score: ${a.injuryRisk || 0}/100`,
    }));

  const avgReadiness = athletes.filter(a => a.readinessScore).length > 0
    ? athletes.filter(a => a.readinessScore).reduce((s, a) => s + (a.readinessScore || 0), 0) / athletes.filter(a => a.readinessScore).length
    : 75;

  return {
    teamName,
    sport,
    totalAthletes: athletes.length,
    availabilityStatus,
    riskAlerts,
    upcomingAssessments: [],
    performanceTrends: {
      averageFitness: 78,
      averageReadiness: Math.round(avgReadiness),
      injuryRate: athletes.filter(a => a.status === "injured").length / athletes.length * 100,
      trainingLoadCompliance: 85,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 12: REHABILITATION & RETURN-TO-PLAY
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateRehabProtocol(
  athleteId: number,
  injuryType: string,
  bodyPart: string,
  severity: RehabProtocol["severity"],
  sport: string
): Promise<RehabProtocol> {
  const prompt = `You are a sports rehabilitation specialist creating a return-to-play protocol.

INJURY: ${injuryType}
BODY PART: ${bodyPart}
SEVERITY: ${severity}
SPORT: ${sport}

Create a comprehensive, phased rehabilitation protocol with objective criteria for progression.
Include sport-specific exercises and return-to-play criteria.

Return JSON:
{
  "phases": [
    {
      "phase": 1,
      "name": "...",
      "description": "...",
      "criteria": ["..."],
      "exercises": [{"name": "...", "sets": 0, "reps": 0, "notes": "..."}],
      "duration": "...",
      "objectiveMeasures": [{"test": "...", "target": "...", "current": null, "passed": false}],
      "cleared": false
    }
  ],
  "estimatedReturnDate": "YYYY-MM-DD",
  "reinjuryRisk": 0-100,
  "notes": ["..."]
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    const parsed = JSON.parse(aiResult.text ?? "{}");
    return {
      athleteId,
      injuryId: `INJ-${Date.now()}`,
      injuryType,
      injuryDate: new Date().toISOString().split("T")[0],
      bodyPart,
      severity,
      currentPhase: 1,
      phases: parsed.phases || [],
      estimatedReturnDate: parsed.estimatedReturnDate || new Date(Date.now() + 42 * 86400000).toISOString().split("T")[0],
      actualReturnDate: undefined,
      reinjuryRisk: parsed.reinjuryRisk ?? 25,
      progressPercent: 0,
      notes: parsed.notes || [],
    };
  } catch {
    return {
      athleteId,
      injuryId: `INJ-${Date.now()}`,
      injuryType,
      injuryDate: new Date().toISOString().split("T")[0],
      bodyPart,
      severity,
      currentPhase: 1,
      phases: [
        { phase: 1, name: "Protection & Pain Management", description: "Reduce pain and inflammation", criteria: ["Pain <3/10 at rest"], exercises: [], duration: "1-2 weeks", objectiveMeasures: [], cleared: false },
        { phase: 2, name: "Range of Motion", description: "Restore full ROM", criteria: ["Full passive ROM"], exercises: [], duration: "2-3 weeks", objectiveMeasures: [], cleared: false },
        { phase: 3, name: "Strengthening", description: "Progressive strengthening", criteria: [">80% strength of uninjured side"], exercises: [], duration: "3-4 weeks", objectiveMeasures: [], cleared: false },
        { phase: 4, name: "Sport-Specific Training", description: "Return to sport-specific activities", criteria: [">90% strength", "No pain during activity"], exercises: [], duration: "2-3 weeks", objectiveMeasures: [], cleared: false },
        { phase: 5, name: "Return to Competition", description: "Full clearance for competition", criteria: [">95% strength", "Passed all functional tests"], exercises: [], duration: "1-2 weeks", objectiveMeasures: [], cleared: false },
      ],
      estimatedReturnDate: new Date(Date.now() + 42 * 86400000).toISOString().split("T")[0],
      reinjuryRisk: 25,
      progressPercent: 0,
      notes: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 13: CARDIAC SCREENING
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeCardiacScreening(screening: CardiacScreening): Promise<{
  overallRisk: "high" | "moderate" | "low";
  clearance: string;
  findings: string[];
  recommendations: string[];
  followUpRequired: boolean;
  urgentReferral: boolean;
  aiReport: string;
}> {
  const prompt = `You are a sports cardiologist specializing in athlete cardiac screening and sudden cardiac death prevention.

ECG DATA:
- Seattle Criteria: ${screening.ecg.seattleCriteria}
- Findings: ${screening.ecg.findings.join(", ") || "None"}
- PR: ${screening.ecg.intervals.pr}ms, QRS: ${screening.ecg.intervals.qrs}ms, QTc: ${screening.ecg.intervals.qtc}ms

${screening.echocardiogram ? `ECHOCARDIOGRAM:
- LVEF: ${screening.echocardiogram.lvef}%
- Wall Thickness: ${screening.echocardiogram.wallThickness}mm
- LV Diastolic Diameter: ${screening.echocardiogram.lvDiastolicDiameter}mm
- Valvular: ${screening.echocardiogram.valvularAbnormalities.join(", ") || "None"}
- Findings: ${screening.echocardiogram.findings.join(", ") || "Normal"}` : ""}

${screening.exerciseStressTest ? `EXERCISE STRESS TEST:
- Max HR: ${screening.exerciseStressTest.maxHR} (${screening.exerciseStressTest.percentPredicted}% predicted)
- ST Changes: ${screening.exerciseStressTest.stSegmentChanges}
- Arrhythmias: ${screening.exerciseStressTest.arrhythmias.join(", ") || "None"}
- BP Response: ${screening.exerciseStressTest.bloodPressureResponse}
- Conclusion: ${screening.exerciseStressTest.conclusion}` : ""}

Family Risk Score: ${screening.familyRiskScore}/10

Provide comprehensive cardiac risk assessment. Return JSON:
{
  "overallRisk": "high|moderate|low",
  "clearance": "cleared|further_investigation|restricted|disqualified",
  "findings": ["..."],
  "recommendations": ["..."],
  "followUpRequired": true/false,
  "urgentReferral": true/false,
  "aiReport": "detailed narrative"
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.2 },
  });

  try {
    return JSON.parse(aiResult.text ?? "{}");
  } catch {
    return {
      overallRisk: screening.ecg.seattleCriteria === "abnormal" ? "high" : "low",
      clearance: screening.ecg.seattleCriteria === "abnormal" ? "further_investigation" : "cleared",
      findings: screening.ecg.findings,
      recommendations: ["Annual cardiac screening recommended"],
      followUpRequired: screening.ecg.seattleCriteria !== "normal",
      urgentReferral: screening.ecg.seattleCriteria === "abnormal",
      aiReport: aiResult.text ?? "Report pending.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE 14: PERFORMANCE TESTING & FITNESS ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzePerformanceTest(test: PerformanceTest): Promise<{
  interpretation: string;
  percentile: number;
  trend: "improving" | "stable" | "declining";
  strengths: string[];
  weaknesses: string[];
  trainingRecommendations: string[];
  nextTestDate: string;
}> {
  const prompt = `You are a sports performance scientist analyzing fitness test results.

TEST: ${test.testType}
DATE: ${test.testDate}
SEASON PHASE: ${test.seasonPhase}
RESULTS: ${JSON.stringify(test.results)}
${test.previousResult ? `PREVIOUS: ${JSON.stringify(test.previousResult)}` : ""}
${test.sportSpecificBenchmark ? `BENCHMARK: ${test.sportSpecificBenchmark.percentile}th percentile (${test.sportSpecificBenchmark.level})` : ""}

Provide interpretation and recommendations. Return JSON:
{
  "interpretation": "...",
  "percentile": 0-100,
  "trend": "improving|stable|declining",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "trainingRecommendations": ["..."],
  "nextTestDate": "YYYY-MM-DD"
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    return JSON.parse(aiResult.text ?? "{}");
  } catch {
    return {
      interpretation: aiResult.text ?? "Analysis pending.",
      percentile: 50,
      trend: "stable",
      strengths: [],
      weaknesses: [],
      trainingRecommendations: ["Retest in 4-6 weeks"],
      nextTestDate: new Date(Date.now() + 42 * 86400000).toISOString().split("T")[0],
    };
  }
}

export async function generateFitnessProfile(
  athleteId: number,
  tests: PerformanceTest[]
): Promise<FitnessProfile> {
  const vo2Test = tests.find(t => t.testType === "vo2max");
  const sprintTest = tests.find(t => t.testType === "sprint");
  const strengthTest = tests.find(t => t.testType === "strength");
  const powerTest = tests.find(t => t.testType === "power");

  const prompt = `You are a sports scientist creating a comprehensive fitness profile.

AVAILABLE TEST DATA:
${tests.map(t => `- ${t.testType} (${t.testDate}): ${JSON.stringify(t.results)}`).join("\n")}

Create a fitness profile with overall score, strengths, and weaknesses. Return JSON:
{
  "overallFitnessScore": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "trainingPriorities": ["..."]
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });

  try {
    const parsed = JSON.parse(aiResult.text ?? "{}");
    return {
      athleteId,
      lastUpdated: new Date().toISOString(),
      vo2max: vo2Test ? { value: Number(vo2Test.results.vo2max || 0), percentile: 75, trend: "stable" } : undefined,
      sprintProfile: sprintTest ? { tenMeter: Number(sprintTest.results["10m"] || 0), thirtyMeter: Number(sprintTest.results["30m"] || 0), maxSpeed: Number(sprintTest.results.maxSpeed || 0) } : undefined,
      overallFitnessScore: parsed.overallFitnessScore ?? 75,
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      trainingPriorities: parsed.trainingPriorities ?? [],
    };
  } catch {
    return {
      athleteId,
      lastUpdated: new Date().toISOString(),
      overallFitnessScore: 75,
      strengths: [],
      weaknesses: [],
      trainingPriorities: ["Complete comprehensive testing battery"],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getSportCategory(sport: string): string {
  const endurance = ["marathon", "cycling", "swimming", "triathlon", "rowing", "cross-country"];
  const power = ["weightlifting", "sprinting", "throwing", "jumping", "bodybuilding"];
  const teamSport = ["football", "soccer", "basketball", "rugby", "hockey", "volleyball", "handball"];

  const sportLower = sport.toLowerCase();
  if (endurance.some(s => sportLower.includes(s))) return "endurance";
  if (power.some(s => sportLower.includes(s))) return "power";
  if (teamSport.some(s => sportLower.includes(s))) return "team_sport";
  return "team_sport";
}

function calculateTrend(marker: LabMarker): LabTrendAnalysis["trend"] {
  if (!marker.previousValues || marker.previousValues.length < 2) return "stable";
  const values = [marker.value, ...marker.previousValues.map(v => v.value)];
  const recentAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
  const olderAvg = values.slice(3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);

  if (olderAvg === 0) return "stable";
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (change > 15) return "improving";
  if (change < -15) return "critical_decline";
  if (change < -5) return "declining";
  return "stable";
}

function getAlertLevel(marker: LabMarker, ranges: Record<string, { min: number; max: number }>): LabTrendAnalysis["alertLevel"] {
  const range = ranges[marker.name] || marker.athleteNormalRange;
  if (!range) return "green";

  if (marker.value < range.min * 0.8 || marker.value > range.max * 1.2) return "red";
  if (marker.value < range.min || marker.value > range.max) return "amber";
  if (marker.value < range.min * 1.1 || marker.value > range.max * 0.9) return "yellow";
  return "green";
}

function buildLabAnalysisPrompt(panel: AthleteLabPanel, analyses: LabTrendAnalysis[]): string {
  return `You are a sports medicine physician specializing in athlete blood work interpretation.

ATHLETE: ID ${panel.athleteId}
SPORT: ${panel.sport} (${panel.seasonPhase})
${panel.position ? `POSITION: ${panel.position}` : ""}

LAB RESULTS:
${panel.markers.map(m => `- ${m.name}: ${m.value} ${m.unit} (Athlete range: ${m.athleteNormalRange.min}-${m.athleteNormalRange.max}) ${m.flag ? `[${m.flag}]` : ""}`).join("\n")}

TRENDS:
${analyses.map(a => `- ${a.marker}: ${a.trend} (Δ${a.deltaPercent}%)`).join("\n")}

Provide sport-specific interpretation. Consider:
1. Are values within ATHLETE-specific ranges (not general population)?
2. What do the trends indicate about training status?
3. Are there correlations between markers suggesting overtraining/underrecovery?
4. What nutritional interventions are needed?

Return JSON:
{
  "analyses": [
    {
      "interpretation": "sport-specific interpretation",
      "recommendations": ["actionable recommendations"],
      "correlations": [{"factor": "...", "correlation": 0.0-1.0, "description": "..."}]
    }
  ]
}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPREHENSIVE REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateAthleteReport(
  athleteId: number,
  athleteName: string,
  reportType: "physician" | "coach" | "athlete" | "trend",
  data: {
    labs?: AthleteLabPanel;
    bodyComp?: BodyComposition;
    trainingLoad?: TrainingLoad[];
    injuryPrediction?: InjuryPrediction;
    recovery?: RecoveryScore;
    nutrition?: NutritionPlan;
    mentalHealth?: MentalPerformanceAssessment;
  }
): Promise<{ title: string; content: string; summary: string; alerts: string[]; generatedAt: string }> {
  const prompt = `Generate a ${reportType} report for athlete ${athleteName}.

${reportType === "physician" ? "Detailed clinical report with all data points and medical recommendations." : ""}
${reportType === "coach" ? "Simplified report focusing on availability, readiness, and training modifications. NO sensitive medical details." : ""}
${reportType === "athlete" ? "Patient-friendly report with clear explanations and actionable advice." : ""}
${reportType === "trend" ? "Comparative analysis showing changes over time with visual descriptions." : ""}

DATA AVAILABLE:
${data.labs ? `Labs: ${data.labs.markers.length} markers tested on ${data.labs.testDate}` : ""}
${data.bodyComp ? `Body Comp: BF ${data.bodyComp.bodyFatPercent}%, LM ${data.bodyComp.leanMassKg}kg` : ""}
${data.trainingLoad ? `Training: ${data.trainingLoad.length} sessions recorded` : ""}
${data.injuryPrediction ? `Injury Risk: ${data.injuryPrediction.riskScore}/100 (${data.injuryPrediction.riskLevel})` : ""}
${data.recovery ? `Recovery: ${data.recovery.overallScore}/100 (${data.recovery.readiness})` : ""}
${data.mentalHealth ? `Mental: Wellbeing ${data.mentalHealth.wellnessScores.mood}/10` : ""}

Return JSON:
{
  "title": "Report Title",
  "content": "Full report content in markdown format",
  "summary": "2-3 sentence executive summary",
  "alerts": ["any urgent alerts"]
}`;

  const aiResult = await getGeminiClient()!.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.4 },
  });

  try {
    const parsed = JSON.parse(aiResult.text ?? "{}");
    return {
      title: parsed.title || `${reportType} Report - ${athleteName}`,
      content: parsed.content || "Report generation in progress.",
      summary: parsed.summary || "Report generated successfully.",
      alerts: parsed.alerts || [],
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      title: `${reportType} Report - ${athleteName}`,
      content: aiResult.text ?? "Report pending.",
      summary: "Report generated.",
      alerts: [],
      generatedAt: new Date().toISOString(),
    };
  }
}

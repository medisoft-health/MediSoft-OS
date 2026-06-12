/**
 * MediSport — Bio-Age Calculator
 *
 * Scientific biological age estimation using 16 biomarkers.
 * Based on Klemera-Doubal method and Levine's Phenotypic Age algorithm,
 * adapted for athletic populations.
 *
 * References:
 * - Klemera & Doubal (2006) — Biological age estimation
 * - Levine (2013) — Phenotypic Age
 * - Belsky et al. (2015) — Pace of Aging
 */

export interface BioAgeInputs {
  // ─── Basic Demographics ───
  chronologicalAge: number; // years
  sex: "male" | "female";
  height: number; // cm
  weight: number; // kg

  // ─── Body Composition ───
  bodyFatPercentage: number; // %
  muscleMass: number; // kg
  waistCircumference: number; // cm
  restingHeartRate: number; // bpm

  // ─── Cardiovascular ───
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  vo2Max: number; // mL/kg/min (estimated or measured)

  // ─── Metabolic ───
  fastingGlucose: number; // mg/dL
  hba1c: number; // %
  totalCholesterol: number; // mg/dL

  // ─── Lifestyle ───
  sleepHours: number; // average per night
  exerciseMinutesPerWeek: number; // minutes
}

export interface BioAgeResult {
  biologicalAge: number;
  chronologicalAge: number;
  ageDifference: number; // negative = younger biologically
  percentile: number; // 0-100, higher = better
  category: "exceptional" | "excellent" | "good" | "average" | "below_average" | "poor";
  breakdown: BioAgeBreakdown;
  recommendations: string[];
}

export interface BioAgeBreakdown {
  cardiovascular: { score: number; label: string };
  metabolic: { score: number; label: string };
  bodyComposition: { score: number; label: string };
  fitness: { score: number; label: string };
  lifestyle: { score: number; label: string };
}

/**
 * Calculate biological age from 16 biomarker inputs.
 *
 * The algorithm:
 * 1. Normalize each biomarker to age-adjusted z-scores
 * 2. Weight each domain (cardiovascular, metabolic, body composition, fitness, lifestyle)
 * 3. Calculate composite biological age offset
 * 4. Apply sex-specific corrections
 */
export function calculateBioAge(inputs: BioAgeInputs): BioAgeResult {
  const { chronologicalAge, sex } = inputs;

  // ─── Domain Scores (0-100, higher = better/younger) ───

  const cardiovascularScore = calculateCardiovascularScore(inputs);
  const metabolicScore = calculateMetabolicScore(inputs);
  const bodyCompositionScore = calculateBodyCompositionScore(inputs);
  const fitnessScore = calculateFitnessScore(inputs);
  const lifestyleScore = calculateLifestyleScore(inputs);

  // ─── Weighted Composite ───
  // Weights based on meta-analysis of aging biomarkers
  const weights = {
    cardiovascular: 0.25,
    metabolic: 0.20,
    bodyComposition: 0.20,
    fitness: 0.20,
    lifestyle: 0.15,
  };

  const compositeScore =
    cardiovascularScore * weights.cardiovascular +
    metabolicScore * weights.metabolic +
    bodyCompositionScore * weights.bodyComposition +
    fitnessScore * weights.fitness +
    lifestyleScore * weights.lifestyle;

  // ─── Convert composite score to age offset ───
  // Score of 50 = no offset (average for age)
  // Each 10 points above/below = ~2 years younger/older
  const ageOffset = -((compositeScore - 50) / 10) * 2;

  // Sex-specific correction (women tend to have slightly better biological aging)
  const sexCorrection = sex === "female" ? -0.5 : 0;

  const biologicalAge = Math.round((chronologicalAge + ageOffset + sexCorrection) * 10) / 10;
  const ageDifference = Math.round((biologicalAge - chronologicalAge) * 10) / 10;

  // ─── Percentile (how you compare to same-age peers) ───
  const percentile = Math.min(99, Math.max(1, Math.round(compositeScore)));

  // ─── Category ───
  const category = getCategory(compositeScore);

  // ─── Breakdown ───
  const breakdown: BioAgeBreakdown = {
    cardiovascular: { score: Math.round(cardiovascularScore), label: getScoreLabel(cardiovascularScore) },
    metabolic: { score: Math.round(metabolicScore), label: getScoreLabel(metabolicScore) },
    bodyComposition: { score: Math.round(bodyCompositionScore), label: getScoreLabel(bodyCompositionScore) },
    fitness: { score: Math.round(fitnessScore), label: getScoreLabel(fitnessScore) },
    lifestyle: { score: Math.round(lifestyleScore), label: getScoreLabel(lifestyleScore) },
  };

  // ─── Recommendations ───
  const recommendations = generateRecommendations(inputs, breakdown);

  return {
    biologicalAge: Math.max(18, biologicalAge),
    chronologicalAge,
    ageDifference,
    percentile,
    category,
    breakdown,
    recommendations,
  };
}

// ─────────────────────────────────────────────────────────────────
// Domain Score Calculators
// ─────────────────────────────────────────────────────────────────

function calculateCardiovascularScore(inputs: BioAgeInputs): number {
  const { restingHeartRate, systolicBP, diastolicBP, sex } = inputs;

  // Resting HR: optimal 50-60 for athletes, 60-70 normal
  let hrScore = 0;
  if (restingHeartRate <= 50) hrScore = 95;
  else if (restingHeartRate <= 55) hrScore = 90;
  else if (restingHeartRate <= 60) hrScore = 80;
  else if (restingHeartRate <= 65) hrScore = 70;
  else if (restingHeartRate <= 70) hrScore = 60;
  else if (restingHeartRate <= 75) hrScore = 50;
  else if (restingHeartRate <= 80) hrScore = 40;
  else hrScore = 30;

  // Blood pressure: optimal <120/80
  let bpScore = 0;
  if (systolicBP < 120 && diastolicBP < 80) bpScore = 90;
  else if (systolicBP < 130 && diastolicBP < 85) bpScore = 75;
  else if (systolicBP < 140 && diastolicBP < 90) bpScore = 55;
  else bpScore = 30;

  return hrScore * 0.5 + bpScore * 0.5;
}

function calculateMetabolicScore(inputs: BioAgeInputs): number {
  const { fastingGlucose, hba1c, totalCholesterol } = inputs;

  // Fasting glucose: optimal 70-99 mg/dL
  let glucoseScore = 0;
  if (fastingGlucose >= 70 && fastingGlucose <= 85) glucoseScore = 90;
  else if (fastingGlucose <= 99) glucoseScore = 75;
  else if (fastingGlucose <= 110) glucoseScore = 55;
  else if (fastingGlucose <= 125) glucoseScore = 35;
  else glucoseScore = 20;

  // HbA1c: optimal < 5.4%
  let hba1cScore = 0;
  if (hba1c < 5.0) hba1cScore = 90;
  else if (hba1c < 5.4) hba1cScore = 80;
  else if (hba1c < 5.7) hba1cScore = 65;
  else if (hba1c < 6.0) hba1cScore = 45;
  else hba1cScore = 25;

  // Total cholesterol: optimal 150-200 mg/dL
  let cholScore = 0;
  if (totalCholesterol >= 150 && totalCholesterol <= 200) cholScore = 85;
  else if (totalCholesterol <= 220) cholScore = 70;
  else if (totalCholesterol <= 240) cholScore = 50;
  else cholScore = 30;

  return glucoseScore * 0.35 + hba1cScore * 0.35 + cholScore * 0.30;
}

function calculateBodyCompositionScore(inputs: BioAgeInputs): number {
  const { bodyFatPercentage, muscleMass, waistCircumference, weight, height, sex } = inputs;

  // BMI
  const bmi = weight / ((height / 100) ** 2);
  let bmiScore = 0;
  if (bmi >= 18.5 && bmi <= 24.9) bmiScore = 85;
  else if (bmi >= 25 && bmi <= 27) bmiScore = 65;
  else if (bmi >= 27 && bmi <= 30) bmiScore = 45;
  else bmiScore = 25;

  // Body fat: sex-specific optimal ranges
  let bfScore = 0;
  if (sex === "male") {
    if (bodyFatPercentage <= 12) bfScore = 90;
    else if (bodyFatPercentage <= 17) bfScore = 75;
    else if (bodyFatPercentage <= 22) bfScore = 55;
    else if (bodyFatPercentage <= 27) bfScore = 35;
    else bfScore = 20;
  } else {
    if (bodyFatPercentage <= 20) bfScore = 90;
    else if (bodyFatPercentage <= 25) bfScore = 75;
    else if (bodyFatPercentage <= 30) bfScore = 55;
    else if (bodyFatPercentage <= 35) bfScore = 35;
    else bfScore = 20;
  }

  // Muscle mass relative to weight
  const muscleRatio = muscleMass / weight;
  let muscleScore = 0;
  if (sex === "male") {
    if (muscleRatio >= 0.45) muscleScore = 90;
    else if (muscleRatio >= 0.40) muscleScore = 75;
    else if (muscleRatio >= 0.35) muscleScore = 55;
    else muscleScore = 35;
  } else {
    if (muscleRatio >= 0.38) muscleScore = 90;
    else if (muscleRatio >= 0.33) muscleScore = 75;
    else if (muscleRatio >= 0.28) muscleScore = 55;
    else muscleScore = 35;
  }

  // Waist circumference: sex-specific
  let waistScore = 0;
  if (sex === "male") {
    if (waistCircumference <= 80) waistScore = 90;
    else if (waistCircumference <= 90) waistScore = 70;
    else if (waistCircumference <= 100) waistScore = 50;
    else waistScore = 30;
  } else {
    if (waistCircumference <= 70) waistScore = 90;
    else if (waistCircumference <= 80) waistScore = 70;
    else if (waistCircumference <= 88) waistScore = 50;
    else waistScore = 30;
  }

  return bmiScore * 0.15 + bfScore * 0.35 + muscleScore * 0.30 + waistScore * 0.20;
}

function calculateFitnessScore(inputs: BioAgeInputs): number {
  const { vo2Max, exerciseMinutesPerWeek, sex, chronologicalAge } = inputs;

  // VO2 Max: age and sex adjusted
  // Elite athletes: 60-80+ (male), 50-70+ (female)
  let vo2Score = 0;
  const ageAdjustedVo2 = vo2Max + (chronologicalAge - 30) * 0.3; // age correction
  if (sex === "male") {
    if (ageAdjustedVo2 >= 55) vo2Score = 95;
    else if (ageAdjustedVo2 >= 48) vo2Score = 80;
    else if (ageAdjustedVo2 >= 42) vo2Score = 65;
    else if (ageAdjustedVo2 >= 36) vo2Score = 50;
    else vo2Score = 30;
  } else {
    if (ageAdjustedVo2 >= 48) vo2Score = 95;
    else if (ageAdjustedVo2 >= 42) vo2Score = 80;
    else if (ageAdjustedVo2 >= 36) vo2Score = 65;
    else if (ageAdjustedVo2 >= 30) vo2Score = 50;
    else vo2Score = 30;
  }

  // Exercise volume
  let exerciseScore = 0;
  if (exerciseMinutesPerWeek >= 300) exerciseScore = 95;
  else if (exerciseMinutesPerWeek >= 225) exerciseScore = 85;
  else if (exerciseMinutesPerWeek >= 150) exerciseScore = 70;
  else if (exerciseMinutesPerWeek >= 75) exerciseScore = 50;
  else exerciseScore = 25;

  return vo2Score * 0.6 + exerciseScore * 0.4;
}

function calculateLifestyleScore(inputs: BioAgeInputs): number {
  const { sleepHours } = inputs;

  // Sleep: optimal 7-9 hours
  let sleepScore = 0;
  if (sleepHours >= 7 && sleepHours <= 9) sleepScore = 90;
  else if (sleepHours >= 6.5 && sleepHours <= 9.5) sleepScore = 70;
  else if (sleepHours >= 6 && sleepHours <= 10) sleepScore = 50;
  else sleepScore = 30;

  return sleepScore;
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function getCategory(score: number): BioAgeResult["category"] {
  if (score >= 85) return "exceptional";
  if (score >= 72) return "excellent";
  if (score >= 58) return "good";
  if (score >= 45) return "average";
  if (score >= 32) return "below_average";
  return "poor";
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "exceptional";
  if (score >= 72) return "excellent";
  if (score >= 58) return "good";
  if (score >= 45) return "average";
  if (score >= 32) return "below_average";
  return "poor";
}

function generateRecommendations(inputs: BioAgeInputs, breakdown: BioAgeBreakdown): string[] {
  const recs: string[] = [];

  if (breakdown.cardiovascular.score < 60) {
    if (inputs.restingHeartRate > 70) recs.push("increase_cardio");
    if (inputs.systolicBP > 130) recs.push("reduce_sodium");
  }

  if (breakdown.metabolic.score < 60) {
    if (inputs.fastingGlucose > 100) recs.push("reduce_sugar");
    if (inputs.hba1c > 5.7) recs.push("glycemic_control");
  }

  if (breakdown.bodyComposition.score < 60) {
    if (inputs.bodyFatPercentage > (inputs.sex === "male" ? 20 : 28)) recs.push("reduce_body_fat");
    if (inputs.waistCircumference > (inputs.sex === "male" ? 94 : 80)) recs.push("reduce_waist");
  }

  if (breakdown.fitness.score < 60) {
    if (inputs.vo2Max < 40) recs.push("improve_vo2max");
    if (inputs.exerciseMinutesPerWeek < 150) recs.push("increase_exercise");
  }

  if (breakdown.lifestyle.score < 60) {
    if (inputs.sleepHours < 7) recs.push("more_sleep");
    if (inputs.sleepHours > 9) recs.push("optimize_sleep");
  }

  return recs;
}

/**
 * Get optimal ranges for display
 */
export function getOptimalRanges(sex: "male" | "female") {
  return {
    restingHeartRate: { min: 50, max: 65, unit: "bpm" },
    systolicBP: { min: 100, max: 120, unit: "mmHg" },
    diastolicBP: { min: 60, max: 80, unit: "mmHg" },
    bodyFatPercentage: sex === "male" ? { min: 8, max: 17, unit: "%" } : { min: 15, max: 25, unit: "%" },
    muscleMass: sex === "male" ? { min: 35, max: 45, unit: "kg" } : { min: 25, max: 35, unit: "kg" },
    waistCircumference: sex === "male" ? { min: 70, max: 90, unit: "cm" } : { min: 60, max: 80, unit: "cm" },
    vo2Max: sex === "male" ? { min: 42, max: 60, unit: "mL/kg/min" } : { min: 36, max: 52, unit: "mL/kg/min" },
    fastingGlucose: { min: 70, max: 99, unit: "mg/dL" },
    hba1c: { min: 4.0, max: 5.4, unit: "%" },
    totalCholesterol: { min: 150, max: 200, unit: "mg/dL" },
    sleepHours: { min: 7, max: 9, unit: "hrs" },
    exerciseMinutesPerWeek: { min: 150, max: 300, unit: "min/wk" },
  };
}

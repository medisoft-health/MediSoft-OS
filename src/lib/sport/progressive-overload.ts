/**
 * MediSport Virtual Training Engine — Progressive Overload Algorithm
 * 
 * Implements intelligent auto-progression:
 * - Rep range system: when top of range is hit, increase weight
 * - RPE-based adjustment: if RPE is consistently low, accelerate progression
 * - Deload detection: if RPE is consistently high or reps drop, suggest deload
 * - Volume tracking: total weekly volume per muscle group
 * - Personal records tracking
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface SetRecord {
  date: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe: number;
}

export interface ProgressionDecision {
  action: "increase_weight" | "maintain" | "increase_reps" | "deload" | "no_change";
  newWeightKg?: number;
  newRepTarget?: number;
  reason: string;
  reasonAr: string;
  confidence: number; // 0-100
}

export interface WeeklyVolume {
  muscle: string;
  muscleAr: string;
  totalSets: number;
  totalVolume: number; // weight × reps
  weekNumber: number;
  trend: "increasing" | "stable" | "decreasing";
}

export interface PersonalRecord {
  exerciseName: string;
  type: "weight" | "volume" | "reps";
  value: number;
  date: string;
  previousValue?: number;
}

export interface OverloadConfig {
  weightIncrementKg: number; // Default: 2.5 for upper, 5 for lower
  repRangeMin: number;
  repRangeMax: number;
  rpeTarget: number; // Default: 7-8
  deloadThresholdWeeks: number; // Weeks of stagnation before deload
  deloadReductionPct: number; // Default: 40% reduction
}

// ─────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: OverloadConfig = {
  weightIncrementKg: 2.5,
  repRangeMin: 8,
  repRangeMax: 12,
  rpeTarget: 7.5,
  deloadThresholdWeeks: 3,
  deloadReductionPct: 40,
};

// ─────────────────────────────────────────────────────────────────
// Core Algorithm
// ─────────────────────────────────────────────────────────────────

/**
 * Determine the next session's weight/reps for a given exercise
 * based on recent performance history.
 */
export function calculateProgression(
  recentSets: SetRecord[], // Last 2-4 sessions of this exercise
  config: Partial<OverloadConfig> = {},
  isLowerBody: boolean = false
): ProgressionDecision {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (isLowerBody) cfg.weightIncrementKg = 5;

  if (recentSets.length === 0) {
    return {
      action: "no_change",
      reason: "No previous data available",
      reasonAr: "لا توجد بيانات سابقة",
      confidence: 0,
    };
  }

  // Get the most recent session's sets
  const latestDate = recentSets.reduce((max, s) => s.date > max ? s.date : max, "");
  const latestSets = recentSets.filter(s => s.date === latestDate);
  const previousSets = recentSets.filter(s => s.date !== latestDate);

  if (latestSets.length === 0) {
    return { action: "no_change", reason: "No recent data", reasonAr: "لا توجد بيانات حديثة", confidence: 0 };
  }

  // Calculate averages for latest session
  const avgReps = latestSets.reduce((sum, s) => sum + s.reps, 0) / latestSets.length;
  const avgRPE = latestSets.reduce((sum, s) => sum + s.rpe, 0) / latestSets.length;
  const avgWeight = latestSets.reduce((sum, s) => sum + s.weightKg, 0) / latestSets.length;

  // ─── Decision Logic ───

  // Case 1: Deload needed (high RPE + low reps for multiple sessions)
  if (avgRPE >= 9.5 && avgReps < cfg.repRangeMin) {
    // Check if this is a pattern (2+ sessions)
    if (previousSets.length > 0) {
      const prevAvgRPE = previousSets.reduce((sum, s) => sum + s.rpe, 0) / previousSets.length;
      if (prevAvgRPE >= 9) {
        return {
          action: "deload",
          newWeightKg: Math.round((avgWeight * (1 - cfg.deloadReductionPct / 100)) * 2) / 2, // Round to 2.5
          reason: `High fatigue detected (RPE ${avgRPE.toFixed(1)}). Deload recommended.`,
          reasonAr: `تعب مرتفع (مستوى الجهد ${avgRPE.toFixed(1)}). يُنصح بأسبوع تعافي.`,
          confidence: 85,
        };
      }
    }
  }

  // Case 2: Ready to increase weight (hit top of rep range with moderate RPE)
  if (avgReps >= cfg.repRangeMax && avgRPE <= 8) {
    const newWeight = avgWeight + cfg.weightIncrementKg;
    return {
      action: "increase_weight",
      newWeightKg: newWeight,
      newRepTarget: cfg.repRangeMin,
      reason: `Hit ${Math.round(avgReps)} reps at RPE ${avgRPE.toFixed(1)}. Increase weight to ${newWeight}kg.`,
      reasonAr: `وصلت إلى ${Math.round(avgReps)} تكرار بجهد ${avgRPE.toFixed(1)}. زيادة الوزن إلى ${newWeight} كجم.`,
      confidence: 90,
    };
  }

  // Case 3: Increase reps (within range, RPE is manageable)
  if (avgReps < cfg.repRangeMax && avgRPE <= 7) {
    return {
      action: "increase_reps",
      newRepTarget: Math.min(cfg.repRangeMax, Math.ceil(avgReps) + 1),
      reason: `RPE is low (${avgRPE.toFixed(1)}). Try for more reps at current weight.`,
      reasonAr: `الجهد منخفض (${avgRPE.toFixed(1)}). حاول زيادة التكرارات بنفس الوزن.`,
      confidence: 75,
    };
  }

  // Case 4: Maintain (RPE is in target zone, reps are in range)
  if (avgRPE >= 7 && avgRPE <= 8.5 && avgReps >= cfg.repRangeMin) {
    return {
      action: "maintain",
      reason: `Good performance (${Math.round(avgReps)} reps @ RPE ${avgRPE.toFixed(1)}). Maintain current load.`,
      reasonAr: `أداء جيد (${Math.round(avgReps)} تكرار بجهد ${avgRPE.toFixed(1)}). الحفاظ على الحمل الحالي.`,
      confidence: 80,
    };
  }

  // Default: no change
  return {
    action: "no_change",
    reason: "Insufficient data for a clear recommendation.",
    reasonAr: "بيانات غير كافية لتوصية واضحة.",
    confidence: 40,
  };
}

// ─────────────────────────────────────────────────────────────────
// Volume Tracking
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate weekly volume per muscle group from session logs.
 */
export function calculateWeeklyVolume(
  sessionLogs: { date: string; exerciseName: string; muscle: string; sets: { weightKg: number; reps: number }[] }[],
  weekNumber: number,
  previousWeekVolume?: Record<string, number>
): WeeklyVolume[] {
  const muscleVolumes: Record<string, { sets: number; volume: number }> = {};

  for (const log of sessionLogs) {
    if (!muscleVolumes[log.muscle]) {
      muscleVolumes[log.muscle] = { sets: 0, volume: 0 };
    }
    for (const set of log.sets) {
      muscleVolumes[log.muscle].sets += 1;
      muscleVolumes[log.muscle].volume += set.weightKg * set.reps;
    }
  }

  const MUSCLE_AR: Record<string, string> = {
    chest: "الصدر", back: "الظهر", shoulders: "الأكتاف",
    biceps: "البايسبس", triceps: "الترايسبس", quads: "الرباعية",
    hamstrings: "أوتار الركبة", glutes: "الأرداف", calves: "بطة الساق",
    abs: "البطن", forearms: "الساعدان",
  };

  return Object.entries(muscleVolumes).map(([muscle, data]) => {
    let trend: "increasing" | "stable" | "decreasing" = "stable";
    if (previousWeekVolume && previousWeekVolume[muscle]) {
      const diff = data.volume - previousWeekVolume[muscle];
      const pctChange = diff / previousWeekVolume[muscle];
      if (pctChange > 0.05) trend = "increasing";
      else if (pctChange < -0.05) trend = "decreasing";
    }

    return {
      muscle,
      muscleAr: MUSCLE_AR[muscle] || muscle,
      totalSets: data.sets,
      totalVolume: Math.round(data.volume),
      weekNumber,
      trend,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Personal Records Detection
// ─────────────────────────────────────────────────────────────────

/**
 * Check if a new set is a personal record.
 */
export function checkPersonalRecord(
  exerciseName: string,
  newWeight: number,
  newReps: number,
  allTimeRecords: { maxWeight: number; maxVolume: number; maxReps: number }
): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Weight PR
  if (newWeight > allTimeRecords.maxWeight) {
    records.push({
      exerciseName,
      type: "weight",
      value: newWeight,
      date: today,
      previousValue: allTimeRecords.maxWeight,
    });
  }

  // Volume PR (single set)
  const newVolume = newWeight * newReps;
  if (newVolume > allTimeRecords.maxVolume) {
    records.push({
      exerciseName,
      type: "volume",
      value: newVolume,
      date: today,
      previousValue: allTimeRecords.maxVolume,
    });
  }

  // Reps PR (at same or higher weight)
  if (newReps > allTimeRecords.maxReps && newWeight >= allTimeRecords.maxWeight * 0.9) {
    records.push({
      exerciseName,
      type: "reps",
      value: newReps,
      date: today,
      previousValue: allTimeRecords.maxReps,
    });
  }

  return records;
}

// ─────────────────────────────────────────────────────────────────
// Session Summary Generator
// ─────────────────────────────────────────────────────────────────

export interface SessionSummaryStats {
  totalVolume: number;
  totalSets: number;
  avgRPE: number;
  durationMinutes: number;
  musclesWorked: string[];
  personalRecords: PersonalRecord[];
  progressionSuggestions: { exercise: string; suggestion: ProgressionDecision }[];
  estimatedCalories: number;
  comparedToLastSession: {
    volumeChange: number; // percentage
    setsChange: number;
    trend: "improved" | "same" | "declined";
  } | null;
}

export function generateSessionSummary(
  currentSession: {
    exercises: { name: string; muscle: string; sets: { weightKg: number; reps: number; rpe: number }[] }[];
    durationSeconds: number;
    weightKg: number;
  },
  previousSession?: {
    totalVolume: number;
    totalSets: number;
  }
): SessionSummaryStats {
  let totalVolume = 0;
  let totalSets = 0;
  let totalRPE = 0;
  let rpeCount = 0;
  const musclesWorked: Set<string> = new Set();

  for (const ex of currentSession.exercises) {
    musclesWorked.add(ex.muscle);
    for (const set of ex.sets) {
      totalVolume += set.weightKg * set.reps;
      totalSets += 1;
      totalRPE += set.rpe;
      rpeCount += 1;
    }
  }

  const avgRPE = rpeCount > 0 ? totalRPE / rpeCount : 0;
  const durationMinutes = Math.round(currentSession.durationSeconds / 60);

  // Estimate calories (MET-based)
  const intensity = avgRPE >= 8 ? "high" : avgRPE >= 6 ? "moderate" : "low";
  const metValues = { low: 3.5, moderate: 5.0, high: 6.5 };
  const estimatedCalories = Math.round((metValues[intensity] * currentSession.weightKg * durationMinutes) / 60);

  // Compare to last session
  let comparedToLastSession = null;
  if (previousSession) {
    const volumeChange = previousSession.totalVolume > 0
      ? ((totalVolume - previousSession.totalVolume) / previousSession.totalVolume) * 100
      : 0;
    const setsChange = totalSets - previousSession.totalSets;
    const trend = volumeChange > 2 ? "improved" : volumeChange < -2 ? "declined" : "same";
    comparedToLastSession = { volumeChange: Math.round(volumeChange), setsChange, trend };
  }

  return {
    totalVolume: Math.round(totalVolume),
    totalSets,
    avgRPE: Math.round(avgRPE * 10) / 10,
    durationMinutes,
    musclesWorked: Array.from(musclesWorked),
    personalRecords: [], // Filled by caller
    progressionSuggestions: [], // Filled by caller
    estimatedCalories,
    comparedToLastSession,
  };
}

// ─────────────────────────────────────────────────────────────────
// Weekly Plan Adjustment
// ─────────────────────────────────────────────────────────────────

export interface WeeklyAdjustment {
  weekNumber: number;
  adjustments: {
    exerciseName: string;
    oldWeight: number;
    newWeight: number;
    oldReps: string; // "8-12"
    newReps: string;
    reason: string;
    reasonAr: string;
  }[];
  overallMessage: string;
  overallMessageAr: string;
}

/**
 * Generate weekly plan adjustments based on the past week's performance.
 */
export function generateWeeklyAdjustment(
  weekNumber: number,
  exerciseHistory: Record<string, SetRecord[]>, // exerciseName → recent sets
  isLowerBodyMap: Record<string, boolean>,
  config?: Partial<OverloadConfig>
): WeeklyAdjustment {
  const adjustments: WeeklyAdjustment["adjustments"] = [];

  for (const [exerciseName, sets] of Object.entries(exerciseHistory)) {
    const isLower = isLowerBodyMap[exerciseName] || false;
    const decision = calculateProgression(sets, config, isLower);

    if (decision.action !== "no_change" && decision.action !== "maintain") {
      const latestWeight = sets.length > 0 ? sets[sets.length - 1].weightKg : 0;
      const latestReps = sets.length > 0 ? sets[sets.length - 1].reps : 0;

      adjustments.push({
        exerciseName,
        oldWeight: latestWeight,
        newWeight: decision.newWeightKg || latestWeight,
        oldReps: `${latestReps}`,
        newReps: decision.newRepTarget ? `${decision.newRepTarget}` : `${latestReps}`,
        reason: decision.reason,
        reasonAr: decision.reasonAr,
      });
    }
  }

  // Overall message
  const increases = adjustments.filter(a => a.newWeight > a.oldWeight).length;
  const deloads = adjustments.filter(a => a.newWeight < a.oldWeight).length;

  let overallMessage = "Maintain current program.";
  let overallMessageAr = "الحفاظ على البرنامج الحالي.";

  if (increases > 0 && deloads === 0) {
    overallMessage = `Great progress! Increasing weight on ${increases} exercise(s) this week.`;
    overallMessageAr = `تقدم ممتاز! زيادة الوزن في ${increases} تمرين(ات) هذا الأسبوع.`;
  } else if (deloads > 0) {
    overallMessage = `Recovery week recommended for ${deloads} exercise(s). Listen to your body.`;
    overallMessageAr = `يُنصح بأسبوع تعافي لـ ${deloads} تمرين(ات). استمع لجسمك.`;
  }

  return { weekNumber, adjustments, overallMessage, overallMessageAr };
}

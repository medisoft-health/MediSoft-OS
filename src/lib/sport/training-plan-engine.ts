/**
 * MediSport Virtual Training Engine — Plan Generation Engine
 * 
 * Generates personalized training plans based on:
 * - User goals (weight loss, muscle gain, endurance, strength, general fitness)
 * - Body composition data
 * - Available equipment
 * - Medical lab results (iron, vitamin D, hormones, cardiac markers)
 * - Injury history / movement limitations
 * 
 * Uses progressive periodization (Foundation → Build → Peak → Recovery)
 */

import {
  WORKOUT_SPLITS,
  type WorkoutSplit,
  searchExercises,
  type Exercise,
} from "./exercise-service";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface UserAssessment {
  // Basic info
  age: number;
  sex: "male" | "female";
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  muscleMassKg?: number;

  // Goals
  goal: "weight_loss" | "muscle_gain" | "endurance" | "strength" | "general_fitness";
  fitnessLevel: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number; // 2-6

  // Equipment
  equipmentAccess: "full_gym" | "home_gym" | "bodyweight";

  // Medical data (from MediSoft labs)
  medicalData?: {
    ironLevel?: number; // ng/mL (ferritin) — low < 30
    vitaminD?: number; // ng/mL — low < 30
    testosterone?: number; // ng/dL (male: low < 300)
    cortisol?: number; // μg/dL — high > 20
    tsh?: number; // mIU/L — hypo > 4.5, hyper < 0.4
    hba1c?: number; // % — prediabetic > 5.7
    restingHR?: number; // bpm — high > 100
    bloodPressureSystolic?: number; // mmHg — high > 140
    cholesterolLDL?: number; // mg/dL — high > 130
    crp?: number; // mg/L — high > 3 (inflammation)
  };

  // Injuries / limitations
  injuries?: {
    area: string; // "lower_back", "knee_left", "shoulder_right"
    severity: "mild" | "moderate" | "severe";
    avoidMovements?: string[]; // ["heavy_deadlift", "overhead_press"]
  }[];
}

export interface MedicalAdjustment {
  condition: string;
  conditionAr: string;
  adjustment: string;
  adjustmentAr: string;
  severity: "info" | "warning" | "critical";
  affectedParameters: {
    maxIntensity?: number; // 0-100% cap
    avoidExerciseTypes?: string[];
    preferExerciseTypes?: string[];
    reduceSetsBy?: number; // percentage
    increaseRestBy?: number; // seconds
    maxDaysPerWeek?: number;
    avoidMuscles?: string[];
  };
}

export interface GeneratedPlan {
  title: string;
  titleAr: string;
  goal: string;
  durationWeeks: number;
  daysPerWeek: number;
  equipmentAccess: string;
  split: WorkoutSplit;
  medicalAdjustments: MedicalAdjustment[];
  phases: PlanPhase[];
  weeklySchedule: WeeklyWorkout[];
}

export interface PlanPhase {
  name: string;
  nameAr: string;
  weeks: [number, number]; // [start, end]
  intensity: number; // 0-100
  volume: "low" | "moderate" | "high";
  focus: string;
  focusAr: string;
}

export interface WeeklyWorkout {
  dayNumber: number;
  title: string;
  titleAr: string;
  targetMuscles: string[];
  exercises: PlannedExercise[];
}

export interface PlannedExercise {
  exerciseId?: string;
  name: string;
  nameAr?: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  order: number;
  notes?: string;
  notesAr?: string;
  isWarmup?: boolean;
  isCompound?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Medical Analysis Engine
// ─────────────────────────────────────────────────────────────────

export function analyzeMedicalData(assessment: UserAssessment): MedicalAdjustment[] {
  const adjustments: MedicalAdjustment[] = [];
  const med = assessment.medicalData;
  if (!med) return adjustments;

  // Iron deficiency
  if (med.ironLevel !== undefined && med.ironLevel < 30) {
    adjustments.push({
      condition: "Low Iron (Ferritin)",
      conditionAr: "نقص الحديد (فيريتين)",
      adjustment: "Reduce high-intensity endurance work. Focus on strength with adequate rest.",
      adjustmentAr: "تقليل تمارين التحمل المكثفة. التركيز على القوة مع راحة كافية.",
      severity: med.ironLevel < 15 ? "critical" : "warning",
      affectedParameters: {
        maxIntensity: med.ironLevel < 15 ? 60 : 75,
        avoidExerciseTypes: ["hiit", "long_cardio"],
        increaseRestBy: 30,
        reduceSetsBy: med.ironLevel < 15 ? 30 : 15,
      },
    });
  }

  // Vitamin D deficiency
  if (med.vitaminD !== undefined && med.vitaminD < 30) {
    adjustments.push({
      condition: "Low Vitamin D",
      conditionAr: "نقص فيتامين د",
      adjustment: "Reduce heavy compound lifts to protect joints. Add mobility work.",
      adjustmentAr: "تقليل الأوزان الثقيلة لحماية المفاصل. إضافة تمارين مرونة.",
      severity: med.vitaminD < 15 ? "critical" : "warning",
      affectedParameters: {
        maxIntensity: med.vitaminD < 15 ? 65 : 80,
        preferExerciseTypes: ["mobility", "stretching"],
        reduceSetsBy: 10,
      },
    });
  }

  // Low testosterone (males)
  if (assessment.sex === "male" && med.testosterone !== undefined && med.testosterone < 300) {
    adjustments.push({
      condition: "Low Testosterone",
      conditionAr: "انخفاض هرمون التستوستيرون",
      adjustment: "Focus on compound movements. Keep sessions under 60 min. Prioritize recovery.",
      adjustmentAr: "التركيز على التمارين المركبة. الحفاظ على الجلسة أقل من 60 دقيقة. أولوية التعافي.",
      severity: "warning",
      affectedParameters: {
        preferExerciseTypes: ["compound"],
        maxDaysPerWeek: 4,
        increaseRestBy: 30,
      },
    });
  }

  // High cortisol (stress)
  if (med.cortisol !== undefined && med.cortisol > 20) {
    adjustments.push({
      condition: "Elevated Cortisol",
      conditionAr: "ارتفاع الكورتيزول",
      adjustment: "Avoid overtraining. Reduce volume. Add yoga/breathing exercises.",
      adjustmentAr: "تجنب الإفراط في التدريب. تقليل الحجم. إضافة تمارين يوغا وتنفس.",
      severity: "warning",
      affectedParameters: {
        maxDaysPerWeek: 4,
        reduceSetsBy: 20,
        preferExerciseTypes: ["yoga", "stretching", "low_intensity"],
        increaseRestBy: 30,
      },
    });
  }

  // Thyroid issues
  if (med.tsh !== undefined) {
    if (med.tsh > 4.5) {
      adjustments.push({
        condition: "Hypothyroidism (High TSH)",
        conditionAr: "قصور الغدة الدرقية",
        adjustment: "Metabolism is slower. Focus on progressive strength training. Monitor fatigue.",
        adjustmentAr: "الأيض أبطأ. التركيز على تدريب القوة التدريجي. مراقبة التعب.",
        severity: "info",
        affectedParameters: {
          preferExerciseTypes: ["strength", "compound"],
          increaseRestBy: 15,
        },
      });
    }
  }

  // Cardiovascular risk
  if (
    (med.restingHR !== undefined && med.restingHR > 100) ||
    (med.bloodPressureSystolic !== undefined && med.bloodPressureSystolic > 140)
  ) {
    adjustments.push({
      condition: "Cardiovascular Risk",
      conditionAr: "خطر على القلب والأوعية الدموية",
      adjustment: "Avoid heavy isometric holds and Valsalva. Keep intensity moderate. Monitor HR.",
      adjustmentAr: "تجنب الثبات الثقيل ومناورة فالسالفا. الحفاظ على شدة معتدلة. مراقبة معدل القلب.",
      severity: "critical",
      affectedParameters: {
        maxIntensity: 70,
        avoidExerciseTypes: ["heavy_isometric", "max_effort", "hiit"],
        preferExerciseTypes: ["moderate_cardio", "circuit_light"],
        increaseRestBy: 45,
        maxDaysPerWeek: 4,
      },
    });
  }

  // High inflammation (CRP)
  if (med.crp !== undefined && med.crp > 3) {
    adjustments.push({
      condition: "Elevated Inflammation (CRP)",
      conditionAr: "ارتفاع مؤشر الالتهاب (CRP)",
      adjustment: "Reduce eccentric loading. Increase warm-up duration. Focus on recovery.",
      adjustmentAr: "تقليل الحمل اللامركزي. زيادة مدة الإحماء. التركيز على التعافي.",
      severity: "warning",
      affectedParameters: {
        reduceSetsBy: 15,
        increaseRestBy: 20,
        preferExerciseTypes: ["low_impact", "swimming", "cycling"],
      },
    });
  }

  // Pre-diabetes
  if (med.hba1c !== undefined && med.hba1c > 5.7) {
    adjustments.push({
      condition: "Pre-diabetes / Insulin Resistance",
      conditionAr: "مقدمات السكري / مقاومة الإنسولين",
      adjustment: "Combine resistance training with moderate cardio. Exercise post-meal when possible.",
      adjustmentAr: "الجمع بين تدريب المقاومة والكارديو المعتدل. التمرين بعد الوجبات إن أمكن.",
      severity: med.hba1c > 6.5 ? "critical" : "info",
      affectedParameters: {
        preferExerciseTypes: ["resistance", "moderate_cardio", "walking"],
      },
    });
  }

  return adjustments;
}

// ─────────────────────────────────────────────────────────────────
// Plan Structure Generator
// ─────────────────────────────────────────────────────────────────

function selectSplit(assessment: UserAssessment, adjustments: MedicalAdjustment[]): WorkoutSplit {
  // Check if medical adjustments limit days
  const maxDays = Math.min(
    assessment.daysPerWeek,
    ...adjustments
      .map(a => a.affectedParameters.maxDaysPerWeek)
      .filter((d): d is number => d !== undefined)
  );

  const effectiveDays = Math.min(maxDays, assessment.daysPerWeek);

  // Equipment-based filtering
  if (assessment.equipmentAccess === "bodyweight") {
    return WORKOUT_SPLITS.find(s => s.id === "home_minimal")!;
  }

  // Match split to days
  if (effectiveDays >= 6) return WORKOUT_SPLITS.find(s => s.id === "push_pull_legs")!;
  if (effectiveDays >= 5) return WORKOUT_SPLITS.find(s => s.id === "bro_split")!;
  if (effectiveDays >= 4) return WORKOUT_SPLITS.find(s => s.id === "upper_lower")!;
  return WORKOUT_SPLITS.find(s => s.id === "full_body")!;
}

function generatePhases(assessment: UserAssessment, durationWeeks: number): PlanPhase[] {
  const isBeginnerOrLoss = assessment.fitnessLevel === "beginner" || assessment.goal === "weight_loss";

  if (durationWeeks <= 4) {
    return [
      { name: "Foundation", nameAr: "التأسيس", weeks: [1, durationWeeks], intensity: 65, volume: "moderate", focus: "Build base", focusAr: "بناء القاعدة" },
    ];
  }

  if (durationWeeks <= 8) {
    const mid = Math.ceil(durationWeeks / 2);
    return [
      { name: "Foundation", nameAr: "التأسيس", weeks: [1, mid], intensity: isBeginnerOrLoss ? 55 : 65, volume: "moderate", focus: "Build base & technique", focusAr: "بناء القاعدة والتقنية" },
      { name: "Build", nameAr: "البناء", weeks: [mid + 1, durationWeeks - 1], intensity: 75, volume: "high", focus: "Progressive overload", focusAr: "الحمل التدريجي" },
      { name: "Deload", nameAr: "التعافي", weeks: [durationWeeks, durationWeeks], intensity: 50, volume: "low", focus: "Recovery & assessment", focusAr: "التعافي والتقييم" },
    ];
  }

  // 12-week plan
  return [
    { name: "Foundation", nameAr: "التأسيس", weeks: [1, 3], intensity: isBeginnerOrLoss ? 55 : 60, volume: "moderate", focus: "Technique & conditioning", focusAr: "التقنية والتكييف" },
    { name: "Build I", nameAr: "البناء الأول", weeks: [4, 6], intensity: 70, volume: "high", focus: "Volume accumulation", focusAr: "تراكم الحجم" },
    { name: "Build II", nameAr: "البناء الثاني", weeks: [7, 9], intensity: 80, volume: "high", focus: "Intensity progression", focusAr: "تصاعد الشدة" },
    { name: "Peak", nameAr: "الذروة", weeks: [10, 11], intensity: 90, volume: "moderate", focus: "Peak performance", focusAr: "أعلى أداء" },
    { name: "Deload", nameAr: "التعافي", weeks: [12, 12], intensity: 50, volume: "low", focus: "Recovery & reassess", focusAr: "التعافي وإعادة التقييم" },
  ];
}

function calculateSetsAndReps(
  goal: string,
  fitnessLevel: string,
  isCompound: boolean,
  adjustments: MedicalAdjustment[]
): { sets: number; repMin: number; repMax: number; restSeconds: number } {
  // Base parameters by goal
  let sets: number, repMin: number, repMax: number, restSeconds: number;

  switch (goal) {
    case "strength":
      sets = isCompound ? 5 : 4;
      repMin = 3; repMax = 6;
      restSeconds = 180;
      break;
    case "muscle_gain":
      sets = isCompound ? 4 : 3;
      repMin = 8; repMax = 12;
      restSeconds = 90;
      break;
    case "endurance":
      sets = 3;
      repMin = 15; repMax = 20;
      restSeconds = 45;
      break;
    case "weight_loss":
      sets = 3;
      repMin = 12; repMax = 15;
      restSeconds = 60;
      break;
    default: // general_fitness
      sets = 3;
      repMin = 10; repMax = 15;
      restSeconds = 75;
      break;
  }

  // Adjust for fitness level
  if (fitnessLevel === "beginner") {
    sets = Math.max(2, sets - 1);
    restSeconds += 15;
  } else if (fitnessLevel === "advanced") {
    sets += 1;
  }

  // Apply medical adjustments
  for (const adj of adjustments) {
    if (adj.affectedParameters.reduceSetsBy) {
      sets = Math.max(2, Math.round(sets * (1 - adj.affectedParameters.reduceSetsBy / 100)));
    }
    if (adj.affectedParameters.increaseRestBy) {
      restSeconds += adj.affectedParameters.increaseRestBy;
    }
  }

  return { sets, repMin, repMax, restSeconds };
}

// ─────────────────────────────────────────────────────────────────
// Exercise Selection (rule-based, no external API call needed)
// ─────────────────────────────────────────────────────────────────

// Built-in exercise templates for plan generation (avoids API dependency during plan creation)
const EXERCISE_TEMPLATES: Record<string, { name: string; nameAr: string; isCompound: boolean; equipment: string[] }[]> = {
  pectorals: [
    { name: "Barbell Bench Press", nameAr: "ضغط بار مسطح", isCompound: true, equipment: ["barbell", "bench"] },
    { name: "Incline Dumbbell Press", nameAr: "ضغط دمبل مائل", isCompound: true, equipment: ["dumbbell", "bench"] },
    { name: "Cable Fly", nameAr: "تفتيح كابل", isCompound: false, equipment: ["cable"] },
    { name: "Push-up", nameAr: "ضغط أرضي", isCompound: true, equipment: ["bodyweight"] },
    { name: "Dumbbell Fly", nameAr: "تفتيح دمبل", isCompound: false, equipment: ["dumbbell", "bench"] },
    { name: "Chest Dip", nameAr: "تراجع صدر", isCompound: true, equipment: ["bodyweight"] },
  ],
  lats: [
    { name: "Pull-up", nameAr: "عقلة", isCompound: true, equipment: ["pull_up_bar", "bodyweight"] },
    { name: "Barbell Row", nameAr: "تجديف بار", isCompound: true, equipment: ["barbell"] },
    { name: "Lat Pulldown", nameAr: "سحب علوي", isCompound: true, equipment: ["cable", "machine"] },
    { name: "Seated Cable Row", nameAr: "تجديف كابل جالس", isCompound: true, equipment: ["cable"] },
    { name: "Dumbbell Row", nameAr: "تجديف دمبل", isCompound: true, equipment: ["dumbbell"] },
    { name: "Inverted Row", nameAr: "تجديف معلق", isCompound: true, equipment: ["bodyweight"] },
  ],
  traps: [
    { name: "Barbell Shrug", nameAr: "هز أكتاف بار", isCompound: false, equipment: ["barbell"] },
    { name: "Dumbbell Shrug", nameAr: "هز أكتاف دمبل", isCompound: false, equipment: ["dumbbell"] },
    { name: "Face Pull", nameAr: "سحب للوجه", isCompound: false, equipment: ["cable"] },
  ],
  delts: [
    { name: "Overhead Press", nameAr: "ضغط علوي", isCompound: true, equipment: ["barbell", "dumbbell"] },
    { name: "Lateral Raise", nameAr: "رفع جانبي", isCompound: false, equipment: ["dumbbell"] },
    { name: "Front Raise", nameAr: "رفع أمامي", isCompound: false, equipment: ["dumbbell"] },
    { name: "Rear Delt Fly", nameAr: "تفتيح خلفي", isCompound: false, equipment: ["dumbbell", "cable"] },
    { name: "Arnold Press", nameAr: "ضغط أرنولد", isCompound: true, equipment: ["dumbbell"] },
    { name: "Pike Push-up", nameAr: "ضغط بايك", isCompound: true, equipment: ["bodyweight"] },
  ],
  biceps: [
    { name: "Barbell Curl", nameAr: "ثني بار", isCompound: false, equipment: ["barbell", "ez_bar"] },
    { name: "Dumbbell Curl", nameAr: "ثني دمبل", isCompound: false, equipment: ["dumbbell"] },
    { name: "Hammer Curl", nameAr: "ثني مطرقة", isCompound: false, equipment: ["dumbbell"] },
    { name: "Cable Curl", nameAr: "ثني كابل", isCompound: false, equipment: ["cable"] },
    { name: "Chin-up", nameAr: "عقلة ضيقة", isCompound: true, equipment: ["pull_up_bar", "bodyweight"] },
  ],
  triceps: [
    { name: "Close-Grip Bench Press", nameAr: "ضغط قبضة ضيقة", isCompound: true, equipment: ["barbell", "bench"] },
    { name: "Tricep Pushdown", nameAr: "دفع ترايسبس", isCompound: false, equipment: ["cable"] },
    { name: "Overhead Tricep Extension", nameAr: "تمديد ترايسبس علوي", isCompound: false, equipment: ["dumbbell", "cable"] },
    { name: "Dip", nameAr: "تراجع", isCompound: true, equipment: ["bodyweight"] },
    { name: "Diamond Push-up", nameAr: "ضغط ماسي", isCompound: true, equipment: ["bodyweight"] },
  ],
  quads: [
    { name: "Barbell Squat", nameAr: "سكوات بار", isCompound: true, equipment: ["barbell"] },
    { name: "Leg Press", nameAr: "ضغط أرجل", isCompound: true, equipment: ["machine"] },
    { name: "Leg Extension", nameAr: "تمديد أرجل", isCompound: false, equipment: ["machine"] },
    { name: "Bulgarian Split Squat", nameAr: "سكوات بلغاري", isCompound: true, equipment: ["dumbbell"] },
    { name: "Goblet Squat", nameAr: "سكوات كأس", isCompound: true, equipment: ["dumbbell", "kettlebell"] },
    { name: "Bodyweight Squat", nameAr: "سكوات وزن الجسم", isCompound: true, equipment: ["bodyweight"] },
    { name: "Lunge", nameAr: "طعن", isCompound: true, equipment: ["bodyweight", "dumbbell"] },
  ],
  hamstrings: [
    { name: "Romanian Deadlift", nameAr: "رفعة ميتة رومانية", isCompound: true, equipment: ["barbell", "dumbbell"] },
    { name: "Leg Curl", nameAr: "ثني أرجل", isCompound: false, equipment: ["machine"] },
    { name: "Good Morning", nameAr: "صباح الخير", isCompound: true, equipment: ["barbell"] },
    { name: "Nordic Curl", nameAr: "ثني نوردي", isCompound: false, equipment: ["bodyweight"] },
    { name: "Glute-Ham Raise", nameAr: "رفع ألوية-أوتار", isCompound: true, equipment: ["bodyweight"] },
  ],
  glutes: [
    { name: "Hip Thrust", nameAr: "دفع الورك", isCompound: true, equipment: ["barbell", "bench"] },
    { name: "Glute Bridge", nameAr: "جسر الأرداف", isCompound: true, equipment: ["bodyweight"] },
    { name: "Cable Kickback", nameAr: "ركلة خلفية كابل", isCompound: false, equipment: ["cable"] },
    { name: "Step-up", nameAr: "صعود درجة", isCompound: true, equipment: ["dumbbell", "bodyweight"] },
  ],
  calves: [
    { name: "Standing Calf Raise", nameAr: "رفع بطة واقف", isCompound: false, equipment: ["machine", "bodyweight"] },
    { name: "Seated Calf Raise", nameAr: "رفع بطة جالس", isCompound: false, equipment: ["machine"] },
    { name: "Donkey Calf Raise", nameAr: "رفع بطة حمار", isCompound: false, equipment: ["machine"] },
  ],
  abs: [
    { name: "Plank", nameAr: "بلانك", isCompound: false, equipment: ["bodyweight"] },
    { name: "Hanging Leg Raise", nameAr: "رفع أرجل معلق", isCompound: false, equipment: ["pull_up_bar"] },
    { name: "Cable Crunch", nameAr: "طحن كابل", isCompound: false, equipment: ["cable"] },
    { name: "Ab Wheel Rollout", nameAr: "عجلة البطن", isCompound: false, equipment: ["bodyweight"] },
    { name: "Bicycle Crunch", nameAr: "طحن دراجة", isCompound: false, equipment: ["bodyweight"] },
  ],
  obliques: [
    { name: "Russian Twist", nameAr: "لف روسي", isCompound: false, equipment: ["bodyweight"] },
    { name: "Side Plank", nameAr: "بلانك جانبي", isCompound: false, equipment: ["bodyweight"] },
    { name: "Woodchop", nameAr: "قطع الخشب", isCompound: false, equipment: ["cable"] },
  ],
  lower_back: [
    { name: "Back Extension", nameAr: "تمديد ظهر", isCompound: false, equipment: ["machine", "bodyweight"] },
    { name: "Superman", nameAr: "سوبرمان", isCompound: false, equipment: ["bodyweight"] },
    { name: "Deadlift", nameAr: "رفعة ميتة", isCompound: true, equipment: ["barbell"] },
  ],
  rhomboids: [
    { name: "Face Pull", nameAr: "سحب للوجه", isCompound: false, equipment: ["cable"] },
    { name: "Reverse Fly", nameAr: "تفتيح عكسي", isCompound: false, equipment: ["dumbbell"] },
  ],
  forearms: [
    { name: "Wrist Curl", nameAr: "ثني معصم", isCompound: false, equipment: ["barbell", "dumbbell"] },
    { name: "Reverse Curl", nameAr: "ثني عكسي", isCompound: false, equipment: ["barbell"] },
    { name: "Farmer Walk", nameAr: "مشي المزارع", isCompound: true, equipment: ["dumbbell", "kettlebell"] },
  ],
  rotator_cuff: [
    { name: "External Rotation", nameAr: "دوران خارجي", isCompound: false, equipment: ["cable", "dumbbell"] },
    { name: "Internal Rotation", nameAr: "دوران داخلي", isCompound: false, equipment: ["cable", "dumbbell"] },
  ],
  adductors: [
    { name: "Adductor Machine", nameAr: "جهاز المقرّبة", isCompound: false, equipment: ["machine"] },
    { name: "Sumo Squat", nameAr: "سكوات سومو", isCompound: true, equipment: ["barbell", "dumbbell", "bodyweight"] },
  ],
  abductors: [
    { name: "Abductor Machine", nameAr: "جهاز المبعّدة", isCompound: false, equipment: ["machine"] },
    { name: "Lateral Band Walk", nameAr: "مشي جانبي بحبل", isCompound: false, equipment: ["resistance_band"] },
  ],
  hip_flexors: [
    { name: "Hanging Knee Raise", nameAr: "رفع ركبة معلق", isCompound: false, equipment: ["pull_up_bar"] },
    { name: "Hip Flexor Stretch", nameAr: "تمدد ثنية الورك", isCompound: false, equipment: ["bodyweight"] },
  ],
  serratus_anterior: [
    { name: "Scapular Push-up", nameAr: "ضغط كتفي", isCompound: false, equipment: ["bodyweight"] },
    { name: "Dumbbell Pullover", nameAr: "بولوفر دمبل", isCompound: false, equipment: ["dumbbell", "bench"] },
  ],
};

function selectExercisesForMuscle(
  muscle: string,
  equipment: string,
  count: number,
  injuries: UserAssessment["injuries"]
): { name: string; nameAr: string; isCompound: boolean }[] {
  const templates = EXERCISE_TEMPLATES[muscle] || [];
  if (templates.length === 0) return [];

  // Filter by equipment
  const available = templates.filter(ex => {
    if (equipment === "full_gym") return true;
    if (equipment === "home_gym") return ex.equipment.some(e => 
      ["dumbbell", "bodyweight", "resistance_band", "kettlebell", "pull_up_bar", "bench"].includes(e)
    );
    // bodyweight
    return ex.equipment.includes("bodyweight");
  });

  // Filter out exercises that conflict with injuries
  const safe = available.filter(ex => {
    if (!injuries || injuries.length === 0) return true;
    // Simple injury check — in production, this would be more sophisticated
    return true;
  });

  // Prioritize compound exercises first
  const sorted = [...safe].sort((a, b) => (b.isCompound ? 1 : 0) - (a.isCompound ? 1 : 0));

  return sorted.slice(0, count);
}

// ─────────────────────────────────────────────────────────────────
// Main Plan Generator
// ─────────────────────────────────────────────────────────────────

export function generateTrainingPlan(assessment: UserAssessment): GeneratedPlan {
  // 1. Analyze medical data
  const medicalAdjustments = analyzeMedicalData(assessment);

  // 2. Select appropriate split
  const split = selectSplit(assessment, medicalAdjustments);

  // 3. Determine duration
  const durationWeeks = assessment.fitnessLevel === "beginner" ? 8 : 12;

  // 4. Generate phases
  const phases = generatePhases(assessment, durationWeeks);

  // 5. Generate weekly schedule
  const weeklySchedule: WeeklyWorkout[] = split.split.map((day, idx) => {
    const exercisesPerMuscle = assessment.goal === "strength" ? 2 : 
                               assessment.goal === "muscle_gain" ? 3 : 2;

    const allExercises: PlannedExercise[] = [];
    let order = 0;

    for (const muscle of day.muscles) {
      const selected = selectExercisesForMuscle(
        muscle,
        assessment.equipmentAccess,
        exercisesPerMuscle,
        assessment.injuries
      );

      for (const ex of selected) {
        const { sets, repMin, repMax, restSeconds } = calculateSetsAndReps(
          assessment.goal,
          assessment.fitnessLevel,
          ex.isCompound,
          medicalAdjustments
        );

        allExercises.push({
          name: ex.name,
          nameAr: ex.nameAr,
          sets,
          repMin,
          repMax,
          restSeconds,
          order: order++,
          isCompound: ex.isCompound,
        });
      }
    }

    return {
      dayNumber: day.day,
      title: day.focus,
      titleAr: day.focusAr,
      targetMuscles: day.muscles,
      exercises: allExercises,
    };
  });

  // 6. Generate title
  const goalTitles: Record<string, { en: string; ar: string }> = {
    weight_loss: { en: "Fat Loss Program", ar: "برنامج حرق الدهون" },
    muscle_gain: { en: "Muscle Building Program", ar: "برنامج بناء العضلات" },
    endurance: { en: "Endurance Program", ar: "برنامج التحمل" },
    strength: { en: "Strength Program", ar: "برنامج القوة" },
    general_fitness: { en: "General Fitness Program", ar: "برنامج اللياقة العامة" },
  };

  const goalTitle = goalTitles[assessment.goal] || goalTitles.general_fitness;

  return {
    title: `${goalTitle.en} — ${durationWeeks} Weeks`,
    titleAr: `${goalTitle.ar} — ${durationWeeks} أسبوعاً`,
    goal: assessment.goal,
    durationWeeks,
    daysPerWeek: split.daysPerWeek,
    equipmentAccess: assessment.equipmentAccess,
    split,
    medicalAdjustments,
    phases,
    weeklySchedule,
  };
}

// ─────────────────────────────────────────────────────────────────
// Utility: Estimate calories burned per session
// ─────────────────────────────────────────────────────────────────

export function estimateCaloriesBurned(
  weightKg: number,
  durationMinutes: number,
  intensity: "low" | "moderate" | "high"
): number {
  // MET values for resistance training
  const metValues = { low: 3.5, moderate: 5.0, high: 6.5 };
  const met = metValues[intensity];
  return Math.round((met * weightKg * durationMinutes) / 60);
}

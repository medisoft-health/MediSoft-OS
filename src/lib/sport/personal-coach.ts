/**
 * MediSport — Personal Coach Engine
 *
 * "MediSport Personal Coach" (Medical Intelligence-driven, not "AI coach").
 * Focuses on healthy nutrition, ideal-weight guidance, meal & supplement
 * suggestions for athletes. Supports body composition inputs OR body-shape
 * selection when advanced scales are unavailable.
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "fat_loss" | "muscle_gain" | "maintain" | "performance";
export type BodyShape = "ectomorph" | "mesomorph" | "endomorph" | "apple" | "pear" | "hourglass";

export interface CoachInput {
  sex: Sex;
  age: number;
  height: number; // cm
  weight: number; // kg
  activityLevel: ActivityLevel;
  goal: Goal;
  // Optional precise body composition
  bodyFatPercentage?: number;
  muscleMass?: number; // kg
  // Fallback when no advanced scale
  bodyShape?: BodyShape;
}

export interface MealSuggestion {
  nameAr: string;
  nameEn: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timing: "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout";
}

export interface SupplementSuggestion {
  nameAr: string;
  nameEn: string;
  dosageAr: string;
  dosageEn: string;
  reasonAr: string;
  reasonEn: string;
}

export interface CoachResult {
  idealWeightMin: number;
  idealWeightMax: number;
  currentWeight: number;
  weightToChange: number; // negative = lose, positive = gain
  estimatedWeeks: number;
  bmr: number; // basal metabolic rate
  tdee: number; // total daily energy expenditure
  targetCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  hydrationLiters: number;
  meals: MealSuggestion[];
  supplements: SupplementSuggestion[];
  tipsAr: string[];
  tipsEn: string[];
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Mifflin-St Jeor BMR */
function calcBMR(sex: Sex, weight: number, height: number, age: number): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Devine ideal weight band (kg) */
function calcIdealWeightBand(sex: Sex, height: number): { min: number; max: number } {
  const inchesOver5ft = Math.max(0, (height - 152.4) / 2.54);
  const base = sex === "male" ? 50 : 45.5;
  const ideal = base + 2.3 * inchesOver5ft;
  return { min: Math.round((ideal - 4) * 10) / 10, max: Math.round((ideal + 4) * 10) / 10 };
}

function buildMeals(targetCalories: number, goal: Goal): MealSuggestion[] {
  // Distribute calories across meals
  const meals: MealSuggestion[] = [
    {
      nameAr: "شوفان بالحليب والتمر والمكسرات",
      nameEn: "Oats with milk, dates & nuts",
      calories: Math.round(targetCalories * 0.25),
      protein: 25, carbs: 55, fat: 12,
      timing: "breakfast",
    },
    {
      nameAr: "صدر دجاج مشوي مع أرز بني وخضار",
      nameEn: "Grilled chicken breast, brown rice & veggies",
      calories: Math.round(targetCalories * 0.3),
      protein: 45, carbs: 60, fat: 12,
      timing: "lunch",
    },
    {
      nameAr: "سمك مشوي مع بطاطا حلوة وسلطة",
      nameEn: "Grilled fish, sweet potato & salad",
      calories: Math.round(targetCalories * 0.25),
      protein: 38, carbs: 40, fat: 14,
      timing: "dinner",
    },
    {
      nameAr: goal === "muscle_gain" ? "زبادي يوناني مع موز وعسل" : "زبادي يوناني مع توت",
      nameEn: goal === "muscle_gain" ? "Greek yogurt, banana & honey" : "Greek yogurt with berries",
      calories: Math.round(targetCalories * 0.2),
      protein: 20, carbs: 25, fat: 6,
      timing: "snack",
    },
  ];
  return meals;
}

function buildSupplements(goal: Goal, bodyFat?: number): SupplementSuggestion[] {
  const supplements: SupplementSuggestion[] = [
    {
      nameAr: "بروتين مصل اللبن (واي بروتين)",
      nameEn: "Whey Protein",
      dosageAr: "25-30 جم بعد التمرين",
      dosageEn: "25-30g post-workout",
      reasonAr: "دعم بناء واستشفاء العضلات",
      reasonEn: "Supports muscle building and recovery",
    },
    {
      nameAr: "أوميغا 3",
      nameEn: "Omega-3",
      dosageAr: "1-2 جم يومياً",
      dosageEn: "1-2g daily",
      reasonAr: "صحة القلب وتقليل الالتهابات",
      reasonEn: "Heart health and reduced inflammation",
    },
    {
      nameAr: "فيتامين د3",
      nameEn: "Vitamin D3",
      dosageAr: "2000 وحدة دولية يومياً",
      dosageEn: "2000 IU daily",
      reasonAr: "صحة العظام ووظائف المناعة",
      reasonEn: "Bone health and immune function",
    },
  ];

  if (goal === "muscle_gain") {
    supplements.push({
      nameAr: "كرياتين مونوهيدرات",
      nameEn: "Creatine Monohydrate",
      dosageAr: "5 جم يومياً",
      dosageEn: "5g daily",
      reasonAr: "زيادة القوة والكتلة العضلية",
      reasonEn: "Increases strength and muscle mass",
    });
  }
  return supplements;
}

export function generateCoachPlan(input: CoachInput): CoachResult {
  const bmr = calcBMR(input.sex, input.weight, input.height, input.age);
  const tdee = bmr * ACTIVITY_FACTORS[input.activityLevel];

  // Calorie target by goal
  let targetCalories = tdee;
  if (input.goal === "fat_loss") targetCalories = tdee - 500;
  else if (input.goal === "muscle_gain") targetCalories = tdee + 350;
  else if (input.goal === "performance") targetCalories = tdee + 150;
  targetCalories = Math.round(targetCalories);

  // Macros (g)
  const proteinPerKg = input.goal === "muscle_gain" ? 2.2 : input.goal === "fat_loss" ? 2.0 : 1.8;
  const protein = Math.round(input.weight * proteinPerKg);
  const fat = Math.round((targetCalories * 0.25) / 9);
  const carbs = Math.round((targetCalories - protein * 4 - fat * 9) / 4);

  const band = calcIdealWeightBand(input.sex, input.height);
  const targetWeight =
    input.weight > band.max ? band.max : input.weight < band.min ? band.min : input.weight;
  const weightToChange = Math.round((targetWeight - input.weight) * 10) / 10;

  // Healthy rate: ~0.5kg/week
  const estimatedWeeks = Math.max(0, Math.round(Math.abs(weightToChange) / 0.5));

  const hydrationLiters = Math.round(input.weight * 0.035 * 10) / 10;

  const tipsAr = [
    "تناول وجباتك على فترات منتظمة كل 3-4 ساعات للحفاظ على مستوى الطاقة.",
    "احرص على شرب الماء قبل وأثناء وبعد التمرين.",
    "احصل على 7-9 ساعات نوم لدعم الاستشفاء وبناء العضلات.",
    input.goal === "fat_loss"
      ? "ركّز على البروتين والخضروات لزيادة الشبع مع سعرات أقل."
      : "وزّع البروتين على مدار اليوم لتحسين بناء العضلات.",
  ];
  const tipsEn = [
    "Eat at regular 3-4 hour intervals to maintain energy levels.",
    "Drink water before, during, and after training.",
    "Get 7-9 hours of sleep to support recovery and muscle growth.",
    input.goal === "fat_loss"
      ? "Prioritize protein and vegetables for satiety with fewer calories."
      : "Spread protein across the day to optimize muscle building.",
  ];

  return {
    idealWeightMin: band.min,
    idealWeightMax: band.max,
    currentWeight: input.weight,
    weightToChange,
    estimatedWeeks,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    macros: { protein, carbs, fat },
    hydrationLiters,
    meals: buildMeals(targetCalories, input.goal),
    supplements: buildSupplements(input.goal, input.bodyFatPercentage),
    tipsAr,
    tipsEn,
  };
}

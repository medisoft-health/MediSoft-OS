/**
 * MediSport — Exercise Library
 *
 * Catalog of exercises used by the Coach Program Builder.
 * Each exercise includes muscle group, equipment, difficulty,
 * and bilingual names/instructions.
 */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "glutes"
  | "full_body"
  | "cardio";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "resistance_band"
  | "cardio_machine";

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  id: string;
  nameAr: string;
  nameEn: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  difficulty: ExerciseDifficulty;
  // Default prescription
  defaultSets: number;
  defaultReps: string; // e.g. "8-12" or "30s"
  caloriesPerSet: number;
  instructionsAr: string;
  instructionsEn: string;
}

export const EXERCISE_LIBRARY: Exercise[] = [
  // ─── Chest ───
  {
    id: "bench-press",
    nameAr: "ضغط البنش بالبار",
    nameEn: "Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    difficulty: "intermediate",
    defaultSets: 4,
    defaultReps: "8-12",
    caloriesPerSet: 8,
    instructionsAr: "استلقِ على البنش، أمسك البار بقبضة أوسع قليلاً من الكتفين، اخفض البار للصدر ثم ادفع لأعلى.",
    instructionsEn: "Lie on bench, grip bar slightly wider than shoulders, lower to chest then press up.",
  },
  {
    id: "incline-dumbbell-press",
    nameAr: "ضغط الدمبل المائل",
    nameEn: "Incline Dumbbell Press",
    muscleGroup: "chest",
    equipment: "dumbbell",
    difficulty: "intermediate",
    defaultSets: 3,
    defaultReps: "10-12",
    caloriesPerSet: 7,
    instructionsAr: "اضبط البنش على زاوية 30-45 درجة، ادفع الدمبل لأعلى مع ضم الصدر.",
    instructionsEn: "Set bench at 30-45°, press dumbbells up while squeezing chest.",
  },
  {
    id: "push-ups",
    nameAr: "تمرين الضغط",
    nameEn: "Push-Ups",
    muscleGroup: "chest",
    equipment: "bodyweight",
    difficulty: "beginner",
    defaultSets: 3,
    defaultReps: "12-20",
    caloriesPerSet: 5,
    instructionsAr: "ضع اليدين بعرض الكتفين، حافظ على استقامة الجسم، اخفض الصدر للأرض ثم ادفع.",
    instructionsEn: "Place hands shoulder-width, keep body straight, lower chest to floor then push.",
  },
  // ─── Back ───
  {
    id: "deadlift",
    nameAr: "الرفعة المميتة",
    nameEn: "Deadlift",
    muscleGroup: "back",
    equipment: "barbell",
    difficulty: "advanced",
    defaultSets: 4,
    defaultReps: "5-8",
    caloriesPerSet: 12,
    instructionsAr: "قف أمام البار، انحنِ مع استقامة الظهر، أمسك البار وارفعه بدفع الوركين للأمام.",
    instructionsEn: "Stand at bar, hinge with straight back, grip and lift by driving hips forward.",
  },
  {
    id: "pull-ups",
    nameAr: "العقلة",
    nameEn: "Pull-Ups",
    muscleGroup: "back",
    equipment: "bodyweight",
    difficulty: "advanced",
    defaultSets: 3,
    defaultReps: "6-10",
    caloriesPerSet: 8,
    instructionsAr: "أمسك العقلة بقبضة أوسع من الكتفين، اسحب جسمك لأعلى حتى يتجاوز ذقنك البار.",
    instructionsEn: "Grip bar wider than shoulders, pull body up until chin passes bar.",
  },
  {
    id: "lat-pulldown",
    nameAr: "سحب أمامي",
    nameEn: "Lat Pulldown",
    muscleGroup: "back",
    equipment: "cable",
    difficulty: "beginner",
    defaultSets: 3,
    defaultReps: "10-12",
    caloriesPerSet: 6,
    instructionsAr: "اجلس وأمسك البار، اسحبه للأسفل نحو أعلى الصدر مع ضم لوحي الكتف.",
    instructionsEn: "Sit and grip bar, pull down toward upper chest while squeezing shoulder blades.",
  },
  {
    id: "bent-over-row",
    nameAr: "تجديف منحني بالبار",
    nameEn: "Bent-Over Barbell Row",
    muscleGroup: "back",
    equipment: "barbell",
    difficulty: "intermediate",
    defaultSets: 4,
    defaultReps: "8-10",
    caloriesPerSet: 8,
    instructionsAr: "انحنِ من الورك مع استقامة الظهر، اسحب البار نحو البطن.",
    instructionsEn: "Hinge from hips with straight back, row bar toward abdomen.",
  },
  // ─── Shoulders ───
  {
    id: "overhead-press",
    nameAr: "الضغط العلوي بالبار",
    nameEn: "Overhead Press",
    muscleGroup: "shoulders",
    equipment: "barbell",
    difficulty: "intermediate",
    defaultSets: 4,
    defaultReps: "6-10",
    caloriesPerSet: 7,
    instructionsAr: "قف مع البار عند مستوى الترقوة، ادفعه لأعلى حتى تمد الذراعين بالكامل.",
    instructionsEn: "Stand with bar at collarbone, press overhead until arms fully extended.",
  },
  {
    id: "lateral-raise",
    nameAr: "الرفرفة الجانبية",
    nameEn: "Lateral Raise",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    difficulty: "beginner",
    defaultSets: 3,
    defaultReps: "12-15",
    caloriesPerSet: 4,
    instructionsAr: "أمسك دمبل في كل يد، ارفع الذراعين للجانبين حتى مستوى الكتف.",
    instructionsEn: "Hold dumbbells, raise arms to sides until shoulder level.",
  },
  // ─── Arms ───
  {
    id: "bicep-curl",
    nameAr: "تمرين البايسيبس بالدمبل",
    nameEn: "Dumbbell Bicep Curl",
    muscleGroup: "arms",
    equipment: "dumbbell",
    difficulty: "beginner",
    defaultSets: 3,
    defaultReps: "10-12",
    caloriesPerSet: 4,
    instructionsAr: "أمسك الدمبل، ثنّ المرفقين لرفع الوزن نحو الكتف مع تثبيت الكوع.",
    instructionsEn: "Hold dumbbells, curl toward shoulders keeping elbows fixed.",
  },
  {
    id: "tricep-dips",
    nameAr: "غطس الترايسيبس",
    nameEn: "Tricep Dips",
    muscleGroup: "arms",
    equipment: "bodyweight",
    difficulty: "intermediate",
    defaultSets: 3,
    defaultReps: "10-15",
    caloriesPerSet: 5,
    instructionsAr: "ضع اليدين على مقعد خلفك، اخفض الجسم بثني المرفقين ثم ادفع لأعلى.",
    instructionsEn: "Hands on bench behind you, lower by bending elbows then push up.",
  },
  // ─── Legs ───
  {
    id: "squat",
    nameAr: "القرفصاء بالبار",
    nameEn: "Barbell Squat",
    muscleGroup: "legs",
    equipment: "barbell",
    difficulty: "intermediate",
    defaultSets: 4,
    defaultReps: "8-12",
    caloriesPerSet: 10,
    instructionsAr: "ضع البار على الكتفين، انزل بالقرفصاء حتى يوازي الفخذ الأرض ثم قف.",
    instructionsEn: "Bar on shoulders, squat until thighs parallel to floor then stand.",
  },
  {
    id: "leg-press",
    nameAr: "دفع الأرجل بالجهاز",
    nameEn: "Leg Press",
    muscleGroup: "legs",
    equipment: "machine",
    difficulty: "beginner",
    defaultSets: 4,
    defaultReps: "10-15",
    caloriesPerSet: 8,
    instructionsAr: "اجلس على الجهاز، ضع القدمين على المنصة وادفعها بعيداً ثم اخفض ببطء.",
    instructionsEn: "Sit on machine, place feet on platform, push away then lower slowly.",
  },
  {
    id: "lunges",
    nameAr: "الطعنات",
    nameEn: "Lunges",
    muscleGroup: "legs",
    equipment: "bodyweight",
    difficulty: "beginner",
    defaultSets: 3,
    defaultReps: "12 each leg",
    caloriesPerSet: 6,
    instructionsAr: "خطوة للأمام واخفض الورك حتى تنثني الركبتان بزاوية 90 درجة.",
    instructionsEn: "Step forward and lower hips until both knees bend at 90°.",
  },
  // ─── Glutes ───
  {
    id: "hip-thrust",
    nameAr: "دفع الورك",
    nameEn: "Hip Thrust",
    muscleGroup: "glutes",
    equipment: "barbell",
    difficulty: "intermediate",
    defaultSets: 4,
    defaultReps: "10-12",
    caloriesPerSet: 7,
    instructionsAr: "استند بالظهر على بنش، ضع البار على الورك، ادفع الورك لأعلى مع ضم الألوية.",
    instructionsEn: "Back against bench, bar on hips, drive hips up squeezing glutes.",
  },
  // ─── Core ───
  {
    id: "plank",
    nameAr: "البلانك",
    nameEn: "Plank",
    muscleGroup: "core",
    equipment: "bodyweight",
    difficulty: "beginner",
    defaultSets: 3,
    defaultReps: "30-60s",
    caloriesPerSet: 3,
    instructionsAr: "استند على الساعدين وأصابع القدمين، حافظ على استقامة الجسم.",
    instructionsEn: "Rest on forearms and toes, keep body in straight line.",
  },
  {
    id: "hanging-leg-raise",
    nameAr: "رفع الأرجل معلقاً",
    nameEn: "Hanging Leg Raise",
    muscleGroup: "core",
    equipment: "bodyweight",
    difficulty: "advanced",
    defaultSets: 3,
    defaultReps: "10-15",
    caloriesPerSet: 5,
    instructionsAr: "تعلق بالعقلة، ارفع الساقين مستقيمتين حتى مستوى الورك.",
    instructionsEn: "Hang from bar, raise straight legs to hip level.",
  },
  // ─── Cardio ───
  {
    id: "treadmill-run",
    nameAr: "الجري على المشاية",
    nameEn: "Treadmill Run",
    muscleGroup: "cardio",
    equipment: "cardio_machine",
    difficulty: "beginner",
    defaultSets: 1,
    defaultReps: "20-30 min",
    caloriesPerSet: 250,
    instructionsAr: "اضبط سرعة وميل المشاية حسب مستواك، حافظ على إيقاع ثابت.",
    instructionsEn: "Set speed and incline to your level, maintain steady pace.",
  },
  {
    id: "burpees",
    nameAr: "البيربي",
    nameEn: "Burpees",
    muscleGroup: "full_body",
    equipment: "bodyweight",
    difficulty: "advanced",
    defaultSets: 4,
    defaultReps: "10-15",
    caloriesPerSet: 12,
    instructionsAr: "من الوقوف، انزل للقرفصاء، اقفز للوضع الأمامي، ادفع، ثم اقفز لأعلى.",
    instructionsEn: "From standing, squat, jump to plank, push-up, then jump up.",
  },
  {
    id: "kettlebell-swing",
    nameAr: "أرجحة الكيتل بيل",
    nameEn: "Kettlebell Swing",
    muscleGroup: "full_body",
    equipment: "kettlebell",
    difficulty: "intermediate",
    defaultSets: 4,
    defaultReps: "15-20",
    caloriesPerSet: 10,
    instructionsAr: "أمسك الكيتل بيل بكلتا اليدين، أرجحها من بين الساقين لمستوى الكتف بدفع الورك.",
    instructionsEn: "Hold kettlebell with both hands, swing from between legs to shoulder height with hip drive.",
  },
];

// ─── Program templates ───

export interface ProgramTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  goal: "muscle_gain" | "fat_loss" | "strength" | "endurance" | "general";
  daysPerWeek: number;
  exerciseIds: string[];
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: "push-pull-legs",
    nameAr: "دفع - سحب - أرجل",
    nameEn: "Push Pull Legs",
    goal: "muscle_gain",
    daysPerWeek: 6,
    exerciseIds: ["bench-press", "overhead-press", "lateral-raise", "tricep-dips"],
  },
  {
    id: "full-body-beginner",
    nameAr: "تمرين الجسم الكامل للمبتدئين",
    nameEn: "Full Body Beginner",
    goal: "general",
    daysPerWeek: 3,
    exerciseIds: ["squat", "push-ups", "lat-pulldown", "plank"],
  },
  {
    id: "fat-loss-hiit",
    nameAr: "حرق الدهون عالي الكثافة",
    nameEn: "Fat Loss HIIT",
    goal: "fat_loss",
    daysPerWeek: 4,
    exerciseIds: ["burpees", "kettlebell-swing", "lunges", "treadmill-run"],
  },
  {
    id: "strength-5x5",
    nameAr: "القوة 5×5",
    nameEn: "Strength 5x5",
    goal: "strength",
    daysPerWeek: 3,
    exerciseIds: ["squat", "bench-press", "deadlift", "overhead-press", "bent-over-row"],
  },
];

// ─── Helpers ───

export function searchExercises(query: string, locale: "ar" | "en"): Exercise[] {
  if (!query.trim()) return EXERCISE_LIBRARY;
  const q = query.toLowerCase();
  return EXERCISE_LIBRARY.filter(
    (e) =>
      e.nameAr.includes(query) ||
      e.nameEn.toLowerCase().includes(q) ||
      e.muscleGroup.includes(q)
  );
}

export function getExercisesByMuscleGroup(group: MuscleGroup): Exercise[] {
  return EXERCISE_LIBRARY.filter((e) => e.muscleGroup === group);
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISE_LIBRARY.find((e) => e.id === id);
}

/**
 * MediSport Virtual Training Engine — Exercise Library Service
 * 
 * Dual-source exercise library:
 * - Free tier: ExerciseDB V1 (1500+ exercises with GIFs)
 * - Premium tier: MuscleWiki API (1900+ exercises, 7500+ videos, multiple angles)
 * 
 * Provides unified interface for searching, filtering, and caching exercises.
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  externalId: string;
  source: "exercisedb" | "musclewiki";
  name: string;
  nameAr?: string;
  gifUrl?: string;
  videoUrl?: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  instructions: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  forceType?: "push" | "pull" | "static";
  category?: string;
  isPremium: boolean;
}

export interface ExerciseSearchParams {
  query?: string;
  bodyPart?: string;
  targetMuscle?: string;
  equipment?: string;
  difficulty?: string;
  category?: string;
  source?: "exercisedb" | "musclewiki" | "all";
  limit?: number;
  offset?: number;
}

export interface ExerciseDBResponse {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  gifUrl: string;
  instructions: string[];
}

export interface MuscleWikiExercise {
  id: number;
  exercise_name: string;
  videoURL: string[];
  muscles_primary: { name: string }[];
  muscles_secondary: { name: string }[];
  muscles_tertiary: { name: string }[];
  correct_steps: string[];
  category: { name: string };
  difficulty: { name: string };
  force: { name: string };
  equipment: { name: string };
  body_region: { name: string };
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const EXERCISEDB_BASE = "https://exercisedb-api.vercel.app/api/v1";
const MUSCLEWIKI_BASE = "https://api.musclewiki.com";

// Body part mapping (English → Arabic)
export const BODY_PARTS_AR: Record<string, string> = {
  chest: "الصدر",
  back: "الظهر",
  shoulders: "الأكتاف",
  upper_arms: "الذراعان العلويان",
  lower_arms: "الساعدان",
  upper_legs: "الفخذان",
  lower_legs: "الساقان",
  waist: "الخصر",
  cardio: "تمارين القلب",
  neck: "الرقبة",
  full_body: "الجسم الكامل",
};

// Target muscle mapping (English → Arabic)
export const MUSCLES_AR: Record<string, string> = {
  pectorals: "عضلات الصدر",
  lats: "العضلة الظهرية العريضة",
  traps: "شبه المنحرفة",
  delts: "الدالية",
  biceps: "ذات الرأسين",
  triceps: "ذات الرؤوس الثلاثة",
  forearms: "الساعدان",
  quads: "الرباعية",
  hamstrings: "أوتار الركبة",
  glutes: "الأرداف",
  calves: "بطة الساق",
  abs: "عضلات البطن",
  obliques: "المائلة",
  lower_back: "أسفل الظهر",
  adductors: "المقرّبة",
  abductors: "المبعّدة",
  hip_flexors: "ثنيات الورك",
  serratus_anterior: "المنشارية الأمامية",
  rhomboids: "شبه المعينية",
  rotator_cuff: "الكفة المدورة",
};

// Equipment mapping (English → Arabic)
export const EQUIPMENT_AR: Record<string, string> = {
  barbell: "بار حديدي",
  dumbbell: "دمبل",
  cable: "كابل",
  machine: "جهاز",
  bodyweight: "وزن الجسم",
  kettlebell: "كيتل بيل",
  resistance_band: "حبل مقاومة",
  smith_machine: "جهاز سميث",
  ez_bar: "بار منحني",
  medicine_ball: "كرة طبية",
  stability_ball: "كرة توازن",
  foam_roller: "أسطوانة رغوية",
  trx: "حبال TRX",
  pull_up_bar: "بار عقلة",
  bench: "مقعد تمرين",
  none: "بدون معدات",
};

// Difficulty mapping
export const DIFFICULTY_AR: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

// ─────────────────────────────────────────────────────────────────
// ExerciseDB Service (Free Tier)
// ─────────────────────────────────────────────────────────────────

async function fetchExerciseDB(endpoint: string): Promise<any> {
  const res = await fetch(`${EXERCISEDB_BASE}${endpoint}`, {
    headers: { "Accept": "application/json" },
    next: { revalidate: 86400 }, // Cache for 24h
  });
  if (!res.ok) throw new Error(`ExerciseDB error: ${res.status}`);
  const data = await res.json();
  return data.data || data;
}

function normalizeExerciseDB(ex: ExerciseDBResponse): Exercise {
  return {
    id: `edb_${ex.id}`,
    externalId: ex.id,
    source: "exercisedb",
    name: ex.name,
    gifUrl: ex.gifUrl,
    targetMuscles: [ex.target],
    secondaryMuscles: ex.secondaryMuscles || [],
    bodyParts: [ex.bodyPart],
    equipments: [ex.equipment],
    instructions: ex.instructions || [],
    isPremium: false,
  };
}

export async function searchExerciseDB(params: ExerciseSearchParams): Promise<Exercise[]> {
  const limit = params.limit || 20;
  const offset = params.offset || 0;

  let exercises: ExerciseDBResponse[] = [];

  try {
    if (params.query) {
      exercises = await fetchExerciseDB(`/exercises?search=${encodeURIComponent(params.query)}&limit=${limit}&offset=${offset}`);
    } else if (params.bodyPart) {
      exercises = await fetchExerciseDB(`/exercises?bodyPart=${encodeURIComponent(params.bodyPart)}&limit=${limit}&offset=${offset}`);
    } else if (params.targetMuscle) {
      exercises = await fetchExerciseDB(`/exercises?target=${encodeURIComponent(params.targetMuscle)}&limit=${limit}&offset=${offset}`);
    } else if (params.equipment) {
      exercises = await fetchExerciseDB(`/exercises?equipment=${encodeURIComponent(params.equipment)}&limit=${limit}&offset=${offset}`);
    } else {
      exercises = await fetchExerciseDB(`/exercises?limit=${limit}&offset=${offset}`);
    }
  } catch (error) {
    console.error("[ExerciseDB] Search error:", error);
    exercises = [];
  }

  return (Array.isArray(exercises) ? exercises : []).map(normalizeExerciseDB);
}

export async function getExerciseDBById(id: string): Promise<Exercise | null> {
  try {
    const ex = await fetchExerciseDB(`/exercises/${id}`);
    return ex ? normalizeExerciseDB(ex) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// MuscleWiki Service (Premium Tier)
// ─────────────────────────────────────────────────────────────────

async function fetchMuscleWiki(endpoint: string): Promise<any> {
  const apiKey = process.env.MUSCLEWIKI_API_KEY;
  if (!apiKey) throw new Error("MuscleWiki API key not configured");

  const res = await fetch(`${MUSCLEWIKI_BASE}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
    },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`MuscleWiki error: ${res.status}`);
  return res.json();
}

function normalizeMuscleWiki(ex: MuscleWikiExercise): Exercise {
  const difficultyMap: Record<string, "beginner" | "intermediate" | "advanced"> = {
    "Beginner": "beginner",
    "Intermediate": "intermediate",
    "Advanced": "advanced",
  };
  const forceMap: Record<string, "push" | "pull" | "static"> = {
    "Push": "push",
    "Pull": "pull",
    "Static": "static",
  };

  return {
    id: `mw_${ex.id}`,
    externalId: String(ex.id),
    source: "musclewiki",
    name: ex.exercise_name,
    videoUrl: ex.videoURL?.[0] || undefined,
    gifUrl: undefined,
    targetMuscles: (ex.muscles_primary || []).map(m => m.name),
    secondaryMuscles: [
      ...(ex.muscles_secondary || []).map(m => m.name),
      ...(ex.muscles_tertiary || []).map(m => m.name),
    ],
    bodyParts: ex.body_region ? [ex.body_region.name] : [],
    equipments: ex.equipment ? [ex.equipment.name] : [],
    instructions: ex.correct_steps || [],
    difficulty: ex.difficulty ? difficultyMap[ex.difficulty.name] : undefined,
    forceType: ex.force ? forceMap[ex.force.name] : undefined,
    category: ex.category?.name,
    isPremium: true,
  };
}

export async function searchMuscleWiki(params: ExerciseSearchParams): Promise<Exercise[]> {
  const limit = params.limit || 20;
  const offset = params.offset || 0;

  let queryParts: string[] = [`limit=${limit}`, `offset=${offset}`];

  if (params.query) queryParts.push(`name=${encodeURIComponent(params.query)}`);
  if (params.targetMuscle) queryParts.push(`muscle=${encodeURIComponent(params.targetMuscle)}`);
  if (params.equipment) queryParts.push(`equipment=${encodeURIComponent(params.equipment)}`);
  if (params.difficulty) queryParts.push(`difficulty=${encodeURIComponent(params.difficulty)}`);
  if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);

  try {
    const data = await fetchMuscleWiki(`/exercises?${queryParts.join("&")}`);
    const exercises = data.results || data || [];
    return (Array.isArray(exercises) ? exercises : []).map(normalizeMuscleWiki);
  } catch (error) {
    console.error("[MuscleWiki] Search error:", error);
    return [];
  }
}

export async function getMuscleWikiById(id: string): Promise<Exercise | null> {
  try {
    const ex = await fetchMuscleWiki(`/exercises/${id}`);
    return ex ? normalizeMuscleWiki(ex) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Unified Search (combines both sources)
// ─────────────────────────────────────────────────────────────────

export async function searchExercises(
  params: ExerciseSearchParams,
  isPremiumUser: boolean = false
): Promise<Exercise[]> {
  const source = params.source || (isPremiumUser ? "all" : "exercisedb");

  if (source === "exercisedb") {
    return searchExerciseDB(params);
  }

  if (source === "musclewiki") {
    return searchMuscleWiki(params);
  }

  // "all" — fetch from both and merge (premium gets MuscleWiki first)
  const [edbResults, mwResults] = await Promise.allSettled([
    searchExerciseDB({ ...params, limit: Math.ceil((params.limit || 20) / 2) }),
    searchMuscleWiki({ ...params, limit: Math.ceil((params.limit || 20) / 2) }),
  ]);

  const edb = edbResults.status === "fulfilled" ? edbResults.value : [];
  const mw = mwResults.status === "fulfilled" ? mwResults.value : [];

  // Premium exercises first, then free
  return [...mw, ...edb].slice(0, params.limit || 20);
}

export async function getExerciseById(
  id: string,
  source: "exercisedb" | "musclewiki"
): Promise<Exercise | null> {
  if (source === "musclewiki") return getMuscleWikiById(id);
  return getExerciseDBById(id);
}

// ─────────────────────────────────────────────────────────────────
// Available body parts & muscles for filtering UI
// ─────────────────────────────────────────────────────────────────

export const BODY_PARTS = [
  "chest", "back", "shoulders", "upper_arms", "lower_arms",
  "upper_legs", "lower_legs", "waist", "cardio", "neck", "full_body",
] as const;

export const TARGET_MUSCLES = [
  "pectorals", "lats", "traps", "delts", "biceps", "triceps", "forearms",
  "quads", "hamstrings", "glutes", "calves", "abs", "obliques",
  "lower_back", "adductors", "abductors", "hip_flexors",
  "serratus_anterior", "rhomboids", "rotator_cuff",
] as const;

export const EQUIPMENT_LIST = [
  "barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell",
  "resistance_band", "smith_machine", "ez_bar", "medicine_ball",
  "stability_ball", "foam_roller", "trx", "pull_up_bar", "bench", "none",
] as const;

// ─────────────────────────────────────────────────────────────────
// Workout split templates (used by plan generator)
// ─────────────────────────────────────────────────────────────────

export interface WorkoutSplit {
  id: string;
  name: string;
  nameAr: string;
  daysPerWeek: number;
  split: { day: number; focus: string; focusAr: string; muscles: string[] }[];
}

export const WORKOUT_SPLITS: WorkoutSplit[] = [
  {
    id: "push_pull_legs",
    name: "Push/Pull/Legs",
    nameAr: "دفع/سحب/أرجل",
    daysPerWeek: 6,
    split: [
      { day: 1, focus: "Push", focusAr: "دفع (صدر + أكتاف + ترايسبس)", muscles: ["pectorals", "delts", "triceps"] },
      { day: 2, focus: "Pull", focusAr: "سحب (ظهر + بايسبس)", muscles: ["lats", "traps", "biceps", "rhomboids"] },
      { day: 3, focus: "Legs", focusAr: "أرجل", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { day: 4, focus: "Push", focusAr: "دفع (صدر + أكتاف + ترايسبس)", muscles: ["pectorals", "delts", "triceps"] },
      { day: 5, focus: "Pull", focusAr: "سحب (ظهر + بايسبس)", muscles: ["lats", "traps", "biceps", "rhomboids"] },
      { day: 6, focus: "Legs", focusAr: "أرجل", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    ],
  },
  {
    id: "upper_lower",
    name: "Upper/Lower",
    nameAr: "علوي/سفلي",
    daysPerWeek: 4,
    split: [
      { day: 1, focus: "Upper", focusAr: "الجزء العلوي", muscles: ["pectorals", "lats", "delts", "biceps", "triceps"] },
      { day: 2, focus: "Lower", focusAr: "الجزء السفلي", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { day: 3, focus: "Upper", focusAr: "الجزء العلوي", muscles: ["pectorals", "lats", "delts", "biceps", "triceps"] },
      { day: 4, focus: "Lower", focusAr: "الجزء السفلي", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    ],
  },
  {
    id: "bro_split",
    name: "Body Part Split",
    nameAr: "تقسيم عضلي",
    daysPerWeek: 5,
    split: [
      { day: 1, focus: "Chest", focusAr: "الصدر", muscles: ["pectorals"] },
      { day: 2, focus: "Back", focusAr: "الظهر", muscles: ["lats", "traps", "rhomboids"] },
      { day: 3, focus: "Shoulders", focusAr: "الأكتاف", muscles: ["delts", "rotator_cuff"] },
      { day: 4, focus: "Legs", focusAr: "الأرجل", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { day: 5, focus: "Arms", focusAr: "الذراعان", muscles: ["biceps", "triceps", "forearms"] },
    ],
  },
  {
    id: "full_body",
    name: "Full Body",
    nameAr: "الجسم الكامل",
    daysPerWeek: 3,
    split: [
      { day: 1, focus: "Full Body A", focusAr: "الجسم الكامل (أ)", muscles: ["pectorals", "lats", "quads", "delts", "abs"] },
      { day: 2, focus: "Full Body B", focusAr: "الجسم الكامل (ب)", muscles: ["traps", "hamstrings", "glutes", "biceps", "triceps"] },
      { day: 3, focus: "Full Body C", focusAr: "الجسم الكامل (ج)", muscles: ["pectorals", "lats", "quads", "delts", "calves"] },
    ],
  },
  {
    id: "home_minimal",
    name: "Home Minimal",
    nameAr: "تدريب منزلي",
    daysPerWeek: 3,
    split: [
      { day: 1, focus: "Upper Body", focusAr: "الجزء العلوي (منزلي)", muscles: ["pectorals", "delts", "triceps", "lats", "biceps"] },
      { day: 2, focus: "Lower Body", focusAr: "الجزء السفلي (منزلي)", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { day: 3, focus: "Core + Cardio", focusAr: "بطن + كارديو", muscles: ["abs", "obliques", "lower_back"] },
    ],
  },
];

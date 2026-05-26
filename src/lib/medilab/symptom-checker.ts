/**
 * Symptom Checker — database of 30+ common symptoms with Arabic/English names,
 * categories, and association-based suggestions.
 */

export interface SymptomSuggestion {
  id: string;
  nameEn: string;
  nameAr: string;
  category: "general" | "cardiovascular" | "respiratory" | "gi" | "neuro" | "musculoskeletal" | "endocrine" | "dermatologic" | "urinary" | "hematologic";
  commonAssociations: string[];
}

export const SYMPTOM_DATABASE: SymptomSuggestion[] = [
  // General
  { id: "fatigue", nameEn: "Fatigue", nameAr: "إرهاق", category: "general", commonAssociations: ["weakness", "weight_loss", "fever"] },
  { id: "fever", nameEn: "Fever", nameAr: "حمى", category: "general", commonAssociations: ["chills", "sweating", "fatigue"] },
  { id: "weight_loss", nameEn: "Weight Loss", nameAr: "فقدان الوزن", category: "general", commonAssociations: ["appetite_loss", "fatigue", "night_sweats"] },
  { id: "weight_gain", nameEn: "Weight Gain", nameAr: "زيادة الوزن", category: "general", commonAssociations: ["edema", "fatigue", "cold_intolerance"] },
  { id: "night_sweats", nameEn: "Night Sweats", nameAr: "تعرق ليلي", category: "general", commonAssociations: ["fever", "weight_loss", "fatigue"] },
  { id: "weakness", nameEn: "Weakness", nameAr: "ضعف عام", category: "general", commonAssociations: ["fatigue", "dizziness", "numbness"] },
  { id: "appetite_loss", nameEn: "Loss of Appetite", nameAr: "فقدان الشهية", category: "general", commonAssociations: ["weight_loss", "nausea", "fatigue"] },
  { id: "chills", nameEn: "Chills", nameAr: "قشعريرة", category: "general", commonAssociations: ["fever", "sweating"] },
  { id: "sweating", nameEn: "Excessive Sweating", nameAr: "تعرق مفرط", category: "general", commonAssociations: ["fever", "palpitations", "heat_intolerance"] },

  // Cardiovascular
  { id: "chest_pain", nameEn: "Chest Pain", nameAr: "ألم في الصدر", category: "cardiovascular", commonAssociations: ["shortness_of_breath", "sweating", "palpitations"] },
  { id: "palpitations", nameEn: "Palpitations", nameAr: "خفقان", category: "cardiovascular", commonAssociations: ["anxiety", "dizziness", "sweating"] },
  { id: "edema", nameEn: "Leg Swelling", nameAr: "تورم الساقين", category: "cardiovascular", commonAssociations: ["shortness_of_breath", "weight_gain"] },

  // Respiratory
  { id: "shortness_of_breath", nameEn: "Shortness of Breath", nameAr: "ضيق التنفس", category: "respiratory", commonAssociations: ["cough", "chest_pain", "wheezing"] },
  { id: "cough", nameEn: "Cough", nameAr: "سعال", category: "respiratory", commonAssociations: ["fever", "shortness_of_breath", "chest_pain"] },
  { id: "wheezing", nameEn: "Wheezing", nameAr: "صفير في التنفس", category: "respiratory", commonAssociations: ["shortness_of_breath", "cough"] },

  // GI
  { id: "abdominal_pain", nameEn: "Abdominal Pain", nameAr: "ألم في البطن", category: "gi", commonAssociations: ["nausea", "vomiting", "diarrhea"] },
  { id: "nausea", nameEn: "Nausea", nameAr: "غثيان", category: "gi", commonAssociations: ["vomiting", "abdominal_pain", "dizziness"] },
  { id: "vomiting", nameEn: "Vomiting", nameAr: "قيء", category: "gi", commonAssociations: ["nausea", "abdominal_pain", "fever"] },
  { id: "diarrhea", nameEn: "Diarrhea", nameAr: "إسهال", category: "gi", commonAssociations: ["abdominal_pain", "fever", "nausea"] },
  { id: "constipation", nameEn: "Constipation", nameAr: "إمساك", category: "gi", commonAssociations: ["abdominal_pain", "bloating"] },
  { id: "jaundice", nameEn: "Jaundice", nameAr: "يرقان", category: "gi", commonAssociations: ["abdominal_pain", "itching", "dark_urine"] },
  { id: "bloating", nameEn: "Bloating", nameAr: "انتفاخ", category: "gi", commonAssociations: ["constipation", "abdominal_pain"] },

  // Neurological
  { id: "headache", nameEn: "Headache", nameAr: "صداع", category: "neuro", commonAssociations: ["nausea", "vision_changes", "dizziness"] },
  { id: "dizziness", nameEn: "Dizziness", nameAr: "دوخة", category: "neuro", commonAssociations: ["nausea", "fatigue", "palpitations"] },
  { id: "numbness", nameEn: "Numbness/Tingling", nameAr: "تنميل", category: "neuro", commonAssociations: ["weakness", "pain", "dizziness"] },
  { id: "seizures", nameEn: "Seizures", nameAr: "نوبات تشنجية", category: "neuro", commonAssociations: ["confusion", "headache"] },
  { id: "confusion", nameEn: "Confusion", nameAr: "تشوش ذهني", category: "neuro", commonAssociations: ["headache", "fever", "seizures"] },
  { id: "vision_changes", nameEn: "Vision Changes", nameAr: "تغير في الرؤية", category: "neuro", commonAssociations: ["headache", "dizziness"] },

  // Endocrine
  { id: "polyuria", nameEn: "Frequent Urination", nameAr: "كثرة التبول", category: "endocrine", commonAssociations: ["polydipsia", "weight_loss", "fatigue"] },
  { id: "polydipsia", nameEn: "Excessive Thirst", nameAr: "عطش شديد", category: "endocrine", commonAssociations: ["polyuria", "fatigue", "weight_loss"] },
  { id: "heat_intolerance", nameEn: "Heat Intolerance", nameAr: "عدم تحمل الحرارة", category: "endocrine", commonAssociations: ["sweating", "weight_loss", "palpitations"] },
  { id: "cold_intolerance", nameEn: "Cold Intolerance", nameAr: "عدم تحمل البرد", category: "endocrine", commonAssociations: ["fatigue", "weight_gain", "constipation"] },

  // Musculoskeletal
  { id: "joint_pain", nameEn: "Joint Pain", nameAr: "ألم المفاصل", category: "musculoskeletal", commonAssociations: ["swelling", "stiffness", "fatigue"] },
  { id: "muscle_pain", nameEn: "Muscle Pain", nameAr: "ألم عضلي", category: "musculoskeletal", commonAssociations: ["fatigue", "weakness", "fever"] },
  { id: "back_pain", nameEn: "Back Pain", nameAr: "ألم الظهر", category: "musculoskeletal", commonAssociations: ["numbness", "weakness"] },
  { id: "stiffness", nameEn: "Joint Stiffness", nameAr: "تيبس المفاصل", category: "musculoskeletal", commonAssociations: ["joint_pain", "swelling"] },

  // Urinary
  { id: "dysuria", nameEn: "Painful Urination", nameAr: "ألم عند التبول", category: "urinary", commonAssociations: ["polyuria", "fever", "hematuria"] },
  { id: "hematuria", nameEn: "Blood in Urine", nameAr: "دم في البول", category: "urinary", commonAssociations: ["dysuria", "back_pain"] },

  // Dermatologic
  { id: "rash", nameEn: "Rash", nameAr: "طفح جلدي", category: "dermatologic", commonAssociations: ["itching", "fever", "joint_pain"] },
  { id: "itching", nameEn: "Itching", nameAr: "حكة", category: "dermatologic", commonAssociations: ["rash", "jaundice"] },

  // Hematologic
  { id: "easy_bruising", nameEn: "Easy Bruising", nameAr: "كدمات سهلة", category: "hematologic", commonAssociations: ["fatigue", "bleeding"] },
  { id: "bleeding", nameEn: "Abnormal Bleeding", nameAr: "نزيف غير طبيعي", category: "hematologic", commonAssociations: ["easy_bruising", "fatigue"] },
];

/** Search symptoms by query (matches both Arabic and English, case-insensitive). */
export function searchSymptoms(query: string): SymptomSuggestion[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return SYMPTOM_DATABASE.filter(
    (s) =>
      s.nameEn.toLowerCase().includes(q) ||
      s.nameAr.includes(q) ||
      s.id.includes(q),
  );
}

/** Get symptoms by category. */
export function getSymptomsByCategory(category: string): SymptomSuggestion[] {
  return SYMPTOM_DATABASE.filter((s) => s.category === category);
}

/** Suggest related symptoms based on currently selected ones (via commonAssociations). */
export function getSuggestedSymptoms(selectedIds: string[]): SymptomSuggestion[] {
  if (selectedIds.length === 0) return [];

  const selectedSet = new Set(selectedIds);
  const scores = new Map<string, number>();

  for (const id of selectedIds) {
    const symptom = SYMPTOM_DATABASE.find((s) => s.id === id);
    if (!symptom) continue;
    for (const assocId of symptom.commonAssociations) {
      if (selectedSet.has(assocId)) continue; // Already selected
      scores.set(assocId, (scores.get(assocId) ?? 0) + 1);
    }
  }

  // Return top suggestions sorted by association strength
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => SYMPTOM_DATABASE.find((s) => s.id === id)!)
    .filter(Boolean);
}

/**
 * MediSport — athlete lab marker reference library (Phase 6).
 * Shared between standalone (sport) and integrated (/medisport) so the saved
 * lab history + comparison features stay mirrored across both surfaces.
 */

export interface LabMarkerDef {
  name: string;
  category: string;
  unit: string;
  athleteMin: number;
  athleteMax: number;
}

export const LAB_MARKER_CATEGORIES: { id: string; nameAr: string; nameEn: string; icon: string }[] = [
  { id: "muscle_recovery", nameAr: "استشفاء العضلات", nameEn: "Muscle Recovery", icon: "💪" },
  { id: "hormonal", nameAr: "الهرمونات", nameEn: "Hormonal", icon: "⚡" },
  { id: "iron_oxygen", nameAr: "الحديد والأكسجين", nameEn: "Iron & Oxygen", icon: "🩸" },
  { id: "inflammation", nameAr: "الالتهابات", nameEn: "Inflammation", icon: "🔥" },
  { id: "metabolic", nameAr: "الأيض", nameEn: "Metabolic", icon: "⚙️" },
  { id: "bone_joint", nameAr: "العظام والمفاصل", nameEn: "Bone & Joint", icon: "🦴" },
  { id: "hydration", nameAr: "الترطيب والأملاح", nameEn: "Hydration", icon: "💧" },
  { id: "kidney_liver", nameAr: "الكلى والكبد", nameEn: "Kidney & Liver", icon: "🫘" },
  { id: "immune", nameAr: "المناعة", nameEn: "Immune", icon: "🛡️" },
];

export const LAB_MARKERS: LabMarkerDef[] = [
  { name: "CK (Creatine Kinase)", category: "muscle_recovery", unit: "U/L", athleteMin: 40, athleteMax: 500 },
  { name: "LDH", category: "muscle_recovery", unit: "U/L", athleteMin: 120, athleteMax: 300 },
  { name: "Myoglobin", category: "muscle_recovery", unit: "ng/mL", athleteMin: 20, athleteMax: 90 },
  { name: "Testosterone", category: "hormonal", unit: "ng/dL", athleteMin: 400, athleteMax: 1000 },
  { name: "Cortisol", category: "hormonal", unit: "µg/dL", athleteMin: 5, athleteMax: 20 },
  { name: "T/C Ratio", category: "hormonal", unit: "ratio", athleteMin: 0.3, athleteMax: 2.0 },
  { name: "IGF-1", category: "hormonal", unit: "ng/mL", athleteMin: 150, athleteMax: 400 },
  { name: "Hemoglobin", category: "iron_oxygen", unit: "g/dL", athleteMin: 14, athleteMax: 17.5 },
  { name: "Ferritin", category: "iron_oxygen", unit: "ng/mL", athleteMin: 50, athleteMax: 200 },
  { name: "Iron", category: "iron_oxygen", unit: "µg/dL", athleteMin: 65, athleteMax: 175 },
  { name: "VO2max (estimated)", category: "iron_oxygen", unit: "mL/kg/min", athleteMin: 45, athleteMax: 80 },
  { name: "CRP (hs)", category: "inflammation", unit: "mg/L", athleteMin: 0, athleteMax: 3 },
  { name: "IL-6", category: "inflammation", unit: "pg/mL", athleteMin: 0, athleteMax: 5 },
  { name: "ESR", category: "inflammation", unit: "mm/hr", athleteMin: 0, athleteMax: 15 },
  { name: "Glucose (Fasting)", category: "metabolic", unit: "mg/dL", athleteMin: 70, athleteMax: 100 },
  { name: "HbA1c", category: "metabolic", unit: "%", athleteMin: 4.0, athleteMax: 5.5 },
  { name: "Vitamin D", category: "bone_joint", unit: "ng/mL", athleteMin: 40, athleteMax: 80 },
  { name: "Calcium", category: "bone_joint", unit: "mg/dL", athleteMin: 8.5, athleteMax: 10.5 },
  { name: "Sodium", category: "hydration", unit: "mEq/L", athleteMin: 136, athleteMax: 145 },
  { name: "Potassium", category: "hydration", unit: "mEq/L", athleteMin: 3.5, athleteMax: 5.0 },
  { name: "Magnesium", category: "hydration", unit: "mg/dL", athleteMin: 2.0, athleteMax: 2.5 },
  { name: "Creatinine", category: "kidney_liver", unit: "mg/dL", athleteMin: 0.9, athleteMax: 1.5 },
  { name: "BUN", category: "kidney_liver", unit: "mg/dL", athleteMin: 10, athleteMax: 25 },
  { name: "ALT", category: "kidney_liver", unit: "U/L", athleteMin: 10, athleteMax: 50 },
  { name: "WBC", category: "immune", unit: "×10³/µL", athleteMin: 4.0, athleteMax: 10.0 },
  { name: "Lymphocytes", category: "immune", unit: "%", athleteMin: 20, athleteMax: 40 },
];

export function getMarkerDef(name: string): LabMarkerDef | undefined {
  return LAB_MARKERS.find((m) => m.name === name);
}

export function getMarkersByCategory(category: string): LabMarkerDef[] {
  return LAB_MARKERS.filter((m) => m.category === category);
}

export const SEASON_PHASES = ["pre-season", "in-season", "off-season", "recovery"] as const;
export type SeasonPhase = (typeof SEASON_PHASES)[number];

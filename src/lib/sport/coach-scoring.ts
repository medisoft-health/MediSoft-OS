/**
 * MediSport — Coach Scoring Engine (Phase 8)
 *
 * Pure, testable functions that compute a coach's verification score out of 100
 * from profile data + certifications + on-platform performance.
 *
 * Rubric (total 100):
 *   1. Academic degree            20
 *   2. Professional certifications 25
 *   3. Years of experience        15
 *   4. Profile completeness       10
 *   5. Admin discretionary score  15  (manual, 0..15)
 *   6. On-platform performance    15  (dynamic; 0 at first verification)
 *
 * New coaches start at a max of 85 (performance starts at 0) and grow with
 * real activity, reviews, and client retention.
 */

// ----------------------------- Reference catalogs -----------------------------

export type DegreeLevel =
  | "doctorate"
  | "masters"
  | "bachelors"
  | "diploma"
  | "none";

export const DEGREE_LEVELS: { id: DegreeLevel; ar: string; en: string }[] = [
  { id: "doctorate", ar: "دكتوراه", en: "Doctorate (PhD)" },
  { id: "masters", ar: "ماجستير", en: "Master's" },
  { id: "bachelors", ar: "بكالوريوس", en: "Bachelor's" },
  { id: "diploma", ar: "دبلوم", en: "Diploma" },
  { id: "none", ar: "لا يوجد", en: "None" },
];

/** Study fields that grant a relevance bonus to the academic axis. */
export const RELEVANT_STUDY_FIELDS: { id: string; ar: string; en: string }[] = [
  { id: "sports_science", ar: "علوم رياضة", en: "Sports Science" },
  { id: "physical_education", ar: "تربية بدنية", en: "Physical Education" },
  { id: "nutrition", ar: "تغذية", en: "Nutrition / Dietetics" },
  { id: "physiotherapy", ar: "علاج طبيعي", en: "Physiotherapy" },
  { id: "medicine", ar: "طب", en: "Medicine" },
  { id: "kinesiology", ar: "حركة وظيفية (Kinesiology)", en: "Kinesiology" },
  { id: "other", ar: "تخصص آخر", en: "Other" },
];

/** Recognized certification issuers (international + regional). */
export const CERT_ISSUERS: { id: string; ar: string; en: string; recognized: boolean }[] = [
  { id: "nasm", ar: "NASM", en: "NASM", recognized: true },
  { id: "issa", ar: "ISSA", en: "ISSA", recognized: true },
  { id: "ace", ar: "ACE", en: "ACE", recognized: true },
  { id: "acsm", ar: "ACSM", en: "ACSM", recognized: true },
  { id: "nsca", ar: "NSCA", en: "NSCA", recognized: true },
  { id: "reps", ar: "REPs", en: "REPs", recognized: true },
  { id: "precision_nutrition", ar: "Precision Nutrition", en: "Precision Nutrition", recognized: true },
  { id: "ukad_local", ar: "شهادة محلية/خليجية معتمدة", en: "Local/Gulf accredited body", recognized: true },
  { id: "other", ar: "جهة أخرى", en: "Other issuer", recognized: false },
];

/** Coaching specialties (multi-select tags). */
export const COACH_SPECIALTIES: { id: string; ar: string; en: string }[] = [
  { id: "muscle_gain", ar: "بناء العضلات", en: "Muscle Building" },
  { id: "fat_loss", ar: "إنقاص الوزن", en: "Fat Loss" },
  { id: "rehab", ar: "تأهيل الإصابات", en: "Injury Rehab" },
  { id: "competition", ar: "تحضير البطولات", en: "Competition Prep" },
  { id: "nutrition", ar: "التغذية الرياضية", en: "Sports Nutrition" },
  { id: "women", ar: "تدريب النساء/الحمل", en: "Women / Pre-Postnatal" },
  { id: "seniors", ar: "كبار السن", en: "Senior Fitness" },
  { id: "endurance", ar: "التحمّل والجَلَد", en: "Endurance" },
  { id: "youth", ar: "تدريب الناشئين", en: "Youth Athletes" },
  { id: "powerlifting", ar: "رفع الأثقال", en: "Powerlifting" },
];

// ------------------------------- Score types ---------------------------------

export interface CoachCertInput {
  issuer?: string | null;
  recognized?: boolean | null; // explicit override; else derived from issuer
  expiryDate?: string | null; // ISO date; affects "active" bonus
}

export interface CoachScoreInput {
  highestDegree?: DegreeLevel | string | null;
  studyField?: string | null;
  yearsExperience?: number | null;
  certifications?: CoachCertInput[];
  // Profile completeness signals:
  hasAvatar?: boolean;
  bioLength?: number;
  languagesCount?: number;
  hasProfessionalLinks?: boolean;
  hasCv?: boolean;
  // Admin discretionary (0..15):
  adminScore?: number | null;
  // Dynamic performance:
  ratingAvg?: number | null; // 0..5
  ratingCount?: number | null;
  adherenceRate?: number | null; // 0..1 (client adherence/results proxy)
  responseRate?: number | null; // 0..1
}

export interface CoachScoreBreakdown {
  academic: number; // /20
  certifications: number; // /25
  experience: number; // /15
  completeness: number; // /10
  admin: number; // /15
  performance: number; // /15
}

export type CoachTier =
  | "elite"
  | "professional"
  | "certified"
  | "associate"
  | "unranked";

export interface CoachScoreResult {
  total: number; // 0..100 (rounded to 1 decimal)
  tier: CoachTier;
  breakdown: CoachScoreBreakdown;
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

// ------------------------------- Axis scorers ---------------------------------

export function scoreAcademic(
  degree?: DegreeLevel | string | null,
  studyField?: string | null
): number {
  let base = 0;
  switch (degree) {
    case "doctorate":
      base = 20;
      break;
    case "masters":
      base = 16;
      break;
    case "bachelors":
      base = 12;
      break;
    case "diploma":
      base = 7;
      break;
    default:
      base = 0;
  }
  // Relevance bonus (+3) for medical/sports-science fields, capped at 20.
  const relevant =
    studyField &&
    ["sports_science", "physical_education", "nutrition", "physiotherapy", "medicine", "kinesiology"].includes(
      studyField
    );
  if (relevant && base > 0) base = Math.min(20, base + 3);
  return clamp(base, 0, 20);
}

export function scoreCertifications(certs?: CoachCertInput[]): number {
  if (!certs || certs.length === 0) return 0;
  const recognizedIds = new Set(
    CERT_ISSUERS.filter((c) => c.recognized).map((c) => c.id)
  );
  let pts = 0;
  let counted = 0;
  for (const c of certs) {
    if (counted >= 3) break;
    const isRecognized =
      c.recognized ?? (c.issuer ? recognizedIds.has(c.issuer) : false);
    if (!isRecognized) continue;
    counted += 1;
    pts += 8; // 8 per recognized cert (max 3 -> 24)
    // +1 if currently active (no expiry, or expiry in the future)
    if (!c.expiryDate || new Date(c.expiryDate).getTime() > Date.now()) {
      pts += 1 / 3; // distribute the "active" bonus; up to +1 across 3 certs
    }
  }
  return clamp(round1(pts), 0, 25);
}

export function scoreExperience(years?: number | null): number {
  const y = years ?? 0;
  if (y >= 10) return 15;
  if (y >= 7) return 13;
  if (y >= 4) return 11;
  if (y >= 2) return 7;
  if (y >= 1) return 3;
  return 0;
}

export function scoreCompleteness(input: CoachScoreInput): number {
  let pts = 0;
  if (input.hasAvatar) pts += 2;
  if ((input.bioLength ?? 0) >= 80) pts += 2;
  if ((input.languagesCount ?? 0) >= 1) pts += 2;
  if (input.hasProfessionalLinks) pts += 2;
  if (input.hasCv) pts += 2;
  return clamp(pts, 0, 10);
}

export function scoreAdmin(adminScore?: number | null): number {
  return clamp(Math.round(adminScore ?? 0), 0, 15);
}

export function scorePerformance(input: CoachScoreInput): number {
  const ratingCount = input.ratingCount ?? 0;
  // Reviews (up to 10): scaled from average stars, dampened when few reviews.
  let reviewPts = 0;
  if (ratingCount > 0 && (input.ratingAvg ?? 0) > 0) {
    const norm = clamp((input.ratingAvg ?? 0) / 5, 0, 1); // 0..1
    const confidence = clamp(ratingCount / 5, 0, 1); // full weight at >=5 reviews
    reviewPts = norm * 10 * confidence;
  }
  // Adherence/results (up to 3) and response rate (up to 2).
  const adherencePts = clamp((input.adherenceRate ?? 0) * 3, 0, 3);
  const responsePts = clamp((input.responseRate ?? 0) * 2, 0, 2);
  return clamp(round1(reviewPts + adherencePts + responsePts), 0, 15);
}

export function tierForScore(total: number): CoachTier {
  if (total >= 85) return "elite";
  if (total >= 70) return "professional";
  if (total >= 55) return "certified";
  if (total >= 40) return "associate";
  return "unranked";
}

// ------------------------------- Main entry ----------------------------------

export function calculateCoachScore(input: CoachScoreInput): CoachScoreResult {
  const breakdown: CoachScoreBreakdown = {
    academic: scoreAcademic(input.highestDegree, input.studyField),
    certifications: scoreCertifications(input.certifications),
    experience: scoreExperience(input.yearsExperience),
    completeness: scoreCompleteness(input),
    admin: scoreAdmin(input.adminScore),
    performance: scorePerformance(input),
  };
  const total = round1(
    breakdown.academic +
      breakdown.certifications +
      breakdown.experience +
      breakdown.completeness +
      breakdown.admin +
      breakdown.performance
  );
  return { total, tier: tierForScore(total), breakdown };
}

export const TIER_LABELS: Record<CoachTier, { ar: string; en: string }> = {
  elite: { ar: "مدرب نخبة", en: "Elite Coach" },
  professional: { ar: "مدرب محترف", en: "Professional Coach" },
  certified: { ar: "مدرب معتمَد", en: "Certified Coach" },
  associate: { ar: "مدرب تحت التطوير", en: "Associate Coach" },
  unranked: { ar: "غير مصنّف", en: "Unranked" },
};

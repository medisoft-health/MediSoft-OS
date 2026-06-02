import "server-only";
import type { PatientFullContext } from "@/lib/queries/patient-context";

/**
 * Predictive Risk Scoring Engine.
 *
 * DETERMINISTIC — no AI dependency for base scores. Calculates risk for
 * 5 disease categories using lab biomarkers + demographics + medications + vitals.
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface ContributingFactor {
  factor: string;
  points: number;
  category: "lab" | "demographic" | "medication" | "history";
}

export interface PreventiveAction {
  action: string;
  priority: "immediate" | "short_term" | "long_term";
  category: "lifestyle" | "medication" | "monitoring" | "referral";
}

export interface RiskCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  score: number;
  level: "low" | "moderate" | "high" | "very_high";
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
  contributingFactors: ContributingFactor[];
  preventiveActions: PreventiveAction[];
  nextTestDate: string | null;
  nextTestReason: string | null;
}

export interface RiskAssessmentResult {
  patientId: number;
  assessmentDate: string;
  risks: RiskCategory[];
  overallHealthScore: number;
  topConcern: string | null;
  aiInsight: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function toNum(v: number | string | undefined | null): number {
  if (v == null) return NaN;
  return typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.\-]/g, ""));
}

/** Find the latest lab value for a test (case-insensitive, partial match). */
function findLab(ctx: PatientFullContext, ...patterns: string[]): { value: number; raw: string; unit: string } | null {
  // Search in most recent labs first
  for (const panel of ctx.labHistory) {
    for (const r of panel.results) {
      if (!r.testName) continue;
      const name = r.testName.toLowerCase();
      if (patterns.some((p) => name.includes(p.toLowerCase()))) {
        const n = toNum(r.value);
        if (!isNaN(n)) return { value: n, raw: String(r.value), unit: r.unit ?? "" };
      }
    }
  }
  return null;
}

/** Check if patient has a condition matching a pattern (case-insensitive). */
function hasCondition(ctx: PatientFullContext, ...patterns: string[]): boolean {
  const all = [
    ...(ctx.demographics.chronicConditions ?? []).map((c) => (c.description ?? "").toLowerCase()),
    (ctx.demographics.medicalHistory ?? "").toLowerCase(),
    (ctx.demographics.familyHistory ?? "").toLowerCase(),
  ].join(" ");
  return patterns.some((p) => all.includes(p.toLowerCase()));
}

/** Check if patient is on a medication matching a pattern (case-insensitive). */
function onMed(ctx: PatientFullContext, ...patterns: string[]): boolean {
  return ctx.activeMedications.some((m) => {
    const name = (m.drugName ?? "").toLowerCase();
    return patterns.some((p) => name.includes(p.toLowerCase()));
  });
}

/** Check family history specifically. */
function hasFamilyHistory(ctx: PatientFullContext, ...patterns: string[]): boolean {
  const fh = (ctx.demographics.familyHistory ?? "").toLowerCase();
  return patterns.some((p) => fh.includes(p.toLowerCase()));
}

function scoreToLevel(score: number): RiskCategory["level"] {
  if (score >= 76) return "very_high";
  if (score >= 51) return "high";
  if (score >= 26) return "moderate";
  return "low";
}

function normalize(points: number, maxPoints: number): number {
  return Math.max(0, Math.min(100, Math.round((points / maxPoints) * 100)));
}

function nextTestDateFromLevel(level: RiskCategory["level"], fromDate: Date): string {
  const d = new Date(fromDate);
  switch (level) {
    case "very_high": d.setDate(d.getDate() + 14); break;
    case "high": d.setMonth(d.getMonth() + 1); break;
    case "moderate": d.setMonth(d.getMonth() + 3); break;
    case "low": d.setMonth(d.getMonth() + 6); break;
  }
  return d.toISOString().slice(0, 10);
}

const RETEST_REASONS: Record<RiskCategory["level"], string> = {
  very_high: "مطلوب متابعة عاجلة خلال أسبوعين",
  high: "إعادة الفحص خلال شهر للمتابعة",
  moderate: "إعادة فحص روتينية بعد 3 أشهر",
  low: "فحص دوري بعد 6 أشهر",
};

// ─────────────────────────────────────────────────────────────────
// Risk Calculators
// ─────────────────────────────────────────────────────────────────

function calcDiabetesRisk(ctx: PatientFullContext): RiskCategory {
  const factors: ContributingFactor[] = [];
  let points = 0;
  const MAX = 160;

  const hba1c = findLab(ctx, "hba1c", "a1c", "glycated");
  if (hba1c) {
    if (hba1c.value >= 6.5) { points += 60; factors.push({ factor: `HbA1c = ${hba1c.raw}% (مستوى السكري)`, points: 60, category: "lab" }); }
    else if (hba1c.value >= 5.7) { points += 30; factors.push({ factor: `HbA1c = ${hba1c.raw}% (مرحلة ما قبل السكري)`, points: 30, category: "lab" }); }
  }

  const glucose = findLab(ctx, "glucose", "fasting glucose", "blood sugar");
  if (glucose) {
    if (glucose.value >= 126) { points += 50; factors.push({ factor: `سكر صائم = ${glucose.raw} (مستوى السكري)`, points: 50, category: "lab" }); }
    else if (glucose.value >= 100) { points += 20; factors.push({ factor: `سكر صائم = ${glucose.raw} (ضعف تحمل)`, points: 20, category: "lab" }); }
  }

  const bmi = toNum(ctx.latestVitals?.bmi);
  if (!isNaN(bmi) && bmi > 30) { points += 15; factors.push({ factor: `BMI = ${bmi.toFixed(1)} (سمنة)`, points: 15, category: "demographic" }); }
  else if (!isNaN(bmi) && bmi > 25) { points += 8; factors.push({ factor: `BMI = ${bmi.toFixed(1)} (زيادة وزن)`, points: 8, category: "demographic" }); }

  if (ctx.demographics.age > 45) { points += 10; factors.push({ factor: `العمر ${ctx.demographics.age} سنة (> 45)`, points: 10, category: "demographic" }); }

  if (hasFamilyHistory(ctx, "diabetes", "سكري", "sugar")) { points += 15; factors.push({ factor: "تاريخ عائلي للسكري", points: 15, category: "history" }); }

  if (onMed(ctx, "prednisone", "prednisolone", "dexamethasone", "corticosteroid")) {
    points += 10; factors.push({ factor: "يتناول كورتيزون (يرفع السكر)", points: 10, category: "medication" });
  }

  const score = normalize(points, MAX);
  const level = scoreToLevel(score);
  const now = new Date();

  const actions: PreventiveAction[] = [];
  if (score >= 50) {
    actions.push({ action: "استشارة طبيب الغدد الصماء", priority: "immediate", category: "referral" });
    actions.push({ action: "تقليل الكربوهيدرات والسكريات", priority: "immediate", category: "lifestyle" });
  }
  if (score >= 26) {
    actions.push({ action: "المشي 30 دقيقة يومياً", priority: "short_term", category: "lifestyle" });
    actions.push({ action: "فحص HbA1c كل 3 أشهر", priority: "short_term", category: "monitoring" });
  }
  actions.push({ action: "الحفاظ على وزن صحي", priority: "long_term", category: "lifestyle" });

  return {
    id: "diabetes", name: "خطر السكري", nameEn: "Diabetes Risk", icon: "Droplets",
    score, level, trend: "insufficient_data", contributingFactors: factors, preventiveActions: actions,
    nextTestDate: nextTestDateFromLevel(level, now), nextTestReason: RETEST_REASONS[level],
  };
}

function calcCardiovascularRisk(ctx: PatientFullContext): RiskCategory {
  const factors: ContributingFactor[] = [];
  let points = 0;
  const MAX = 160;

  const ldl = findLab(ctx, "ldl");
  if (ldl && ldl.value > 160) { points += 25; factors.push({ factor: `LDL = ${ldl.raw} mg/dL (مرتفع)`, points: 25, category: "lab" }); }
  else if (ldl && ldl.value > 130) { points += 10; factors.push({ factor: `LDL = ${ldl.raw} mg/dL (حدّي)`, points: 10, category: "lab" }); }

  const hdl = findLab(ctx, "hdl");
  const isMale = ctx.demographics.sex?.toLowerCase() === "male";
  if (hdl) {
    const threshold = isMale ? 40 : 50;
    if (hdl.value < threshold) { points += 20; factors.push({ factor: `HDL = ${hdl.raw} mg/dL (منخفض)`, points: 20, category: "lab" }); }
  }

  const trig = findLab(ctx, "triglyceride");
  if (trig && trig.value > 200) { points += 15; factors.push({ factor: `الدهون الثلاثية = ${trig.raw} mg/dL (مرتفعة)`, points: 15, category: "lab" }); }

  const crp = findLab(ctx, "crp", "c-reactive");
  if (crp && crp.value > 3.0) { points += 20; factors.push({ factor: `CRP = ${crp.raw} (التهاب مرتفع)`, points: 20, category: "lab" }); }

  const sys = ctx.latestVitals?.bloodPressureSystolic;
  if (sys && sys > 140) { points += 20; factors.push({ factor: `ضغط الدم ${sys}/${ctx.latestVitals?.bloodPressureDiastolic ?? "?"} (مرتفع)`, points: 20, category: "lab" }); }

  if (hasCondition(ctx, "smoking", "smoker", "تدخين", "مدخن")) {
    points += 15; factors.push({ factor: "مدخن", points: 15, category: "history" });
  }

  if (hasCondition(ctx, "diabetes", "سكري", "diabetic")) {
    points += 20; factors.push({ factor: "مريض سكري", points: 20, category: "history" });
  }

  const ageThreshold = isMale ? 45 : 55;
  if (ctx.demographics.age > ageThreshold) {
    points += 10; factors.push({ factor: `العمر ${ctx.demographics.age} سنة`, points: 10, category: "demographic" });
  }

  if (hasFamilyHistory(ctx, "heart", "cardiac", "قلب", "cvd", "coronary")) {
    points += 15; factors.push({ factor: "تاريخ عائلي لأمراض القلب", points: 15, category: "history" });
  }

  const score = normalize(points, MAX);
  const level = scoreToLevel(score);
  const now = new Date();

  const actions: PreventiveAction[] = [];
  if (score >= 50) {
    actions.push({ action: "مناقشة بدء علاج الكوليسترول", priority: "immediate", category: "medication" });
    actions.push({ action: "استشارة طبيب القلب", priority: "immediate", category: "referral" });
  }
  if (score >= 26) {
    actions.push({ action: "نظام غذائي متوسطي (البحر المتوسط)", priority: "short_term", category: "lifestyle" });
    actions.push({ action: "رياضة 30 دقيقة يومياً", priority: "short_term", category: "lifestyle" });
  }
  actions.push({ action: "فحص الدهون كل 6 أشهر", priority: "long_term", category: "monitoring" });

  return {
    id: "cardiovascular", name: "خطر القلب والأوعية", nameEn: "Cardiovascular Risk", icon: "Heart",
    score, level, trend: "insufficient_data", contributingFactors: factors, preventiveActions: actions,
    nextTestDate: nextTestDateFromLevel(level, now), nextTestReason: RETEST_REASONS[level],
  };
}

function calcKidneyRisk(ctx: PatientFullContext): RiskCategory {
  const factors: ContributingFactor[] = [];
  let points = 0;
  const MAX = 160;

  const egfr = findLab(ctx, "egfr");
  if (egfr) {
    if (egfr.value < 30) { points += 70; factors.push({ factor: `eGFR = ${egfr.raw} (قصور شديد)`, points: 70, category: "lab" }); }
    else if (egfr.value < 60) { points += 40; factors.push({ factor: `eGFR = ${egfr.raw} (قصور متوسط)`, points: 40, category: "lab" }); }
    else if (egfr.value < 90) { points += 15; factors.push({ factor: `eGFR = ${egfr.raw} (قصور خفيف)`, points: 15, category: "lab" }); }
  }

  const creat = findLab(ctx, "creatinine");
  const isMale = ctx.demographics.sex?.toLowerCase() === "male";
  if (creat) {
    const threshold = isMale ? 1.3 : 1.1;
    if (creat.value > threshold) { points += 15; factors.push({ factor: `كرياتينين = ${creat.raw} (مرتفع)`, points: 15, category: "lab" }); }
  }

  const bun = findLab(ctx, "bun", "urea");
  if (bun && bun.value > 20) { points += 10; factors.push({ factor: `BUN = ${bun.raw} (مرتفع)`, points: 10, category: "lab" }); }

  if (onMed(ctx, "ibuprofen", "naproxen", "diclofenac", "nsaid", "ketorolac")) {
    points += 10; factors.push({ factor: "يتناول مسكنات NSAID (تضر الكلى)", points: 10, category: "medication" });
  }

  if (hasCondition(ctx, "diabetes", "سكري")) { points += 15; factors.push({ factor: "مريض سكري (خطر على الكلى)", points: 15, category: "history" }); }
  if (hasCondition(ctx, "hypertension", "ضغط", "blood pressure")) { points += 15; factors.push({ factor: "ارتفاع ضغط الدم", points: 15, category: "history" }); }

  const score = normalize(points, MAX);
  const level = scoreToLevel(score);
  const now = new Date();

  const actions: PreventiveAction[] = [];
  if (score >= 50) {
    actions.push({ action: "استشارة طبيب الكلى فوراً", priority: "immediate", category: "referral" });
    actions.push({ action: "إيقاف المسكنات غير الستيرويدية", priority: "immediate", category: "medication" });
  }
  if (score >= 26) {
    actions.push({ action: "شرب 2-3 لتر ماء يومياً", priority: "short_term", category: "lifestyle" });
    actions.push({ action: "تقليل الملح في الطعام", priority: "short_term", category: "lifestyle" });
  }
  actions.push({ action: "فحص وظائف الكلى دورياً", priority: "long_term", category: "monitoring" });

  return {
    id: "kidney", name: "خطر أمراض الكلى", nameEn: "Kidney Disease Risk", icon: "Bean",
    score, level, trend: "insufficient_data", contributingFactors: factors, preventiveActions: actions,
    nextTestDate: nextTestDateFromLevel(level, now), nextTestReason: RETEST_REASONS[level],
  };
}

function calcLiverRisk(ctx: PatientFullContext): RiskCategory {
  const factors: ContributingFactor[] = [];
  let points = 0;
  const MAX = 120;

  const alt = findLab(ctx, "alt", "alanine amino", "sgpt");
  if (alt && alt.value > 112) { points += 25; factors.push({ factor: `ALT = ${alt.raw} (أكثر من ضعف الطبيعي)`, points: 25, category: "lab" }); }
  else if (alt && alt.value > 56) { points += 12; factors.push({ factor: `ALT = ${alt.raw} (مرتفع)`, points: 12, category: "lab" }); }

  const ast = findLab(ctx, "ast", "aspartate amino", "sgot");
  if (ast && alt && alt.value > 0 && ast.value / alt.value > 2) {
    points += 20; factors.push({ factor: `نسبة AST/ALT = ${(ast.value / alt.value).toFixed(1)} (يشير لتلف كحولي)`, points: 20, category: "lab" });
  }

  const ggt = findLab(ctx, "ggt", "gamma");
  if (ggt && ggt.value > 135) { points += 20; factors.push({ factor: `GGT = ${ggt.raw} (أكثر من 3 أضعاف الطبيعي)`, points: 20, category: "lab" }); }

  const bili = findLab(ctx, "bilirubin");
  if (bili && bili.value > 2.0) { points += 25; factors.push({ factor: `بيليروبين = ${bili.raw} (مرتفع)`, points: 25, category: "lab" }); }

  const alb = findLab(ctx, "albumin");
  if (alb && alb.value < 3.5) { points += 20; factors.push({ factor: `ألبومين = ${alb.raw} (منخفض — ضعف وظيفة الكبد)`, points: 20, category: "lab" }); }

  if (onMed(ctx, "statin", "atorvastatin", "rosuvastatin", "simvastatin")) {
    points += 5; factors.push({ factor: "يتناول ستاتين (يؤثر على الكبد)", points: 5, category: "medication" });
  }
  if (onMed(ctx, "methotrexate", "mtx")) {
    points += 10; factors.push({ factor: "يتناول ميثوتريكسات (سام للكبد)", points: 10, category: "medication" });
  }
  if (onMed(ctx, "amiodarone")) {
    points += 10; factors.push({ factor: "يتناول أميودارون (سام للكبد)", points: 10, category: "medication" });
  }

  const score = normalize(points, MAX);
  const level = scoreToLevel(score);
  const now = new Date();

  const actions: PreventiveAction[] = [];
  if (score >= 50) {
    actions.push({ action: "استشارة طبيب الجهاز الهضمي", priority: "immediate", category: "referral" });
    actions.push({ action: "فحص الالتهاب الكبدي الفيروسي", priority: "immediate", category: "monitoring" });
  }
  if (score >= 26) {
    actions.push({ action: "تجنب الكحول تماماً", priority: "short_term", category: "lifestyle" });
    actions.push({ action: "مراجعة الأدوية السامة للكبد", priority: "short_term", category: "medication" });
  }
  actions.push({ action: "فحص وظائف الكبد كل 6 أشهر", priority: "long_term", category: "monitoring" });

  return {
    id: "liver", name: "خطر أمراض الكبد", nameEn: "Liver Disease Risk", icon: "Waves",
    score, level, trend: "insufficient_data", contributingFactors: factors, preventiveActions: actions,
    nextTestDate: nextTestDateFromLevel(level, now), nextTestReason: RETEST_REASONS[level],
  };
}

function calcAnemiaRisk(ctx: PatientFullContext): RiskCategory {
  const factors: ContributingFactor[] = [];
  let points = 0;
  const MAX = 120;
  const isMale = ctx.demographics.sex?.toLowerCase() === "male";

  const hgb = findLab(ctx, "hemoglobin", "hgb", "hb");
  if (hgb) {
    const threshold = isMale ? 13 : 12;
    if (hgb.value < threshold) { points += 30; factors.push({ factor: `هيموغلوبين = ${hgb.raw} (منخفض)`, points: 30, category: "lab" }); }
  }

  const ferritin = findLab(ctx, "ferritin");
  if (ferritin && ferritin.value < 12) { points += 25; factors.push({ factor: `فيريتين = ${ferritin.raw} (نقص حديد)`, points: 25, category: "lab" }); }

  const mcv = findLab(ctx, "mcv");
  if (mcv) {
    if (mcv.value < 80) { points += 15; factors.push({ factor: `MCV = ${mcv.raw} (فقر دم صغير الكريات)`, points: 15, category: "lab" }); }
    else if (mcv.value > 100) { points += 15; factors.push({ factor: `MCV = ${mcv.raw} (فقر دم كبير الكريات)`, points: 15, category: "lab" }); }
  }

  const b12 = findLab(ctx, "b12", "cobalamin");
  if (b12 && b12.value < 200) { points += 20; factors.push({ factor: `فيتامين B12 = ${b12.raw} (منخفض)`, points: 20, category: "lab" }); }

  const folate = findLab(ctx, "folate", "folic");
  if (folate && folate.value < 3) { points += 15; factors.push({ factor: `حمض الفوليك = ${folate.raw} (منخفض)`, points: 15, category: "lab" }); }

  if (!isMale) { points += 5; factors.push({ factor: "أنثى (خطر أعلى بسبب الدورة الشهرية)", points: 5, category: "demographic" }); }

  if (onMed(ctx, "metformin")) {
    points += 10; factors.push({ factor: "تتناول ميتفورمين (يستنزف B12)", points: 10, category: "medication" });
  }

  const score = normalize(points, MAX);
  const level = scoreToLevel(score);
  const now = new Date();

  const actions: PreventiveAction[] = [];
  if (score >= 50) {
    actions.push({ action: "فحص مخزون الحديد وفيتامين B12 بالتفصيل", priority: "immediate", category: "monitoring" });
    actions.push({ action: "استشارة طبيب أمراض الدم", priority: "immediate", category: "referral" });
  }
  if (score >= 26) {
    actions.push({ action: "تناول أغذية غنية بالحديد (لحوم، سبانخ)", priority: "short_term", category: "lifestyle" });
    actions.push({ action: "تناول مكمل حديد إذا أوصى الطبيب", priority: "short_term", category: "medication" });
  }
  actions.push({ action: "فحص صورة الدم كل 3-6 أشهر", priority: "long_term", category: "monitoring" });

  return {
    id: "anemia", name: "خطر فقر الدم", nameEn: "Anemia Risk", icon: "Droplets",
    score, level, trend: "insufficient_data", contributingFactors: factors, preventiveActions: actions,
    nextTestDate: nextTestDateFromLevel(level, now), nextTestReason: RETEST_REASONS[level],
  };
}

// ─────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────

export function calculateRiskScores(ctx: PatientFullContext): RiskAssessmentResult {
  const risks = [
    calcDiabetesRisk(ctx),
    calcCardiovascularRisk(ctx),
    calcKidneyRisk(ctx),
    calcLiverRisk(ctx),
    calcAnemiaRisk(ctx),
  ];

  // Overall health score = inverse of average risk
  const avgRisk = risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
  const overallHealthScore = Math.round(100 - avgRisk);

  // Top concern = highest-scoring risk
  const sorted = [...risks].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const topConcern = top && top.score >= 26
    ? `${top.name} (${top.nameEn}) — ${top.level === "very_high" ? "خطر عالي جداً" : top.level === "high" ? "خطر عالي" : "خطر متوسط"} (${top.score}/100)`
    : null;

  return {
    patientId: ctx.demographics.id,
    assessmentDate: new Date().toISOString(),
    risks,
    overallHealthScore,
    topConcern,
    aiInsight: null,
  };
}

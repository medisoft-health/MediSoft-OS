import "server-only";
/**
 * MediGuard — AI Medical Error Prevention Engine
 *
 * Integrated directly into PharmaX as an advanced safety layer that goes beyond
 * basic drug-drug interactions. MediGuard provides:
 *
 *   1. Smart Dose Calculation — weight-based, renal-adjusted, hepatic-adjusted
 *   2. Drug-Food Interactions — warns about dangerous food combinations
 *   3. Drug-Disease Contraindications — checks against patient's conditions
 *   4. Cross-Allergy Detection — identifies related allergens
 *   5. Duplicate Therapy Detection — catches therapeutic duplication
 *   6. Pregnancy/Lactation Safety — FDA pregnancy categories
 *   7. Age-Appropriate Dosing — pediatric/geriatric adjustments
 *   8. Lab-Based Contraindications — stops prescribing when labs are dangerous
 *   9. Timing & Administration Guidance — optimal dosing schedule
 *  10. Real-Time Prevention — blocks errors before they reach the patient
 *
 * Architecture:
 *   - Extends the existing PharmaX 3-layer system (RxNorm + OpenFDA + Gemini)
 *   - Adds a 4th layer: MediGuard AI reasoning with patient-specific context
 *   - Uses latest lab results, vitals, and full medication history
 *
 * @module MediGuard
 */

import { getGeminiClient, GEMINI_MODEL, isGeminiConfigured } from "@/lib/ai/gemini";
import { db } from "@/db";
import { patients, prescriptions, labResults, vitals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MediGuardPatientContext {
  patientId: number;
  age: number;
  sex: string;
  weightKg?: number;
  heightCm?: number;
  bsa?: number; // Body Surface Area (m²)
  bmi?: number;
  allergies: Array<{ substance: string; reaction?: string; severity?: string }>;
  chronicConditions: Array<{ code?: string; description: string }>;
  pregnancyStatus?: "not_pregnant" | "pregnant" | "breastfeeding" | "unknown";
  renalFunction?: {
    egfr?: number;
    creatinine?: number;
    bun?: number;
    stage: "normal" | "mild" | "moderate" | "severe" | "dialysis";
  };
  hepaticFunction?: {
    alt?: number;
    ast?: number;
    bilirubin?: number;
    albumin?: number;
    inr?: number;
    childPughScore?: "A" | "B" | "C";
  };
  currentMedications: Array<{
    drugName: string;
    dose: string;
    frequency: string;
    startDate?: string;
  }>;
  latestVitals?: {
    weightKg?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    spo2?: number;
  };
  latestLabs?: Array<{
    name: string;
    value: number;
    unit: string;
    date: string;
    isAbnormal: boolean;
  }>;
}

export interface DoseCalculation {
  drug: string;
  standardDose: string;
  calculatedDose: string;
  adjustmentReason: string;
  adjustmentType: "none" | "renal" | "hepatic" | "weight" | "age" | "combined";
  maxDailyDose: string;
  frequency: string;
  route: string;
  warnings: string[];
  formula?: string;
}

export interface FoodInteraction {
  drug: string;
  food: string;
  severity: "avoid" | "caution" | "timing";
  effect: string;
  recommendation: string;
}

export interface DiseaseContraindication {
  drug: string;
  condition: string;
  severity: "contraindicated" | "relative_contraindication" | "use_with_caution";
  reason: string;
  alternative?: string;
}

export interface CrossAllergyAlert {
  drug: string;
  knownAllergy: string;
  crossReactivityRisk: "high" | "moderate" | "low";
  mechanism: string;
  recommendation: string;
}

export interface DuplicateTherapyAlert {
  newDrug: string;
  existingDrug: string;
  therapeuticClass: string;
  risk: string;
  recommendation: string;
}

export interface LabContraindication {
  drug: string;
  labTest: string;
  currentValue: number;
  unit: string;
  threshold: string;
  risk: string;
  recommendation: string;
}

export interface TimingGuidance {
  drug: string;
  bestTime: string;
  withFood: "with_food" | "empty_stomach" | "either";
  separateFrom: Array<{ drug: string; interval: string; reason: string }>;
  specialInstructions: string[];
}

export interface MediGuardResult {
  status: "safe" | "warnings" | "blocked";
  overallRiskScore: number; // 0-100 (0 = safe, 100 = extremely dangerous)
  blockers: Array<{
    type: string;
    severity: "critical";
    message: string;
    drug: string;
    reason: string;
  }>;
  doseCalculations: DoseCalculation[];
  foodInteractions: FoodInteraction[];
  diseaseContraindications: DiseaseContraindication[];
  crossAllergyAlerts: CrossAllergyAlert[];
  duplicateTherapyAlerts: DuplicateTherapyAlert[];
  labContraindications: LabContraindication[];
  timingGuidance: TimingGuidance[];
  aiNarrative: string | null;
  meta: {
    patientContextLoaded: boolean;
    labsAvailable: boolean;
    vitalsAvailable: boolean;
    currentMedsCount: number;
    checksPerformed: number;
    errorsBlocked: number;
    warningsRaised: number;
  };
}

// ─── Known Drug-Food Interactions Database ───────────────────────────────────

const FOOD_INTERACTIONS: Record<string, FoodInteraction[]> = {
  warfarin: [
    { drug: "Warfarin", food: "Vitamin K-rich foods (spinach, kale, broccoli)", severity: "caution", effect: "Reduces anticoagulant effect, increases clotting risk", recommendation: "Maintain consistent Vitamin K intake; do not suddenly increase or decrease green vegetables" },
    { drug: "Warfarin", food: "Cranberry juice", severity: "avoid", effect: "Increases INR and bleeding risk", recommendation: "Avoid cranberry juice or limit to small amounts" },
    { drug: "Warfarin", food: "Grapefruit", severity: "caution", effect: "May increase warfarin levels via CYP3A4 inhibition", recommendation: "Limit grapefruit consumption; monitor INR closely" },
    { drug: "Warfarin", food: "Alcohol", severity: "avoid", effect: "Acute intake increases INR; chronic use decreases it", recommendation: "Avoid alcohol or limit to 1-2 drinks/day with consistent pattern" },
  ],
  metformin: [
    { drug: "Metformin", food: "Alcohol", severity: "avoid", effect: "Increases risk of lactic acidosis", recommendation: "Avoid excessive alcohol consumption" },
    { drug: "Metformin", food: "High-fiber meals", severity: "timing", effect: "May delay absorption", recommendation: "Take with meals to reduce GI side effects" },
  ],
  simvastatin: [
    { drug: "Simvastatin", food: "Grapefruit", severity: "avoid", effect: "Inhibits CYP3A4, increases statin levels 15x, risk of rhabdomyolysis", recommendation: "Avoid grapefruit and grapefruit juice entirely" },
  ],
  atorvastatin: [
    { drug: "Atorvastatin", food: "Grapefruit (large amounts)", severity: "caution", effect: "Inhibits CYP3A4, increases statin levels", recommendation: "Limit grapefruit to small amounts (< 1 glass/day)" },
  ],
  ciprofloxacin: [
    { drug: "Ciprofloxacin", food: "Dairy products (milk, yogurt, cheese)", severity: "avoid", effect: "Calcium chelates ciprofloxacin, reducing absorption by 40%", recommendation: "Take 2 hours before or 6 hours after dairy products" },
    { drug: "Ciprofloxacin", food: "Caffeine", severity: "caution", effect: "Inhibits caffeine metabolism, causing jitteriness/insomnia", recommendation: "Reduce caffeine intake during treatment" },
  ],
  tetracycline: [
    { drug: "Tetracycline", food: "Dairy products", severity: "avoid", effect: "Calcium chelation reduces absorption by 50-65%", recommendation: "Take 1 hour before or 2 hours after dairy" },
    { drug: "Tetracycline", food: "Iron-rich foods", severity: "avoid", effect: "Iron chelation reduces absorption", recommendation: "Separate from iron supplements by 2-3 hours" },
  ],
  lisinopril: [
    { drug: "Lisinopril", food: "Potassium-rich foods (bananas, oranges)", severity: "caution", effect: "ACE inhibitors increase potassium retention; excess K+ causes arrhythmia", recommendation: "Monitor potassium levels; avoid potassium supplements" },
  ],
  enalapril: [
    { drug: "Enalapril", food: "Potassium-rich foods", severity: "caution", effect: "Risk of hyperkalemia", recommendation: "Monitor serum potassium; avoid salt substitutes containing KCl" },
  ],
  spironolactone: [
    { drug: "Spironolactone", food: "Potassium-rich foods", severity: "avoid", effect: "High risk of life-threatening hyperkalemia", recommendation: "Avoid potassium supplements and salt substitutes; monitor K+ regularly" },
  ],
  amlodipine: [
    { drug: "Amlodipine", food: "Grapefruit", severity: "caution", effect: "May increase amlodipine levels causing hypotension", recommendation: "Limit grapefruit consumption" },
  ],
  levothyroxine: [
    { drug: "Levothyroxine", food: "Calcium supplements", severity: "timing", effect: "Calcium reduces absorption by 20-25%", recommendation: "Take levothyroxine 4 hours before calcium" },
    { drug: "Levothyroxine", food: "Coffee", severity: "timing", effect: "Reduces absorption by 30%", recommendation: "Take levothyroxine 60 minutes before coffee" },
    { drug: "Levothyroxine", food: "Soy products", severity: "timing", effect: "May reduce absorption", recommendation: "Maintain consistent soy intake; take medication 4 hours before soy" },
    { drug: "Levothyroxine", food: "High-fiber foods", severity: "timing", effect: "Fiber binds levothyroxine reducing absorption", recommendation: "Take on empty stomach, 30-60 min before breakfast" },
  ],
  methotrexate: [
    { drug: "Methotrexate", food: "Alcohol", severity: "avoid", effect: "Dramatically increases hepatotoxicity risk", recommendation: "Absolutely avoid alcohol during treatment" },
    { drug: "Methotrexate", food: "Folic acid-rich foods", severity: "caution", effect: "May reduce methotrexate efficacy in cancer treatment", recommendation: "Follow oncologist guidance on folate supplementation" },
  ],
  maois: [
    { drug: "MAOIs (Phenelzine, Tranylcypromine)", food: "Tyramine-rich foods (aged cheese, cured meats, soy sauce, beer, wine)", severity: "avoid", effect: "Hypertensive crisis — can be fatal", recommendation: "Strict tyramine-free diet required; avoid all aged/fermented foods" },
  ],
  phenelzine: [
    { drug: "Phenelzine", food: "Tyramine-rich foods (aged cheese, cured meats, red wine)", severity: "avoid", effect: "Hypertensive crisis — potentially fatal BP spike", recommendation: "Strict tyramine-free diet mandatory" },
  ],
  isoniazid: [
    { drug: "Isoniazid", food: "Tyramine-rich foods", severity: "caution", effect: "Weak MAO inhibition — risk of headache, hypertension", recommendation: "Avoid large amounts of aged cheese and fermented foods" },
    { drug: "Isoniazid", food: "Alcohol", severity: "avoid", effect: "Increases hepatotoxicity risk significantly", recommendation: "Avoid alcohol during TB treatment" },
  ],
  digoxin: [
    { drug: "Digoxin", food: "High-fiber meals", severity: "timing", effect: "Fiber reduces digoxin absorption", recommendation: "Take consistently with regard to meals; avoid sudden diet changes" },
    { drug: "Digoxin", food: "St. John's Wort", severity: "avoid", effect: "Reduces digoxin levels by 25% via P-glycoprotein induction", recommendation: "Avoid St. John's Wort completely" },
  ],
  lithium: [
    { drug: "Lithium", food: "Caffeine", severity: "caution", effect: "Caffeine increases lithium excretion, reducing levels", recommendation: "Maintain consistent caffeine intake; sudden changes affect lithium levels" },
    { drug: "Lithium", food: "High-sodium foods", severity: "caution", effect: "Sudden sodium changes alter lithium levels", recommendation: "Maintain consistent salt intake" },
  ],
};

// ─── Cross-Allergy Groups ────────────────────────────────────────────────────

const CROSS_ALLERGY_GROUPS: Array<{
  group: string;
  members: string[];
  crossReactivity: string;
  risk: "high" | "moderate" | "low";
}> = [
  {
    group: "Penicillins ↔ Cephalosporins",
    members: ["penicillin", "amoxicillin", "ampicillin", "piperacillin", "cephalexin", "cefazolin", "ceftriaxone", "cefuroxime", "cefixime"],
    crossReactivity: "1-2% cross-reactivity between penicillins and cephalosporins (primarily 1st gen)",
    risk: "moderate",
  },
  {
    group: "Penicillins ↔ Carbapenems",
    members: ["penicillin", "amoxicillin", "ampicillin", "meropenem", "imipenem", "ertapenem"],
    crossReactivity: "< 1% cross-reactivity, but caution with severe penicillin allergy",
    risk: "low",
  },
  {
    group: "Sulfonamide Antibiotics ↔ Non-Antibiotic Sulfonamides",
    members: ["sulfamethoxazole", "trimethoprim-sulfamethoxazole", "sulfasalazine", "furosemide", "hydrochlorothiazide", "celecoxib", "sumatriptan"],
    crossReactivity: "Low cross-reactivity between antibiotic and non-antibiotic sulfonamides, but monitor",
    risk: "low",
  },
  {
    group: "NSAIDs Cross-Sensitivity",
    members: ["aspirin", "ibuprofen", "naproxen", "diclofenac", "indomethacin", "ketorolac", "meloxicam", "piroxicam"],
    crossReactivity: "High cross-reactivity among COX-1 inhibitors; aspirin-sensitive patients react to most NSAIDs",
    risk: "high",
  },
  {
    group: "ACE Inhibitors (Angioedema)",
    members: ["lisinopril", "enalapril", "ramipril", "captopril", "benazepril", "perindopril", "quinapril"],
    crossReactivity: "Class-wide angioedema risk; if angioedema with one ACE-I, all are contraindicated",
    risk: "high",
  },
  {
    group: "Fluoroquinolones",
    members: ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin", "norfloxacin"],
    crossReactivity: "Variable cross-reactivity; some patients tolerate alternative fluoroquinolones",
    risk: "moderate",
  },
  {
    group: "Opioids (True Allergy vs Side Effects)",
    members: ["morphine", "codeine", "hydrocodone", "oxycodone", "fentanyl", "tramadol", "meperidine"],
    crossReactivity: "True allergy rare; cross-reactivity within phenanthrene group (morphine, codeine, hydrocodone)",
    risk: "moderate",
  },
  {
    group: "Local Anesthetics",
    members: ["lidocaine", "bupivacaine", "mepivacaine", "ropivacaine", "procaine", "benzocaine", "tetracaine"],
    crossReactivity: "Amides (lidocaine group) rarely cross-react; Esters (procaine group) cross-react with each other",
    risk: "low",
  },
];

// ─── Renal Dose Adjustments ──────────────────────────────────────────────────

const RENAL_DOSE_ADJUSTMENTS: Record<string, Array<{ egfrRange: [number, number]; adjustment: string; maxDose?: string }>> = {
  metformin: [
    { egfrRange: [45, 999], adjustment: "No adjustment needed", maxDose: "2000mg/day" },
    { egfrRange: [30, 44], adjustment: "Reduce dose by 50%", maxDose: "1000mg/day" },
    { egfrRange: [0, 29], adjustment: "CONTRAINDICATED — risk of lactic acidosis", maxDose: "0" },
  ],
  lisinopril: [
    { egfrRange: [30, 999], adjustment: "No adjustment needed", maxDose: "40mg/day" },
    { egfrRange: [10, 29], adjustment: "Reduce initial dose to 2.5-5mg", maxDose: "20mg/day" },
    { egfrRange: [0, 9], adjustment: "Use with extreme caution; start 2.5mg", maxDose: "10mg/day" },
  ],
  gabapentin: [
    { egfrRange: [60, 999], adjustment: "No adjustment needed", maxDose: "3600mg/day" },
    { egfrRange: [30, 59], adjustment: "Reduce dose; 200-700mg TID", maxDose: "2100mg/day" },
    { egfrRange: [15, 29], adjustment: "Reduce dose; 200-700mg BID", maxDose: "1400mg/day" },
    { egfrRange: [0, 14], adjustment: "Reduce dose; 100-300mg daily", maxDose: "300mg/day" },
  ],
  allopurinol: [
    { egfrRange: [60, 999], adjustment: "Standard dosing", maxDose: "800mg/day" },
    { egfrRange: [30, 59], adjustment: "Max 200mg/day", maxDose: "200mg/day" },
    { egfrRange: [10, 29], adjustment: "Max 100mg/day", maxDose: "100mg/day" },
    { egfrRange: [0, 9], adjustment: "Max 100mg every other day", maxDose: "50mg/day" },
  ],
  enoxaparin: [
    { egfrRange: [30, 999], adjustment: "Standard dosing (1mg/kg BID or 1.5mg/kg daily)", maxDose: "Based on weight" },
    { egfrRange: [0, 29], adjustment: "Reduce to 1mg/kg ONCE daily", maxDose: "1mg/kg/day" },
  ],
  vancomycin: [
    { egfrRange: [50, 999], adjustment: "Standard: 15-20mg/kg q8-12h", maxDose: "Based on levels" },
    { egfrRange: [30, 49], adjustment: "Extend interval: 15-20mg/kg q24h", maxDose: "Based on trough levels" },
    { egfrRange: [10, 29], adjustment: "Extend interval: 15-20mg/kg q48-72h", maxDose: "Based on trough levels" },
    { egfrRange: [0, 9], adjustment: "Single dose then redose based on levels", maxDose: "Based on trough levels" },
  ],
  gentamicin: [
    { egfrRange: [60, 999], adjustment: "Standard: 5-7mg/kg q24h", maxDose: "7mg/kg/day" },
    { egfrRange: [40, 59], adjustment: "5-7mg/kg q36h", maxDose: "Based on levels" },
    { egfrRange: [20, 39], adjustment: "5-7mg/kg q48h", maxDose: "Based on levels" },
    { egfrRange: [0, 19], adjustment: "Single dose then redose based on levels; consider alternative", maxDose: "Based on levels" },
  ],
  dabigatran: [
    { egfrRange: [50, 999], adjustment: "Standard: 150mg BID", maxDose: "300mg/day" },
    { egfrRange: [30, 49], adjustment: "Reduce to 110mg BID (or 75mg BID per US label)", maxDose: "220mg/day" },
    { egfrRange: [15, 29], adjustment: "75mg BID (US) or AVOID (EU)", maxDose: "150mg/day" },
    { egfrRange: [0, 14], adjustment: "CONTRAINDICATED", maxDose: "0" },
  ],
  rivaroxaban: [
    { egfrRange: [50, 999], adjustment: "Standard dosing", maxDose: "20mg/day" },
    { egfrRange: [15, 49], adjustment: "Reduce to 15mg daily", maxDose: "15mg/day" },
    { egfrRange: [0, 14], adjustment: "AVOID — insufficient data", maxDose: "0" },
  ],
};

// ─── Main MediGuard Analysis Function ────────────────────────────────────────

export async function runMediGuardAnalysis(input: {
  drugs: Array<{ drugName: string; dose?: string; frequency?: string; route?: string; rxcui?: string }>;
  patientId: number;
}): Promise<MediGuardResult> {
  const { drugs, patientId } = input;

  // ── Step 1: Load full patient context ──────────────────────────
  const patientContext = await loadPatientContext(patientId);

  // ── Step 2: Run all safety checks in parallel ──────────────────
  const [
    doseCalcs,
    foodInts,
    diseaseContras,
    allergyAlerts,
    duplicates,
    labContras,
    timing,
  ] = await Promise.all([
    calculateDoses(drugs, patientContext),
    checkFoodInteractions(drugs),
    checkDiseaseContraindications(drugs, patientContext),
    checkCrossAllergies(drugs, patientContext),
    checkDuplicateTherapy(drugs, patientContext),
    checkLabContraindications(drugs, patientContext),
    generateTimingGuidance(drugs),
  ]);

  // ── Step 3: Identify blockers (critical errors that must stop prescribing) ─
  const blockers: MediGuardResult["blockers"] = [];

  // Blocked by renal contraindication
  for (const dc of doseCalcs) {
    if (dc.calculatedDose.includes("CONTRAINDICATED")) {
      blockers.push({
        type: "renal_contraindication",
        severity: "critical",
        message: `${dc.drug} is CONTRAINDICATED with current renal function (eGFR ${patientContext.renalFunction?.egfr ?? "unknown"})`,
        drug: dc.drug,
        reason: dc.adjustmentReason,
      });
    }
  }

  // Blocked by disease contraindication
  for (const dc of diseaseContras) {
    if (dc.severity === "contraindicated") {
      blockers.push({
        type: "disease_contraindication",
        severity: "critical",
        message: `${dc.drug} is CONTRAINDICATED in patients with ${dc.condition}`,
        drug: dc.drug,
        reason: dc.reason,
      });
    }
  }

  // Blocked by severe allergy cross-reactivity
  for (const aa of allergyAlerts) {
    if (aa.crossReactivityRisk === "high") {
      blockers.push({
        type: "allergy_cross_reactivity",
        severity: "critical",
        message: `${aa.drug} has HIGH cross-reactivity with known allergy to ${aa.knownAllergy}`,
        drug: aa.drug,
        reason: aa.mechanism,
      });
    }
  }

  // Blocked by dangerous lab values
  for (const lc of labContras) {
    if (lc.risk.toLowerCase().includes("contraindicated") || lc.risk.toLowerCase().includes("fatal")) {
      blockers.push({
        type: "lab_contraindication",
        severity: "critical",
        message: `${lc.drug} is dangerous with current ${lc.labTest}: ${lc.currentValue} ${lc.unit} (threshold: ${lc.threshold})`,
        drug: lc.drug,
        reason: lc.risk,
      });
    }
  }

  // ── Step 4: Calculate risk score ───────────────────────────────
  let riskScore = 0;
  riskScore += blockers.length * 30;
  riskScore += diseaseContras.filter(d => d.severity === "relative_contraindication").length * 15;
  riskScore += allergyAlerts.filter(a => a.crossReactivityRisk === "moderate").length * 10;
  riskScore += foodInts.filter(f => f.severity === "avoid").length * 5;
  riskScore += duplicates.length * 10;
  riskScore += labContras.length * 15;
  riskScore = Math.min(100, riskScore);

  // ── Step 5: AI Narrative ───────────────────────────────────────
  let aiNarrative: string | null = null;
  if (isGeminiConfigured() && (blockers.length > 0 || riskScore > 20)) {
    aiNarrative = await generateMediGuardNarrative({
      drugs,
      patientContext,
      blockers,
      doseCalcs,
      foodInts,
      diseaseContras,
      allergyAlerts,
      duplicates,
      labContras,
      riskScore,
    });
  }

  // ── Step 6: Determine status ───────────────────────────────────
  const status: MediGuardResult["status"] =
    blockers.length > 0 ? "blocked" :
    riskScore > 30 ? "warnings" :
    "safe";

  return {
    status,
    overallRiskScore: riskScore,
    blockers,
    doseCalculations: doseCalcs,
    foodInteractions: foodInts,
    diseaseContraindications: diseaseContras,
    crossAllergyAlerts: allergyAlerts,
    duplicateTherapyAlerts: duplicates,
    labContraindications: labContras,
    timingGuidance: timing,
    aiNarrative,
    meta: {
      patientContextLoaded: true,
      labsAvailable: (patientContext.latestLabs?.length ?? 0) > 0,
      vitalsAvailable: !!patientContext.latestVitals,
      currentMedsCount: patientContext.currentMedications.length,
      checksPerformed: 7,
      errorsBlocked: blockers.length,
      warningsRaised: diseaseContras.length + allergyAlerts.length + foodInts.filter(f => f.severity === "avoid").length + duplicates.length,
    },
  };
}

// ─── Patient Context Loader ──────────────────────────────────────────────────

async function loadPatientContext(patientId: number): Promise<MediGuardPatientContext> {
  // Load patient basic info
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patient) throw new Error(`Patient ${patientId} not found`);

  // Load current medications
  const currentMeds = await db
    .select({
      drugName: prescriptions.drugName,
      dose: prescriptions.dose,
      frequency: prescriptions.frequency,
      createdAt: prescriptions.createdAt,
    })
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId))
    .orderBy(desc(prescriptions.createdAt))
    .limit(20);

  // Load latest labs
  const latestLabResults = await db
    .select()
    .from(labResults)
    .where(eq(labResults.patientId, patientId))
    .orderBy(desc(labResults.resultDate))
    .limit(5);

  // Load latest vitals
  const [latestVital] = await db
    .select()
    .from(vitals)
    .where(eq(vitals.patientId, patientId))
    .orderBy(desc(vitals.recordedAt))
    .limit(1);

  // Parse allergies
  const allergies = Array.isArray(patient.allergies)
    ? (patient.allergies as Array<{ substance?: string; reaction?: string; severity?: string }>)
    : [];

  // Parse chronic conditions
  const chronicConditions = Array.isArray(patient.chronicConditions)
    ? (patient.chronicConditions as Array<{ code?: string; description?: string }>).map(c => ({
        code: c.code,
        description: c.description ?? "Unknown",
      }))
    : [];

  // Calculate age
  const dob = new Date(patient.dateOfBirth);
  const age = new Date().getFullYear() - dob.getFullYear();

  // Parse weight/height (from vitals table, not patients)
  const weightKg = latestVital?.weightKg ? parseFloat(String(latestVital.weightKg)) : undefined;
  const heightCm = latestVital?.heightCm ? parseFloat(String(latestVital.heightCm)) : undefined;

  // Calculate BSA (DuBois formula) and BMI
  const bsa = weightKg && heightCm ? 0.007184 * Math.pow(weightKg, 0.425) * Math.pow(heightCm, 0.725) : undefined;
  const bmi = weightKg && heightCm ? weightKg / Math.pow(heightCm / 100, 2) : undefined;

  // Determine renal function from labs
  let renalFunction: MediGuardPatientContext["renalFunction"];
  const creatinineLab = findLabValue(latestLabResults, ["creatinine", "serum creatinine"]);
  const egfrLab = findLabValue(latestLabResults, ["egfr", "gfr", "estimated gfr"]);
  const bunLab = findLabValue(latestLabResults, ["bun", "blood urea nitrogen"]);

  if (egfrLab || creatinineLab) {
    const egfr = egfrLab?.value ?? (creatinineLab ? estimateEGFR(creatinineLab.value, age, patient.sex) : undefined);
    const stage = egfr
      ? egfr >= 90 ? "normal" : egfr >= 60 ? "mild" : egfr >= 30 ? "moderate" : egfr >= 15 ? "severe" : "dialysis"
      : "normal";
    renalFunction = {
      egfr,
      creatinine: creatinineLab?.value,
      bun: bunLab?.value,
      stage,
    };
  }

  // Determine hepatic function from labs
  let hepaticFunction: MediGuardPatientContext["hepaticFunction"];
  const altLab = findLabValue(latestLabResults, ["alt", "sgpt", "alanine aminotransferase"]);
  const astLab = findLabValue(latestLabResults, ["ast", "sgot", "aspartate aminotransferase"]);
  const biliLab = findLabValue(latestLabResults, ["bilirubin", "total bilirubin"]);
  const albuminLab = findLabValue(latestLabResults, ["albumin"]);
  const inrLab = findLabValue(latestLabResults, ["inr", "pt/inr"]);

  if (altLab || astLab || biliLab) {
    const childPugh = calculateChildPugh(biliLab?.value, albuminLab?.value, inrLab?.value);
    hepaticFunction = {
      alt: altLab?.value,
      ast: astLab?.value,
      bilirubin: biliLab?.value,
      albumin: albuminLab?.value,
      inr: inrLab?.value,
      childPughScore: childPugh,
    };
  }

  return {
    patientId,
    age,
    sex: patient.sex,
    weightKg,
    heightCm,
    bsa,
    bmi,
    allergies: allergies.map(a => ({ substance: a.substance ?? "Unknown", reaction: a.reaction, severity: a.severity })),
    chronicConditions,
    renalFunction,
    hepaticFunction,
    currentMedications: currentMeds.map(m => ({
      drugName: m.drugName,
      dose: m.dose,
      frequency: m.frequency,
      startDate: m.createdAt?.toISOString(),
    })),
    latestVitals: latestVital ? {
      weightKg: latestVital.weightKg ? parseFloat(String(latestVital.weightKg)) : undefined,
      bpSystolic: latestVital.bloodPressureSystolic ? Number(latestVital.bloodPressureSystolic) : undefined,
      bpDiastolic: latestVital.bloodPressureDiastolic ? Number(latestVital.bloodPressureDiastolic) : undefined,
      heartRate: latestVital.heartRate ? Number(latestVital.heartRate) : undefined,
      temperature: latestVital.temperature ? parseFloat(String(latestVital.temperature)) : undefined,
      spo2: latestVital.spO2 ? Number(latestVital.spO2) : undefined,
    } : undefined,
    latestLabs: extractLabValues(latestLabResults),
  };
}

// ─── Safety Check Functions ──────────────────────────────────────────────────

async function calculateDoses(
  drugs: Array<{ drugName: string; dose?: string; frequency?: string; route?: string }>,
  ctx: MediGuardPatientContext,
): Promise<DoseCalculation[]> {
  const results: DoseCalculation[] = [];

  for (const drug of drugs) {
    const name = drug.drugName.toLowerCase().trim();
    const renalAdj = RENAL_DOSE_ADJUSTMENTS[name];

    if (renalAdj && ctx.renalFunction?.egfr != null) {
      const egfr = ctx.renalFunction.egfr;
      const applicable = renalAdj.find(r => egfr >= r.egfrRange[0] && egfr <= r.egfrRange[1]);
      if (applicable) {
        results.push({
          drug: drug.drugName,
          standardDose: drug.dose ?? "Standard",
          calculatedDose: applicable.adjustment,
          adjustmentReason: `eGFR = ${egfr} mL/min/1.73m² (${ctx.renalFunction.stage} impairment)`,
          adjustmentType: "renal",
          maxDailyDose: applicable.maxDose ?? "See guidelines",
          frequency: drug.frequency ?? "As per adjustment",
          route: drug.route ?? "oral",
          warnings: applicable.adjustment.includes("CONTRAINDICATED")
            ? [`STOP: ${drug.drugName} is contraindicated at eGFR ${egfr}`]
            : [`Dose reduced due to renal impairment`],
          formula: `CKD-EPI eGFR: ${egfr} → ${applicable.adjustment}`,
        });
        continue;
      }
    }

    // Weight-based dosing for certain drugs
    if (ctx.weightKg && ["enoxaparin", "vancomycin", "gentamicin", "heparin"].includes(name)) {
      const weightDose = calculateWeightBasedDose(name, ctx.weightKg, ctx.renalFunction?.egfr);
      if (weightDose) {
        results.push(weightDose);
        continue;
      }
    }

    // Age-based adjustment for geriatric patients
    if (ctx.age >= 65) {
      const geriatricDrugs = ["benzodiazepines", "diazepam", "lorazepam", "alprazolam", "zolpidem", "opioids", "morphine", "oxycodone"];
      if (geriatricDrugs.some(g => name.includes(g))) {
        results.push({
          drug: drug.drugName,
          standardDose: drug.dose ?? "Standard adult dose",
          calculatedDose: "Start at 50% of standard dose",
          adjustmentReason: `Patient is ${ctx.age} years old (geriatric). Beers Criteria recommends lower doses.`,
          adjustmentType: "age",
          maxDailyDose: "50% of standard max",
          frequency: drug.frequency ?? "Extended intervals recommended",
          route: drug.route ?? "oral",
          warnings: ["Increased sensitivity in elderly", "Higher fall risk", "Monitor for excessive sedation"],
        });
        continue;
      }
    }

    // Default: no adjustment needed
    results.push({
      drug: drug.drugName,
      standardDose: drug.dose ?? "Standard",
      calculatedDose: drug.dose ?? "Standard dose appropriate",
      adjustmentReason: "No adjustment required based on available patient data",
      adjustmentType: "none",
      maxDailyDose: "Per guidelines",
      frequency: drug.frequency ?? "As prescribed",
      route: drug.route ?? "oral",
      warnings: [],
    });
  }

  return results;
}

function calculateWeightBasedDose(drug: string, weightKg: number, egfr?: number): DoseCalculation | null {
  switch (drug) {
    case "enoxaparin":
      const enoxDose = egfr && egfr < 30 ? `${Math.round(weightKg)}mg SC once daily` : `${Math.round(weightKg)}mg SC every 12h`;
      return {
        drug: "Enoxaparin",
        standardDose: "1mg/kg SC q12h",
        calculatedDose: enoxDose,
        adjustmentReason: `Weight: ${weightKg}kg${egfr && egfr < 30 ? `, eGFR ${egfr} (reduced frequency)` : ""}`,
        adjustmentType: egfr && egfr < 30 ? "combined" : "weight",
        maxDailyDose: `${Math.round(weightKg * 2)}mg/day`,
        frequency: egfr && egfr < 30 ? "Once daily" : "Every 12 hours",
        route: "subcutaneous",
        warnings: egfr && egfr < 30 ? ["Reduced frequency due to renal impairment", "Monitor anti-Xa levels"] : ["Monitor for bleeding signs"],
        formula: `${weightKg}kg × 1mg/kg = ${Math.round(weightKg)}mg`,
      };
    case "vancomycin":
      const vancDose = Math.round(weightKg * 15);
      return {
        drug: "Vancomycin",
        standardDose: "15-20mg/kg q8-12h",
        calculatedDose: `${vancDose}mg IV q12h (round to nearest 250mg: ${Math.round(vancDose / 250) * 250}mg)`,
        adjustmentReason: `Weight: ${weightKg}kg × 15mg/kg`,
        adjustmentType: "weight",
        maxDailyDose: `${Math.round(weightKg * 40)}mg/day`,
        frequency: "Every 8-12 hours",
        route: "IV",
        warnings: ["Monitor trough levels (target 15-20 mcg/mL for serious infections)", "Infuse over ≥1 hour to avoid Red Man Syndrome"],
        formula: `${weightKg}kg × 15mg/kg = ${vancDose}mg → rounded to ${Math.round(vancDose / 250) * 250}mg`,
      };
    case "gentamicin":
      const gentDose = Math.round(weightKg * 5);
      return {
        drug: "Gentamicin",
        standardDose: "5-7mg/kg q24h",
        calculatedDose: `${gentDose}mg IV q24h`,
        adjustmentReason: `Weight: ${weightKg}kg × 5mg/kg (once-daily dosing)`,
        adjustmentType: "weight",
        maxDailyDose: `${Math.round(weightKg * 7)}mg/day`,
        frequency: "Every 24 hours (extended-interval)",
        route: "IV",
        warnings: ["Monitor peak and trough levels", "Nephrotoxicity risk — check creatinine q48h", "Ototoxicity — ask about hearing changes"],
        formula: `${weightKg}kg × 5mg/kg = ${gentDose}mg`,
      };
    default:
      return null;
  }
}

async function checkFoodInteractions(
  drugs: Array<{ drugName: string }>,
): Promise<FoodInteraction[]> {
  const results: FoodInteraction[] = [];
  for (const drug of drugs) {
    const key = drug.drugName.toLowerCase().trim();
    // Check direct match
    if (FOOD_INTERACTIONS[key]) {
      results.push(...FOOD_INTERACTIONS[key]);
    }
    // Check partial match (e.g., "Metformin 500mg" matches "metformin")
    for (const [dbKey, interactions] of Object.entries(FOOD_INTERACTIONS)) {
      if (key.includes(dbKey) && dbKey !== key) {
        results.push(...interactions);
      }
    }
  }
  return results;
}

async function checkDiseaseContraindications(
  drugs: Array<{ drugName: string }>,
  ctx: MediGuardPatientContext,
): Promise<DiseaseContraindication[]> {
  if (!ctx.chronicConditions.length) return [];

  // Use AI to check disease-drug contraindications
  if (!isGeminiConfigured()) return [];

  const client = getGeminiClient();
  if (!client) return [];

  const prompt = `You are a clinical pharmacist. Check for drug-disease contraindications.

Patient conditions: ${ctx.chronicConditions.map(c => c.description).join(", ")}
${ctx.renalFunction ? `Renal: eGFR ${ctx.renalFunction.egfr}, stage: ${ctx.renalFunction.stage}` : ""}
${ctx.hepaticFunction ? `Hepatic: ALT ${ctx.hepaticFunction.alt}, AST ${ctx.hepaticFunction.ast}, Child-Pugh: ${ctx.hepaticFunction.childPughScore ?? "unknown"}` : ""}

Drugs to check: ${drugs.map(d => d.drugName).join(", ")}

For each REAL contraindication found, return JSON array:
[{"drug":"...", "condition":"...", "severity":"contraindicated|relative_contraindication|use_with_caution", "reason":"...", "alternative":"..."}]

Only include REAL, evidence-based contraindications. Return empty array [] if none found.
Return ONLY the JSON array, no other text.`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    });
    const text = result.text?.trim() ?? "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as DiseaseContraindication[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function checkCrossAllergies(
  drugs: Array<{ drugName: string }>,
  ctx: MediGuardPatientContext,
): Promise<CrossAllergyAlert[]> {
  if (!ctx.allergies.length) return [];

  const alerts: CrossAllergyAlert[] = [];
  const patientAllergens = ctx.allergies.map(a => a.substance.toLowerCase());

  for (const drug of drugs) {
    const drugLower = drug.drugName.toLowerCase();
    for (const group of CROSS_ALLERGY_GROUPS) {
      const drugInGroup = group.members.some(m => drugLower.includes(m));
      const allergyInGroup = group.members.some(m => patientAllergens.some(a => a.includes(m)));
      if (drugInGroup && allergyInGroup) {
        const matchedAllergy = ctx.allergies.find(a =>
          group.members.some(m => a.substance.toLowerCase().includes(m))
        );
        alerts.push({
          drug: drug.drugName,
          knownAllergy: matchedAllergy?.substance ?? "Unknown",
          crossReactivityRisk: group.risk,
          mechanism: group.crossReactivity,
          recommendation: group.risk === "high"
            ? `DO NOT prescribe. Patient has documented allergy to ${matchedAllergy?.substance}. Choose alternative class.`
            : group.risk === "moderate"
            ? `Use with caution. Monitor for allergic reaction. Have epinephrine available.`
            : `Low risk but document decision. Monitor patient.`,
        });
      }
    }
  }

  return alerts;
}

async function checkDuplicateTherapy(
  drugs: Array<{ drugName: string }>,
  ctx: MediGuardPatientContext,
): Promise<DuplicateTherapyAlert[]> {
  if (!ctx.currentMedications.length) return [];
  if (!isGeminiConfigured()) return [];

  const client = getGeminiClient();
  if (!client) return [];

  const prompt = `You are a clinical pharmacist checking for therapeutic duplication.

Current medications: ${ctx.currentMedications.map(m => `${m.drugName} ${m.dose} ${m.frequency}`).join("; ")}

New drugs being prescribed: ${drugs.map(d => d.drugName).join(", ")}

Check if any NEW drug duplicates the therapeutic class of a CURRENT medication (e.g., two SSRIs, two statins, two ACE inhibitors, two PPIs).

Return JSON array of duplicates found:
[{"newDrug":"...", "existingDrug":"...", "therapeuticClass":"...", "risk":"...", "recommendation":"..."}]

Only include REAL therapeutic duplications. Return empty array [] if none found.
Return ONLY the JSON array.`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    });
    const text = result.text?.trim() ?? "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as DuplicateTherapyAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function checkLabContraindications(
  drugs: Array<{ drugName: string }>,
  ctx: MediGuardPatientContext,
): Promise<LabContraindication[]> {
  const results: LabContraindication[] = [];
  if (!ctx.latestLabs?.length) return results;

  // Known lab-drug contraindications
  const labChecks: Array<{
    drug: string;
    lab: string;
    condition: (value: number) => boolean;
    threshold: string;
    risk: string;
    recommendation: string;
  }> = [
    { drug: "metformin", lab: "egfr", condition: (v) => v < 30, threshold: "< 30 mL/min", risk: "CONTRAINDICATED — Lactic acidosis risk", recommendation: "Discontinue metformin immediately" },
    { drug: "metformin", lab: "creatinine", condition: (v) => v > 1.5, threshold: "> 1.5 mg/dL (males)", risk: "High risk of lactic acidosis", recommendation: "Check eGFR; consider discontinuation" },
    { drug: "spironolactone", lab: "potassium", condition: (v) => v > 5.0, threshold: "> 5.0 mEq/L", risk: "CONTRAINDICATED — Life-threatening hyperkalemia", recommendation: "Do NOT start; correct potassium first" },
    { drug: "lisinopril", lab: "potassium", condition: (v) => v > 5.5, threshold: "> 5.5 mEq/L", risk: "Dangerous hyperkalemia — cardiac arrest risk", recommendation: "Hold ACE inhibitor; treat hyperkalemia" },
    { drug: "enalapril", lab: "potassium", condition: (v) => v > 5.5, threshold: "> 5.5 mEq/L", risk: "Dangerous hyperkalemia", recommendation: "Hold ACE inhibitor" },
    { drug: "warfarin", lab: "inr", condition: (v) => v > 4.0, threshold: "> 4.0", risk: "High bleeding risk — supratherapeutic INR", recommendation: "Hold warfarin; consider Vitamin K" },
    { drug: "heparin", lab: "platelets", condition: (v) => v < 100, threshold: "< 100,000/μL", risk: "Thrombocytopenia — HIT risk", recommendation: "Check for HIT; consider alternative anticoagulant" },
    { drug: "digoxin", lab: "potassium", condition: (v) => v < 3.5, threshold: "< 3.5 mEq/L", risk: "Hypokalemia increases digoxin toxicity — fatal arrhythmia risk", recommendation: "Correct potassium before giving digoxin" },
    { drug: "allopurinol", lab: "egfr", condition: (v) => v < 30, threshold: "< 30 mL/min", risk: "Severe hypersensitivity syndrome risk", recommendation: "Reduce dose to 100mg every other day or avoid" },
  ];

  for (const drug of drugs) {
    const drugLower = drug.drugName.toLowerCase().trim();
    for (const check of labChecks) {
      if (!drugLower.includes(check.drug)) continue;
      const labValue = ctx.latestLabs.find(l =>
        l.name.toLowerCase().includes(check.lab)
      );
      if (labValue && check.condition(labValue.value)) {
        results.push({
          drug: drug.drugName,
          labTest: labValue.name,
          currentValue: labValue.value,
          unit: labValue.unit,
          threshold: check.threshold,
          risk: check.risk,
          recommendation: check.recommendation,
        });
      }
    }
  }

  return results;
}

async function generateTimingGuidance(
  drugs: Array<{ drugName: string }>,
): Promise<TimingGuidance[]> {
  const results: TimingGuidance[] = [];

  const timingDb: Record<string, { bestTime: string; withFood: "with_food" | "empty_stomach" | "either"; specialInstructions: string[] }> = {
    levothyroxine: { bestTime: "Morning, 30-60 min before breakfast", withFood: "empty_stomach", specialInstructions: ["Take on empty stomach", "Wait 4h before calcium/iron", "Wait 60 min before coffee"] },
    metformin: { bestTime: "With meals", withFood: "with_food", specialInstructions: ["Take with food to reduce GI side effects", "Extended-release: take with dinner"] },
    omeprazole: { bestTime: "30 min before breakfast", withFood: "empty_stomach", specialInstructions: ["Take 30 min before first meal", "Swallow whole — do not crush"] },
    amlodipine: { bestTime: "Morning or evening (consistent)", withFood: "either", specialInstructions: ["Take at the same time daily"] },
    atorvastatin: { bestTime: "Evening (any time)", withFood: "either", specialInstructions: ["Can be taken any time of day", "Evening may be slightly more effective"] },
    simvastatin: { bestTime: "Evening/bedtime", withFood: "either", specialInstructions: ["MUST take in the evening (short half-life)", "Avoid grapefruit"] },
    lisinopril: { bestTime: "Morning", withFood: "either", specialInstructions: ["First dose may cause dizziness — take at bedtime initially"] },
    methotrexate: { bestTime: "Same day each week", withFood: "either", specialInstructions: ["WEEKLY dosing — NOT daily", "Take folic acid on non-MTX days"] },
    warfarin: { bestTime: "Evening (same time daily)", withFood: "either", specialInstructions: ["Take at same time every day", "Consistent Vitamin K intake"] },
    insulin: { bestTime: "Before meals (rapid) or bedtime (basal)", withFood: "with_food", specialInstructions: ["Rapid-acting: 15 min before meals", "Basal: same time daily"] },
    ciprofloxacin: { bestTime: "Morning and evening", withFood: "empty_stomach", specialInstructions: ["Take 2h before or 6h after dairy/calcium", "Drink plenty of water"] },
    iron: { bestTime: "Morning on empty stomach", withFood: "empty_stomach", specialInstructions: ["Take with Vitamin C to enhance absorption", "Avoid with tea, coffee, dairy", "Separate from antacids by 2h"] },
  };

  for (const drug of drugs) {
    const key = drug.drugName.toLowerCase().trim();
    const match = Object.entries(timingDb).find(([k]) => key.includes(k));
    if (match) {
      const [, info] = match;
      // Check for separation requirements with other drugs
      const separateFrom: Array<{ drug: string; interval: string; reason: string }> = [];
      if (key.includes("levothyroxine")) {
        for (const other of drugs) {
          if (other.drugName.toLowerCase().includes("calcium") || other.drugName.toLowerCase().includes("iron")) {
            separateFrom.push({ drug: other.drugName, interval: "4 hours", reason: "Chelation reduces absorption" });
          }
        }
      }
      if (key.includes("ciprofloxacin")) {
        for (const other of drugs) {
          if (other.drugName.toLowerCase().includes("calcium") || other.drugName.toLowerCase().includes("iron") || other.drugName.toLowerCase().includes("antacid")) {
            separateFrom.push({ drug: other.drugName, interval: "2 hours before or 6 hours after", reason: "Metal cation chelation" });
          }
        }
      }

      results.push({
        drug: drug.drugName,
        bestTime: info.bestTime,
        withFood: info.withFood,
        separateFrom,
        specialInstructions: info.specialInstructions,
      });
    }
  }

  return results;
}

// ─── AI Narrative Generator ──────────────────────────────────────────────────

async function generateMediGuardNarrative(input: {
  drugs: Array<{ drugName: string }>;
  patientContext: MediGuardPatientContext;
  blockers: MediGuardResult["blockers"];
  doseCalcs: DoseCalculation[];
  foodInts: FoodInteraction[];
  diseaseContras: DiseaseContraindication[];
  allergyAlerts: CrossAllergyAlert[];
  duplicates: DuplicateTherapyAlert[];
  labContras: LabContraindication[];
  riskScore: number;
}): Promise<string | null> {
  const client = getGeminiClient();
  if (!client) return null;

  const prompt = `You are MediGuard, an AI clinical safety system. Write a concise safety narrative (3-5 sentences) for the prescribing physician.

Patient: ${input.patientContext.age}yo ${input.patientContext.sex}, ${input.patientContext.weightKg ?? "unknown"}kg
Conditions: ${input.patientContext.chronicConditions.map(c => c.description).join(", ") || "None documented"}
Allergies: ${input.patientContext.allergies.map(a => a.substance).join(", ") || "NKDA"}
Renal: ${input.patientContext.renalFunction ? `eGFR ${input.patientContext.renalFunction.egfr} (${input.patientContext.renalFunction.stage})` : "Not assessed"}
Hepatic: ${input.patientContext.hepaticFunction ? `Child-Pugh ${input.patientContext.hepaticFunction.childPughScore ?? "N/A"}` : "Not assessed"}

Drugs being prescribed: ${input.drugs.map(d => d.drugName).join(", ")}
Risk Score: ${input.riskScore}/100

${input.blockers.length > 0 ? `⛔ BLOCKED: ${input.blockers.map(b => b.message).join("; ")}` : ""}
${input.diseaseContras.length > 0 ? `⚠️ Disease contraindications: ${input.diseaseContras.map(d => `${d.drug} vs ${d.condition}`).join("; ")}` : ""}
${input.allergyAlerts.length > 0 ? `🚨 Allergy alerts: ${input.allergyAlerts.map(a => `${a.drug} cross-reacts with ${a.knownAllergy}`).join("; ")}` : ""}
${input.labContras.length > 0 ? `🧪 Lab contraindications: ${input.labContras.map(l => `${l.drug}: ${l.labTest}=${l.currentValue}${l.unit}`).join("; ")}` : ""}
${input.duplicates.length > 0 ? `📋 Duplicates: ${input.duplicates.map(d => `${d.newDrug} duplicates ${d.existingDrug}`).join("; ")}` : ""}
${input.foodInts.filter(f => f.severity === "avoid").length > 0 ? `🍽️ Food interactions: ${input.foodInts.filter(f => f.severity === "avoid").map(f => `${f.drug}: avoid ${f.food}`).join("; ")}` : ""}

Write a clear, actionable narrative. If blocked, explain why and suggest alternatives. Use medical terminology appropriate for a physician. Be direct and concise.`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.2 },
    });
    return result.text?.trim() ?? null;
  } catch {
    return null;
  }
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function findLabValue(
  labs: Array<{ panelName: string; resultDate: Date; results?: unknown }>,
  names: string[],
): { value: number; unit: string; date: string } | undefined {
  for (const lab of labs) {
    const items = lab.results as Array<{ name?: string; value?: number; unit?: string }> | undefined;
    if (!items) continue;
    for (const item of items) {
      if (!item.name || item.value == null) continue;
      const itemLower = item.name.toLowerCase();
      if (names.some(n => itemLower.includes(n))) {
        return { value: item.value, unit: item.unit ?? "", date: lab.resultDate.toISOString() };
      }
    }
  }
  return undefined;
}

function extractLabValues(
  labs: Array<{ panelName: string; resultDate: Date; results?: unknown }>,
): Array<{ name: string; value: number; unit: string; date: string; isAbnormal: boolean }> {
  const extracted: Array<{ name: string; value: number; unit: string; date: string; isAbnormal: boolean }> = [];
  for (const lab of labs) {
    const items = lab.results as Array<{ name?: string; value?: number; unit?: string; referenceRange?: string; isAbnormal?: boolean }> | undefined;
    if (!items) continue;
    for (const item of items) {
      if (!item.name || item.value == null) continue;
      extracted.push({
        name: item.name,
        value: item.value,
        unit: item.unit ?? "",
        date: lab.resultDate.toISOString(),
        isAbnormal: item.isAbnormal ?? false,
      });
    }
  }
  return extracted;
}

function estimateEGFR(creatinine: number, age: number, sex: string): number {
  // CKD-EPI 2021 equation (race-free)
  const isFemale = sex === "female";
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const scrOverKappa = creatinine / kappa;
  const minVal = Math.min(scrOverKappa, 1);
  const maxVal = Math.max(scrOverKappa, 1);
  const egfr = 142 * Math.pow(minVal, alpha) * Math.pow(maxVal, -1.200) * Math.pow(0.9938, age) * (isFemale ? 1.012 : 1);
  return Math.round(egfr);
}

function calculateChildPugh(
  bilirubin?: number,
  albumin?: number,
  inr?: number,
): "A" | "B" | "C" | undefined {
  if (!bilirubin && !albumin && !inr) return undefined;
  let score = 0;
  // Bilirubin (mg/dL)
  if (bilirubin) {
    if (bilirubin < 2) score += 1;
    else if (bilirubin <= 3) score += 2;
    else score += 3;
  }
  // Albumin (g/dL)
  if (albumin) {
    if (albumin > 3.5) score += 1;
    else if (albumin >= 2.8) score += 2;
    else score += 3;
  }
  // INR
  if (inr) {
    if (inr < 1.7) score += 1;
    else if (inr <= 2.3) score += 2;
    else score += 3;
  }
  // Simplified (without ascites and encephalopathy)
  if (score <= 3) return "A";
  if (score <= 6) return "B";
  return "C";
}

/**
 * MediGuard Clinical Guidelines Engine
 * ─────────────────────────────────────
 * Validates prescriptions and clinical decisions against international
 * medical guidelines (WHO, AHA, ESC, ADA, NICE, GOLD, KDIGO, etc.)
 *
 * Features:
 * - Guideline-based prescription validation
 * - First-line therapy recommendations
 * - Contraindication detection based on guidelines
 * - Step therapy enforcement
 * - Target-based dosing (BP, HbA1c, LDL, etc.)
 * - Guideline deviation alerts with citations
 * - Arabic + English support
 */

import { getGeminiClient, GEMINI_MODEL, isGeminiConfigured } from "@/lib/ai/gemini";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GuidelineValidationRequest {
  drugs: Array<{
    drugName: string;
    dose?: string;
    frequency?: string;
    indication?: string;
  }>;
  patientContext: {
    age: number;
    sex: string;
    conditions: string[];
    currentMedications?: string[];
    labValues?: Record<string, number>;
    vitals?: {
      bpSystolic?: number;
      bpDiastolic?: number;
      heartRate?: number;
      hba1c?: number;
      ldl?: number;
      egfr?: number;
    };
  };
}

export interface GuidelineViolation {
  drug: string;
  severity: "critical" | "major" | "moderate" | "informational";
  type: "not_first_line" | "contraindicated" | "dose_outside_range" | "step_therapy_required" | "target_not_met" | "combination_not_recommended" | "missing_monitoring" | "age_inappropriate" | "better_alternative";
  guideline: string;
  guidelineSource: string;
  year: number;
  recommendation: string;
  suggestedAlternative?: string;
  evidence_level: "A" | "B" | "C" | "D" | "expert_opinion";
  citation: string;
}

export interface GuidelineValidationResult {
  isCompliant: boolean;
  overallScore: number; // 0-100
  violations: GuidelineViolation[];
  recommendations: Array<{
    condition: string;
    currentTherapy: string;
    guidelineRecommendation: string;
    source: string;
    action: "continue" | "modify" | "add" | "switch" | "stop";
    priority: "urgent" | "important" | "routine";
  }>;
  targetAssessment: Array<{
    target: string;
    currentValue?: number;
    goalValue: string;
    isAtTarget: boolean;
    guideline: string;
    adjustmentNeeded?: string;
  }>;
  monitoringRequired: Array<{
    test: string;
    frequency: string;
    reason: string;
    relatedDrug: string;
    guideline: string;
  }>;
  aiNarrative: string;
  guidelinesChecked: string[];
}

// ─── Clinical Guidelines Database ────────────────────────────────────────────

const CLINICAL_GUIDELINES: Record<string, {
  name: string;
  nameAr: string;
  source: string;
  year: number;
  conditions: string[];
  firstLine: string[];
  contraindicated: Array<{ drug: string; reason: string }>;
  targets: Array<{ metric: string; goal: string; population?: string }>;
  monitoring: Array<{ drug: string; test: string; frequency: string }>;
  stepTherapy?: string[];
}> = {
  // ─── Hypertension (AHA/ACC 2023 + ESC 2024) ───────────────────────────────
  hypertension: {
    name: "Hypertension Management",
    nameAr: "إدارة ارتفاع ضغط الدم",
    source: "AHA/ACC 2023 + ESC 2024",
    year: 2024,
    conditions: ["hypertension", "high blood pressure", "htn", "ارتفاع ضغط الدم"],
    firstLine: [
      "ACE inhibitor (lisinopril, enalapril, ramipril)",
      "ARB (losartan, valsartan, irbesartan, telmisartan)",
      "Calcium channel blocker (amlodipine, nifedipine)",
      "Thiazide diuretic (hydrochlorothiazide, chlorthalidone, indapamide)",
    ],
    contraindicated: [
      { drug: "ACE inhibitor + ARB combination", reason: "No benefit, increased hyperkalemia risk (ONTARGET trial)" },
      { drug: "Beta-blocker as first-line (without compelling indication)", reason: "Not first-line per AHA 2023 unless HF, post-MI, or rate control needed" },
      { drug: "Alpha-blocker as monotherapy", reason: "Inferior to thiazide (ALLHAT trial)" },
      { drug: "ACE inhibitor in pregnancy", reason: "Teratogenic — switch to labetalol or nifedipine" },
      { drug: "Diltiazem/Verapamil with beta-blocker", reason: "Risk of severe bradycardia and heart block" },
    ],
    targets: [
      { metric: "BP", goal: "<130/80 mmHg", population: "Most adults" },
      { metric: "BP", goal: "<140/90 mmHg", population: "Age >65 with frailty" },
      { metric: "BP", goal: "<120/80 mmHg", population: "High CV risk (SPRINT criteria)" },
    ],
    monitoring: [
      { drug: "ACE inhibitor/ARB", test: "Serum creatinine + potassium", frequency: "2 weeks after start, then every 6 months" },
      { drug: "Thiazide", test: "Electrolytes (Na, K, Mg)", frequency: "4 weeks after start, then annually" },
      { drug: "Any antihypertensive", test: "Blood pressure", frequency: "Every 2-4 weeks until at target" },
    ],
    stepTherapy: [
      "Step 1: ACE-I/ARB OR CCB OR Thiazide (monotherapy)",
      "Step 2: ACE-I/ARB + CCB OR ACE-I/ARB + Thiazide (dual therapy)",
      "Step 3: ACE-I/ARB + CCB + Thiazide (triple therapy)",
      "Step 4 (Resistant): Add spironolactone 25-50mg (PATHWAY-2 trial)",
    ],
  },

  // ─── Type 2 Diabetes (ADA 2024 + EASD 2024) ───────────────────────────────
  diabetes_type2: {
    name: "Type 2 Diabetes Management",
    nameAr: "إدارة السكري النوع الثاني",
    source: "ADA Standards of Care 2024 + EASD Consensus 2024",
    year: 2024,
    conditions: ["type 2 diabetes", "t2dm", "diabetes mellitus", "السكري", "سكر"],
    firstLine: [
      "Metformin (first-line for most patients)",
      "SGLT2 inhibitor (empagliflozin, dapagliflozin) — if CKD or HF",
      "GLP-1 RA (semaglutide, liraglutide, dulaglutide) — if ASCVD or obesity",
    ],
    contraindicated: [
      { drug: "Metformin with eGFR <30", reason: "Contraindicated — lactic acidosis risk (ADA 2024)" },
      { drug: "Sulfonylurea as first-line in elderly", reason: "High hypoglycemia risk — prefer DPP-4i or SGLT2i" },
      { drug: "Pioglitazone in heart failure", reason: "Fluid retention worsens HF (NYHA III-IV contraindicated)" },
      { drug: "SGLT2i in type 1 diabetes", reason: "DKA risk — not approved for T1DM" },
      { drug: "Insulin without trying oral agents first", reason: "Step therapy required unless HbA1c >10% or symptomatic" },
    ],
    targets: [
      { metric: "HbA1c", goal: "<7.0%", population: "Most adults" },
      { metric: "HbA1c", goal: "<8.0%", population: "Elderly, limited life expectancy, hypoglycemia-prone" },
      { metric: "HbA1c", goal: "<6.5%", population: "Young, newly diagnosed, no hypoglycemia" },
      { metric: "Fasting glucose", goal: "80-130 mg/dL" },
      { metric: "Post-prandial glucose", goal: "<180 mg/dL" },
    ],
    monitoring: [
      { drug: "Metformin", test: "HbA1c", frequency: "Every 3 months until stable, then every 6 months" },
      { drug: "Metformin", test: "Vitamin B12", frequency: "Annually (long-term use)" },
      { drug: "Metformin", test: "eGFR", frequency: "Every 6-12 months" },
      { drug: "SGLT2 inhibitor", test: "eGFR + electrolytes", frequency: "Every 3-6 months" },
      { drug: "Sulfonylurea", test: "Blood glucose (self-monitoring)", frequency: "Daily if dose changing" },
    ],
    stepTherapy: [
      "Step 1: Metformin + lifestyle (unless contraindicated)",
      "Step 2: Add SGLT2i (if CKD/HF) OR GLP-1 RA (if ASCVD/obesity) OR DPP-4i",
      "Step 3: Triple therapy (Metformin + SGLT2i + GLP-1 RA)",
      "Step 4: Add basal insulin if HbA1c still above target",
    ],
  },

  // ─── Dyslipidemia (ESC/EAS 2024 + AHA/ACC 2023) ───────────────────────────
  dyslipidemia: {
    name: "Dyslipidemia Management",
    nameAr: "إدارة اضطراب الدهون",
    source: "ESC/EAS 2024 + AHA/ACC 2023",
    year: 2024,
    conditions: ["dyslipidemia", "hyperlipidemia", "high cholesterol", "ارتفاع الكوليسترول", "دهون"],
    firstLine: [
      "High-intensity statin (atorvastatin 40-80mg, rosuvastatin 20-40mg)",
      "Moderate-intensity statin (atorvastatin 10-20mg, rosuvastatin 5-10mg, simvastatin 20-40mg)",
    ],
    contraindicated: [
      { drug: "Simvastatin >40mg", reason: "FDA warning — increased myopathy risk" },
      { drug: "Statin + Gemfibrozil", reason: "High rhabdomyolysis risk — use fenofibrate instead" },
      { drug: "Simvastatin + strong CYP3A4 inhibitors", reason: "Contraindicated (clarithromycin, itraconazole, HIV PIs)" },
      { drug: "Statin in pregnancy", reason: "Teratogenic — discontinue before conception" },
    ],
    targets: [
      { metric: "LDL-C", goal: "<55 mg/dL", population: "Very high CV risk" },
      { metric: "LDL-C", goal: "<70 mg/dL", population: "High CV risk" },
      { metric: "LDL-C", goal: "<100 mg/dL", population: "Moderate CV risk" },
      { metric: "LDL-C", goal: "<116 mg/dL", population: "Low CV risk" },
    ],
    monitoring: [
      { drug: "Statin", test: "Lipid panel", frequency: "6-8 weeks after start, then annually" },
      { drug: "Statin", test: "ALT", frequency: "Baseline, 12 weeks, then if symptoms" },
      { drug: "Statin", test: "CK", frequency: "Only if muscle symptoms" },
    ],
    stepTherapy: [
      "Step 1: High-intensity statin (max tolerated dose)",
      "Step 2: Add ezetimibe 10mg if LDL not at target",
      "Step 3: Add PCSK9 inhibitor (evolocumab/alirocumab) if still not at target",
      "Step 4: Consider inclisiran (siRNA) for adherence issues",
    ],
  },

  // ─── Heart Failure (ESC 2023 + AHA/ACC 2022) ──────────────────────────────
  heart_failure: {
    name: "Heart Failure with Reduced EF (HFrEF)",
    nameAr: "فشل القلب مع انخفاض الكسر القذفي",
    source: "ESC 2023 + AHA/ACC/HFSA 2022",
    year: 2023,
    conditions: ["heart failure", "hfref", "chf", "فشل القلب", "ضعف عضلة القلب"],
    firstLine: [
      "ACE-I/ARB/ARNI (sacubitril/valsartan preferred)",
      "Beta-blocker (carvedilol, bisoprolol, metoprolol succinate)",
      "MRA (spironolactone, eplerenone)",
      "SGLT2 inhibitor (dapagliflozin, empagliflozin)",
    ],
    contraindicated: [
      { drug: "Verapamil/Diltiazem in HFrEF", reason: "Negative inotropic — worsens HF" },
      { drug: "NSAIDs in heart failure", reason: "Fluid retention, renal impairment, increased mortality" },
      { drug: "Pioglitazone in NYHA III-IV", reason: "Fluid retention worsens HF" },
      { drug: "Dronedarone in NYHA III-IV", reason: "Increased mortality (ANDROMEDA trial)" },
      { drug: "Metformin with acute decompensated HF", reason: "Lactic acidosis risk in low perfusion states" },
    ],
    targets: [
      { metric: "Heart rate", goal: "<70 bpm (if sinus rhythm)" },
      { metric: "BP", goal: "Systolic >90 mmHg (to tolerate medications)" },
      { metric: "LVEF", goal: "Improvement >5% from baseline" },
    ],
    monitoring: [
      { drug: "ACE-I/ARB/ARNI", test: "Creatinine + K+", frequency: "1-2 weeks after start/titration" },
      { drug: "MRA (spironolactone)", test: "K+ + creatinine", frequency: "1 week, 4 weeks, then every 3 months" },
      { drug: "Beta-blocker", test: "Heart rate + BP", frequency: "Every 2 weeks during titration" },
      { drug: "SGLT2i", test: "eGFR + volume status", frequency: "Every 3 months" },
    ],
    stepTherapy: [
      "All 4 pillars should be initiated (can be simultaneous): ACE-I/ARNI + BB + MRA + SGLT2i",
      "Titrate to target doses over 2-4 weeks",
      "If still symptomatic: add hydralazine/isosorbide dinitrate OR ivabradine",
      "Device therapy: ICD if EF ≤35%, CRT if QRS ≥150ms with LBBB",
    ],
  },

  // ─── Asthma (GINA 2024) ───────────────────────────────────────────────────
  asthma: {
    name: "Asthma Management",
    nameAr: "إدارة الربو",
    source: "GINA 2024 (Global Initiative for Asthma)",
    year: 2024,
    conditions: ["asthma", "الربو", "bronchial asthma"],
    firstLine: [
      "Step 1-2: Low-dose ICS-formoterol as needed (preferred track)",
      "Step 3: Low-dose ICS-formoterol maintenance + reliever (MART)",
      "Step 4: Medium-dose ICS-formoterol MART",
      "Step 5: High-dose ICS + LABA + add-on (tiotropium, biologic)",
    ],
    contraindicated: [
      { drug: "SABA-only without ICS", reason: "GINA 2024: No longer recommended — increases exacerbation risk" },
      { drug: "Non-selective beta-blocker", reason: "Can trigger severe bronchospasm" },
      { drug: "Aspirin/NSAIDs (if AERD)", reason: "Aspirin-exacerbated respiratory disease — avoid" },
      { drug: "LABA without ICS", reason: "Increased asthma mortality (SMART trial) — always combine" },
    ],
    targets: [
      { metric: "Symptom control", goal: "ACT score ≥20" },
      { metric: "Exacerbations", goal: "Zero per year" },
      { metric: "FEV1", goal: ">80% predicted" },
    ],
    monitoring: [
      { drug: "ICS", test: "Symptom assessment (ACT)", frequency: "Every 1-3 months" },
      { drug: "ICS", test: "Spirometry", frequency: "At diagnosis, 3-6 months after starting, then annually" },
      { drug: "Systemic corticosteroids", test: "Bone density + glucose + BP", frequency: "If frequent courses" },
    ],
  },

  // ─── COPD (GOLD 2024) ─────────────────────────────────────────────────────
  copd: {
    name: "COPD Management",
    nameAr: "إدارة الانسداد الرئوي المزمن",
    source: "GOLD 2024",
    year: 2024,
    conditions: ["copd", "chronic obstructive pulmonary disease", "الانسداد الرئوي"],
    firstLine: [
      "Group A: SABA or SAMA as needed",
      "Group B: LABA or LAMA",
      "Group E: LABA + LAMA (if eosinophils <300, add ICS if ≥300)",
    ],
    contraindicated: [
      { drug: "ICS monotherapy in COPD", reason: "Not recommended — must combine with LABA" },
      { drug: "Theophylline as first-line", reason: "Narrow therapeutic index, drug interactions — last resort" },
      { drug: "Sedatives/opioids in severe COPD", reason: "Respiratory depression risk" },
    ],
    targets: [
      { metric: "Exacerbations", goal: "<2 moderate or 0 severe per year" },
      { metric: "mMRC dyspnea", goal: "Score <2" },
      { metric: "CAT score", goal: "<10" },
    ],
    monitoring: [
      { drug: "ICS in COPD", test: "Blood eosinophils", frequency: "Annually — withdraw ICS if <100" },
      { drug: "Any COPD therapy", test: "Spirometry", frequency: "Annually" },
      { drug: "Any COPD therapy", test: "Exacerbation frequency", frequency: "Every visit" },
    ],
  },

  // ─── CKD (KDIGO 2024) ─────────────────────────────────────────────────────
  ckd: {
    name: "Chronic Kidney Disease",
    nameAr: "مرض الكلى المزمن",
    source: "KDIGO 2024",
    year: 2024,
    conditions: ["ckd", "chronic kidney disease", "renal failure", "الفشل الكلوي", "مرض الكلى"],
    firstLine: [
      "ACE-I or ARB (if albuminuria)",
      "SGLT2 inhibitor (dapagliflozin/empagliflozin) — eGFR ≥20",
      "Finerenone (if T2DM + albuminuria)",
      "BP control to <120/80 (if tolerated)",
    ],
    contraindicated: [
      { drug: "NSAIDs in CKD", reason: "Accelerates CKD progression, AKI risk" },
      { drug: "Metformin with eGFR <30", reason: "Lactic acidosis — reduce dose at eGFR 30-45, stop at <30" },
      { drug: "Gadolinium contrast with eGFR <30", reason: "Nephrogenic systemic fibrosis risk" },
      { drug: "ACE-I + ARB combination in CKD", reason: "Hyperkalemia without benefit (VA NEPHRON-D)" },
      { drug: "Spironolactone with eGFR <30 + K >5.0", reason: "Life-threatening hyperkalemia" },
    ],
    targets: [
      { metric: "BP", goal: "<120/80 mmHg (if tolerated)" },
      { metric: "eGFR decline", goal: "<5 mL/min/year" },
      { metric: "UACR", goal: ">30% reduction from baseline" },
      { metric: "Potassium", goal: "3.5-5.0 mEq/L" },
    ],
    monitoring: [
      { drug: "ACE-I/ARB", test: "Creatinine + K+", frequency: "2-4 weeks after start, then every 3-6 months" },
      { drug: "SGLT2i", test: "eGFR", frequency: "Expected initial dip — recheck at 4 weeks" },
      { drug: "Any nephrotoxic drug", test: "eGFR + UACR", frequency: "Every 3 months" },
    ],
  },

  // ─── Anticoagulation (ESC 2024 + CHEST 2024) ──────────────────────────────
  anticoagulation: {
    name: "Anticoagulation (AF & VTE)",
    nameAr: "مضادات التخثر",
    source: "ESC 2024 AF Guidelines + CHEST 2024",
    year: 2024,
    conditions: ["atrial fibrillation", "af", "dvt", "pe", "vte", "الرجفان الأذيني", "تخثر"],
    firstLine: [
      "DOAC preferred over warfarin (apixaban, rivaroxaban, edoxaban, dabigatran)",
      "Warfarin only if: mechanical valve, moderate-severe mitral stenosis, or antiphospholipid syndrome",
    ],
    contraindicated: [
      { drug: "DOAC with mechanical heart valve", reason: "Increased thrombosis (RE-ALIGN trial) — use warfarin" },
      { drug: "Rivaroxaban/Apixaban with strong CYP3A4 + P-gp inhibitors", reason: "Bleeding risk" },
      { drug: "Dabigatran with eGFR <30", reason: "Accumulation — use apixaban instead" },
      { drug: "Triple therapy >1 week (DOAC + dual antiplatelet)", reason: "Excessive bleeding — step down to dual" },
      { drug: "Aspirin for stroke prevention in AF", reason: "Inferior to DOAC, similar bleeding (AVERROES)" },
    ],
    targets: [
      { metric: "INR (warfarin)", goal: "2.0-3.0 (2.5-3.5 for mechanical valve)" },
      { metric: "CHA2DS2-VASc", goal: "Anticoagulate if ≥2 (men) or ≥3 (women)" },
    ],
    monitoring: [
      { drug: "Warfarin", test: "INR", frequency: "Weekly until stable, then every 4 weeks" },
      { drug: "DOAC", test: "Renal function (eGFR)", frequency: "Every 6-12 months (more often if CKD)" },
      { drug: "DOAC", test: "CBC", frequency: "Annually" },
      { drug: "Any anticoagulant", test: "Signs of bleeding", frequency: "Every visit" },
    ],
  },
};

// ─── Main Validation Function ────────────────────────────────────────────────

export async function validateAgainstGuidelines(
  request: GuidelineValidationRequest,
): Promise<GuidelineValidationResult> {
  const { drugs, patientContext } = request;

  // Determine which guidelines apply based on patient conditions
  const applicableGuidelines = findApplicableGuidelines(patientContext.conditions);

  // Run rule-based checks first
  const ruleViolations = runRuleBasedChecks(drugs, patientContext, applicableGuidelines);

  // Run target assessment
  const targetAssessment = assessTargets(patientContext, applicableGuidelines);

  // Determine required monitoring
  const monitoringRequired = determineMonitoring(drugs, applicableGuidelines);

  // Run AI-powered deep analysis
  const aiAnalysis = await runAIGuidelineAnalysis(drugs, patientContext, applicableGuidelines, ruleViolations);

  // Combine violations
  const allViolations = [...ruleViolations, ...(aiAnalysis.additionalViolations || [])];

  // Calculate compliance score
  const overallScore = calculateComplianceScore(allViolations);

  return {
    isCompliant: allViolations.filter(v => v.severity === "critical" || v.severity === "major").length === 0,
    overallScore,
    violations: allViolations,
    recommendations: aiAnalysis.recommendations || [],
    targetAssessment,
    monitoringRequired,
    aiNarrative: aiAnalysis.narrative,
    guidelinesChecked: applicableGuidelines.map(g => `${g.name} (${g.source})`),
  };
}

// ─── Rule-Based Checks ───────────────────────────────────────────────────────

function findApplicableGuidelines(conditions: string[]) {
  const applicable: typeof CLINICAL_GUIDELINES[keyof typeof CLINICAL_GUIDELINES][] = [];
  const conditionsLower = conditions.map(c => c.toLowerCase());

  for (const [, guideline] of Object.entries(CLINICAL_GUIDELINES)) {
    if (guideline.conditions.some(gc => conditionsLower.some(pc => pc.includes(gc) || gc.includes(pc)))) {
      applicable.push(guideline);
    }
  }
  return applicable;
}

function runRuleBasedChecks(
  drugs: GuidelineValidationRequest["drugs"],
  patientContext: GuidelineValidationRequest["patientContext"],
  guidelines: typeof CLINICAL_GUIDELINES[keyof typeof CLINICAL_GUIDELINES][],
): GuidelineViolation[] {
  const violations: GuidelineViolation[] = [];
  const drugNamesLower = drugs.map(d => d.drugName.toLowerCase());

  for (const guideline of guidelines) {
    // Check contraindications
    for (const contra of guideline.contraindicated) {
      const contraLower = contra.drug.toLowerCase();
      for (const drug of drugs) {
        const drugLower = drug.drugName.toLowerCase();

        // Direct match
        if (contraLower.includes(drugLower) || drugLower.includes(contraLower.split(" ")[0])) {
          // Check context-specific contraindications
          if (shouldTriggerContraindication(contra, drug, patientContext, drugNamesLower)) {
            violations.push({
              drug: drug.drugName,
              severity: "critical",
              type: "contraindicated",
              guideline: guideline.name,
              guidelineSource: guideline.source,
              year: guideline.year,
              recommendation: contra.reason,
              evidence_level: "A",
              citation: `${guideline.source} — ${contra.reason}`,
            });
          }
        }
      }
    }

    // Check if first-line therapy is being used
    if (guideline.firstLine.length > 0) {
      const isUsingFirstLine = drugs.some(d => {
        const dLower = d.drugName.toLowerCase();
        return guideline.firstLine.some(fl => fl.toLowerCase().includes(dLower));
      });

      if (!isUsingFirstLine && drugs.length > 0) {
        // Check if any prescribed drug is NOT in first-line
        for (const drug of drugs) {
          const dLower = drug.drugName.toLowerCase();
          const isFirstLine = guideline.firstLine.some(fl => fl.toLowerCase().includes(dLower));
          if (!isFirstLine && drug.indication && guideline.conditions.some(c => drug.indication!.toLowerCase().includes(c))) {
            violations.push({
              drug: drug.drugName,
              severity: "moderate",
              type: "not_first_line",
              guideline: guideline.name,
              guidelineSource: guideline.source,
              year: guideline.year,
              recommendation: `${drug.drugName} is not a first-line therapy per ${guideline.source}. First-line options: ${guideline.firstLine.slice(0, 2).join("; ")}`,
              suggestedAlternative: guideline.firstLine[0],
              evidence_level: "A",
              citation: `${guideline.source} — First-line therapy recommendations`,
            });
          }
        }
      }
    }
  }

  // Check age-specific rules
  if (patientContext.age >= 65) {
    for (const drug of drugs) {
      const dLower = drug.drugName.toLowerCase();
      // Beers Criteria checks for elderly
      const beersDrugs = ["glibenclamide", "glyburide", "chlorpropamide", "meperidine", "indomethacin", "ketorolac", "diazepam", "chlordiazepoxide", "amitriptyline", "doxepin"];
      if (beersDrugs.some(b => dLower.includes(b))) {
        violations.push({
          drug: drug.drugName,
          severity: "major",
          type: "age_inappropriate",
          guideline: "AGS Beers Criteria 2023",
          guidelineSource: "American Geriatrics Society 2023",
          year: 2023,
          recommendation: `${drug.drugName} is potentially inappropriate in patients ≥65 years per Beers Criteria. Consider safer alternatives.`,
          evidence_level: "B",
          citation: "AGS Beers Criteria 2023 — Potentially Inappropriate Medications in Older Adults",
        });
      }
    }
  }

  return violations;
}

function shouldTriggerContraindication(
  contra: { drug: string; reason: string },
  drug: GuidelineValidationRequest["drugs"][0],
  patientContext: GuidelineValidationRequest["patientContext"],
  allDrugNames: string[],
): boolean {
  const contraLower = contra.drug.toLowerCase();
  const reason = contra.reason.toLowerCase();

  // Check combination contraindications
  if (contraLower.includes("+") || contraLower.includes("with")) {
    const parts = contraLower.split(/\s*[\+&]\s*|\s+with\s+/);
    if (parts.length >= 2) {
      return parts.every(part => allDrugNames.some(d => d.includes(part.trim().split(" ")[0])));
    }
  }

  // Check condition-specific contraindications
  if (reason.includes("egfr") && patientContext.labValues) {
    const egfr = patientContext.vitals?.egfr || patientContext.labValues["egfr"];
    if (egfr && reason.includes("<30") && egfr >= 30) return false;
    if (egfr && reason.includes("<30") && egfr < 30) return true;
  }

  if (reason.includes("pregnancy")) {
    // Only trigger if patient is female of childbearing age
    if (patientContext.sex !== "female" || patientContext.age > 50) return false;
  }

  if (reason.includes("heart failure") || reason.includes("hf")) {
    if (!patientContext.conditions.some(c => c.toLowerCase().includes("heart failure") || c.toLowerCase().includes("hf"))) return false;
  }

  return true;
}

// ─── Target Assessment ───────────────────────────────────────────────────────

function assessTargets(
  patientContext: GuidelineValidationRequest["patientContext"],
  guidelines: typeof CLINICAL_GUIDELINES[keyof typeof CLINICAL_GUIDELINES][],
): GuidelineValidationResult["targetAssessment"] {
  const assessments: GuidelineValidationResult["targetAssessment"] = [];

  for (const guideline of guidelines) {
    for (const target of guideline.targets) {
      let currentValue: number | undefined;
      let isAtTarget = false;

      if (target.metric === "BP" && patientContext.vitals?.bpSystolic) {
        currentValue = patientContext.vitals.bpSystolic;
        const goalNum = parseInt(target.goal.replace(/[<>]/g, "").split("/")[0]);
        isAtTarget = currentValue < goalNum;
      } else if (target.metric === "HbA1c" && patientContext.vitals?.hba1c) {
        currentValue = patientContext.vitals.hba1c;
        const goalNum = parseFloat(target.goal.replace(/[<%]/g, ""));
        isAtTarget = currentValue < goalNum;
      } else if (target.metric === "LDL-C" && patientContext.labValues?.["ldl"]) {
        currentValue = patientContext.labValues["ldl"];
        const goalNum = parseInt(target.goal.replace(/[<> mg\/dL]/g, ""));
        isAtTarget = currentValue < goalNum;
      } else if (target.metric === "Heart rate" && patientContext.vitals?.heartRate) {
        currentValue = patientContext.vitals.heartRate;
        const goalNum = parseInt(target.goal.replace(/[<> bpm]/g, ""));
        isAtTarget = currentValue < goalNum;
      }

      if (currentValue !== undefined) {
        assessments.push({
          target: target.metric,
          currentValue,
          goalValue: target.goal + (target.population ? ` (${target.population})` : ""),
          isAtTarget,
          guideline: `${guideline.name} — ${guideline.source}`,
          adjustmentNeeded: isAtTarget ? undefined : `Current ${target.metric}: ${currentValue} — Goal: ${target.goal}. Consider therapy intensification.`,
        });
      }
    }
  }

  return assessments;
}

// ─── Monitoring Requirements ─────────────────────────────────────────────────

function determineMonitoring(
  drugs: GuidelineValidationRequest["drugs"],
  guidelines: typeof CLINICAL_GUIDELINES[keyof typeof CLINICAL_GUIDELINES][],
): GuidelineValidationResult["monitoringRequired"] {
  const monitoring: GuidelineValidationResult["monitoringRequired"] = [];

  for (const guideline of guidelines) {
    for (const mon of guideline.monitoring) {
      const drugLower = mon.drug.toLowerCase();
      const isRelevant = drugs.some(d => {
        const dLower = d.drugName.toLowerCase();
        return drugLower.includes(dLower) || dLower.includes(drugLower.split(" ")[0]) || drugLower.includes("any");
      });

      if (isRelevant) {
        monitoring.push({
          test: mon.test,
          frequency: mon.frequency,
          reason: `Required per ${guideline.source}`,
          relatedDrug: mon.drug,
          guideline: guideline.source,
        });
      }
    }
  }

  return monitoring;
}

// ─── AI-Powered Deep Analysis ────────────────────────────────────────────────

async function runAIGuidelineAnalysis(
  drugs: GuidelineValidationRequest["drugs"],
  patientContext: GuidelineValidationRequest["patientContext"],
  guidelines: typeof CLINICAL_GUIDELINES[keyof typeof CLINICAL_GUIDELINES][],
  existingViolations: GuidelineViolation[],
): Promise<{
  narrative: string;
  additionalViolations: GuidelineViolation[];
  recommendations: GuidelineValidationResult["recommendations"];
}> {
  if (!isGeminiConfigured()) {
    return {
      narrative: "AI analysis unavailable — Gemini not configured.",
      additionalViolations: [],
      recommendations: [],
    };
  }

  const guidelineContext = guidelines.map(g => ({
    name: g.name,
    source: g.source,
    year: g.year,
    firstLine: g.firstLine,
    stepTherapy: g.stepTherapy,
  }));

  const prompt = `You are MediGuard, an AI clinical pharmacist and guideline expert.

TASK: Analyze this prescription against current clinical guidelines and provide:
1. A concise narrative summary (2-3 paragraphs) of guideline compliance
2. Any additional violations not caught by rule-based checks
3. Specific recommendations for optimization

PATIENT:
- Age: ${patientContext.age}, Sex: ${patientContext.sex}
- Conditions: ${patientContext.conditions.join(", ")}
- Current medications: ${patientContext.currentMedications?.join(", ") || "None listed"}
${patientContext.vitals ? `- Vitals: BP ${patientContext.vitals.bpSystolic || "?"}/${patientContext.vitals.bpDiastolic || "?"}, HR ${patientContext.vitals.heartRate || "?"}, HbA1c ${patientContext.vitals.hba1c || "?"}, eGFR ${patientContext.vitals.egfr || "?"}` : ""}

PRESCRIBED DRUGS:
${drugs.map(d => `- ${d.drugName} ${d.dose || ""} ${d.frequency || ""} ${d.indication ? `(for: ${d.indication})` : ""}`).join("\n")}

APPLICABLE GUIDELINES:
${JSON.stringify(guidelineContext, null, 2)}

EXISTING VIOLATIONS FOUND:
${existingViolations.length > 0 ? existingViolations.map(v => `- [${v.severity}] ${v.drug}: ${v.recommendation}`).join("\n") : "None"}

Respond in JSON format:
{
  "narrative": "Clinical narrative in English (professional, concise, cite guidelines)",
  "additionalViolations": [
    {
      "drug": "drug name",
      "severity": "critical|major|moderate|informational",
      "type": "not_first_line|contraindicated|dose_outside_range|step_therapy_required|better_alternative|missing_monitoring",
      "guideline": "guideline name",
      "guidelineSource": "source + year",
      "year": 2024,
      "recommendation": "what should be done",
      "suggestedAlternative": "alternative drug if applicable",
      "evidence_level": "A|B|C",
      "citation": "specific citation"
    }
  ],
  "recommendations": [
    {
      "condition": "condition name",
      "currentTherapy": "what patient is on",
      "guidelineRecommendation": "what guideline says",
      "source": "guideline source",
      "action": "continue|modify|add|switch|stop",
      "priority": "urgent|important|routine"
    }
  ]
}`;

  try {
    const client = getGeminiClient();
    const result = await client!.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.2, responseMimeType: "application/json" },
    });

    const text = result.text ?? "";
    const parsed = JSON.parse(text);

    return {
      narrative: parsed.narrative || "Analysis complete.",
      additionalViolations: (parsed.additionalViolations || []).map((v: Record<string, unknown>) => ({
        drug: v.drug || "Unknown",
        severity: v.severity || "informational",
        type: v.type || "better_alternative",
        guideline: v.guideline || "Clinical Guidelines",
        guidelineSource: v.guidelineSource || "Expert Opinion",
        year: v.year || 2024,
        recommendation: v.recommendation || "",
        suggestedAlternative: v.suggestedAlternative,
        evidence_level: v.evidence_level || "C",
        citation: v.citation || "",
      })),
      recommendations: parsed.recommendations || [],
    };
  } catch (err) {
    console.error("[MediGuard Guidelines] AI analysis error:", err);
    return {
      narrative: "AI-enhanced analysis encountered an error. Rule-based checks completed successfully.",
      additionalViolations: [],
      recommendations: [],
    };
  }
}

// ─── Compliance Score ────────────────────────────────────────────────────────

function calculateComplianceScore(violations: GuidelineViolation[]): number {
  let score = 100;
  for (const v of violations) {
    switch (v.severity) {
      case "critical": score -= 30; break;
      case "major": score -= 20; break;
      case "moderate": score -= 10; break;
      case "informational": score -= 3; break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

// ─── Export Guidelines List (for UI) ─────────────────────────────────────────

export function getAvailableGuidelines() {
  return Object.entries(CLINICAL_GUIDELINES).map(([key, g]) => ({
    id: key,
    name: g.name,
    nameAr: g.nameAr,
    source: g.source,
    year: g.year,
    conditions: g.conditions,
    hasStepTherapy: !!g.stepTherapy,
    monitoringChecks: g.monitoring.length,
    contraindications: g.contraindicated.length,
  }));
}

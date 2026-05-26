/**
 * Curated biomarker reference library.
 *
 * Scope: ~50 common adult biomarkers across 8 panels. Reference ranges are
 * the standard adult ranges most US/EU clinical labs report; sex-specific
 * where the literature requires it.
 *
 * **This is screening guidance, not a substitute for the reporting lab's
 * own reference ranges.** A real lab's printed values always win in a
 * conflict.
 *
 * Sources cross-referenced:
 *   - LOINC.org (codes)
 *   - MedlinePlus (US National Library of Medicine)
 *   - CLSI EP28-A3c (statistical methods for ref ranges)
 *   - UpToDate adult ranges
 */

export type Sex = "male" | "female" | "any";

export interface BiomarkerSpec {
  /** Short canonical name (used as the test identifier). */
  name: string;
  /** Long descriptive name shown in the UI when needed. */
  longName?: string;
  /** LOINC code where available — empty string when ambiguous. */
  loinc: string;
  /** SI / customary unit. */
  unit: string;
  /** Reference range, possibly multiple if sex-specific. */
  ranges: BiomarkerRange[];
  /** Notes shown as a small hint under the input. */
  hint?: string;
}

export interface BiomarkerRange {
  sex: Sex;
  /** Optional: only applies above this age. */
  ageMin?: number;
  /** Optional: only applies below this age. */
  ageMax?: number;
  low: number;
  high: number;
  /** Critical thresholds — values outside these are red-flagged. */
  criticalLow?: number;
  criticalHigh?: number;
}

export interface PanelSpec {
  /** Stable identifier (used by the UI router). */
  id: string;
  /** Display name. */
  name: string;
  /** Panel-level LOINC code if one is registered. */
  loinc?: string;
  /** Short description for the picker. */
  description: string;
  /** Ordered biomarker list. */
  biomarkers: BiomarkerSpec[];
}

// ─────────────────────────────────────────────────────────────────
// Panels
// ─────────────────────────────────────────────────────────────────
export const PANELS: PanelSpec[] = [
  // CBC
  {
    id: "cbc",
    name: "Complete Blood Count (CBC)",
    loinc: "58410-2",
    description: "Hemoglobin, hematocrit, RBC/WBC/platelets, indices.",
    biomarkers: [
      {
        name: "Hemoglobin",
        longName: "Hemoglobin",
        loinc: "718-7",
        unit: "g/dL",
        ranges: [
          { sex: "male", low: 13.5, high: 17.5, criticalLow: 7, criticalHigh: 20 },
          { sex: "female", low: 12.0, high: 15.5, criticalLow: 7, criticalHigh: 20 },
        ],
      },
      {
        name: "Hematocrit",
        loinc: "4544-3",
        unit: "%",
        ranges: [
          { sex: "male", low: 38.8, high: 50.0 },
          { sex: "female", low: 34.9, high: 44.5 },
        ],
      },
      {
        name: "WBC",
        longName: "White Blood Cell count",
        loinc: "6690-2",
        unit: "10^9/L",
        ranges: [
          { sex: "any", low: 4.0, high: 11.0, criticalLow: 2.0, criticalHigh: 30.0 },
        ],
      },
      {
        name: "Platelets",
        loinc: "777-3",
        unit: "10^9/L",
        ranges: [
          { sex: "any", low: 150, high: 450, criticalLow: 50, criticalHigh: 1000 },
        ],
      },
      {
        name: "RBC",
        longName: "Red Blood Cell count",
        loinc: "789-8",
        unit: "10^12/L",
        ranges: [
          { sex: "male", low: 4.7, high: 6.1 },
          { sex: "female", low: 4.2, high: 5.4 },
        ],
      },
      { name: "MCV", loinc: "787-2", unit: "fL", ranges: [{ sex: "any", low: 80, high: 100 }] },
      { name: "MCH", loinc: "785-6", unit: "pg", ranges: [{ sex: "any", low: 27, high: 33 }] },
      { name: "MCHC", loinc: "786-4", unit: "g/dL", ranges: [{ sex: "any", low: 33, high: 36 }] },
      { name: "RDW", loinc: "788-0", unit: "%", ranges: [{ sex: "any", low: 11.5, high: 14.5 }] },
    ],
  },

  // BMP
  {
    id: "bmp",
    name: "Basic Metabolic Panel (BMP)",
    loinc: "24320-4",
    description: "Sodium, potassium, chloride, CO₂, BUN, creatinine, glucose, calcium.",
    biomarkers: [
      {
        name: "Sodium",
        loinc: "2951-2",
        unit: "mmol/L",
        ranges: [
          { sex: "any", low: 135, high: 145, criticalLow: 120, criticalHigh: 160 },
        ],
      },
      {
        name: "Potassium",
        loinc: "2823-3",
        unit: "mmol/L",
        ranges: [
          { sex: "any", low: 3.5, high: 5.0, criticalLow: 2.5, criticalHigh: 6.5 },
        ],
      },
      { name: "Chloride", loinc: "2075-0", unit: "mmol/L", ranges: [{ sex: "any", low: 96, high: 106 }] },
      { name: "CO2", longName: "Bicarbonate", loinc: "2028-9", unit: "mmol/L", ranges: [{ sex: "any", low: 22, high: 29 }] },
      { name: "BUN", longName: "Blood Urea Nitrogen", loinc: "3094-0", unit: "mg/dL", ranges: [{ sex: "any", low: 7, high: 20 }] },
      {
        name: "Creatinine",
        loinc: "2160-0",
        unit: "mg/dL",
        ranges: [
          { sex: "male", low: 0.74, high: 1.35 },
          { sex: "female", low: 0.59, high: 1.04 },
        ],
      },
      {
        name: "Glucose",
        longName: "Glucose (fasting)",
        loinc: "1558-6",
        unit: "mg/dL",
        ranges: [
          { sex: "any", low: 70, high: 99, criticalLow: 40, criticalHigh: 500 },
        ],
        hint: "Fasting range. Postprandial cutoff differs.",
      },
      { name: "Calcium", loinc: "17861-6", unit: "mg/dL", ranges: [{ sex: "any", low: 8.5, high: 10.2 }] },
    ],
  },

  // CMP (extends BMP with liver)
  {
    id: "cmp",
    name: "Comprehensive Metabolic Panel (CMP)",
    loinc: "24323-8",
    description: "BMP plus albumin, total protein, ALT, AST, ALP, bilirubin.",
    biomarkers: [
      // BMP block
      { name: "Sodium", loinc: "2951-2", unit: "mmol/L", ranges: [{ sex: "any", low: 135, high: 145 }] },
      { name: "Potassium", loinc: "2823-3", unit: "mmol/L", ranges: [{ sex: "any", low: 3.5, high: 5.0 }] },
      { name: "Chloride", loinc: "2075-0", unit: "mmol/L", ranges: [{ sex: "any", low: 96, high: 106 }] },
      { name: "CO2", loinc: "2028-9", unit: "mmol/L", ranges: [{ sex: "any", low: 22, high: 29 }] },
      { name: "BUN", loinc: "3094-0", unit: "mg/dL", ranges: [{ sex: "any", low: 7, high: 20 }] },
      {
        name: "Creatinine",
        loinc: "2160-0",
        unit: "mg/dL",
        ranges: [
          { sex: "male", low: 0.74, high: 1.35 },
          { sex: "female", low: 0.59, high: 1.04 },
        ],
      },
      { name: "Glucose", loinc: "1558-6", unit: "mg/dL", ranges: [{ sex: "any", low: 70, high: 99 }] },
      { name: "Calcium", loinc: "17861-6", unit: "mg/dL", ranges: [{ sex: "any", low: 8.5, high: 10.2 }] },
      // Liver block
      { name: "Albumin", loinc: "1751-7", unit: "g/dL", ranges: [{ sex: "any", low: 3.4, high: 5.4 }] },
      { name: "Total Protein", loinc: "2885-2", unit: "g/dL", ranges: [{ sex: "any", low: 6.0, high: 8.3 }] },
      { name: "ALT", longName: "Alanine Aminotransferase", loinc: "1742-6", unit: "U/L", ranges: [{ sex: "any", low: 7, high: 56 }] },
      { name: "AST", longName: "Aspartate Aminotransferase", loinc: "1920-8", unit: "U/L", ranges: [{ sex: "any", low: 10, high: 40 }] },
      { name: "ALP", longName: "Alkaline Phosphatase", loinc: "6768-6", unit: "U/L", ranges: [{ sex: "any", low: 44, high: 147 }] },
      { name: "Total Bilirubin", loinc: "1975-2", unit: "mg/dL", ranges: [{ sex: "any", low: 0.1, high: 1.2 }] },
    ],
  },

  // Lipid
  {
    id: "lipid",
    name: "Lipid Panel",
    loinc: "57698-3",
    description: "Total cholesterol, LDL, HDL, triglycerides.",
    biomarkers: [
      { name: "Total Cholesterol", loinc: "2093-3", unit: "mg/dL", ranges: [{ sex: "any", low: 0, high: 200 }], hint: "Desirable < 200 mg/dL." },
      { name: "LDL", longName: "LDL Cholesterol", loinc: "13457-7", unit: "mg/dL", ranges: [{ sex: "any", low: 0, high: 100 }], hint: "Optimal < 100 mg/dL." },
      {
        name: "HDL",
        longName: "HDL Cholesterol",
        loinc: "2085-9",
        unit: "mg/dL",
        ranges: [
          { sex: "male", low: 40, high: 200 },
          { sex: "female", low: 50, high: 200 },
        ],
        hint: "Higher is better.",
      },
      { name: "Triglycerides", loinc: "2571-8", unit: "mg/dL", ranges: [{ sex: "any", low: 0, high: 150 }], hint: "Fasting. Normal < 150 mg/dL." },
    ],
  },

  // A1c & diabetes
  {
    id: "diabetes",
    name: "Diabetes Markers",
    description: "HbA1c, fasting glucose.",
    biomarkers: [
      {
        name: "HbA1c",
        longName: "Hemoglobin A1c",
        loinc: "4548-4",
        unit: "%",
        ranges: [{ sex: "any", low: 4.0, high: 5.6 }],
        hint: "ADA: <5.7% normal · 5.7–6.4% prediabetes · ≥6.5% diabetes.",
      },
      { name: "Fasting Glucose", loinc: "1558-6", unit: "mg/dL", ranges: [{ sex: "any", low: 70, high: 99 }] },
    ],
  },

  // Thyroid
  {
    id: "thyroid",
    name: "Thyroid Function (TFTs)",
    description: "TSH, free T4, free T3.",
    biomarkers: [
      { name: "TSH", loinc: "3016-3", unit: "mIU/L", ranges: [{ sex: "any", low: 0.4, high: 4.0, criticalLow: 0.1, criticalHigh: 20 }] },
      { name: "Free T4", loinc: "3024-7", unit: "ng/dL", ranges: [{ sex: "any", low: 0.8, high: 1.8 }] },
      { name: "Free T3", loinc: "3051-0", unit: "pg/mL", ranges: [{ sex: "any", low: 2.3, high: 4.2 }] },
    ],
  },

  // Renal panel
  {
    id: "renal",
    name: "Renal Function",
    description: "BUN, creatinine, eGFR.",
    biomarkers: [
      { name: "BUN", loinc: "3094-0", unit: "mg/dL", ranges: [{ sex: "any", low: 7, high: 20 }] },
      {
        name: "Creatinine",
        loinc: "2160-0",
        unit: "mg/dL",
        ranges: [
          { sex: "male", low: 0.74, high: 1.35 },
          { sex: "female", low: 0.59, high: 1.04 },
        ],
      },
      { name: "eGFR", loinc: "62238-1", unit: "mL/min/1.73m²", ranges: [{ sex: "any", low: 90, high: 120 }], hint: "Stage 3 CKD: 30–59. Stage 5: <15." },
    ],
  },

  // Urinalysis (qualitative & semi-quantitative — looser ranges)
  {
    id: "urinalysis",
    name: "Urinalysis",
    description: "pH, specific gravity, glucose, protein, ketones.",
    biomarkers: [
      { name: "pH", loinc: "5803-2", unit: "", ranges: [{ sex: "any", low: 4.5, high: 8.0 }] },
      { name: "Specific Gravity", loinc: "5811-5", unit: "", ranges: [{ sex: "any", low: 1.005, high: 1.030 }] },
      { name: "Urine Glucose", loinc: "5792-7", unit: "mg/dL", ranges: [{ sex: "any", low: 0, high: 15 }], hint: "Normally absent." },
      { name: "Urine Protein", loinc: "5804-0", unit: "mg/dL", ranges: [{ sex: "any", low: 0, high: 14 }], hint: "Normally absent / trace." },
      { name: "Urine Ketones", loinc: "5797-6", unit: "mg/dL", ranges: [{ sex: "any", low: 0, high: 5 }], hint: "Normally absent." },
    ],
  },

  // ── New panels ─────────────────────────────────────────────────

  // Liver Function Tests
  {
    id: "liver",
    name: "Liver Function Tests (LFTs)",
    loinc: "24325-3",
    description: "ALT, AST, ALP, GGT, bilirubin, albumin, total protein.",
    biomarkers: [
      { name: "ALT", longName: "Alanine Aminotransferase", loinc: "1742-6", unit: "U/L", ranges: [{ sex: "any", low: 7, high: 56 }] },
      { name: "AST", longName: "Aspartate Aminotransferase", loinc: "1920-8", unit: "U/L", ranges: [{ sex: "any", low: 10, high: 40 }] },
      { name: "ALP", longName: "Alkaline Phosphatase", loinc: "6768-6", unit: "U/L", ranges: [{ sex: "any", low: 44, high: 147 }] },
      { name: "GGT", longName: "Gamma-Glutamyl Transferase", loinc: "2324-2", unit: "U/L", ranges: [{ sex: "male", low: 0, high: 65 }, { sex: "female", low: 0, high: 45 }] },
      { name: "Total Bilirubin", loinc: "1975-2", unit: "mg/dL", ranges: [{ sex: "any", low: 0.1, high: 1.2 }] },
      { name: "Direct Bilirubin", loinc: "1968-7", unit: "mg/dL", ranges: [{ sex: "any", low: 0, high: 0.3 }] },
      { name: "Albumin", loinc: "1751-7", unit: "g/dL", ranges: [{ sex: "any", low: 3.4, high: 5.4 }] },
      { name: "Total Protein", loinc: "2885-2", unit: "g/dL", ranges: [{ sex: "any", low: 6.0, high: 8.3 }] },
    ],
  },

  // Coagulation Panel
  {
    id: "coagulation",
    name: "Coagulation Panel",
    loinc: "55230-8",
    description: "PT, INR, aPTT, fibrinogen.",
    biomarkers: [
      { name: "PT", longName: "Prothrombin Time", loinc: "5902-2", unit: "seconds", ranges: [{ sex: "any", low: 11, high: 13.5 }] },
      { name: "INR", longName: "International Normalized Ratio", loinc: "6301-6", unit: "", ranges: [{ sex: "any", low: 0.8, high: 1.1 }], hint: "Therapeutic on warfarin: 2.0–3.0." },
      { name: "aPTT", longName: "Activated Partial Thromboplastin Time", loinc: "3173-2", unit: "seconds", ranges: [{ sex: "any", low: 25, high: 35 }] },
      { name: "Fibrinogen", loinc: "3255-7", unit: "mg/dL", ranges: [{ sex: "any", low: 200, high: 400 }] },
    ],
  },

  // Iron Studies
  {
    id: "iron",
    name: "Iron Studies",
    description: "Serum iron, ferritin, TIBC, transferrin saturation.",
    biomarkers: [
      { name: "Serum Iron", loinc: "2498-4", unit: "µg/dL", ranges: [{ sex: "male", low: 65, high: 175 }, { sex: "female", low: 50, high: 170 }] },
      { name: "Ferritin", loinc: "2276-4", unit: "ng/mL", ranges: [{ sex: "male", low: 24, high: 336 }, { sex: "female", low: 11, high: 307 }] },
      { name: "TIBC", longName: "Total Iron Binding Capacity", loinc: "2500-7", unit: "µg/dL", ranges: [{ sex: "any", low: 250, high: 400 }] },
      { name: "Transferrin Saturation", loinc: "2502-3", unit: "%", ranges: [{ sex: "any", low: 20, high: 50 }] },
    ],
  },

  // Vitamin Panel
  {
    id: "vitamins",
    name: "Vitamin Panel",
    description: "Vitamin D, B12, folate.",
    biomarkers: [
      { name: "Vitamin D", longName: "25-Hydroxy Vitamin D", loinc: "1989-3", unit: "ng/mL", ranges: [{ sex: "any", low: 30, high: 100 }], hint: "Deficient <20, insufficient 20–29." },
      { name: "Vitamin B12", loinc: "2132-9", unit: "pg/mL", ranges: [{ sex: "any", low: 200, high: 900 }] },
      { name: "Folate", longName: "Serum Folate", loinc: "2284-8", unit: "ng/mL", ranges: [{ sex: "any", low: 2.7, high: 17 }] },
    ],
  },

  // Cardiac Markers
  {
    id: "cardiac",
    name: "Cardiac Markers",
    description: "Troponin I, CK-MB, BNP, LDH.",
    biomarkers: [
      { name: "Troponin I", loinc: "10839-9", unit: "ng/mL", ranges: [{ sex: "any", low: 0, high: 0.04, criticalHigh: 0.4 }], hint: ">0.04 suggests myocardial injury." },
      { name: "CK-MB", longName: "Creatine Kinase-MB", loinc: "2157-6", unit: "ng/mL", ranges: [{ sex: "any", low: 0, high: 5 }] },
      { name: "BNP", longName: "B-type Natriuretic Peptide", loinc: "30934-4", unit: "pg/mL", ranges: [{ sex: "any", low: 0, high: 100 }], hint: ">100 suggests heart failure." },
      { name: "LDH", longName: "Lactate Dehydrogenase", loinc: "2532-0", unit: "U/L", ranges: [{ sex: "any", low: 140, high: 280 }] },
    ],
  },

  // Tumor Markers
  {
    id: "tumor",
    name: "Tumor Markers",
    description: "PSA, CEA, AFP, CA-125, CA 19-9.",
    biomarkers: [
      { name: "PSA", longName: "Prostate-Specific Antigen", loinc: "2857-1", unit: "ng/mL", ranges: [{ sex: "male", low: 0, high: 4.0 }], hint: "Age-adjusted cutoffs may vary." },
      { name: "CEA", longName: "Carcinoembryonic Antigen", loinc: "2039-6", unit: "ng/mL", ranges: [{ sex: "any", low: 0, high: 3.0 }], hint: "Non-smokers <3.0, smokers <5.0." },
      { name: "AFP", longName: "Alpha-Fetoprotein", loinc: "1834-1", unit: "ng/mL", ranges: [{ sex: "any", low: 0, high: 10 }] },
      { name: "CA-125", loinc: "10334-1", unit: "U/mL", ranges: [{ sex: "female", low: 0, high: 35 }] },
      { name: "CA 19-9", loinc: "24108-3", unit: "U/mL", ranges: [{ sex: "any", low: 0, high: 37 }] },
    ],
  },

  // Hormones
  {
    id: "hormones",
    name: "Hormone Panel",
    description: "Testosterone, estradiol, progesterone, LH, FSH, prolactin, cortisol.",
    biomarkers: [
      { name: "Total Testosterone", loinc: "2986-8", unit: "ng/dL", ranges: [{ sex: "male", low: 270, high: 1070 }, { sex: "female", low: 15, high: 70 }] },
      { name: "Estradiol", longName: "Estradiol (E2)", loinc: "2243-4", unit: "pg/mL", ranges: [{ sex: "male", low: 10, high: 40 }, { sex: "female", low: 15, high: 350 }], hint: "Varies by menstrual phase." },
      { name: "Progesterone", loinc: "2839-9", unit: "ng/mL", ranges: [{ sex: "female", low: 0.1, high: 25 }], hint: "Varies by menstrual phase." },
      { name: "LH", longName: "Luteinizing Hormone", loinc: "10501-5", unit: "mIU/mL", ranges: [{ sex: "male", low: 1.8, high: 8.6 }, { sex: "female", low: 1.0, high: 95 }], hint: "Female range varies by phase." },
      { name: "FSH", longName: "Follicle-Stimulating Hormone", loinc: "15067-2", unit: "mIU/mL", ranges: [{ sex: "male", low: 1.5, high: 12.4 }, { sex: "female", low: 1.0, high: 135 }], hint: "Female range varies by phase." },
      { name: "Prolactin", loinc: "2842-3", unit: "ng/mL", ranges: [{ sex: "male", low: 2, high: 18 }, { sex: "female", low: 2, high: 29 }] },
      { name: "Cortisol (AM)", loinc: "2143-6", unit: "µg/dL", ranges: [{ sex: "any", low: 6.2, high: 19.4 }], hint: "Morning (6–8 AM) sample." },
    ],
  },

  // Infectious Disease Panel
  {
    id: "infectious",
    name: "Infectious Disease Panel",
    description: "Hepatitis B/C, HIV, syphilis markers.",
    biomarkers: [
      { name: "HBsAg", longName: "Hepatitis B Surface Antigen", loinc: "5195-3", unit: "", ranges: [{ sex: "any", low: 0, high: 0 }], hint: "Positive/Negative. Qualitative." },
      { name: "Anti-HBs", longName: "Hepatitis B Surface Antibody", loinc: "10900-9", unit: "mIU/mL", ranges: [{ sex: "any", low: 10, high: 99999 }], hint: "≥10 = immune." },
      { name: "Anti-HCV", longName: "Hepatitis C Antibody", loinc: "16128-1", unit: "", ranges: [{ sex: "any", low: 0, high: 0 }], hint: "Positive/Negative. Qualitative." },
      { name: "HIV Ag/Ab", longName: "HIV Antigen/Antibody Combo", loinc: "56888-1", unit: "", ranges: [{ sex: "any", low: 0, high: 0 }], hint: "Non-reactive = negative." },
      { name: "RPR", longName: "Rapid Plasma Reagin (Syphilis)", loinc: "20507-0", unit: "", ranges: [{ sex: "any", low: 0, high: 0 }], hint: "Non-reactive = negative." },
    ],
  },

  // Electrolytes Panel
  {
    id: "electrolytes",
    name: "Electrolytes Panel",
    description: "Sodium, potassium, chloride, bicarbonate, calcium, magnesium, phosphate.",
    biomarkers: [
      { name: "Sodium", loinc: "2951-2", unit: "mmol/L", ranges: [{ sex: "any", low: 135, high: 145, criticalLow: 120, criticalHigh: 160 }] },
      { name: "Potassium", loinc: "2823-3", unit: "mmol/L", ranges: [{ sex: "any", low: 3.5, high: 5.0, criticalLow: 2.5, criticalHigh: 6.5 }] },
      { name: "Chloride", loinc: "2075-0", unit: "mmol/L", ranges: [{ sex: "any", low: 96, high: 106 }] },
      { name: "Bicarbonate", loinc: "2028-9", unit: "mmol/L", ranges: [{ sex: "any", low: 22, high: 29 }] },
      { name: "Calcium", loinc: "17861-6", unit: "mg/dL", ranges: [{ sex: "any", low: 8.5, high: 10.2 }] },
      { name: "Magnesium", loinc: "19123-9", unit: "mg/dL", ranges: [{ sex: "any", low: 1.7, high: 2.2 }] },
      { name: "Phosphate", loinc: "2777-1", unit: "mg/dL", ranges: [{ sex: "any", low: 2.5, high: 4.5 }] },
    ],
  },

  // Arterial Blood Gas (ABG)
  {
    id: "abg",
    name: "Arterial Blood Gas (ABG)",
    description: "pH, pCO2, pO2, HCO3, base excess, O2 saturation.",
    biomarkers: [
      { name: "Arterial pH", loinc: "2744-1", unit: "", ranges: [{ sex: "any", low: 7.35, high: 7.45, criticalLow: 7.1, criticalHigh: 7.6 }] },
      { name: "pCO2", longName: "Partial Pressure CO2", loinc: "2019-8", unit: "mmHg", ranges: [{ sex: "any", low: 35, high: 45 }] },
      { name: "pO2", longName: "Partial Pressure O2", loinc: "2703-7", unit: "mmHg", ranges: [{ sex: "any", low: 80, high: 100, criticalLow: 40 }] },
      { name: "HCO3", longName: "Bicarbonate (ABG)", loinc: "1960-4", unit: "mmol/L", ranges: [{ sex: "any", low: 22, high: 26 }] },
      { name: "Base Excess", loinc: "1925-7", unit: "mmol/L", ranges: [{ sex: "any", low: -2, high: 2 }] },
      { name: "O2 Saturation", loinc: "2708-6", unit: "%", ranges: [{ sex: "any", low: 95, high: 100, criticalLow: 88 }] },
    ],
  },

  // Stool Analysis
  {
    id: "stool",
    name: "Stool Analysis",
    description: "Occult blood, WBC, parasites, H. pylori.",
    biomarkers: [
      { name: "Fecal Occult Blood", loinc: "27396-1", unit: "", ranges: [{ sex: "any", low: 0, high: 0 }], hint: "Negative = normal." },
      { name: "Stool WBC", loinc: "11055-2", unit: "/HPF", ranges: [{ sex: "any", low: 0, high: 5 }] },
      { name: "H. pylori Antigen", loinc: "29893-5", unit: "", ranges: [{ sex: "any", low: 0, high: 0 }], hint: "Negative = normal." },
    ],
  },

  // Semen Analysis
  {
    id: "semen",
    name: "Semen Analysis",
    description: "Volume, count, motility, morphology.",
    biomarkers: [
      { name: "Semen Volume", loinc: "3167-4", unit: "mL", ranges: [{ sex: "male", low: 1.5, high: 6.0 }] },
      { name: "Sperm Concentration", loinc: "3168-2", unit: "million/mL", ranges: [{ sex: "male", low: 15, high: 300 }], hint: "WHO 2010: ≥15 M/mL." },
      { name: "Total Motility", loinc: "6159-8", unit: "%", ranges: [{ sex: "male", low: 40, high: 100 }] },
      { name: "Normal Morphology", loinc: "3169-0", unit: "%", ranges: [{ sex: "male", low: 4, high: 100 }], hint: "Strict (Kruger): ≥4% normal." },
    ],
  },

  // Allergy Panel (IgE)
  {
    id: "allergy",
    name: "Allergy Panel (IgE)",
    description: "Total IgE, specific IgE panels.",
    biomarkers: [
      { name: "Total IgE", loinc: "19113-0", unit: "IU/mL", ranges: [{ sex: "any", low: 0, high: 100 }], hint: ">100 IU/mL may indicate atopy." },
    ],
  },

  // Autoimmune Panel
  {
    id: "autoimmune",
    name: "Autoimmune Panel",
    description: "ANA, RF, anti-CCP, ESR, CRP.",
    biomarkers: [
      { name: "ANA", longName: "Antinuclear Antibody", loinc: "8061-4", unit: "titer", ranges: [{ sex: "any", low: 0, high: 0 }], hint: "Negative (<1:40) = normal." },
      { name: "RF", longName: "Rheumatoid Factor", loinc: "11572-5", unit: "IU/mL", ranges: [{ sex: "any", low: 0, high: 14 }] },
      { name: "Anti-CCP", longName: "Anti-Cyclic Citrullinated Peptide", loinc: "53027-9", unit: "U/mL", ranges: [{ sex: "any", low: 0, high: 20 }] },
      { name: "ESR", longName: "Erythrocyte Sedimentation Rate", loinc: "4537-7", unit: "mm/hr", ranges: [{ sex: "male", low: 0, high: 15 }, { sex: "female", low: 0, high: 20 }] },
      { name: "CRP", longName: "C-Reactive Protein", loinc: "1988-5", unit: "mg/L", ranges: [{ sex: "any", low: 0, high: 3.0 }], hint: ">10 mg/L suggests significant inflammation." },
    ],
  },

  // HbA1c + Fasting Glucose (Diabetes Screening)
  {
    id: "diabetes_screen",
    name: "Diabetes Screening (HbA1c + FG)",
    description: "HbA1c and fasting glucose for diabetes screening.",
    biomarkers: [
      { name: "HbA1c", longName: "Hemoglobin A1c", loinc: "4548-4", unit: "%", ranges: [{ sex: "any", low: 4.0, high: 5.6 }], hint: "ADA: <5.7% normal · 5.7–6.4% prediabetes · ≥6.5% diabetes." },
      { name: "Fasting Glucose", loinc: "1558-6", unit: "mg/dL", ranges: [{ sex: "any", low: 70, high: 99, criticalLow: 40, criticalHigh: 500 }] },
    ],
  },
];

export const PANEL_BY_ID = Object.fromEntries(PANELS.map((p) => [p.id, p])) as Record<
  string,
  PanelSpec
>;

/**
 * Map from AI-detected panelCategory strings to panel IDs.
 * The AI returns one of: CBC, BMP, CMP, Lipid, Diabetes, Thyroid, Renal,
 * Liver, Coagulation, Iron, Vitamins, Cardiac, Tumor, Hormones, Infectious,
 * Electrolytes, ABG, Urinalysis, Stool, Semen, Allergy, Autoimmune, Other.
 */
const CATEGORY_TO_PANEL_ID: Record<string, string> = {
  cbc: "cbc",
  bmp: "bmp",
  cmp: "cmp",
  lipid: "lipid",
  diabetes: "diabetes",
  "diabetes screening": "diabetes_screen",
  thyroid: "thyroid",
  renal: "renal",
  liver: "liver",
  lft: "liver",
  lfts: "liver",
  coagulation: "coagulation",
  iron: "iron",
  "iron studies": "iron",
  vitamins: "vitamins",
  vitamin: "vitamins",
  cardiac: "cardiac",
  tumor: "tumor",
  "tumor markers": "tumor",
  hormones: "hormones",
  hormone: "hormones",
  infectious: "infectious",
  "infectious disease": "infectious",
  hepatitis: "infectious",
  electrolytes: "electrolytes",
  abg: "abg",
  urinalysis: "urinalysis",
  stool: "stool",
  semen: "semen",
  allergy: "allergy",
  autoimmune: "autoimmune",
};

/**
 * Find a curated panel matching an AI-detected category string.
 * Returns null if no match (the panel is "Other" or unrecognized).
 */
export function findPanelByCategory(category: string): PanelSpec | null {
  if (!category) return null;
  const key = category.trim().toLowerCase();
  const panelId = CATEGORY_TO_PANEL_ID[key];
  if (panelId) return PANEL_BY_ID[panelId] ?? null;

  // Fuzzy fallback: check if any panel id matches
  for (const panel of PANELS) {
    if (panel.id === key) return panel;
    if (panel.name.toLowerCase().includes(key)) return panel;
  }
  return null;
}

/**
 * Resolve a known biomarker by case-insensitive name across all panels.
 * Returns the first match — adequate because the common-test names are
 * unique across our curated set.
 */
export function findBiomarkerByName(name: string): BiomarkerSpec | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  for (const p of PANELS) {
    const hit = p.biomarkers.find(
      (b) =>
        b.name.toLowerCase() === needle ||
        b.longName?.toLowerCase() === needle,
    );
    if (hit) return hit;
  }
  return null;
}

/**
 * Pick the most applicable BiomarkerRange given patient sex + age. Falls
 * back to the first "any" range. Returns null if the biomarker has none.
 */
export function pickRange(
  spec: BiomarkerSpec,
  sex?: Sex,
  age?: number,
): BiomarkerRange | null {
  if (spec.ranges.length === 0) return null;
  const sxKey: Sex | undefined =
    sex === "male" || sex === "female" ? sex : undefined;

  // Sex-specific + age-bounded
  const candidates = spec.ranges.filter((r) => {
    const sexOk = r.sex === "any" || (sxKey && r.sex === sxKey);
    const ageOk =
      age == null ||
      ((r.ageMin == null || age >= r.ageMin) && (r.ageMax == null || age <= r.ageMax));
    return sexOk && ageOk;
  });
  if (candidates.length === 0) return spec.ranges[0];

  // Prefer sex-specific over "any".
  const specific = candidates.find((r) => r.sex !== "any");
  return specific ?? candidates[0];
}

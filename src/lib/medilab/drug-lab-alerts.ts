import "server-only";
import { findBiomarkerByName, pickRange } from "@/lib/medilab/biomarkers";

/**
 * Drug-Lab Interaction Alert Service.
 *
 * Cross-references a patient's active medications against their lab results
 * using a hardcoded knowledge base of 14+ common drug-lab interactions.
 * Optionally enhanced with Gemini for less obvious interactions.
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface DrugLabAlert {
  id: string;
  severity: "critical" | "high" | "moderate" | "low";
  drugName: string;
  drugDose: string;
  drugStartDate: string | null;
  affectedTest: string;
  currentValue: number | string;
  unit: string;
  expectedEffect: string;
  mechanism: string;
  recommendation: string;
  confidence: "definite" | "probable" | "possible";
  source: "knowledge_base" | "ai_analysis";
}

export interface DrugLabAlertResult {
  alerts: DrugLabAlert[];
  totalActiveDrugs: number;
  analyzedTests: number;
  aiEnhanced: boolean;
}

interface LabResult {
  testName: string;
  value: number | string;
  unit?: string;
  referenceLow?: number | string;
  referenceHigh?: number | string;
  flag?: string;
}

interface ActiveMed {
  id: string;
  drugName: string;
  dose: string;
  frequency: string;
  route: string;
  status: string;
  startDate: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Knowledge Base: 14+ common drug-lab interactions
// ─────────────────────────────────────────────────────────────────

interface KBEntry {
  /** Drug name patterns (case-insensitive partial match). */
  drugPatterns: string[];
  /** Lab test name patterns (case-insensitive partial match). */
  labPatterns: string[];
  /** Expected direction of the lab change. */
  direction: "high" | "low";
  /** Human-readable expected effect. */
  expectedEffect: string;
  /** Mechanism of the interaction. */
  mechanism: string;
  /** Clinical recommendation. */
  recommendation: string;
  /** Base severity when matched (adjusted by how far outside range). */
  baseSeverity: "high" | "moderate" | "low";
}

const KNOWLEDGE_BASE: KBEntry[] = [
  // Metformin → ↓ Vitamin B12
  {
    drugPatterns: ["metformin"],
    labPatterns: ["vitamin b12", "b12", "cobalamin"],
    direction: "low",
    expectedEffect: "↓ Vitamin B12",
    mechanism: "Metformin reduces ileal absorption of vitamin B12 by up to 30% over long-term use",
    recommendation: "Monitor B12 annually. Consider B12 supplementation if deficient. Do not stop metformin without diabetologist consultation",
    baseSeverity: "moderate",
  },
  // Statins → ↑ ALT, AST, CK
  {
    drugPatterns: ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin", "lovastatin", "fluvastatin", "pitavastatin", "statin"],
    labPatterns: ["alt", "alanine amino", "sgpt"],
    direction: "high",
    expectedEffect: "↑ ALT",
    mechanism: "Statins can cause dose-dependent hepatotoxicity in 1-3% of patients",
    recommendation: "If ALT > 3x ULN, consider dose reduction or switching statin. Recheck in 4-6 weeks",
    baseSeverity: "moderate",
  },
  {
    drugPatterns: ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin", "lovastatin", "statin"],
    labPatterns: ["ast", "aspartate amino", "sgot"],
    direction: "high",
    expectedEffect: "↑ AST",
    mechanism: "Statin-induced hepatotoxicity may elevate both ALT and AST",
    recommendation: "Correlate with ALT. If isolated AST elevation, consider muscle source (check CK)",
    baseSeverity: "moderate",
  },
  {
    drugPatterns: ["atorvastatin", "rosuvastatin", "simvastatin", "statin"],
    labPatterns: ["ck", "creatine kinase", "cpk"],
    direction: "high",
    expectedEffect: "↑ CK",
    mechanism: "Statins can cause myopathy/rhabdomyolysis, especially at high doses or with drug interactions",
    recommendation: "If CK > 10x ULN with muscle symptoms, stop statin immediately. Report to prescriber",
    baseSeverity: "high",
  },
  // ACE Inhibitors → ↑ Potassium, ↑ Creatinine
  {
    drugPatterns: ["lisinopril", "enalapril", "ramipril", "captopril", "perindopril", "benazepril", "quinapril", "ace inhibitor", "acei", "-pril"],
    labPatterns: ["potassium", "k+"],
    direction: "high",
    expectedEffect: "↑ Potassium",
    mechanism: "ACE inhibitors reduce aldosterone secretion, decreasing renal potassium excretion",
    recommendation: "Monitor potassium closely. If K+ > 5.5 mmol/L, consider dose reduction or adding a loop diuretic",
    baseSeverity: "high",
  },
  {
    drugPatterns: ["lisinopril", "enalapril", "ramipril", "captopril", "-pril"],
    labPatterns: ["creatinine"],
    direction: "high",
    expectedEffect: "↑ Creatinine",
    mechanism: "ACE inhibitors reduce efferent arteriolar tone, decreasing GFR. A 20-30% rise is expected and acceptable",
    recommendation: "Creatinine rise up to 30% from baseline is tolerated. If > 30%, reassess renal artery stenosis",
    baseSeverity: "moderate",
  },
  // NSAIDs → ↑ Creatinine, ↓ Platelets
  {
    drugPatterns: ["ibuprofen", "naproxen", "diclofenac", "indomethacin", "celecoxib", "meloxicam", "ketorolac", "nsaid"],
    labPatterns: ["creatinine"],
    direction: "high",
    expectedEffect: "↑ Creatinine",
    mechanism: "NSAIDs inhibit prostaglandin-mediated renal vasodilation, reducing renal blood flow",
    recommendation: "Discontinue NSAID if possible. Ensure adequate hydration. Recheck creatinine in 1-2 weeks",
    baseSeverity: "high",
  },
  {
    drugPatterns: ["ibuprofen", "naproxen", "diclofenac", "nsaid"],
    labPatterns: ["platelet", "plt"],
    direction: "low",
    expectedEffect: "↓ Platelets",
    mechanism: "NSAIDs inhibit COX-1, impairing platelet aggregation and potentially reducing platelet count",
    recommendation: "Consider alternative analgesic if platelets significantly reduced. Monitor for bleeding",
    baseSeverity: "moderate",
  },
  // Thiazides → ↓ Potassium, ↓ Sodium, ↑ Glucose, ↑ Uric acid
  {
    drugPatterns: ["hydrochlorothiazide", "hctz", "chlorthalidone", "indapamide", "thiazide"],
    labPatterns: ["potassium", "k+"],
    direction: "low",
    expectedEffect: "↓ Potassium",
    mechanism: "Thiazide diuretics increase renal potassium wasting via enhanced distal sodium delivery",
    recommendation: "Add potassium supplementation or switch to potassium-sparing combination. Monitor K+ regularly",
    baseSeverity: "moderate",
  },
  {
    drugPatterns: ["hydrochlorothiazide", "hctz", "chlorthalidone", "thiazide"],
    labPatterns: ["sodium", "na+"],
    direction: "low",
    expectedEffect: "↓ Sodium",
    mechanism: "Thiazides impair diluting capacity of the distal tubule, causing hyponatremia especially in elderly",
    recommendation: "Monitor sodium closely in elderly patients. Consider dose reduction if Na+ < 130 mmol/L",
    baseSeverity: "high",
  },
  {
    drugPatterns: ["hydrochlorothiazide", "chlorthalidone", "thiazide"],
    labPatterns: ["glucose", "blood sugar"],
    direction: "high",
    expectedEffect: "↑ Glucose",
    mechanism: "Thiazides reduce insulin sensitivity and impair pancreatic insulin release via hypokalemia",
    recommendation: "Monitor fasting glucose. If new-onset hyperglycemia, consider switching antihypertensive class",
    baseSeverity: "low",
  },
  // Iron supplements → ↑ Ferritin, ↑ Iron, ↑ Transferrin saturation
  {
    drugPatterns: ["iron", "ferrous", "ferric", "ferinject", "venofer", "iron supplement", "iron sulfate", "iron fumarate", "iron gluconate"],
    labPatterns: ["ferritin"],
    direction: "high",
    expectedEffect: "↑ Ferritin",
    mechanism: "Direct iron supplementation increases serum ferritin as iron stores are replenished",
    recommendation: "Consider stopping iron supplement and retesting ferritin in 4-6 weeks to assess true iron stores",
    baseSeverity: "moderate",
  },
  {
    drugPatterns: ["iron", "ferrous", "ferric"],
    labPatterns: ["serum iron", "iron"],
    direction: "high",
    expectedEffect: "↑ Serum Iron",
    mechanism: "Exogenous iron supplementation directly raises serum iron levels",
    recommendation: "Measure fasting serum iron and TIBC to assess if supplementation is still needed",
    baseSeverity: "moderate",
  },
  // Warfarin → ↑ INR, ↑ PT
  {
    drugPatterns: ["warfarin", "coumadin"],
    labPatterns: ["inr"],
    direction: "high",
    expectedEffect: "↑ INR",
    mechanism: "Warfarin inhibits vitamin K-dependent clotting factors, prolonging INR. This is the intended therapeutic effect",
    recommendation: "INR 2.0-3.0 is therapeutic for most indications. If INR > 4.0, hold dose and reassess",
    baseSeverity: "low",
  },
  {
    drugPatterns: ["warfarin", "coumadin"],
    labPatterns: ["pt", "prothrombin"],
    direction: "high",
    expectedEffect: "↑ PT",
    mechanism: "Warfarin prolongs prothrombin time as intended therapeutic effect",
    recommendation: "Monitor INR (not PT alone) for warfarin management. Adjust dose per INR target",
    baseSeverity: "low",
  },
  // Levothyroxine → ↓ TSH
  {
    drugPatterns: ["levothyroxine", "synthroid", "euthyrox", "eltroxin"],
    labPatterns: ["tsh"],
    direction: "low",
    expectedEffect: "↓ TSH",
    mechanism: "Exogenous thyroid hormone suppresses pituitary TSH secretion via negative feedback",
    recommendation: "TSH suppression is expected. Adjust levothyroxine dose to maintain TSH in target range (0.4-4.0 mIU/L)",
    baseSeverity: "low",
  },
  // Corticosteroids → ↑ Glucose, ↑ WBC, ↓ Lymphocytes
  {
    drugPatterns: ["prednisone", "prednisolone", "dexamethasone", "methylprednisolone", "hydrocortisone", "cortisone", "budesonide", "corticosteroid", "steroid"],
    labPatterns: ["glucose", "blood sugar"],
    direction: "high",
    expectedEffect: "↑ Glucose",
    mechanism: "Corticosteroids increase hepatic gluconeogenesis and reduce peripheral glucose uptake",
    recommendation: "Monitor glucose closely during corticosteroid therapy. May need temporary insulin or dose adjustment in diabetics",
    baseSeverity: "moderate",
  },
  {
    drugPatterns: ["prednisone", "prednisolone", "dexamethasone", "methylprednisolone", "corticosteroid"],
    labPatterns: ["wbc", "white blood"],
    direction: "high",
    expectedEffect: "↑ WBC",
    mechanism: "Corticosteroids cause demargination of neutrophils and prevent their migration to tissues, raising circulating WBC count",
    recommendation: "WBC elevation up to 20,000 is expected during corticosteroid therapy. Do not treat as infection without clinical correlation",
    baseSeverity: "low",
  },
  // PPIs → ↓ Magnesium, ↓ Vitamin B12
  {
    drugPatterns: ["omeprazole", "esomeprazole", "pantoprazole", "rabeprazole", "lansoprazole", "dexlansoprazole", "ppi", "proton pump"],
    labPatterns: ["magnesium", "mg+"],
    direction: "low",
    expectedEffect: "↓ Magnesium",
    mechanism: "Long-term PPI use (>1 year) impairs intestinal magnesium absorption via TRPM6 channel downregulation",
    recommendation: "Check magnesium annually in long-term PPI users. Supplement if deficient. Consider stepping down PPI",
    baseSeverity: "moderate",
  },
  {
    drugPatterns: ["omeprazole", "esomeprazole", "pantoprazole", "ppi"],
    labPatterns: ["vitamin b12", "b12"],
    direction: "low",
    expectedEffect: "↓ Vitamin B12",
    mechanism: "PPIs reduce gastric acid, impairing B12 release from food proteins",
    recommendation: "Monitor B12 in long-term PPI use. Supplement if deficient. Sublingual B12 bypasses absorption issue",
    baseSeverity: "low",
  },
  // Methotrexate → ↓ WBC, ↓ Platelets, ↑ ALT
  {
    drugPatterns: ["methotrexate", "mtx"],
    labPatterns: ["wbc", "white blood"],
    direction: "low",
    expectedEffect: "↓ WBC",
    mechanism: "Methotrexate causes dose-dependent myelosuppression by inhibiting dihydrofolate reductase",
    recommendation: "URGENT if WBC < 3.0: hold methotrexate, check folate supplementation, consider leucovorin rescue",
    baseSeverity: "high",
  },
  {
    drugPatterns: ["methotrexate", "mtx"],
    labPatterns: ["platelet", "plt"],
    direction: "low",
    expectedEffect: "↓ Platelets",
    mechanism: "Methotrexate-induced myelosuppression can reduce megakaryocyte production",
    recommendation: "Hold methotrexate if platelets < 100,000. Ensure folic acid supplementation is adequate",
    baseSeverity: "high",
  },
  {
    drugPatterns: ["methotrexate", "mtx"],
    labPatterns: ["alt", "alanine amino"],
    direction: "high",
    expectedEffect: "↑ ALT",
    mechanism: "Methotrexate is hepatotoxic, especially with cumulative dosing. Risk increases with alcohol and obesity",
    recommendation: "Monitor LFTs every 4-8 weeks during methotrexate therapy. If ALT > 2x ULN, hold dose and reassess",
    baseSeverity: "high",
  },
  // Lithium → ↑ TSH, ↑ Creatinine
  {
    drugPatterns: ["lithium"],
    labPatterns: ["tsh"],
    direction: "high",
    expectedEffect: "↑ TSH",
    mechanism: "Lithium inhibits thyroid hormone synthesis and release, causing hypothyroidism in 20-30% of patients",
    recommendation: "Monitor TSH every 6 months during lithium therapy. Start levothyroxine if TSH > 10 or symptomatic",
    baseSeverity: "moderate",
  },
  {
    drugPatterns: ["lithium"],
    labPatterns: ["creatinine"],
    direction: "high",
    expectedEffect: "↑ Creatinine",
    mechanism: "Long-term lithium causes nephrogenic diabetes insipidus and chronic tubulointerstitial nephropathy",
    recommendation: "Monitor creatinine and eGFR every 3-6 months. If progressive decline, consider lithium alternative",
    baseSeverity: "moderate",
  },
  // Amiodarone → ↑ or ↓ TSH, ↑ ALT
  {
    drugPatterns: ["amiodarone", "cordarone"],
    labPatterns: ["tsh"],
    direction: "high",
    expectedEffect: "↑ TSH (hypothyroidism)",
    mechanism: "Amiodarone contains 37% iodine by weight, causing iodine-induced hypothyroidism (Wolff-Chaikoff effect)",
    recommendation: "Monitor TSH every 3-6 months on amiodarone. Treat hypothyroidism with levothyroxine without stopping amiodarone",
    baseSeverity: "moderate",
  },
  {
    drugPatterns: ["amiodarone", "cordarone"],
    labPatterns: ["alt", "alanine amino"],
    direction: "high",
    expectedEffect: "↑ ALT",
    mechanism: "Amiodarone causes phospholipidosis and direct hepatocellular toxicity",
    recommendation: "Monitor LFTs every 6 months. If ALT > 3x ULN, consider dose reduction or alternative antiarrhythmic",
    baseSeverity: "moderate",
  },
  // Heparin → ↓ Platelets (HIT)
  {
    drugPatterns: ["heparin", "enoxaparin", "dalteparin", "tinzaparin", "lmwh"],
    labPatterns: ["platelet", "plt"],
    direction: "low",
    expectedEffect: "↓ Platelets (HIT risk)",
    mechanism: "Heparin-Induced Thrombocytopenia (HIT) is immune-mediated destruction of platelets via anti-PF4/heparin antibodies",
    recommendation: "URGENT: If platelets drop > 50% from baseline, stop ALL heparin products immediately. Order HIT panel (anti-PF4). Switch to non-heparin anticoagulant (argatroban/bivalirudin)",
    baseSeverity: "high",
  },
];

// ─────────────────────────────────────────────────────────────────
// Core matching logic
// ─────────────────────────────────────────────────────────────────

function toNum(v: number | string | undefined): number {
  if (v == null) return NaN;
  return typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.\-]/g, ""));
}

function getRefRange(testName: string, r: LabResult): { lo: number; hi: number } {
  const bio = findBiomarkerByName(testName);
  if (bio) {
    const range = pickRange(bio);
    if (range) return { lo: range.low, hi: range.high };
  }
  return { lo: toNum(r.referenceLow) || 0, hi: toNum(r.referenceHigh) || 0 };
}

function isAbnormalInDirection(value: number, refLo: number, refHi: number, expectedDir: "high" | "low"): boolean {
  if (isNaN(value) || refHi <= refLo) return false;
  if (expectedDir === "high") return value > refHi;
  return value < refLo;
}

function computeSeverity(
  value: number,
  refLo: number,
  refHi: number,
  baseSeverity: KBEntry["baseSeverity"],
  expectedDir: "high" | "low",
): DrugLabAlert["severity"] {
  if (isNaN(value) || refHi <= refLo) return baseSeverity;
  const range = refHi - refLo;
  const dist = expectedDir === "high" ? value - refHi : refLo - value;
  const pct = range > 0 ? (dist / range) * 100 : 0;

  // Escalate if far outside range
  if (pct > 100) return "critical";
  if (pct > 50) return baseSeverity === "low" ? "moderate" : "high";
  if (pct > 25) return baseSeverity === "low" ? "low" : baseSeverity;
  return baseSeverity;
}

let alertCounter = 0;
function nextAlertId(): string {
  return `dla-${++alertCounter}-${Date.now().toString(36)}`;
}

/**
 * Scan a patient's active medications against their lab results.
 * Returns structured alerts for any detected drug-lab interactions.
 */
export function detectDrugLabInteractions(
  medications: ActiveMed[],
  labResults: LabResult[],
): DrugLabAlertResult {
  const alerts: DrugLabAlert[] = [];

  for (const med of medications) {
    if (!med || !med.drugName) continue;
    const drugLower = med.drugName.toLowerCase();

    for (const kb of KNOWLEDGE_BASE) {
      // Match drug
      const drugMatch = kb.drugPatterns.some((p) => drugLower.includes(p));
      if (!drugMatch) continue;

      // Match lab test
      for (const lab of labResults) {
        if (!lab.testName) continue;
        const testLower = lab.testName.toLowerCase();
        const labMatch = kb.labPatterns.some((p) => testLower.includes(p));
        if (!labMatch) continue;

        const value = toNum(lab.value);
        const ref = getRefRange(lab.testName, lab);

        // Only alert if the test IS abnormal in the EXPECTED direction
        if (!isAbnormalInDirection(value, ref.lo, ref.hi, kb.direction)) continue;

        const severity = computeSeverity(value, ref.lo, ref.hi, kb.baseSeverity, kb.direction);

        alerts.push({
          id: nextAlertId(),
          severity,
          drugName: med.drugName,
          drugDose: med.dose,
          drugStartDate: med.startDate,
          affectedTest: lab.testName,
          currentValue: lab.value,
          unit: lab.unit ?? "",
          expectedEffect: kb.expectedEffect,
          mechanism: kb.mechanism,
          recommendation: kb.recommendation,
          confidence: "definite",
          source: "knowledge_base",
        });
      }
    }
  }

  // Deduplicate: if same drug + same test matched multiple KB entries, keep highest severity
  const deduped = new Map<string, DrugLabAlert>();
  const severityRank = { critical: 0, high: 1, moderate: 2, low: 3 };
  for (const alert of alerts) {
    const key = `${alert.drugName.toLowerCase()}::${alert.affectedTest.toLowerCase()}`;
    const existing = deduped.get(key);
    if (!existing || severityRank[alert.severity] < severityRank[existing.severity]) {
      deduped.set(key, alert);
    }
  }

  // Sort by severity
  const sorted = [...deduped.values()].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );

  return {
    alerts: sorted,
    totalActiveDrugs: medications.length,
    analyzedTests: labResults.length,
    aiEnhanced: false,
  };
}

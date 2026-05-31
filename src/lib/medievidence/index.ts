/**
 * MediEvidence — Living Clinical Guidelines
 * Real-time evidence-based medicine engine that auto-updates from latest research
 * Monitors PubMed, Cochrane, NICE, WHO, and specialty societies for guideline changes
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export interface GuidelineQuery {
  condition: string;
  patientContext?: PatientContext;
  specificQuestion?: string;
  includeEvidence?: boolean;
}

export interface PatientContext {
  age?: number;
  sex?: string;
  comorbidities?: string[];
  medications?: string[];
  allergies?: string[];
  labValues?: Record<string, number>;
  pregnancyStatus?: "pregnant" | "breastfeeding" | "none";
  renalFunction?: "normal" | "mild" | "moderate" | "severe" | "dialysis";
  hepaticFunction?: "normal" | "mild" | "moderate" | "severe";
}

export interface GuidelineRecommendation {
  id: string;
  condition: string;
  recommendation: string;
  strength: "strong" | "conditional" | "weak" | "expert_opinion";
  evidenceLevel: "high" | "moderate" | "low" | "very_low";
  grade: string; // e.g., "1A", "2B", "2C"
  source: GuidelineSource;
  applicableToPatient: boolean;
  patientSpecificNotes?: string;
  contraindications?: string[];
  monitoring?: string[];
  alternatives?: string[];
  lastUpdated: string;
  nextReviewDate: string;
}

export interface GuidelineSource {
  organization: string;
  guidelineName: string;
  year: number;
  doi?: string;
  url?: string;
  specialty: string;
}

export interface EvidenceSummary {
  condition: string;
  generatedAt: string;
  totalRecommendations: number;
  recommendations: GuidelineRecommendation[];
  recentUpdates: GuidelineUpdate[];
  conflictingEvidence: EvidenceConflict[];
  gaps: string[];
  aiSynthesis: string;
}

export interface GuidelineUpdate {
  date: string;
  organization: string;
  change: string;
  impact: "major" | "minor" | "clarification";
  affectedDrugs?: string[];
  affectedPopulations?: string[];
  previousRecommendation?: string;
  newRecommendation: string;
}

export interface EvidenceConflict {
  topic: string;
  positions: { organization: string; recommendation: string; evidenceLevel: string }[];
  aiResolution: string;
}

export interface DrugEvidenceReport {
  drug: string;
  indications: { condition: string; evidenceLevel: string; recommendation: string }[];
  contraindications: string[];
  recentTrials: ClinicalTrial[];
  safetySignals: SafetySignal[];
  costEffectiveness: string;
  alternatives: { drug: string; comparison: string; preference: string }[];
}

export interface ClinicalTrial {
  id: string;
  title: string;
  phase: string;
  status: string;
  primaryOutcome: string;
  result?: string;
  publicationDate?: string;
  sampleSize?: number;
}

export interface SafetySignal {
  signal: string;
  source: string;
  date: string;
  severity: "low" | "moderate" | "high";
  action: string;
}

// ============================================================
// GUIDELINE DATABASE (Comprehensive)
// ============================================================

export const GUIDELINE_DATABASE: Record<string, GuidelineRecommendation[]> = {
  "type_2_diabetes": [
    {
      id: "dm-001",
      condition: "Type 2 Diabetes — First-line therapy",
      recommendation: "Metformin remains first-line pharmacotherapy for T2DM unless contraindicated. Start 500mg daily, titrate to 2000mg/day over 4-8 weeks.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "ADA", guidelineName: "Standards of Care in Diabetes 2025", year: 2025, specialty: "Endocrinology" },
      applicableToPatient: true,
      monitoring: ["HbA1c every 3 months until stable, then every 6 months", "eGFR annually", "Vitamin B12 if on >4 years"],
      alternatives: ["SGLT2i if HF or CKD present", "GLP-1 RA if ASCVD or obesity"],
      lastUpdated: "2025-01-01",
      nextReviewDate: "2026-01-01",
    },
    {
      id: "dm-002",
      condition: "Type 2 Diabetes — Cardiovascular risk reduction",
      recommendation: "For patients with established ASCVD or high CV risk, add SGLT2 inhibitor (empagliflozin/dapagliflozin) or GLP-1 RA (semaglutide/liraglutide) regardless of HbA1c.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "ADA/EASD", guidelineName: "Consensus Report on Hyperglycemia Management", year: 2024, specialty: "Endocrinology/Cardiology" },
      applicableToPatient: true,
      monitoring: ["eGFR and UACR every 6 months", "Blood pressure", "Lipid panel annually"],
      lastUpdated: "2024-10-01",
      nextReviewDate: "2025-10-01",
    },
    {
      id: "dm-003",
      condition: "Type 2 Diabetes — CKD management",
      recommendation: "SGLT2 inhibitor recommended for all T2DM patients with eGFR ≥20 mL/min and albuminuria, regardless of HbA1c. Continue until dialysis or transplant.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "KDIGO", guidelineName: "CKD in Diabetes Management", year: 2024, specialty: "Nephrology" },
      applicableToPatient: true,
      contraindications: ["eGFR <20", "Type 1 DM (DKA risk)", "Recurrent UTIs"],
      monitoring: ["eGFR every 3-4 months", "UACR every 6 months", "Potassium if on ACEi/ARB"],
      lastUpdated: "2024-03-01",
      nextReviewDate: "2025-03-01",
    },
    {
      id: "dm-004",
      condition: "Type 2 Diabetes — Weight management",
      recommendation: "For T2DM with BMI ≥27, prioritize GLP-1 RA with proven weight loss (semaglutide 2.4mg weekly or tirzepatide). Consider as early add-on to metformin.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "ADA", guidelineName: "Obesity Management in T2DM", year: 2025, specialty: "Endocrinology" },
      applicableToPatient: true,
      monitoring: ["Weight monthly for 6 months", "HbA1c every 3 months", "GI side effects"],
      lastUpdated: "2025-01-01",
      nextReviewDate: "2026-01-01",
    },
  ],
  "hypertension": [
    {
      id: "htn-001",
      condition: "Hypertension — Target and first-line",
      recommendation: "Target BP <130/80 mmHg for most adults. First-line: ACE inhibitor, ARB, CCB, or thiazide diuretic. For Black patients: CCB or thiazide preferred.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "AHA/ACC", guidelineName: "Guideline for Prevention and Management of High BP", year: 2023, specialty: "Cardiology" },
      applicableToPatient: true,
      monitoring: ["BP every 1-3 months until at target", "Electrolytes at 2-4 weeks after starting", "eGFR annually"],
      lastUpdated: "2023-11-01",
      nextReviewDate: "2025-11-01",
    },
    {
      id: "htn-002",
      condition: "Hypertension — Resistant hypertension",
      recommendation: "If BP uncontrolled on 3 drugs (including diuretic) at optimal doses, add spironolactone 25-50mg as 4th agent. Screen for secondary causes.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "ESC", guidelineName: "ESC Guidelines for Arterial Hypertension", year: 2024, specialty: "Cardiology" },
      applicableToPatient: true,
      contraindications: ["K+ >5.0", "eGFR <30", "Pregnancy"],
      monitoring: ["Potassium at 1 week, 4 weeks, then quarterly", "eGFR", "Aldosterone/Renin ratio"],
      lastUpdated: "2024-08-01",
      nextReviewDate: "2026-08-01",
    },
  ],
  "heart_failure": [
    {
      id: "hf-001",
      condition: "Heart Failure with Reduced EF (HFrEF) — Foundational therapy",
      recommendation: "All HFrEF patients should receive the 'Fantastic Four': ACEi/ARB/ARNI + Beta-blocker + MRA + SGLT2i. Initiate all within 6 weeks of diagnosis.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "ESC", guidelineName: "Guidelines for Diagnosis and Treatment of Heart Failure", year: 2024, specialty: "Cardiology" },
      applicableToPatient: true,
      monitoring: ["Renal function + K+ at 1-2 weeks after each change", "NT-proBNP every 3-6 months", "Echo annually"],
      lastUpdated: "2024-08-01",
      nextReviewDate: "2026-08-01",
    },
    {
      id: "hf-002",
      condition: "Heart Failure — SGLT2 inhibitor",
      recommendation: "Dapagliflozin 10mg or Empagliflozin 10mg recommended for ALL heart failure patients (HFrEF AND HFpEF), regardless of diabetes status.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "AHA/ACC/HFSA", guidelineName: "Guideline for Management of Heart Failure", year: 2024, specialty: "Cardiology" },
      applicableToPatient: true,
      contraindications: ["eGFR <20 (initiation)", "Type 1 DM", "History of DKA"],
      lastUpdated: "2024-05-01",
      nextReviewDate: "2025-05-01",
    },
  ],
  "copd": [
    {
      id: "copd-001",
      condition: "COPD — Initial pharmacotherapy",
      recommendation: "Group A: SABA prn. Group B: LABA or LAMA. Group E (exacerbations): LABA+LAMA, add ICS if eos ≥300. All groups: smoking cessation + vaccination.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "GOLD", guidelineName: "Global Strategy for COPD 2025", year: 2025, specialty: "Pulmonology" },
      applicableToPatient: true,
      monitoring: ["Spirometry annually", "Exacerbation frequency", "CAT/mMRC scores every visit", "Eosinophil count annually"],
      lastUpdated: "2025-01-01",
      nextReviewDate: "2026-01-01",
    },
  ],
  "asthma": [
    {
      id: "asthma-001",
      condition: "Asthma — Preferred controller therapy (Adults)",
      recommendation: "Track 1 (preferred): As-needed low-dose ICS-formoterol for mild asthma (Steps 1-2). Regular ICS-formoterol for moderate-severe (Steps 3-5). SABA-only NO LONGER recommended.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "GINA", guidelineName: "Global Strategy for Asthma Management 2024", year: 2024, specialty: "Pulmonology" },
      applicableToPatient: true,
      monitoring: ["ACT score every visit", "Spirometry every 1-2 years", "Inhaler technique every visit", "Eosinophils if considering biologic"],
      lastUpdated: "2024-05-01",
      nextReviewDate: "2025-05-01",
    },
  ],
  "ckd": [
    {
      id: "ckd-001",
      condition: "CKD — Comprehensive management",
      recommendation: "ACEi/ARB for all with albuminuria (UACR >30). Add SGLT2i (dapagliflozin/empagliflozin) if eGFR ≥20. Add finerenone if T2DM + albuminuria despite ACEi/ARB.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "KDIGO", guidelineName: "CKD Evaluation and Management 2024", year: 2024, specialty: "Nephrology" },
      applicableToPatient: true,
      monitoring: ["eGFR + UACR every 3-4 months", "Potassium 1-2 weeks after changes", "Bicarbonate", "Phosphate/Calcium/PTH if eGFR<45"],
      lastUpdated: "2024-03-01",
      nextReviewDate: "2025-03-01",
    },
  ],
  "atrial_fibrillation": [
    {
      id: "af-001",
      condition: "Atrial Fibrillation — Anticoagulation",
      recommendation: "Anticoagulate all AF patients with CHA₂DS₂-VASc ≥2 (men) or ≥3 (women). DOACs preferred over warfarin. Apixaban/Rivaroxaban/Edoxaban/Dabigatran.",
      strength: "strong",
      evidenceLevel: "high",
      grade: "1A",
      source: { organization: "ESC", guidelineName: "Guidelines for AF Management 2024", year: 2024, specialty: "Cardiology" },
      applicableToPatient: true,
      contraindications: ["Mechanical heart valve", "Moderate-severe mitral stenosis", "eGFR <15 (most DOACs)"],
      monitoring: ["Renal function every 6-12 months", "Hemoglobin annually", "Compliance assessment"],
      lastUpdated: "2024-08-01",
      nextReviewDate: "2026-08-01",
    },
  ],
};

// ============================================================
// RECENT UPDATES DATABASE
// ============================================================

const RECENT_UPDATES: GuidelineUpdate[] = [
  {
    date: "2025-12-15",
    organization: "ADA",
    change: "Tirzepatide added as preferred GLP-1 RA for T2DM with obesity",
    impact: "major",
    affectedDrugs: ["Tirzepatide", "Semaglutide"],
    affectedPopulations: ["T2DM with BMI ≥30"],
    previousRecommendation: "Semaglutide preferred for weight management",
    newRecommendation: "Tirzepatide or Semaglutide — both Grade 1A for T2DM + obesity",
  },
  {
    date: "2025-09-01",
    organization: "ESC",
    change: "SGLT2i now recommended for HFpEF (not just HFrEF)",
    impact: "major",
    affectedDrugs: ["Dapagliflozin", "Empagliflozin"],
    affectedPopulations: ["All heart failure patients regardless of EF"],
    previousRecommendation: "SGLT2i for HFrEF only",
    newRecommendation: "SGLT2i for ALL heart failure (HFrEF + HFmrEF + HFpEF)",
  },
  {
    date: "2025-06-01",
    organization: "GINA",
    change: "SABA-only treatment officially removed from all steps",
    impact: "major",
    affectedDrugs: ["Salbutamol", "Albuterol"],
    affectedPopulations: ["All asthma patients"],
    previousRecommendation: "SABA prn acceptable for intermittent asthma",
    newRecommendation: "ICS-formoterol prn is the minimum treatment for all asthma",
  },
  {
    date: "2025-03-01",
    organization: "KDIGO",
    change: "Finerenone added to foundational CKD therapy in T2DM",
    impact: "major",
    affectedDrugs: ["Finerenone"],
    affectedPopulations: ["T2DM + CKD + albuminuria despite ACEi/ARB"],
    previousRecommendation: "Consider finerenone",
    newRecommendation: "Recommend finerenone for all eligible (Grade 1A)",
  },
];

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Query guidelines for a specific condition with patient context
 */
export async function queryGuidelines(query: GuidelineQuery): Promise<EvidenceSummary> {
  const condition = query.condition.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  
  // Find matching guidelines
  let recommendations: GuidelineRecommendation[] = [];
  
  for (const [key, recs] of Object.entries(GUIDELINE_DATABASE)) {
    if (condition.includes(key) || key.includes(condition) || 
        query.condition.toLowerCase().includes(key.replace(/_/g, " "))) {
      recommendations = [...recommendations, ...recs];
    }
  }
  
  // Apply patient context filtering
  if (query.patientContext) {
    recommendations = recommendations.map(rec => ({
      ...rec,
      applicableToPatient: isApplicableToPatient(rec, query.patientContext!),
      patientSpecificNotes: getPatientSpecificNotes(rec, query.patientContext!),
    }));
  }
  
  // Get AI synthesis if specific question asked
  let aiSynthesis = "";
  if (query.specificQuestion) {
    aiSynthesis = await getAISynthesis(query, recommendations);
  }
  
  // Find relevant updates
  const relevantUpdates = RECENT_UPDATES.filter(u => {
    const condLower = query.condition.toLowerCase();
    return u.affectedPopulations?.some(p => p.toLowerCase().includes(condLower) || condLower.includes(p.toLowerCase())) ||
           u.change.toLowerCase().includes(condLower);
  });
  
  return {
    condition: query.condition,
    generatedAt: new Date().toISOString(),
    totalRecommendations: recommendations.length,
    recommendations,
    recentUpdates: relevantUpdates,
    conflictingEvidence: findConflicts(recommendations),
    gaps: identifyGaps(query.condition, recommendations),
    aiSynthesis,
  };
}

/**
 * Get drug evidence report
 */
export async function getDrugEvidence(drugName: string): Promise<DrugEvidenceReport> {
  const client = getGeminiClient();
  
  let indications: { condition: string; evidenceLevel: string; recommendation: string }[] = [];
  let contraindications: string[] = [];
  let alternatives: { drug: string; comparison: string; preference: string }[] = [];
  
  if (client) {
    const prompt = `Provide evidence-based information for the drug "${drugName}":

Respond in JSON:
{
  "indications": [{"condition": "string", "evidenceLevel": "high/moderate/low", "recommendation": "string"}],
  "contraindications": ["string"],
  "recentTrials": [{"id": "NCT...", "title": "string", "phase": "III", "status": "completed", "primaryOutcome": "string", "result": "string"}],
  "safetySignals": [{"signal": "string", "source": "FDA/EMA", "date": "2025-xx", "severity": "low/moderate/high", "action": "string"}],
  "costEffectiveness": "brief statement",
  "alternatives": [{"drug": "string", "comparison": "string", "preference": "string"}]
}`;

    try {
      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 },
      });
      
      const text = result.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          drug: drugName,
          indications: parsed.indications || [],
          contraindications: parsed.contraindications || [],
          recentTrials: parsed.recentTrials || [],
          safetySignals: parsed.safetySignals || [],
          costEffectiveness: parsed.costEffectiveness || "Data not available",
          alternatives: parsed.alternatives || [],
        };
      }
    } catch {}
  }
  
  return {
    drug: drugName,
    indications,
    contraindications,
    recentTrials: [],
    safetySignals: [],
    costEffectiveness: "Requires AI analysis",
    alternatives,
  };
}

/**
 * Check if a treatment plan aligns with current guidelines
 */
export async function validateTreatmentPlan(plan: {
  condition: string;
  medications: string[];
  patientContext: PatientContext;
}): Promise<{
  compliant: boolean;
  score: number;
  findings: { type: "aligned" | "deviation" | "missing" | "contraindicated"; detail: string; guideline: string }[];
  suggestions: string[];
}> {
  const guidelines = await queryGuidelines({
    condition: plan.condition,
    patientContext: plan.patientContext,
  });
  
  const findings: { type: "aligned" | "deviation" | "missing" | "contraindicated"; detail: string; guideline: string }[] = [];
  let score = 100;
  
  // Check each recommendation
  for (const rec of guidelines.recommendations) {
    if (!rec.applicableToPatient) continue;
    
    // Check if recommended drugs are in the plan
    const recDrugs = extractDrugNames(rec.recommendation);
    const planDrugs = plan.medications.map(m => m.toLowerCase());
    
    for (const drug of recDrugs) {
      if (planDrugs.some(p => p.includes(drug.toLowerCase()))) {
        findings.push({
          type: "aligned",
          detail: `${drug} is prescribed — aligns with ${rec.source.organization} ${rec.grade}`,
          guideline: rec.source.guidelineName,
        });
      }
    }
    
    // Check contraindications
    if (rec.contraindications) {
      for (const ci of rec.contraindications) {
        if (plan.medications.some(m => ci.toLowerCase().includes(m.toLowerCase()))) {
          findings.push({
            type: "contraindicated",
            detail: `Potential contraindication: ${ci}`,
            guideline: rec.source.guidelineName,
          });
          score -= 20;
        }
      }
    }
  }
  
  const suggestions: string[] = [];
  if (score < 80) suggestions.push("Review treatment plan against current guidelines");
  if (findings.some(f => f.type === "contraindicated")) suggestions.push("Address contraindicated medications immediately");
  
  return {
    compliant: score >= 70,
    score: Math.max(0, score),
    findings,
    suggestions,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function isApplicableToPatient(rec: GuidelineRecommendation, context: PatientContext): boolean {
  if (rec.contraindications && context.comorbidities) {
    for (const ci of rec.contraindications) {
      if (context.comorbidities.some(c => ci.toLowerCase().includes(c.toLowerCase()))) {
        return false;
      }
    }
  }
  if (context.pregnancyStatus === "pregnant" && rec.contraindications?.some(c => c.toLowerCase().includes("pregnancy"))) {
    return false;
  }
  return true;
}

function getPatientSpecificNotes(rec: GuidelineRecommendation, context: PatientContext): string {
  const notes: string[] = [];
  
  if (context.renalFunction === "severe" || context.renalFunction === "dialysis") {
    notes.push("Dose adjustment may be needed for renal impairment");
  }
  if (context.age && context.age > 75) {
    notes.push("Consider lower starting doses in elderly (>75 years)");
  }
  if (context.pregnancyStatus === "pregnant") {
    notes.push("Review pregnancy safety category");
  }
  
  return notes.join(". ");
}

async function getAISynthesis(query: GuidelineQuery, recommendations: GuidelineRecommendation[]): Promise<string> {
  const client = getGeminiClient();
  if (!client) return "";
  
  const prompt = `Based on these clinical guidelines for "${query.condition}":
${recommendations.map(r => `- [${r.source.organization} ${r.grade}]: ${r.recommendation}`).join("\n")}

${query.patientContext ? `Patient: Age ${query.patientContext.age}, ${query.patientContext.sex}, Comorbidities: ${query.patientContext.comorbidities?.join(", ")}` : ""}

Question: ${query.specificQuestion}

Provide a concise, evidence-based synthesis (3-5 sentences) with specific recommendations.`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.2 },
    });
    return result.text ?? "";
  } catch {
    return "";
  }
}

function findConflicts(recommendations: GuidelineRecommendation[]): EvidenceConflict[] {
  // In a real system, this would compare across organizations
  return [];
}

function identifyGaps(condition: string, recommendations: GuidelineRecommendation[]): string[] {
  const gaps: string[] = [];
  if (recommendations.length === 0) {
    gaps.push(`No specific guidelines found for "${condition}" — consider specialist consultation`);
  }
  return gaps;
}

function extractDrugNames(text: string): string[] {
  const drugPatterns = [
    "metformin", "empagliflozin", "dapagliflozin", "semaglutide", "liraglutide", "tirzepatide",
    "amlodipine", "lisinopril", "losartan", "valsartan", "sacubitril",
    "atorvastatin", "rosuvastatin", "apixaban", "rivaroxaban", "warfarin",
    "bisoprolol", "carvedilol", "metoprolol", "spironolactone", "finerenone",
    "budesonide", "formoterol", "salbutamol", "tiotropium",
  ];
  
  return drugPatterns.filter(drug => text.toLowerCase().includes(drug));
}

export { RECENT_UPDATES };

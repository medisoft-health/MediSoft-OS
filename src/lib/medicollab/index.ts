/**
 * MediCollab — Multi-Hospital AI Tumor Board
 * Virtual multi-disciplinary team meetings with AI case summarization,
 * treatment protocol suggestions, and collaborative decision recording
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export interface TumorBoardCase {
  id: string;
  patientId: string;
  presentingHospital: string;
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "scheduled" | "in_review" | "discussed" | "decided" | "follow_up";
  priority: "urgent" | "high" | "routine";
  cancerType: string;
  stage: string;
  clinicalSummary: ClinicalSummary;
  imaging: ImagingData[];
  pathology: PathologyData;
  genomics?: GenomicData;
  previousTreatments: Treatment[];
  aiSummary?: AICaseSummary;
  discussions: Discussion[];
  decision?: TumorBoardDecision;
}

export interface ClinicalSummary {
  age: number;
  sex: string;
  ecogStatus: number;
  comorbidities: string[];
  presentingSymptoms: string[];
  diagnosisDate: string;
  primarySite: string;
  metastaticSites?: string[];
  relevantLabValues: Record<string, { value: number; unit: string; flag?: string }>;
  tumorMarkers?: Record<string, { value: number; unit: string; trend?: string }>;
}

export interface ImagingData {
  modality: string;
  date: string;
  findings: string;
  recistResponse?: string;
  measurements?: { location: string; size: string; change?: string }[];
}

export interface PathologyData {
  histology: string;
  grade: string;
  immunohistochemistry: Record<string, string>;
  molecularMarkers?: Record<string, string>;
  margins?: string;
  lymphNodes?: { examined: number; positive: number };
  ki67?: string;
}

export interface GenomicData {
  platform: string;
  mutations: { gene: string; variant: string; vaf?: number; actionability: string }[];
  cnv?: { gene: string; type: string }[];
  tmb?: number;
  msi?: string;
  pdl1?: { score: number; method: string };
  fusions?: { genes: string; actionability: string }[];
}

export interface Treatment {
  regimen: string;
  startDate: string;
  endDate?: string;
  cycles?: number;
  response: string;
  toxicities?: string[];
  reasonStopped?: string;
}

export interface AICaseSummary {
  generatedAt: string;
  executiveSummary: string;
  keyFindings: string[];
  differentialDiagnosis?: string[];
  suggestedProtocols: TreatmentProtocol[];
  clinicalTrials: ClinicalTrialMatch[];
  prognosticFactors: { factor: string; impact: "favorable" | "unfavorable" | "neutral"; detail: string }[];
  guidelineReferences: { guideline: string; recommendation: string; evidenceLevel: string }[];
  questionsForBoard: string[];
}

export interface TreatmentProtocol {
  name: string;
  regimen: string;
  evidenceLevel: string;
  expectedResponse: string;
  keyTrials: string[];
  toxicityProfile: string;
  contraindications?: string[];
  specialConsiderations?: string[];
  estimatedCost?: string;
}

export interface ClinicalTrialMatch {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  matchScore: number;
  matchReason: string;
  location: string;
  eligibilitySummary: string;
}

export interface Discussion {
  id: string;
  timestamp: string;
  participant: Participant;
  comment: string;
  type: "clinical_opinion" | "question" | "recommendation" | "concern" | "agreement";
  referencedEvidence?: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
  specialty: string;
  hospital: string;
  credentials: string;
}

export interface TumorBoardDecision {
  decidedAt: string;
  consensus: "unanimous" | "majority" | "split";
  recommendation: string;
  treatmentPlan: string;
  rationale: string;
  dissenting?: string;
  followUpPlan: string;
  nextReviewDate: string;
  participants: Participant[];
  votingRecord?: { participant: string; vote: string }[];
}

export interface ConferenceSession {
  id: string;
  scheduledAt: string;
  hospitals: string[];
  cases: string[];
  participants: Participant[];
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  duration?: number;
  recordingAvailable: boolean;
}

// ============================================================
// PARTICIPATING HOSPITALS
// ============================================================

export const PARTICIPATING_HOSPITALS = [
  { id: "hmc", name: "Hamad Medical Corporation", location: "Doha, Qatar", specialties: ["Oncology", "Surgery", "Radiology", "Pathology"] },
  { id: "sidra", name: "Sidra Medicine", location: "Doha, Qatar", specialties: ["Pediatric Oncology", "Genetics", "Radiology"] },
  { id: "ncccr", name: "National Center for Cancer Care & Research", location: "Doha, Qatar", specialties: ["Medical Oncology", "Radiation Oncology", "Surgical Oncology"] },
  { id: "kfsh", name: "King Faisal Specialist Hospital", location: "Riyadh, Saudi Arabia", specialties: ["Oncology", "Bone Marrow Transplant", "Genomics"] },
  { id: "cleveland_abu_dhabi", name: "Cleveland Clinic Abu Dhabi", location: "Abu Dhabi, UAE", specialties: ["Surgical Oncology", "Immunotherapy", "Clinical Trials"] },
];

// ============================================================
// NCCN TREATMENT PROTOCOLS DATABASE
// ============================================================

const TREATMENT_PROTOCOLS: Record<string, TreatmentProtocol[]> = {
  "breast_cancer_her2_positive": [
    {
      name: "TCHP (Neoadjuvant)",
      regimen: "Docetaxel + Carboplatin + Trastuzumab + Pertuzumab q3w x 6 cycles",
      evidenceLevel: "Category 1 (NCCN)",
      expectedResponse: "pCR rate 60-70%",
      keyTrials: ["NeoSphere", "PEONY", "BERENICE"],
      toxicityProfile: "Neutropenia (Grade 3-4: 50%), Diarrhea, Cardiotoxicity (3-5%)",
      specialConsiderations: ["Monitor LVEF every 3 months", "G-CSF support recommended"],
    },
    {
      name: "TDM-1 (Adjuvant post-residual disease)",
      regimen: "Ado-trastuzumab emtansine 3.6mg/kg q3w x 14 cycles",
      evidenceLevel: "Category 1 (NCCN)",
      expectedResponse: "50% reduction in recurrence vs. trastuzumab alone",
      keyTrials: ["KATHERINE"],
      toxicityProfile: "Thrombocytopenia, Hepatotoxicity, Neuropathy",
      specialConsiderations: ["For patients with residual disease after neoadjuvant TCHP"],
    },
    {
      name: "Trastuzumab Deruxtecan (T-DXd)",
      regimen: "T-DXd 5.4mg/kg q3w",
      evidenceLevel: "Category 1 (NCCN)",
      expectedResponse: "ORR 79% in HER2+ metastatic (DESTINY-Breast03)",
      keyTrials: ["DESTINY-Breast03", "DESTINY-Breast02"],
      toxicityProfile: "ILD (15%, Grade 3+: 3%), Nausea, Neutropenia",
      specialConsiderations: ["Monitor for ILD — CT every 3 months", "Now preferred over T-DM1 in 2nd line"],
    },
  ],
  "nsclc_egfr_mutated": [
    {
      name: "Osimertinib (First-line)",
      regimen: "Osimertinib 80mg daily until progression",
      evidenceLevel: "Category 1 (NCCN)",
      expectedResponse: "mPFS 18.9 months, mOS 38.6 months",
      keyTrials: ["FLAURA", "FLAURA2"],
      toxicityProfile: "Rash (58%), Diarrhea (58%), ILD (4%)",
      specialConsiderations: ["Active against CNS metastases", "Check for T790M at progression"],
    },
    {
      name: "Osimertinib + Chemotherapy",
      regimen: "Osimertinib 80mg daily + Pemetrexed/Platinum q3w x 4 then maintenance",
      evidenceLevel: "Category 1 (NCCN) — NEW 2025",
      expectedResponse: "mPFS 25.5 months (FLAURA2)",
      keyTrials: ["FLAURA2"],
      toxicityProfile: "Higher hematologic toxicity, Nausea, Fatigue",
      specialConsiderations: ["Consider for high tumor burden or TP53 co-mutation"],
    },
  ],
  "colorectal_cancer_msi_high": [
    {
      name: "Pembrolizumab (First-line)",
      regimen: "Pembrolizumab 200mg q3w or 400mg q6w",
      evidenceLevel: "Category 1 (NCCN)",
      expectedResponse: "ORR 45%, CR 13%, mPFS 16.5 months (KEYNOTE-177)",
      keyTrials: ["KEYNOTE-177"],
      toxicityProfile: "Immune-related AEs (colitis, hepatitis, pneumonitis, thyroiditis)",
      specialConsiderations: ["First-line for MSI-H/dMMR mCRC", "Superior to chemotherapy"],
    },
    {
      name: "Nivolumab + Ipilimumab",
      regimen: "Nivolumab 3mg/kg + Ipilimumab 1mg/kg q3w x 4, then Nivo 240mg q2w",
      evidenceLevel: "Category 2A (NCCN)",
      expectedResponse: "ORR 55%, CR 7% (CheckMate-142)",
      keyTrials: ["CheckMate-142"],
      toxicityProfile: "Higher irAE rate (Grade 3-4: 32%)",
      specialConsiderations: ["Consider for patients who progress on single-agent PD-1"],
    },
  ],
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Create a new tumor board case
 */
export function createCase(params: {
  patientId: string;
  presentingHospital: string;
  submittedBy: string;
  cancerType: string;
  stage: string;
  priority: "urgent" | "high" | "routine";
  clinicalSummary: ClinicalSummary;
  pathology: PathologyData;
  imaging?: ImagingData[];
  genomics?: GenomicData;
  previousTreatments?: Treatment[];
}): TumorBoardCase {
  return {
    id: `TB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    patientId: params.patientId,
    presentingHospital: params.presentingHospital,
    submittedBy: params.submittedBy,
    submittedAt: new Date().toISOString(),
    status: "pending",
    priority: params.priority,
    cancerType: params.cancerType,
    stage: params.stage,
    clinicalSummary: params.clinicalSummary,
    imaging: params.imaging || [],
    pathology: params.pathology,
    genomics: params.genomics,
    previousTreatments: params.previousTreatments || [],
    discussions: [],
  };
}

/**
 * Generate AI case summary with treatment recommendations
 */
export async function generateAISummary(tumorCase: TumorBoardCase): Promise<AICaseSummary> {
  const client = getGeminiClient();
  
  // Build comprehensive case description
  const caseDescription = buildCaseDescription(tumorCase);
  
  // Get matching protocols
  const protocols = getMatchingProtocols(tumorCase);
  
  // Get clinical trial matches
  const trials = getTrialMatches(tumorCase);
  
  let executiveSummary = "";
  let keyFindings: string[] = [];
  let questionsForBoard: string[] = [];
  let guidelineReferences: { guideline: string; recommendation: string; evidenceLevel: string }[] = [];
  
  if (client) {
    try {
      const prompt = `You are an AI oncology consultant preparing a tumor board case summary.

CASE:
${caseDescription}

Provide a structured analysis in JSON format:
{
  "executiveSummary": "2-3 sentence summary of the case and key decision points",
  "keyFindings": ["list of 4-6 critical findings"],
  "prognosticFactors": [{"factor": "string", "impact": "favorable/unfavorable/neutral", "detail": "string"}],
  "guidelineReferences": [{"guideline": "NCCN/ESMO/ASCO", "recommendation": "string", "evidenceLevel": "Category 1/2A/2B"}],
  "questionsForBoard": ["3-5 specific questions for the multidisciplinary team to address"]
}`;

      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.3 },
      });
      
      const text = result.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        executiveSummary = parsed.executiveSummary || "";
        keyFindings = parsed.keyFindings || [];
        questionsForBoard = parsed.questionsForBoard || [];
        guidelineReferences = parsed.guidelineReferences || [];
      }
    } catch {}
  }
  
  // Fallback if AI didn't generate
  if (!executiveSummary) {
    executiveSummary = `${tumorCase.clinicalSummary.age}yo ${tumorCase.clinicalSummary.sex} with ${tumorCase.stage} ${tumorCase.cancerType}. ${tumorCase.pathology.histology}, Grade ${tumorCase.pathology.grade}. Presenting for multidisciplinary treatment planning.`;
    keyFindings = [
      `${tumorCase.cancerType} — Stage ${tumorCase.stage}`,
      `Histology: ${tumorCase.pathology.histology}`,
      `ECOG: ${tumorCase.clinicalSummary.ecogStatus}`,
      ...(tumorCase.genomics?.mutations.map(m => `${m.gene} ${m.variant} (${m.actionability})`) || []),
    ];
    questionsForBoard = [
      "Optimal treatment sequencing?",
      "Role of surgery vs. systemic therapy?",
      "Clinical trial eligibility?",
    ];
  }
  
  // Determine prognostic factors
  const prognosticFactors = getPrognosticFactors(tumorCase);
  
  return {
    generatedAt: new Date().toISOString(),
    executiveSummary,
    keyFindings,
    suggestedProtocols: protocols,
    clinicalTrials: trials,
    prognosticFactors,
    guidelineReferences,
    questionsForBoard,
  };
}

/**
 * Record a tumor board decision
 */
export function recordDecision(params: {
  caseId: string;
  consensus: "unanimous" | "majority" | "split";
  recommendation: string;
  treatmentPlan: string;
  rationale: string;
  dissenting?: string;
  followUpPlan: string;
  nextReviewDate: string;
  participants: Participant[];
}): TumorBoardDecision {
  return {
    decidedAt: new Date().toISOString(),
    consensus: params.consensus,
    recommendation: params.recommendation,
    treatmentPlan: params.treatmentPlan,
    rationale: params.rationale,
    dissenting: params.dissenting,
    followUpPlan: params.followUpPlan,
    nextReviewDate: params.nextReviewDate,
    participants: params.participants,
  };
}

/**
 * Schedule a conference session
 */
export function scheduleConference(params: {
  hospitals: string[];
  cases: string[];
  scheduledAt: string;
  participants: Participant[];
}): ConferenceSession {
  return {
    id: `CONF-${Date.now()}`,
    scheduledAt: params.scheduledAt,
    hospitals: params.hospitals,
    cases: params.cases,
    participants: params.participants,
    status: "scheduled",
    recordingAvailable: false,
  };
}

/**
 * Get demo tumor board case
 */
export function getDemoCase(): TumorBoardCase {
  const demoCase = createCase({
    patientId: "TB-DEMO-001",
    presentingHospital: "Hamad Medical Corporation",
    submittedBy: "Dr. Ahmed Al-Rashid",
    cancerType: "Breast Cancer (HER2-positive)",
    stage: "IIIA (T3N1M0)",
    priority: "high",
    clinicalSummary: {
      age: 48,
      sex: "Female",
      ecogStatus: 1,
      comorbidities: ["Type 2 Diabetes", "Hypertension"],
      presentingSymptoms: ["Left breast mass 4.5cm", "Palpable axillary lymph node"],
      diagnosisDate: "2026-04-15",
      primarySite: "Left breast — upper outer quadrant",
      relevantLabValues: {
        "CA 15-3": { value: 45, unit: "U/mL", flag: "High" },
        "CEA": { value: 3.2, unit: "ng/mL" },
        "LVEF": { value: 62, unit: "%" },
        "Creatinine": { value: 0.9, unit: "mg/dL" },
        "HbA1c": { value: 7.2, unit: "%" },
      },
      tumorMarkers: {
        "CA 15-3": { value: 45, unit: "U/mL", trend: "rising" },
      },
    },
    pathology: {
      histology: "Invasive ductal carcinoma, NOS",
      grade: "3 (Nottingham Score 8/9)",
      immunohistochemistry: {
        "ER": "Negative (0%)",
        "PR": "Negative (0%)",
        "HER2": "Positive (3+ by IHC)",
        "Ki-67": "45%",
      },
      molecularMarkers: {
        "HER2 FISH": "Amplified (ratio 4.2)",
        "PD-L1": "CPS 12",
      },
      margins: "Core biopsy — N/A",
      lymphNodes: { examined: 1, positive: 1 },
      ki67: "45%",
    },
    imaging: [
      {
        modality: "MRI Breast",
        date: "2026-04-20",
        findings: "4.5cm mass left breast UOQ, 2 satellite lesions (0.8cm, 0.5cm). Suspicious left axillary LN 2.1cm.",
        measurements: [
          { location: "Primary mass", size: "4.5 x 3.8 x 3.2 cm" },
          { location: "Satellite 1", size: "0.8 cm" },
          { location: "Axillary LN", size: "2.1 cm" },
        ],
      },
      {
        modality: "PET-CT",
        date: "2026-04-22",
        findings: "FDG-avid left breast mass (SUVmax 12.5). FDG-avid left axillary LN (SUVmax 8.2). No distant metastases.",
        measurements: [
          { location: "Primary", size: "SUVmax 12.5" },
          { location: "Axillary LN", size: "SUVmax 8.2" },
        ],
      },
    ],
    genomics: {
      platform: "FoundationOne CDx",
      mutations: [
        { gene: "PIK3CA", variant: "H1047R", vaf: 0.35, actionability: "Targetable (Alpelisib — but ER-negative)" },
        { gene: "TP53", variant: "R248W", vaf: 0.52, actionability: "Prognostic (unfavorable)" },
      ],
      tmb: 8,
      msi: "MSS",
      pdl1: { score: 12, method: "CPS" },
    },
    previousTreatments: [],
  });
  
  return demoCase;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function buildCaseDescription(tumorCase: TumorBoardCase): string {
  const cs = tumorCase.clinicalSummary;
  let desc = `${cs.age}yo ${cs.sex}, ECOG ${cs.ecogStatus}\n`;
  desc += `Diagnosis: ${tumorCase.stage} ${tumorCase.cancerType}\n`;
  desc += `Histology: ${tumorCase.pathology.histology}, Grade ${tumorCase.pathology.grade}\n`;
  desc += `IHC: ${Object.entries(tumorCase.pathology.immunohistochemistry).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`;
  
  if (tumorCase.genomics) {
    desc += `Genomics: ${tumorCase.genomics.mutations.map(m => `${m.gene} ${m.variant}`).join(", ")}\n`;
    if (tumorCase.genomics.tmb) desc += `TMB: ${tumorCase.genomics.tmb} mut/Mb\n`;
    if (tumorCase.genomics.msi) desc += `MSI: ${tumorCase.genomics.msi}\n`;
  }
  
  if (tumorCase.imaging.length > 0) {
    desc += `Imaging: ${tumorCase.imaging.map(i => `${i.modality}: ${i.findings}`).join("; ")}\n`;
  }
  
  if (cs.comorbidities.length > 0) {
    desc += `Comorbidities: ${cs.comorbidities.join(", ")}\n`;
  }
  
  if (tumorCase.previousTreatments.length > 0) {
    desc += `Previous treatments: ${tumorCase.previousTreatments.map(t => `${t.regimen} (${t.response})`).join(", ")}\n`;
  }
  
  return desc;
}

function getMatchingProtocols(tumorCase: TumorBoardCase): TreatmentProtocol[] {
  const cancerKey = tumorCase.cancerType.toLowerCase();
  
  for (const [key, protocols] of Object.entries(TREATMENT_PROTOCOLS)) {
    if (cancerKey.includes(key.replace(/_/g, " ")) || key.includes(cancerKey.replace(/[^a-z]/g, "_"))) {
      return protocols;
    }
  }
  
  // Check specific markers
  if (cancerKey.includes("her2")) return TREATMENT_PROTOCOLS["breast_cancer_her2_positive"] || [];
  if (cancerKey.includes("egfr")) return TREATMENT_PROTOCOLS["nsclc_egfr_mutated"] || [];
  if (tumorCase.genomics?.msi === "MSI-H") return TREATMENT_PROTOCOLS["colorectal_cancer_msi_high"] || [];
  
  return [{
    name: "Standard of Care",
    regimen: "Per NCCN guidelines for specific tumor type",
    evidenceLevel: "Category 2A",
    expectedResponse: "Variable — requires tumor board discussion",
    keyTrials: [],
    toxicityProfile: "Regimen-dependent",
  }];
}

function getTrialMatches(tumorCase: TumorBoardCase): ClinicalTrialMatch[] {
  const trials: ClinicalTrialMatch[] = [];
  
  // Generate relevant trial matches based on cancer type and genomics
  if (tumorCase.cancerType.toLowerCase().includes("breast") && tumorCase.cancerType.toLowerCase().includes("her2")) {
    trials.push(
      {
        nctId: "NCT05514054",
        title: "T-DXd + Tucatinib in HER2+ Breast Cancer (HER2CLIMB-04)",
        phase: "Phase III",
        status: "Recruiting",
        matchScore: 0.92,
        matchReason: "HER2+ breast cancer, matches stage and biomarker profile",
        location: "Multiple sites including Middle East",
        eligibilitySummary: "HER2+ breast cancer, ECOG 0-1, adequate organ function",
      },
      {
        nctId: "NCT04740918",
        title: "Neoadjuvant T-DXd vs TCHP in Early HER2+ Breast Cancer",
        phase: "Phase III",
        status: "Recruiting",
        matchScore: 0.88,
        matchReason: "Early-stage HER2+ breast cancer, neoadjuvant setting",
        location: "International multicenter",
        eligibilitySummary: "Stage II-III HER2+ breast cancer, no prior systemic therapy",
      }
    );
  }
  
  // Add genomics-based matches
  if (tumorCase.genomics?.mutations.some(m => m.gene === "PIK3CA")) {
    trials.push({
      nctId: "NCT05646862",
      title: "Novel PI3K Inhibitor in PIK3CA-mutated Solid Tumors",
      phase: "Phase II",
      status: "Recruiting",
      matchScore: 0.75,
      matchReason: "PIK3CA H1047R mutation detected",
      location: "US, Europe, Middle East",
      eligibilitySummary: "PIK3CA-mutated solid tumors, ≥1 prior line of therapy",
    });
  }
  
  return trials;
}

function getPrognosticFactors(tumorCase: TumorBoardCase): { factor: string; impact: "favorable" | "unfavorable" | "neutral"; detail: string }[] {
  const factors: { factor: string; impact: "favorable" | "unfavorable" | "neutral"; detail: string }[] = [];
  
  // Age
  factors.push({
    factor: "Age",
    impact: tumorCase.clinicalSummary.age < 40 ? "unfavorable" : "neutral",
    detail: `${tumorCase.clinicalSummary.age} years old`,
  });
  
  // ECOG
  factors.push({
    factor: "Performance Status",
    impact: tumorCase.clinicalSummary.ecogStatus <= 1 ? "favorable" : "unfavorable",
    detail: `ECOG ${tumorCase.clinicalSummary.ecogStatus}`,
  });
  
  // Grade
  if (tumorCase.pathology.grade.includes("3")) {
    factors.push({ factor: "Tumor Grade", impact: "unfavorable", detail: `Grade ${tumorCase.pathology.grade}` });
  }
  
  // Ki-67
  if (tumorCase.pathology.ki67) {
    const ki67Val = parseInt(tumorCase.pathology.ki67);
    factors.push({
      factor: "Ki-67",
      impact: ki67Val > 30 ? "unfavorable" : ki67Val < 15 ? "favorable" : "neutral",
      detail: `Ki-67: ${tumorCase.pathology.ki67}`,
    });
  }
  
  // Genomics
  if (tumorCase.genomics?.mutations.some(m => m.gene === "TP53")) {
    factors.push({ factor: "TP53 mutation", impact: "unfavorable", detail: "Associated with aggressive biology" });
  }
  
  return factors;
}

export { TREATMENT_PROTOCOLS };

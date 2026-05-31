/**
 * MediGenome — Pharmacogenomics AI
 * Bridges genetics and daily prescribing for precision medicine
 * Integrates patient genomic data to tailor drug therapies
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export interface GenomicProfile {
  patientId: string;
  genes: GeneVariant[];
  metabolizerStatus: MetabolizerStatus[];
  hlaTypes?: string[];
  reportDate?: string;
  source?: "clinical_test" | "direct_to_consumer" | "research" | "simulated";
}

export interface GeneVariant {
  gene: string;
  variant: string; // e.g., "*1/*2", "rs1234567"
  diplotype?: string;
  phenotype: string;
  clinicalSignificance: "pathogenic" | "likely_pathogenic" | "uncertain" | "likely_benign" | "benign";
}

export interface MetabolizerStatus {
  gene: string;
  enzyme: string;
  status: "ultra_rapid" | "rapid" | "normal" | "intermediate" | "poor";
  affectedDrugs: string[];
  clinicalImplication: string;
}

export interface PGxRecommendation {
  drug: string;
  gene: string;
  metabolizerStatus: string;
  recommendation: "use_as_directed" | "dose_adjustment" | "alternative_recommended" | "contraindicated";
  action: string;
  rationale: string;
  alternativeDrugs?: string[];
  doseModification?: string;
  evidenceLevel: "1A" | "1B" | "2A" | "2B" | "3" | "4";
  source: string;
  monitoringRequired?: string;
}

export interface DrugGeneInteraction {
  drug: string;
  drugClass: string;
  gene: string;
  enzyme: string;
  effect: string;
  severity: "critical" | "major" | "moderate" | "minor";
  recommendation: string;
}

export interface PGxAnalysisResult {
  patientId: string;
  analyzedAt: string;
  genomicProfile: GenomicProfile;
  drugRecommendations: PGxRecommendation[];
  interactions: DrugGeneInteraction[];
  riskAlleles: RiskAllele[];
  summary: string;
  actionRequired: boolean;
  citations: { id: number; source: string; title: string; year: number }[];
}

export interface RiskAllele {
  gene: string;
  variant: string;
  condition: string;
  riskIncrease: string;
  preventiveAction: string;
}

// ============================================================
// PHARMACOGENOMICS DATABASE
// ============================================================

/**
 * CPIC (Clinical Pharmacogenetics Implementation Consortium) Guidelines
 * Based on PharmGKB and CPIC evidence levels
 */
const CPIC_GUIDELINES: Record<string, {
  gene: string;
  enzyme: string;
  drugClass: string;
  drugs: string[];
  poorMetabolizer: { action: string; dose?: string; alternatives?: string[] };
  intermediateMetabolizer: { action: string; dose?: string };
  ultraRapidMetabolizer: { action: string; dose?: string; alternatives?: string[] };
  evidenceLevel: string;
}> = {
  "CYP2D6": {
    gene: "CYP2D6",
    enzyme: "Cytochrome P450 2D6",
    drugClass: "Multiple (opioids, antidepressants, antipsychotics, beta-blockers)",
    drugs: ["codeine", "tramadol", "oxycodone", "tamoxifen", "fluoxetine", "paroxetine", "venlafaxine", "amitriptyline", "nortriptyline", "metoprolol", "carvedilol", "atomoxetine", "ondansetron", "haloperidol", "aripiprazole"],
    poorMetabolizer: {
      action: "Avoid codeine/tramadol (no analgesic effect). Use alternative opioids. Reduce SSRI doses by 50%.",
      dose: "50% reduction for SSRIs, avoid prodrugs",
      alternatives: ["morphine", "hydromorphone", "fentanyl", "sertraline", "citalopram"],
    },
    intermediateMetabolizer: {
      action: "Reduce dose by 25-50% for CYP2D6 substrates. Monitor for side effects.",
      dose: "25-50% reduction",
    },
    ultraRapidMetabolizer: {
      action: "Avoid codeine (risk of toxicity from rapid conversion to morphine). Increase SSRI doses or use alternatives.",
      dose: "May need higher doses of substrates",
      alternatives: ["morphine (with caution)", "non-opioid analgesics"],
    },
    evidenceLevel: "1A",
  },
  "CYP2C19": {
    gene: "CYP2C19",
    enzyme: "Cytochrome P450 2C19",
    drugClass: "PPIs, Antiplatelets, Antidepressants, Antifungals",
    drugs: ["clopidogrel", "omeprazole", "esomeprazole", "pantoprazole", "lansoprazole", "voriconazole", "escitalopram", "citalopram", "sertraline", "amitriptyline", "clomipramine"],
    poorMetabolizer: {
      action: "Avoid clopidogrel (no antiplatelet effect). Use prasugrel or ticagrelor. PPIs: standard dose effective.",
      alternatives: ["prasugrel", "ticagrelor"],
    },
    intermediateMetabolizer: {
      action: "Clopidogrel may have reduced efficacy. Consider alternative or increased dose.",
      dose: "Consider prasugrel/ticagrelor if high CV risk",
    },
    ultraRapidMetabolizer: {
      action: "PPIs may be less effective (rapid metabolism). May need higher PPI doses. Clopidogrel works well.",
      dose: "Increase PPI dose or use rabeprazole (less CYP2C19 dependent)",
    },
    evidenceLevel: "1A",
  },
  "CYP2C9": {
    gene: "CYP2C9",
    enzyme: "Cytochrome P450 2C9",
    drugClass: "Anticoagulants, NSAIDs, Sulfonylureas",
    drugs: ["warfarin", "phenytoin", "celecoxib", "flurbiprofen", "glipizide", "glimepiride", "losartan"],
    poorMetabolizer: {
      action: "Warfarin: reduce dose by 50-80%. High bleeding risk. Use lower starting dose.",
      dose: "Warfarin: start 1-2 mg/day (not 5 mg). Phenytoin: reduce by 25%.",
      alternatives: ["DOACs (apixaban, rivaroxaban) — not CYP2C9 dependent"],
    },
    intermediateMetabolizer: {
      action: "Warfarin: reduce dose by 20-40%. Monitor INR closely.",
      dose: "Warfarin: start 3 mg/day",
    },
    ultraRapidMetabolizer: {
      action: "May need higher warfarin doses. Monitor INR.",
      dose: "Warfarin: may need 7-10 mg/day",
    },
    evidenceLevel: "1A",
  },
  "VKORC1": {
    gene: "VKORC1",
    enzyme: "Vitamin K Epoxide Reductase",
    drugClass: "Anticoagulants (Warfarin)",
    drugs: ["warfarin", "acenocoumarol", "phenprocoumon"],
    poorMetabolizer: {
      action: "VKORC1 -1639 AA genotype: very sensitive to warfarin. Start at 1-2 mg/day.",
      dose: "Reduce warfarin dose by 50-75%",
      alternatives: ["DOACs (apixaban, rivaroxaban)"],
    },
    intermediateMetabolizer: {
      action: "VKORC1 -1639 AG genotype: moderately sensitive. Standard starting dose with close monitoring.",
      dose: "Standard or slightly reduced dose",
    },
    ultraRapidMetabolizer: {
      action: "VKORC1 -1639 GG genotype: warfarin resistant. May need higher doses.",
      dose: "May need 7-10+ mg/day",
    },
    evidenceLevel: "1A",
  },
  "HLA-B*5701": {
    gene: "HLA-B",
    enzyme: "Human Leukocyte Antigen B",
    drugClass: "Antiretrovirals",
    drugs: ["abacavir"],
    poorMetabolizer: {
      action: "HLA-B*5701 POSITIVE: CONTRAINDICATED. Do NOT prescribe abacavir — risk of fatal hypersensitivity reaction.",
      alternatives: ["tenofovir", "emtricitabine"],
    },
    intermediateMetabolizer: { action: "Not applicable for HLA typing" },
    ultraRapidMetabolizer: { action: "Not applicable for HLA typing" },
    evidenceLevel: "1A",
  },
  "HLA-B*1502": {
    gene: "HLA-B",
    enzyme: "Human Leukocyte Antigen B",
    drugClass: "Anticonvulsants",
    drugs: ["carbamazepine", "oxcarbazepine", "phenytoin", "lamotrigine"],
    poorMetabolizer: {
      action: "HLA-B*1502 POSITIVE: CONTRAINDICATED for carbamazepine — risk of Stevens-Johnson Syndrome (SJS/TEN).",
      alternatives: ["levetiracetam", "valproate", "lacosamide"],
    },
    intermediateMetabolizer: { action: "Not applicable for HLA typing" },
    ultraRapidMetabolizer: { action: "Not applicable for HLA typing" },
    evidenceLevel: "1A",
  },
  "TPMT": {
    gene: "TPMT",
    enzyme: "Thiopurine S-Methyltransferase",
    drugClass: "Immunosuppressants",
    drugs: ["azathioprine", "mercaptopurine", "thioguanine"],
    poorMetabolizer: {
      action: "DRASTICALLY reduce dose (10% of standard) or use alternative. Risk of fatal myelosuppression.",
      dose: "Azathioprine: 10 mg 3x/week (not 2-3 mg/kg/day)",
      alternatives: ["mycophenolate mofetil", "methotrexate"],
    },
    intermediateMetabolizer: {
      action: "Reduce dose by 30-50%. Monitor CBC weekly for first 2 months.",
      dose: "50% of standard dose",
    },
    ultraRapidMetabolizer: {
      action: "Standard doses may be subtherapeutic. May need dose increase. Monitor therapeutic levels.",
      dose: "May need higher than standard dose",
    },
    evidenceLevel: "1A",
  },
  "DPYD": {
    gene: "DPYD",
    enzyme: "Dihydropyrimidine Dehydrogenase",
    drugClass: "Chemotherapy (Fluoropyrimidines)",
    drugs: ["5-fluorouracil", "capecitabine", "tegafur"],
    poorMetabolizer: {
      action: "CONTRAINDICATED. Complete DPD deficiency = fatal toxicity. Use alternative chemotherapy.",
      alternatives: ["alternative chemotherapy regimen per oncologist"],
    },
    intermediateMetabolizer: {
      action: "Reduce dose by 50%. Monitor closely for toxicity (mucositis, neutropenia, hand-foot syndrome).",
      dose: "50% dose reduction",
    },
    ultraRapidMetabolizer: {
      action: "Standard dosing. May have reduced efficacy — monitor response.",
    },
    evidenceLevel: "1A",
  },
  "SLCO1B1": {
    gene: "SLCO1B1",
    enzyme: "Organic Anion Transporter 1B1",
    drugClass: "Statins",
    drugs: ["simvastatin", "atorvastatin", "rosuvastatin", "pravastatin", "lovastatin"],
    poorMetabolizer: {
      action: "High risk of myopathy/rhabdomyolysis with simvastatin. Avoid simvastatin >20mg. Use alternatives.",
      dose: "Simvastatin max 20 mg. Prefer rosuvastatin or pravastatin.",
      alternatives: ["rosuvastatin", "pravastatin", "fluvastatin"],
    },
    intermediateMetabolizer: {
      action: "Moderate risk. Limit simvastatin to 40 mg. Monitor CK levels.",
      dose: "Simvastatin max 40 mg",
    },
    ultraRapidMetabolizer: {
      action: "Standard dosing appropriate. Lower risk of myopathy.",
    },
    evidenceLevel: "1A",
  },
  "CYP3A5": {
    gene: "CYP3A5",
    enzyme: "Cytochrome P450 3A5",
    drugClass: "Immunosuppressants (Transplant)",
    drugs: ["tacrolimus", "cyclosporine"],
    poorMetabolizer: {
      action: "Standard tacrolimus dosing (non-expresser). Most common genotype.",
      dose: "Standard: 0.15-0.3 mg/kg/day",
    },
    intermediateMetabolizer: {
      action: "May need slightly higher tacrolimus dose. Monitor trough levels.",
      dose: "0.2-0.3 mg/kg/day",
    },
    ultraRapidMetabolizer: {
      action: "CYP3A5 expresser: needs 1.5-2x higher tacrolimus dose to achieve target levels.",
      dose: "0.3-0.5 mg/kg/day. Target trough 10-15 ng/mL",
    },
    evidenceLevel: "1A",
  },
};

/**
 * Disease risk alleles database
 */
const RISK_ALLELES: Record<string, { condition: string; riskIncrease: string; preventiveAction: string }[]> = {
  "BRCA1": [{ condition: "Breast/Ovarian Cancer", riskIncrease: "45-85% lifetime risk", preventiveAction: "Enhanced screening, prophylactic surgery discussion, PARP inhibitors" }],
  "BRCA2": [{ condition: "Breast/Ovarian/Prostate Cancer", riskIncrease: "45-85% lifetime risk", preventiveAction: "Enhanced screening, risk-reducing surgery, genetic counseling" }],
  "APOE4": [{ condition: "Alzheimer's Disease", riskIncrease: "3-12x increased risk (homozygous)", preventiveAction: "Cognitive engagement, cardiovascular risk reduction, exercise" }],
  "Factor V Leiden": [{ condition: "Venous Thromboembolism", riskIncrease: "5-80x increased risk", preventiveAction: "Avoid estrogen-containing contraceptives, prophylaxis for surgery" }],
  "MTHFR C677T": [{ condition: "Hyperhomocysteinemia / Neural Tube Defects", riskIncrease: "Moderate", preventiveAction: "L-methylfolate supplementation, B12, avoid methotrexate" }],
  "HFE C282Y": [{ condition: "Hereditary Hemochromatosis", riskIncrease: "High (homozygous)", preventiveAction: "Regular ferritin monitoring, therapeutic phlebotomy" }],
  "LRRK2 G2019S": [{ condition: "Parkinson's Disease", riskIncrease: "30-75% by age 80", preventiveAction: "Exercise, neuroprotective strategies, clinical trial eligibility" }],
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Analyze a patient's genomic profile against their current medications
 */
export async function analyzePharmacogenomics(
  profile: GenomicProfile,
  currentMedications: string[]
): Promise<PGxAnalysisResult> {
  const recommendations: PGxRecommendation[] = [];
  const interactions: DrugGeneInteraction[] = [];
  const riskAlleles: RiskAllele[] = [];
  
  // Check each metabolizer status against current medications
  for (const status of profile.metabolizerStatus) {
    const guideline = CPIC_GUIDELINES[status.gene];
    if (!guideline) continue;
    
    for (const drug of currentMedications) {
      const drugLower = drug.toLowerCase();
      const matchedDrug = guideline.drugs.find(d => drugLower.includes(d.toLowerCase()));
      
      if (matchedDrug) {
        const rec = generateRecommendation(matchedDrug, status, guideline);
        recommendations.push(rec);
        
        if (rec.recommendation !== "use_as_directed") {
          interactions.push({
            drug: matchedDrug,
            drugClass: guideline.drugClass,
            gene: status.gene,
            enzyme: guideline.enzyme,
            effect: status.clinicalImplication,
            severity: rec.recommendation === "contraindicated" ? "critical" : 
                     rec.recommendation === "alternative_recommended" ? "major" : "moderate",
            recommendation: rec.action,
          });
        }
      }
    }
  }
  
  // Check for risk alleles
  for (const variant of profile.genes) {
    const risks = RISK_ALLELES[variant.gene];
    if (risks) {
      for (const risk of risks) {
        riskAlleles.push({
          gene: variant.gene,
          variant: variant.variant,
          condition: risk.condition,
          riskIncrease: risk.riskIncrease,
          preventiveAction: risk.preventiveAction,
        });
      }
    }
  }
  
  // Get AI-enhanced analysis
  const aiSummary = await getAIGenomicAnalysis(profile, currentMedications, recommendations, interactions);
  
  const actionRequired = recommendations.some(r => 
    r.recommendation === "contraindicated" || r.recommendation === "alternative_recommended"
  );
  
  return {
    patientId: profile.patientId,
    analyzedAt: new Date().toISOString(),
    genomicProfile: profile,
    drugRecommendations: recommendations,
    interactions,
    riskAlleles,
    summary: aiSummary,
    actionRequired,
    citations: [
      { id: 1, source: "CPIC", title: "Clinical Pharmacogenetics Implementation Consortium Guidelines", year: 2024 },
      { id: 2, source: "PharmGKB", title: "Pharmacogenomics Knowledge Base", year: 2024 },
      { id: 3, source: "FDA", title: "Table of Pharmacogenomic Biomarkers in Drug Labeling", year: 2024 },
      { id: 4, source: "DPWG", title: "Dutch Pharmacogenetics Working Group Guidelines", year: 2023 },
    ],
  };
}

/**
 * Generate recommendation for a specific drug-gene pair
 */
function generateRecommendation(
  drug: string,
  status: MetabolizerStatus,
  guideline: typeof CPIC_GUIDELINES[string]
): PGxRecommendation {
  let recommendation: PGxRecommendation["recommendation"] = "use_as_directed";
  let action = "Continue current therapy at standard dose.";
  let alternativeDrugs: string[] | undefined;
  let doseModification: string | undefined;
  let monitoringRequired: string | undefined;
  
  switch (status.status) {
    case "poor":
      if (guideline.poorMetabolizer.alternatives) {
        recommendation = drug === "abacavir" || drug === "carbamazepine" || drug === "5-fluorouracil"
          ? "contraindicated" : "alternative_recommended";
        alternativeDrugs = guideline.poorMetabolizer.alternatives;
      } else {
        recommendation = "dose_adjustment";
      }
      action = guideline.poorMetabolizer.action;
      doseModification = guideline.poorMetabolizer.dose;
      monitoringRequired = "Weekly monitoring for first month, then monthly";
      break;
      
    case "intermediate":
      recommendation = "dose_adjustment";
      action = guideline.intermediateMetabolizer.action;
      doseModification = guideline.intermediateMetabolizer.dose;
      monitoringRequired = "Monitor therapeutic levels and side effects";
      break;
      
    case "ultra_rapid":
      if (guideline.ultraRapidMetabolizer.alternatives) {
        recommendation = drug === "codeine" ? "contraindicated" : "alternative_recommended";
        alternativeDrugs = guideline.ultraRapidMetabolizer.alternatives;
      } else {
        recommendation = "dose_adjustment";
      }
      action = guideline.ultraRapidMetabolizer.action;
      doseModification = guideline.ultraRapidMetabolizer.dose;
      monitoringRequired = "Monitor for toxicity (ultra-rapid) or subtherapeutic levels";
      break;
      
    default:
      recommendation = "use_as_directed";
      action = "Standard dosing appropriate for this genotype.";
  }
  
  return {
    drug,
    gene: status.gene,
    metabolizerStatus: status.status,
    recommendation,
    action,
    rationale: `Patient is a ${status.status.replace("_", " ")} metabolizer for ${guideline.enzyme}. ${status.clinicalImplication}`,
    alternativeDrugs,
    doseModification,
    evidenceLevel: guideline.evidenceLevel as PGxRecommendation["evidenceLevel"],
    source: "CPIC Guidelines",
    monitoringRequired,
  };
}

/**
 * AI-enhanced genomic analysis summary
 */
async function getAIGenomicAnalysis(
  profile: GenomicProfile,
  medications: string[],
  recommendations: PGxRecommendation[],
  interactions: DrugGeneInteraction[]
): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    const critical = recommendations.filter(r => r.recommendation === "contraindicated");
    const adjustments = recommendations.filter(r => r.recommendation === "dose_adjustment");
    return `Pharmacogenomic analysis complete. ${critical.length} contraindicated medications found. ${adjustments.length} dose adjustments recommended. ${interactions.length} gene-drug interactions identified.`;
  }
  
  const prompt = `You are MediGenome, a pharmacogenomics AI. Summarize this analysis in 3-4 sentences for the physician:

Patient Metabolizer Status: ${profile.metabolizerStatus.map(m => `${m.gene}: ${m.status}`).join(", ")}
Current Medications: ${medications.join(", ")}
Critical Findings: ${recommendations.filter(r => r.recommendation === "contraindicated").map(r => `${r.drug} (${r.gene} ${r.metabolizerStatus})`).join(", ") || "None"}
Dose Adjustments Needed: ${recommendations.filter(r => r.recommendation === "dose_adjustment").map(r => `${r.drug}: ${r.doseModification}`).join(", ") || "None"}

Write a concise clinical summary. Be direct and actionable.`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.2 },
    });
    return result.text ?? "Analysis complete. Review recommendations above.";
  } catch {
    return "Pharmacogenomic analysis complete. Please review individual drug recommendations.";
  }
}

/**
 * Generate a simulated genomic profile for demo purposes
 */
export function generateDemoProfile(patientId: string, scenario: "normal" | "high_risk" | "complex" = "normal"): GenomicProfile {
  const profiles: Record<string, GenomicProfile> = {
    normal: {
      patientId,
      source: "simulated",
      genes: [
        { gene: "CYP2D6", variant: "*1/*1", phenotype: "Normal Metabolizer", clinicalSignificance: "benign" },
        { gene: "CYP2C19", variant: "*1/*1", phenotype: "Normal Metabolizer", clinicalSignificance: "benign" },
        { gene: "CYP2C9", variant: "*1/*1", phenotype: "Normal Metabolizer", clinicalSignificance: "benign" },
        { gene: "VKORC1", variant: "-1639 GG", phenotype: "Normal Warfarin Sensitivity", clinicalSignificance: "benign" },
      ],
      metabolizerStatus: [
        { gene: "CYP2D6", enzyme: "Cytochrome P450 2D6", status: "normal", affectedDrugs: ["codeine", "tramadol", "metoprolol"], clinicalImplication: "Standard drug metabolism. No dose adjustments needed." },
        { gene: "CYP2C19", enzyme: "Cytochrome P450 2C19", status: "normal", affectedDrugs: ["clopidogrel", "omeprazole"], clinicalImplication: "Standard drug metabolism." },
      ],
    },
    high_risk: {
      patientId,
      source: "simulated",
      genes: [
        { gene: "CYP2D6", variant: "*4/*4", phenotype: "Poor Metabolizer", clinicalSignificance: "pathogenic" },
        { gene: "CYP2C19", variant: "*2/*2", phenotype: "Poor Metabolizer", clinicalSignificance: "pathogenic" },
        { gene: "CYP2C9", variant: "*2/*3", phenotype: "Poor Metabolizer", clinicalSignificance: "pathogenic" },
        { gene: "VKORC1", variant: "-1639 AA", phenotype: "High Warfarin Sensitivity", clinicalSignificance: "pathogenic" },
        { gene: "SLCO1B1", variant: "rs4149056 CC", phenotype: "Poor Transporter", clinicalSignificance: "pathogenic" },
        { gene: "HLA-B", variant: "*5701 Positive", phenotype: "Abacavir Hypersensitivity Risk", clinicalSignificance: "pathogenic" },
      ],
      metabolizerStatus: [
        { gene: "CYP2D6", enzyme: "Cytochrome P450 2D6", status: "poor", affectedDrugs: ["codeine", "tramadol", "metoprolol", "tamoxifen"], clinicalImplication: "Cannot activate prodrugs (codeine→morphine). Increased side effects from active drugs." },
        { gene: "CYP2C19", enzyme: "Cytochrome P450 2C19", status: "poor", affectedDrugs: ["clopidogrel", "omeprazole", "escitalopram"], clinicalImplication: "Clopidogrel INEFFECTIVE. Cannot convert to active metabolite. Use prasugrel/ticagrelor." },
        { gene: "CYP2C9", enzyme: "Cytochrome P450 2C9", status: "poor", affectedDrugs: ["warfarin", "phenytoin", "celecoxib"], clinicalImplication: "Warfarin accumulates — high bleeding risk. Reduce dose by 60-80%." },
        { gene: "SLCO1B1", enzyme: "OATP1B1 Transporter", status: "poor", affectedDrugs: ["simvastatin", "atorvastatin"], clinicalImplication: "High risk of statin myopathy/rhabdomyolysis. Avoid simvastatin >20mg." },
      ],
      hlaTypes: ["HLA-B*5701"],
    },
    complex: {
      patientId,
      source: "simulated",
      genes: [
        { gene: "CYP2D6", variant: "*1/*2xN", phenotype: "Ultra-Rapid Metabolizer", clinicalSignificance: "pathogenic" },
        { gene: "CYP2C19", variant: "*1/*17", phenotype: "Rapid Metabolizer", clinicalSignificance: "likely_pathogenic" },
        { gene: "TPMT", variant: "*1/*3A", phenotype: "Intermediate Metabolizer", clinicalSignificance: "pathogenic" },
        { gene: "DPYD", variant: "*1/*2A", phenotype: "Intermediate Metabolizer", clinicalSignificance: "pathogenic" },
        { gene: "BRCA1", variant: "185delAG", phenotype: "Pathogenic Variant", clinicalSignificance: "pathogenic" },
        { gene: "Factor V Leiden", variant: "R506Q heterozygous", phenotype: "Thrombophilia", clinicalSignificance: "pathogenic" },
      ],
      metabolizerStatus: [
        { gene: "CYP2D6", enzyme: "Cytochrome P450 2D6", status: "ultra_rapid", affectedDrugs: ["codeine", "tramadol"], clinicalImplication: "DANGER: Codeine rapidly converted to morphine — risk of respiratory depression/death." },
        { gene: "CYP2C19", enzyme: "Cytochrome P450 2C19", status: "rapid", affectedDrugs: ["omeprazole", "clopidogrel"], clinicalImplication: "PPIs metabolized too quickly — may need higher doses. Clopidogrel works well." },
        { gene: "TPMT", enzyme: "Thiopurine Methyltransferase", status: "intermediate", affectedDrugs: ["azathioprine", "mercaptopurine"], clinicalImplication: "Reduce thiopurine dose by 30-50%. Risk of myelosuppression." },
        { gene: "DPYD", enzyme: "Dihydropyrimidine Dehydrogenase", status: "intermediate", affectedDrugs: ["5-fluorouracil", "capecitabine"], clinicalImplication: "Reduce fluoropyrimidine dose by 50%. Risk of severe toxicity." },
      ],
    },
  };
  
  return profiles[scenario] || profiles.normal;
}

/**
 * Check a specific drug against a genomic profile
 */
export function checkDrugGenomics(
  drug: string,
  profile: GenomicProfile
): { safe: boolean; warnings: string[]; recommendation: string } {
  const warnings: string[] = [];
  let recommendation = "Safe to prescribe at standard dose.";
  let safe = true;
  
  const drugLower = drug.toLowerCase();
  
  for (const status of profile.metabolizerStatus) {
    const guideline = CPIC_GUIDELINES[status.gene];
    if (!guideline) continue;
    
    const matchedDrug = guideline.drugs.find(d => drugLower.includes(d));
    if (!matchedDrug) continue;
    
    if (status.status === "poor") {
      if (guideline.poorMetabolizer.alternatives) {
        safe = false;
        warnings.push(`⚠️ CRITICAL: Patient is ${status.gene} Poor Metabolizer. ${guideline.poorMetabolizer.action}`);
        recommendation = `AVOID ${drug}. Alternatives: ${guideline.poorMetabolizer.alternatives.join(", ")}`;
      } else {
        warnings.push(`⚠️ Dose adjustment needed: ${guideline.poorMetabolizer.dose}`);
        recommendation = guideline.poorMetabolizer.action;
      }
    } else if (status.status === "ultra_rapid") {
      if (matchedDrug === "codeine" || matchedDrug === "tramadol") {
        safe = false;
        warnings.push(`🚨 DANGER: Patient is CYP2D6 Ultra-Rapid Metabolizer. ${matchedDrug} → rapid morphine conversion → respiratory depression risk.`);
        recommendation = `CONTRAINDICATED. Use: ${guideline.ultraRapidMetabolizer.alternatives?.join(", ")}`;
      }
    }
  }
  
  // Check HLA types
  if (profile.hlaTypes?.includes("HLA-B*5701") && drugLower.includes("abacavir")) {
    safe = false;
    warnings.push("🚨 FATAL RISK: HLA-B*5701 positive — Abacavir hypersensitivity reaction. NEVER prescribe.");
    recommendation = "ABSOLUTELY CONTRAINDICATED. Use tenofovir-based regimen.";
  }
  
  if (profile.hlaTypes?.includes("HLA-B*1502") && (drugLower.includes("carbamazepine") || drugLower.includes("oxcarbazepine"))) {
    safe = false;
    warnings.push("🚨 FATAL RISK: HLA-B*1502 positive — Stevens-Johnson Syndrome risk with carbamazepine.");
    recommendation = "CONTRAINDICATED. Use levetiracetam or valproate.";
  }
  
  return { safe, warnings, recommendation };
}

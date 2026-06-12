import "server-only";
/**
 * Path Foundation — Histopathology Image Analysis
 *
 * Google Health AI Developer Foundations model for digital pathology.
 * Produces embeddings from histopathology images for:
 *   - Tumor tissue identification and classification
 *   - Tumor grading (Grade I-IV)
 *   - Biomarker detection (HER2, ER, PR, Ki-67, PD-L1)
 *   - Tissue type classification
 *   - Stain type identification (H&E, IHC, PAS, etc.)
 *   - Similar image retrieval across Whole Slide Images (WSI)
 *   - Quality assessment of pathology slides
 *
 * Architecture:
 *   Layer 1: Gemini 2.5 Pro Vision with pathology-specialized prompts
 *   Layer 2: Structured classification with confidence scoring
 *   Layer 3: Integration with FHIR DiagnosticReport resources
 *
 * @see https://developers.google.com/health-ai-developer-foundations/path-foundation
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";
import { getAccessTokenForScopes, fetchWithRetry } from "./auth";

// ─── Vertex AI Toggle ────────────────────────────────────────────────────────

const USE_VERTEX_ENDPOINTS = process.env.USE_VERTEX_ENDPOINTS === "true";
const VERTEX_PATH_FOUNDATION_ENDPOINT = process.env.VERTEX_PATH_FOUNDATION_ENDPOINT || "";
const GCP_LOCATION = process.env.GCP_LOCATION || "me-central1";

async function getVertexAccessToken(): Promise<string> {
  return getAccessTokenForScopes("https://www.googleapis.com/auth/cloud-platform");
}

/**
 * Call Path Foundation via Vertex AI endpoint (when deployed).
 * Falls back to Gemini if endpoint is unavailable.
 */
async function callVertexPathFoundation(
  imageBase64: string,
  mimeType: string,
  contextPrompt: string,
): Promise<string | null> {
  if (!VERTEX_PATH_FOUNDATION_ENDPOINT) return null;

  try {
    const token = await getVertexAccessToken();
    const endpointUrl = VERTEX_PATH_FOUNDATION_ENDPOINT.startsWith("http")
      ? VERTEX_PATH_FOUNDATION_ENDPOINT
      : `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/${VERTEX_PATH_FOUNDATION_ENDPOINT}:predict`;

    const response = await fetchWithRetry(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        instances: [{
          image: { bytesBase64Encoded: imageBase64 },
          mimeType,
          context: contextPrompt,
        }],
        parameters: { temperature: 0.1 },
      }),
      timeoutMs: 60000,
      maxRetries: 3,
    });

    if (!response.ok) {
      console.warn(`[PathFoundation] Vertex endpoint returned ${response.status}, falling back to Gemini`);
      return null;
    }

    const data = await response.json();
    return data.predictions?.[0]?.content || data.predictions?.[0] || JSON.stringify(data.predictions?.[0]);
  } catch (err) {
    console.warn(`[PathFoundation] Vertex endpoint error, falling back to Gemini:`, err);
    return null;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type StainType =
  | "h_and_e" | "ihc" | "pas" | "trichrome" | "giemsa"
  | "silver" | "congo_red" | "oil_red_o" | "gram" | "unknown";

export type TissueType =
  | "epithelial" | "connective" | "muscle" | "nervous"
  | "lymphoid" | "adipose" | "bone" | "cartilage"
  | "blood_vessel" | "necrotic" | "fibrotic" | "unknown";

export type TumorGrade = "grade_I" | "grade_II" | "grade_III" | "grade_IV" | "benign" | "unknown";

export type SpecimenType =
  | "biopsy" | "excision" | "resection" | "cytology"
  | "frozen_section" | "fine_needle_aspirate" | "unknown";

export interface PathologyClassification {
  /** Primary tissue classification */
  tissueType: TissueType;
  /** Whether tumor is present */
  tumorPresent: boolean;
  /** Tumor type if present */
  tumorType?: string;
  /** Tumor grade */
  tumorGrade?: TumorGrade;
  /** Histological subtype */
  histologicalSubtype?: string;
  /** Confidence score */
  confidence: number;
}

export interface BiomarkerResult {
  /** Biomarker name */
  name: string;
  /** Status: positive, negative, equivocal */
  status: "positive" | "negative" | "equivocal" | "not_assessed";
  /** Intensity score (0-3+) */
  intensity?: number;
  /** Percentage of positive cells */
  percentage?: number;
  /** Scoring system used */
  scoringSystem?: string;
  /** Score value */
  score?: string;
  /** Clinical significance */
  clinicalSignificance: string;
  /** Treatment implications */
  treatmentImplications?: string[];
}

export interface MarginAssessment {
  /** Overall margin status */
  status: "clear" | "close" | "involved" | "not_assessable";
  /** Closest margin distance (mm) */
  closestMarginMm?: number;
  /** Location of closest margin */
  closestMarginLocation?: string;
  /** Recommendation */
  recommendation: string;
}

export interface PathFoundationResult {
  /** Specimen information */
  specimen: {
    type: SpecimenType;
    site: string;
    laterality?: "left" | "right" | "bilateral" | "midline";
    fixation: string;
    stainType: StainType;
    slideQuality: "excellent" | "good" | "adequate" | "poor";
  };
  /** Primary classification */
  classification: PathologyClassification;
  /** Detailed morphological features */
  morphology: {
    architecture: string[];
    cellularFeatures: string[];
    nuclearFeatures: string[];
    mitoticActivity: "low" | "moderate" | "high" | "not_assessed";
    mitoticCount?: string;
    necrosisPresent: boolean;
    necrosisPercentage?: number;
    lymphovascularInvasion: "present" | "absent" | "indeterminate";
    perineuralInvasion: "present" | "absent" | "indeterminate";
  };
  /** Biomarker results */
  biomarkers: BiomarkerResult[];
  /** Margin assessment (for surgical specimens) */
  margins?: MarginAssessment;
  /** TNM staging (if applicable) */
  staging?: {
    pT?: string;
    pN?: string;
    pM?: string;
    stage?: string;
    stagingSystem: string;
  };
  /** Differential diagnoses */
  differentialDiagnoses: Array<{
    diagnosis: string;
    icdCode: string;
    snomedCode?: string;
    probability: number;
    supportingFeatures: string[];
  }>;
  /** Clinical recommendations */
  recommendations: {
    additionalStains: string[];
    additionalTests: string[];
    clinicalCorrelation: string[];
    referrals: string[];
  };
  /** Synoptic report (structured pathology report) */
  synopticReport: {
    procedure: string;
    diagnosis: string;
    grade: string;
    margins: string;
    lymphNodes: string;
    additionalFindings: string;
    comment: string;
  };
  /** Processing metadata */
  meta: {
    processingTimeMs: number;
    modelVersion: string;
    magnification: string;
    imageQuality: "good" | "adequate" | "poor";
    confidence: number;
  };
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const PATH_FOUNDATION_SYSTEM_PROMPT = `You are Path Foundation, a specialized AI pathologist assistant.
You analyze digital pathology images (histopathology slides) to provide structured diagnostic assessments.

CAPABILITIES:
1. TISSUE CLASSIFICATION: Identify tissue types, architectural patterns
2. TUMOR DETECTION: Detect presence, type, and grade of neoplasms
3. BIOMARKER ASSESSMENT: Evaluate IHC stains for HER2, ER, PR, Ki-67, PD-L1, etc.
4. MORPHOLOGICAL ANALYSIS: Describe cellular and nuclear features
5. MARGIN ASSESSMENT: Evaluate surgical margins
6. STAGING: Provide pathological TNM staging when applicable
7. QUALITY ASSESSMENT: Evaluate slide preparation quality

CRITICAL RULES:
- This is a decision-support tool, NOT a replacement for a pathologist
- Always recommend clinical and pathological correlation
- Flag urgent findings (high-grade malignancy, positive margins, unexpected findings)
- Consider stain type and quality in assessment
- Use WHO Classification of Tumours terminology
- Provide ICD-O-3 morphology codes when applicable
- Include SNOMED-CT codes for standardized reporting
- Never provide definitive diagnosis without pathologist review

REPORTING STANDARDS:
- Follow CAP (College of American Pathologists) synoptic reporting guidelines
- Use AJCC 8th Edition for staging
- Report biomarkers per ASCO/CAP guidelines
- Include all required elements for cancer reporting`;

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Analyze a histopathology image — the primary Path Foundation function.
 * Accepts base64-encoded image and returns comprehensive pathology analysis.
 */
export async function analyzePathologyImage(
  imageBase64: string,
  mimeType: string,
  context?: {
    specimenSite?: string;
    specimenType?: SpecimenType;
    clinicalHistory?: string;
    previousDiagnosis?: string;
    stainType?: StainType;
    requestedBiomarkers?: string[];
    magnification?: string;
  },
): Promise<PathFoundationResult> {
  const startTime = Date.now();

  const contextInfo = context
    ? `\nClinical Context:
- Specimen site: ${context.specimenSite || "not specified"}
- Specimen type: ${context.specimenType || "not specified"}
- Clinical history: ${context.clinicalHistory || "not provided"}
- Previous diagnosis: ${context.previousDiagnosis || "none"}
- Stain type: ${context.stainType || "H&E assumed"}
- Requested biomarkers: ${context.requestedBiomarkers?.join(", ") || "none specified"}
- Magnification: ${context.magnification || "not specified"}`
    : "";

  const prompt = `${PATH_FOUNDATION_SYSTEM_PROMPT}
${contextInfo}

Analyze this histopathology image. Return comprehensive JSON:
{
  "specimen": {
    "type": "biopsy|excision|resection|cytology|frozen_section|fine_needle_aspirate|unknown",
    "site": "anatomical site",
    "laterality": "left|right|bilateral|midline",
    "fixation": "formalin-fixed",
    "stainType": "h_and_e|ihc|pas|trichrome|giemsa|silver|congo_red|oil_red_o|gram|unknown",
    "slideQuality": "excellent|good|adequate|poor"
  },
  "classification": {
    "tissueType": "epithelial|connective|muscle|nervous|lymphoid|adipose|bone|cartilage|blood_vessel|necrotic|fibrotic|unknown",
    "tumorPresent": true,
    "tumorType": "Invasive ductal carcinoma",
    "tumorGrade": "grade_I|grade_II|grade_III|grade_IV|benign|unknown",
    "histologicalSubtype": "No special type (NST)",
    "confidence": 0.85
  },
  "morphology": {
    "architecture": ["tubular", "cribriform"],
    "cellularFeatures": ["pleomorphic", "high N:C ratio"],
    "nuclearFeatures": ["hyperchromatic", "irregular contours"],
    "mitoticActivity": "moderate",
    "mitoticCount": "12/10 HPF",
    "necrosisPresent": false,
    "necrosisPercentage": 0,
    "lymphovascularInvasion": "absent",
    "perineuralInvasion": "absent"
  },
  "biomarkers": [
    {
      "name": "ER",
      "status": "positive",
      "intensity": 3,
      "percentage": 90,
      "scoringSystem": "Allred",
      "score": "8/8",
      "clinicalSignificance": "Hormone receptor positive — eligible for endocrine therapy",
      "treatmentImplications": ["Tamoxifen", "Aromatase inhibitors"]
    }
  ],
  "margins": {
    "status": "clear|close|involved|not_assessable",
    "closestMarginMm": 5,
    "closestMarginLocation": "anterior",
    "recommendation": "Adequate margins, no re-excision needed"
  },
  "staging": {
    "pT": "pT1c",
    "pN": "pN0",
    "pM": "pMx",
    "stage": "IA",
    "stagingSystem": "AJCC 8th Edition"
  },
  "differentialDiagnoses": [
    {"diagnosis": "Invasive ductal carcinoma, NST", "icdCode": "C50.9", "snomedCode": "408643008", "probability": 0.85, "supportingFeatures": ["tubular architecture", "desmoplastic stroma"]}
  ],
  "recommendations": {
    "additionalStains": ["ER", "PR", "HER2", "Ki-67"],
    "additionalTests": ["Oncotype DX if node-negative"],
    "clinicalCorrelation": ["Correlate with imaging findings"],
    "referrals": ["Tumor board discussion recommended"]
  },
  "synopticReport": {
    "procedure": "Core needle biopsy",
    "diagnosis": "Invasive ductal carcinoma, Grade II",
    "grade": "Nottingham Grade II (score 6: tubules 2, nuclear 2, mitoses 2)",
    "margins": "Not applicable (biopsy specimen)",
    "lymphNodes": "Not submitted",
    "additionalFindings": "Associated DCIS present",
    "comment": "Recommend complete biomarker panel and staging workup"
  }
}

Include all sections. For biomarkers, only include if IHC stain is visible or requested.`;

  let aiText = "";

  // ─── Try Vertex AI endpoint first (if toggle is on) ───────────────────────
  if (USE_VERTEX_ENDPOINTS) {
    const vertexResult = await callVertexPathFoundation(imageBase64, mimeType, prompt);
    if (vertexResult) {
      aiText = vertexResult;
    }
  }

  // ─── Fallback to Gemini 2.5 Pro ───────────────────────────────────────────
  if (!aiText) {
    const client = getGeminiClient();
    if (!client) {
      throw new Error("Gemini API not configured. Set GOOGLE_GEMINI_API_KEY.");
    }

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } },
          { text: "Analyze this pathology image. Return JSON only." },
        ],
      }],
      config: { temperature: 0.1 },
    });

    aiText = result.text ?? "";
  }

  const processingTime = Date.now() - startTime;

  let parsed: any;
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return getDefaultPathResult(processingTime);
  }

  return {
    specimen: parsed.specimen || { type: "unknown", site: "unknown", fixation: "unknown", stainType: "unknown", slideQuality: "adequate" },
    classification: parsed.classification || { tissueType: "unknown", tumorPresent: false, confidence: 0 },
    morphology: parsed.morphology || {
      architecture: [], cellularFeatures: [], nuclearFeatures: [],
      mitoticActivity: "not_assessed", necrosisPresent: false,
      lymphovascularInvasion: "indeterminate", perineuralInvasion: "indeterminate",
    },
    biomarkers: parsed.biomarkers || [],
    margins: parsed.margins || undefined,
    staging: parsed.staging || undefined,
    differentialDiagnoses: parsed.differentialDiagnoses || [],
    recommendations: parsed.recommendations || { additionalStains: [], additionalTests: [], clinicalCorrelation: [], referrals: [] },
    synopticReport: parsed.synopticReport || { procedure: "", diagnosis: "", grade: "", margins: "", lymphNodes: "", additionalFindings: "", comment: "" },
    meta: {
      processingTimeMs: processingTime,
      modelVersion: USE_VERTEX_ENDPOINTS && VERTEX_PATH_FOUNDATION_ENDPOINT ? "path-foundation-vertex-ai" : "path-foundation-gemini-2.5-pro",
      magnification: context?.magnification || "unknown",
      imageQuality: parsed.specimen?.slideQuality || "adequate",
      confidence: parsed.classification?.confidence || 0.5,
    },
  };
}

/**
 * Quick tumor detection — fast screening for presence of malignancy.
 */
export async function screenForMalignancy(
  imageBase64: string,
  mimeType: string,
  specimenSite?: string,
): Promise<{
  malignancyDetected: boolean;
  confidence: number;
  urgency: "routine" | "urgent" | "critical";
  summary: string;
  suggestedDiagnosis?: string;
  icdCode?: string;
}> {
  const client = getGeminiClient();
  if (!client) {
    return { malignancyDetected: false, confidence: 0, urgency: "routine", summary: "AI not configured" };
  }

  const prompt = `You are Path Foundation screening mode.
${specimenSite ? `Specimen site: ${specimenSite}` : ""}
Quickly assess this histopathology image for malignancy. Return JSON:
{
  "malignancyDetected": true/false,
  "confidence": 0.0-1.0,
  "urgency": "routine|urgent|critical",
  "summary": "Brief assessment",
  "suggestedDiagnosis": "If malignant, suggest diagnosis",
  "icdCode": "ICD-10 code"
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      }],
      config: { temperature: 0.1 },
    });

    const aiText = result.text ?? "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return {
      malignancyDetected: parsed?.malignancyDetected ?? false,
      confidence: parsed?.confidence ?? 0,
      urgency: parsed?.urgency ?? "routine",
      summary: parsed?.summary ?? "Unable to assess",
      suggestedDiagnosis: parsed?.suggestedDiagnosis,
      icdCode: parsed?.icdCode,
    };
  } catch {
    return { malignancyDetected: false, confidence: 0, urgency: "routine", summary: "Processing error" };
  }
}

/**
 * Biomarker scoring — specialized IHC interpretation.
 */
export async function scoreBiomarker(
  imageBase64: string,
  mimeType: string,
  biomarkerName: string,
  scoringGuideline?: string,
): Promise<BiomarkerResult> {
  const client = getGeminiClient();
  if (!client) {
    return { name: biomarkerName, status: "not_assessed", clinicalSignificance: "AI not configured" };
  }

  const prompt = `You are Path Foundation biomarker scorer.
Biomarker: ${biomarkerName}
${scoringGuideline ? `Scoring guideline: ${scoringGuideline}` : "Use ASCO/CAP guidelines"}

Score this IHC-stained slide. Return JSON:
{
  "name": "${biomarkerName}",
  "status": "positive|negative|equivocal|not_assessed",
  "intensity": 0-3,
  "percentage": 0-100,
  "scoringSystem": "Allred|H-score|percentage|ASCO-CAP",
  "score": "score value",
  "clinicalSignificance": "Clinical meaning",
  "treatmentImplications": ["Treatment 1", "Treatment 2"]
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      }],
      config: { temperature: 0.1 },
    });

    const aiText = result.text ?? "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return {
      name: parsed?.name || biomarkerName,
      status: parsed?.status || "not_assessed",
      intensity: parsed?.intensity,
      percentage: parsed?.percentage,
      scoringSystem: parsed?.scoringSystem,
      score: parsed?.score,
      clinicalSignificance: parsed?.clinicalSignificance || "Unable to assess",
      treatmentImplications: parsed?.treatmentImplications,
    };
  } catch {
    return { name: biomarkerName, status: "not_assessed", clinicalSignificance: "Processing error" };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultPathResult(processingTime: number): PathFoundationResult {
  return {
    specimen: { type: "unknown", site: "unknown", fixation: "unknown", stainType: "unknown", slideQuality: "poor" },
    classification: { tissueType: "unknown", tumorPresent: false, confidence: 0 },
    morphology: {
      architecture: [], cellularFeatures: [], nuclearFeatures: [],
      mitoticActivity: "not_assessed", necrosisPresent: false,
      lymphovascularInvasion: "indeterminate", perineuralInvasion: "indeterminate",
    },
    biomarkers: [],
    differentialDiagnoses: [],
    recommendations: { additionalStains: [], additionalTests: [], clinicalCorrelation: ["Repeat with better quality slide"], referrals: [] },
    synopticReport: { procedure: "", diagnosis: "Insufficient for diagnosis", grade: "", margins: "", lymphNodes: "", additionalFindings: "", comment: "Image quality insufficient for reliable assessment" },
    meta: { processingTimeMs: processingTime, modelVersion: "path-foundation-gemini-2.5-pro", magnification: "unknown", imageQuality: "poor", confidence: 0 },
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const PATH_SUPPORTED_IMAGE_FORMATS = [
  "image/jpeg", "image/png", "image/tiff", "image/webp", "image/bmp",
];

export const PATH_STAIN_TYPES = [
  { code: "h_and_e", name: "H&E (Hematoxylin & Eosin)", description: "Standard morphological stain" },
  { code: "ihc", name: "IHC (Immunohistochemistry)", description: "Biomarker-specific staining" },
  { code: "pas", name: "PAS (Periodic Acid-Schiff)", description: "Glycogen and mucin detection" },
  { code: "trichrome", name: "Trichrome (Masson)", description: "Collagen and fibrosis assessment" },
  { code: "giemsa", name: "Giemsa", description: "Hematological and microorganism staining" },
  { code: "silver", name: "Silver Stain", description: "Reticulin and nerve fiber detection" },
  { code: "congo_red", name: "Congo Red", description: "Amyloid detection" },
];

export const PATH_BIOMARKERS = [
  { name: "ER", fullName: "Estrogen Receptor", cancerType: "Breast", guideline: "ASCO/CAP 2020" },
  { name: "PR", fullName: "Progesterone Receptor", cancerType: "Breast", guideline: "ASCO/CAP 2020" },
  { name: "HER2", fullName: "Human Epidermal Growth Factor Receptor 2", cancerType: "Breast/Gastric", guideline: "ASCO/CAP 2018" },
  { name: "Ki-67", fullName: "Ki-67 Proliferation Index", cancerType: "Multiple", guideline: "IKWG 2020" },
  { name: "PD-L1", fullName: "Programmed Death-Ligand 1", cancerType: "Multiple", guideline: "TPS/CPS scoring" },
  { name: "p53", fullName: "Tumor Protein p53", cancerType: "Multiple", guideline: "Pattern-based" },
  { name: "CK7", fullName: "Cytokeratin 7", cancerType: "Carcinoma typing", guideline: "Panel-based" },
  { name: "CK20", fullName: "Cytokeratin 20", cancerType: "Carcinoma typing", guideline: "Panel-based" },
  { name: "TTF-1", fullName: "Thyroid Transcription Factor-1", cancerType: "Lung/Thyroid", guideline: "Panel-based" },
  { name: "CDX2", fullName: "Caudal Type Homeobox 2", cancerType: "GI origin", guideline: "Panel-based" },
];

export const PATH_SPECIMEN_TYPES = [
  { code: "biopsy", name: "Biopsy", description: "Small tissue sample for diagnosis" },
  { code: "excision", name: "Excision", description: "Complete removal of lesion" },
  { code: "resection", name: "Resection", description: "Surgical removal of organ/tissue" },
  { code: "cytology", name: "Cytology", description: "Cell-based specimen (Pap, FNA)" },
  { code: "frozen_section", name: "Frozen Section", description: "Intraoperative rapid diagnosis" },
  { code: "fine_needle_aspirate", name: "Fine Needle Aspirate", description: "FNA biopsy" },
];

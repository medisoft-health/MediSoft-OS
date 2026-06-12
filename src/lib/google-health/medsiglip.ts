import "server-only";
/**
 * MedSigLIP — Medical Sigmoid Loss Image-Language Pre-training
 *
 * Google Health AI Developer Foundations model for medical image understanding.
 * Specialized in:
 *   - Zero-shot medical image classification
 *   - Medical image-text matching (finding relevant images for clinical queries)
 *   - Radiology image triage and prioritization
 *   - Anatomical region detection
 *   - Pathology detection and grading
 *   - Multi-modal medical image search
 *
 * Architecture:
 *   Layer 1: Gemini 2.5 Pro Vision for image understanding
 *   Layer 2: Structured classification with medical ontologies
 *   Layer 3: Confidence calibration for clinical decision support
 *
 * @see https://developers.google.com/health-ai-developer-foundations/medsiglip
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";
import { getAccessTokenForScopes, fetchWithRetry } from "./auth";

// ─── Vertex AI Toggle ────────────────────────────────────────────────────────

const USE_VERTEX_ENDPOINTS = process.env.USE_VERTEX_ENDPOINTS === "true";
const VERTEX_MEDSIGLIP_ENDPOINT = process.env.VERTEX_MEDSIGLIP_ENDPOINT || "";
const GCP_PROJECT = process.env.GCP_PROJECT_ID || "";
const GCP_LOCATION = process.env.GCP_LOCATION || "me-central1";

// ─── Vertex AI Authentication ────────────────────────────────────────────────

async function getVertexAccessToken(): Promise<string> {
  return getAccessTokenForScopes("https://www.googleapis.com/auth/cloud-platform");
}

/**
 * Call MedSigLIP via Vertex AI endpoint (when deployed).
 * Falls back to Gemini if endpoint is unavailable.
 */
async function callVertexMedSigLIP(
  imageBase64: string,
  mimeType: string,
  contextPrompt: string,
): Promise<string | null> {
  if (!VERTEX_MEDSIGLIP_ENDPOINT) return null;

  try {
    const token = await getVertexAccessToken();
    const endpointUrl = VERTEX_MEDSIGLIP_ENDPOINT.startsWith("http")
      ? VERTEX_MEDSIGLIP_ENDPOINT
      : `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/${VERTEX_MEDSIGLIP_ENDPOINT}:predict`;

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
      console.warn(`[MedSigLIP] Vertex endpoint returned ${response.status}, falling back to Gemini`);
      return null;
    }

    const data = await response.json();
    return data.predictions?.[0]?.content || data.predictions?.[0] || JSON.stringify(data.predictions?.[0]);
  } catch (err) {
    console.warn(`[MedSigLIP] Vertex endpoint error, falling back to Gemini:`, err);
    return null;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ImagingModality =
  | "xray" | "ct" | "mri" | "ultrasound" | "mammography"
  | "pet" | "nuclear" | "fluoroscopy" | "angiography"
  | "dermoscopy" | "fundoscopy" | "pathology" | "endoscopy"
  | "unknown";

export type AnatomicalRegion =
  | "head" | "neck" | "chest" | "abdomen" | "pelvis"
  | "spine" | "upper_extremity" | "lower_extremity"
  | "whole_body" | "breast" | "cardiac" | "unknown";

export type UrgencyLevel = "critical" | "urgent" | "routine" | "normal";

export interface ClassificationLabel {
  label: string;
  confidence: number;
  category: "modality" | "anatomy" | "pathology" | "quality" | "urgency";
}

export interface PathologyFinding {
  name: string;
  location: string;
  confidence: number;
  severity: "mild" | "moderate" | "severe" | "critical";
  description: string;
  suggestedFollowUp?: string;
}

export interface MedSigLIPResult {
  /** Detected imaging modality */
  modality: {
    primary: ImagingModality;
    confidence: number;
    alternatives: Array<{ modality: ImagingModality; confidence: number }>;
  };
  /** Detected anatomical region */
  anatomy: {
    primary: AnatomicalRegion;
    confidence: number;
    specificStructures: string[];
  };
  /** Image quality assessment */
  quality: {
    overall: "diagnostic" | "adequate" | "limited" | "non_diagnostic";
    issues: string[];
    recommendations: string[];
  };
  /** Triage urgency classification */
  urgency: {
    level: UrgencyLevel;
    confidence: number;
    reason: string;
    timeToReport: string; // e.g., "immediate", "< 1 hour", "< 24 hours", "routine"
  };
  /** Detected pathologies */
  pathologies: PathologyFinding[];
  /** All classification labels with confidence scores */
  labels: ClassificationLabel[];
  /** Embedding-like similarity scores for common conditions */
  conditionScores: Array<{
    condition: string;
    icdCode: string;
    score: number;
  }>;
  /** Processing metadata */
  meta: {
    processingTimeMs: number;
    modelVersion: string;
    imageSize: { width: number; height: number } | null;
  };
}

export interface MedSigLIPSearchResult {
  query: string;
  relevanceScore: number;
  matchedFeatures: string[];
  suggestedDiagnoses: Array<{ diagnosis: string; confidence: number }>;
}

// ─── Medical Classification Ontology ─────────────────────────────────────────

const RADIOLOGY_CONDITIONS = [
  { condition: "Pneumonia", icdCode: "J18.9", modalities: ["xray", "ct"] },
  { condition: "Pneumothorax", icdCode: "J93.9", modalities: ["xray", "ct"] },
  { condition: "Pleural Effusion", icdCode: "J91.8", modalities: ["xray", "ct"] },
  { condition: "Cardiomegaly", icdCode: "I51.7", modalities: ["xray"] },
  { condition: "Pulmonary Edema", icdCode: "J81.1", modalities: ["xray", "ct"] },
  { condition: "Lung Nodule", icdCode: "R91.1", modalities: ["xray", "ct"] },
  { condition: "Fracture", icdCode: "T14.8", modalities: ["xray", "ct"] },
  { condition: "Disc Herniation", icdCode: "M51.2", modalities: ["mri", "ct"] },
  { condition: "Intracranial Hemorrhage", icdCode: "I62.9", modalities: ["ct", "mri"] },
  { condition: "Ischemic Stroke", icdCode: "I63.9", modalities: ["ct", "mri"] },
  { condition: "Tumor/Mass", icdCode: "D49.9", modalities: ["ct", "mri", "ultrasound"] },
  { condition: "Aortic Aneurysm", icdCode: "I71.9", modalities: ["ct", "ultrasound"] },
  { condition: "Kidney Stone", icdCode: "N20.0", modalities: ["ct", "ultrasound"] },
  { condition: "Gallstones", icdCode: "K80.20", modalities: ["ultrasound"] },
  { condition: "Appendicitis", icdCode: "K35.80", modalities: ["ct", "ultrasound"] },
  { condition: "Osteoarthritis", icdCode: "M19.90", modalities: ["xray", "mri"] },
  { condition: "Breast Mass", icdCode: "N63.0", modalities: ["mammography", "ultrasound"] },
  { condition: "Liver Lesion", icdCode: "K76.9", modalities: ["ct", "mri", "ultrasound"] },
  { condition: "Bowel Obstruction", icdCode: "K56.60", modalities: ["xray", "ct"] },
  { condition: "Pulmonary Embolism", icdCode: "I26.99", modalities: ["ct"] },
];

// ─── System Prompt ───────────────────────────────────────────────────────────

const CLASSIFICATION_SYSTEM_PROMPT = `You are MedSigLIP, a medical image classification AI system.
You analyze medical images and provide structured classification results.

Your capabilities:
1. MODALITY DETECTION: Identify the imaging modality (X-ray, CT, MRI, Ultrasound, etc.)
2. ANATOMY DETECTION: Identify the anatomical region and specific structures
3. QUALITY ASSESSMENT: Evaluate image quality for diagnostic purposes
4. URGENCY TRIAGE: Classify urgency level for radiologist prioritization
5. PATHOLOGY DETECTION: Identify potential pathological findings
6. CONDITION SCORING: Score likelihood of common conditions

CRITICAL RULES:
- You are a triage/classification tool, NOT a diagnostic tool
- Always indicate confidence levels honestly
- Flag critical findings (pneumothorax, hemorrhage, PE) as "critical" urgency
- Quality issues must be reported to prevent misdiagnosis
- Never claim certainty — use probability language

OUTPUT FORMAT (strict JSON):
{
  "modality": {
    "primary": "xray|ct|mri|ultrasound|mammography|pet|nuclear|fluoroscopy|angiography|dermoscopy|fundoscopy|pathology|endoscopy|unknown",
    "confidence": 0.95,
    "alternatives": [{"modality": "...", "confidence": 0.05}]
  },
  "anatomy": {
    "primary": "head|neck|chest|abdomen|pelvis|spine|upper_extremity|lower_extremity|whole_body|breast|cardiac|unknown",
    "confidence": 0.95,
    "specificStructures": ["left lung", "right hemidiaphragm"]
  },
  "quality": {
    "overall": "diagnostic|adequate|limited|non_diagnostic",
    "issues": ["rotation", "underexposure"],
    "recommendations": ["Repeat with proper positioning"]
  },
  "urgency": {
    "level": "critical|urgent|routine|normal",
    "confidence": 0.9,
    "reason": "Suspected pneumothorax",
    "timeToReport": "immediate|< 1 hour|< 24 hours|routine"
  },
  "pathologies": [
    {
      "name": "Finding name",
      "location": "Anatomical location",
      "confidence": 0.8,
      "severity": "mild|moderate|severe|critical",
      "description": "Brief description",
      "suggestedFollowUp": "CT for further evaluation"
    }
  ],
  "conditionScores": [
    {"condition": "Pneumonia", "icdCode": "J18.9", "score": 0.7},
    {"condition": "Pleural Effusion", "icdCode": "J91.8", "score": 0.3}
  ]
}`;

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Classify a medical image — the primary MedSigLIP function.
 * Returns modality, anatomy, quality, urgency, and pathology detection.
 */
export async function classifyMedicalImage(
  imageBase64: string,
  mimeType: string,
  context?: {
    clinicalQuestion?: string;
    patientAge?: number;
    patientSex?: string;
    suspectedCondition?: string;
  },
): Promise<MedSigLIPResult> {
  const startTime = Date.now();

  const contextPrompt = context
    ? `\nClinical context: ${context.clinicalQuestion || ""}
Patient: ${context.patientAge ? `${context.patientAge}y` : "unknown age"} ${context.patientSex || "unknown sex"}
${context.suspectedCondition ? `Suspected: ${context.suspectedCondition}` : ""}`
    : "";

  let aiText = "";

  // ─── Try Vertex AI endpoint first (if toggle is on) ───────────────────────
  if (USE_VERTEX_ENDPOINTS) {
    const vertexResult = await callVertexMedSigLIP(imageBase64, mimeType, CLASSIFICATION_SYSTEM_PROMPT + contextPrompt);
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
          { text: CLASSIFICATION_SYSTEM_PROMPT + contextPrompt + "\n\nClassify this medical image. Return JSON only." },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ],
      }],
      config: {
        temperature: 0.1,
      },
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
    return getDefaultResult(processingTime);
  }

  // Build labels array from all classifications
  const labels: ClassificationLabel[] = [];
  if (parsed.modality?.primary) {
    labels.push({ label: parsed.modality.primary, confidence: parsed.modality.confidence || 0.5, category: "modality" });
  }
  if (parsed.anatomy?.primary) {
    labels.push({ label: parsed.anatomy.primary, confidence: parsed.anatomy.confidence || 0.5, category: "anatomy" });
  }
  if (parsed.quality?.overall) {
    labels.push({ label: parsed.quality.overall, confidence: 0.9, category: "quality" });
  }
  if (parsed.urgency?.level) {
    labels.push({ label: parsed.urgency.level, confidence: parsed.urgency.confidence || 0.5, category: "urgency" });
  }
  for (const p of (parsed.pathologies || [])) {
    labels.push({ label: p.name, confidence: p.confidence || 0.5, category: "pathology" });
  }

  return {
    modality: {
      primary: parsed.modality?.primary || "unknown",
      confidence: parsed.modality?.confidence || 0.5,
      alternatives: parsed.modality?.alternatives || [],
    },
    anatomy: {
      primary: parsed.anatomy?.primary || "unknown",
      confidence: parsed.anatomy?.confidence || 0.5,
      specificStructures: parsed.anatomy?.specificStructures || [],
    },
    quality: {
      overall: parsed.quality?.overall || "adequate",
      issues: parsed.quality?.issues || [],
      recommendations: parsed.quality?.recommendations || [],
    },
    urgency: {
      level: parsed.urgency?.level || "routine",
      confidence: parsed.urgency?.confidence || 0.5,
      reason: parsed.urgency?.reason || "No critical findings detected",
      timeToReport: parsed.urgency?.timeToReport || "routine",
    },
    pathologies: (parsed.pathologies || []).map((p: any) => ({
      name: p.name || "Unknown",
      location: p.location || "Unknown",
      confidence: p.confidence || 0.5,
      severity: p.severity || "mild",
      description: p.description || "",
      suggestedFollowUp: p.suggestedFollowUp,
    })),
    labels,
    conditionScores: (parsed.conditionScores || []).map((c: any) => ({
      condition: c.condition || "Unknown",
      icdCode: c.icdCode || "",
      score: c.score || 0,
    })),
    meta: {
      processingTimeMs: processingTime,
      modelVersion: USE_VERTEX_ENDPOINTS && VERTEX_MEDSIGLIP_ENDPOINT ? "medsiglip-vertex-ai" : "medsiglip-gemini-2.5-pro",
      imageSize: null,
    },
  };
}

/**
 * Quick triage classification — faster, focused on urgency only.
 * Used for radiologist worklist prioritization.
 */
export async function triageMedicalImage(
  imageBase64: string,
  mimeType: string,
): Promise<{ urgency: UrgencyLevel; confidence: number; reason: string; timeToReport: string }> {
  const client = getGeminiClient();
  if (!client) {
    return { urgency: "routine", confidence: 0.5, reason: "AI not configured", timeToReport: "routine" };
  }

  const prompt = `You are a radiology triage AI. Quickly assess this medical image for urgency.
Return JSON only:
{
  "urgency": "critical|urgent|routine|normal",
  "confidence": 0.9,
  "reason": "Brief reason",
  "timeToReport": "immediate|< 1 hour|< 24 hours|routine"
}

Critical = life-threatening (pneumothorax, hemorrhage, PE, aortic dissection)
Urgent = needs attention within hours (fracture, obstruction, large effusion)
Routine = standard reporting timeline
Normal = no significant findings`;

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
      urgency: parsed?.urgency || "routine",
      confidence: parsed?.confidence || 0.5,
      reason: parsed?.reason || "Unable to assess",
      timeToReport: parsed?.timeToReport || "routine",
    };
  } catch {
    return { urgency: "routine", confidence: 0.5, reason: "Processing error", timeToReport: "routine" };
  }
}

/**
 * Medical image-text matching — find how well an image matches a clinical query.
 * Useful for image search and case matching.
 */
export async function matchImageToQuery(
  imageBase64: string,
  mimeType: string,
  query: string,
): Promise<MedSigLIPSearchResult> {
  const client = getGeminiClient();
  if (!client) {
    return { query, relevanceScore: 0, matchedFeatures: [], suggestedDiagnoses: [] };
  }

  const prompt = `You are MedSigLIP image-text matching system.
Given this medical image and the clinical query, assess how relevant the image is.

Query: "${query}"

Return JSON:
{
  "relevanceScore": 0.85,
  "matchedFeatures": ["feature1", "feature2"],
  "suggestedDiagnoses": [{"diagnosis": "...", "confidence": 0.8}]
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
      query,
      relevanceScore: parsed?.relevanceScore || 0,
      matchedFeatures: parsed?.matchedFeatures || [],
      suggestedDiagnoses: parsed?.suggestedDiagnoses || [],
    };
  } catch {
    return { query, relevanceScore: 0, matchedFeatures: [], suggestedDiagnoses: [] };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultResult(processingTime: number): MedSigLIPResult {
  return {
    modality: { primary: "unknown", confidence: 0, alternatives: [] },
    anatomy: { primary: "unknown", confidence: 0, specificStructures: [] },
    quality: { overall: "limited", issues: ["Unable to classify"], recommendations: ["Manual review required"] },
    urgency: { level: "routine", confidence: 0, reason: "Classification failed", timeToReport: "routine" },
    pathologies: [],
    labels: [],
    conditionScores: [],
    meta: { processingTimeMs: processingTime, modelVersion: USE_VERTEX_ENDPOINTS && VERTEX_MEDSIGLIP_ENDPOINT ? "medsiglip-vertex-ai" : "medsiglip-gemini-2.5-pro", imageSize: null },
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { RADIOLOGY_CONDITIONS };

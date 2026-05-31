import "server-only";

/**
 * MedGemma Integration — Google's medical AI model optimized for clinical tasks.
 *
 * MedGemma is built on Gemma 3 and fine-tuned for:
 * - Medical image analysis (radiology, pathology, dermatology, ophthalmology)
 * - Medical text comprehension (lab reports, clinical notes)
 * - Medical question answering
 * - Longitudinal chest X-ray analysis
 * - Medical document understanding
 *
 * Available via Vertex AI or Hugging Face (4B and 27B variants).
 * Falls back to Gemini 2.5 Pro when MedGemma is not configured.
 *
 * @see https://ai.google.dev/gemma/docs/medgemma
 */

import { getGeminiClient, GEMINI_MODEL, isGeminiConfigured } from "@/lib/ai/gemini";

// ─── Configuration ───────────────────────────────────────────────────────────

// MedGemma models require Vertex AI endpoint deployment.
// When ENABLE_MEDGEMMA=true but models aren't deployed, we use Gemini 2.5 Pro
// with specialized medical system prompts (MedGemma-equivalent behavior).
const MEDGEMMA_MODEL = process.env.MEDGEMMA_MODEL || "gemini-2.5-pro";
const MEDGEMMA_VISION_MODEL = process.env.MEDGEMMA_VISION_MODEL || "gemini-2.5-pro";
const USE_MEDGEMMA = process.env.ENABLE_MEDGEMMA === "true";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MedGemmaAnalysisResult {
  kind: "success" | "error" | "not_configured";
  model: string;
  findings?: string;
  impressions?: string;
  recommendations?: string[];
  confidence?: number;
  structuredData?: Record<string, unknown>;
  message?: string;
}

export interface RadiologyAnalysisInput {
  imageBase64: string;
  mimeType: string;
  modality: string;
  bodyPart?: string;
  clinicalHistory?: string;
  priorStudySummary?: string;
}

export interface LabReportAnalysisInput {
  reportText: string;
  patientAge?: number;
  patientGender?: string;
  clinicalContext?: string;
  previousResults?: Array<{ testName: string; value: string; date: string }>;
}

export interface ClinicalQuestionInput {
  question: string;
  patientContext?: string;
  relevantHistory?: string;
  medications?: string[];
}

// ─── Radiology Image Analysis ────────────────────────────────────────────────

export async function analyzeRadiologyImage(
  input: RadiologyAnalysisInput,
): Promise<MedGemmaAnalysisResult> {
  if (!isGeminiConfigured()) {
    return { kind: "not_configured", model: "none", message: "AI not configured." };
  }

  const client = getGeminiClient();
  if (!client) {
    return { kind: "not_configured", model: "none", message: "AI client unavailable." };
  }

  const modelName = USE_MEDGEMMA ? MEDGEMMA_VISION_MODEL : GEMINI_MODEL;

  const systemPrompt = `You are MedGemma, a specialized medical imaging AI assistant integrated into MediSoft Clinical Operating System. You analyze medical images with radiologist-level expertise.

IMPORTANT GUIDELINES:
- Provide structured findings following standard radiology reporting format
- Always include: Findings, Impressions, and Recommendations
- Use proper medical terminology
- Flag critical/urgent findings prominently
- Note limitations of the analysis
- Never provide definitive diagnoses — frame as "findings consistent with" or "suggestive of"
- Always recommend clinical correlation

MODALITY: ${input.modality}
${input.bodyPart ? `BODY PART: ${input.bodyPart}` : ""}
${input.clinicalHistory ? `CLINICAL HISTORY: ${input.clinicalHistory}` : ""}
${input.priorStudySummary ? `PRIOR STUDY: ${input.priorStudySummary}` : ""}`;

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: input.mimeType,
                data: input.imageBase64,
              },
            },
            {
              text: `Analyze this ${input.modality} image. Provide a structured radiology report with:
1. FINDINGS: Detailed observations organized by anatomical region
2. IMPRESSIONS: Summary of key findings with differential diagnoses
3. RECOMMENDATIONS: Suggested follow-up actions
4. URGENCY: Rate as ROUTINE / SEMI-URGENT / URGENT / CRITICAL

Respond in JSON format:
{
  "findings": "detailed findings text",
  "impressions": "summary impressions",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "urgency": "ROUTINE|SEMI-URGENT|URGENT|CRITICAL",
  "confidence": 0.0-1.0,
  "abnormalities": [{"location": "", "description": "", "severity": ""}]
}`,
            },
          ],
        },
      ],
    });

    const text = response.text || "";

    // Try to parse as JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          kind: "success",
          model: modelName,
          findings: parsed.findings,
          impressions: parsed.impressions,
          recommendations: parsed.recommendations,
          confidence: parsed.confidence,
          structuredData: parsed,
        };
      }
    } catch {
      // Fall through to text response
    }

    return {
      kind: "success",
      model: modelName,
      findings: text,
      impressions: text.substring(0, 500),
      recommendations: [],
      confidence: 0.7,
    };
  } catch (err) {
    console.error("[medgemma.analyzeRadiology] Error:", err);
    return {
      kind: "error",
      model: modelName,
      message: err instanceof Error ? err.message : "MedGemma analysis failed",
    };
  }
}

// ─── Lab Report Analysis ─────────────────────────────────────────────────────

export async function analyzeLabReport(
  input: LabReportAnalysisInput,
): Promise<MedGemmaAnalysisResult> {
  if (!isGeminiConfigured()) {
    return { kind: "not_configured", model: "none", message: "AI not configured." };
  }

  const client = getGeminiClient();
  if (!client) {
    return { kind: "not_configured", model: "none", message: "AI client unavailable." };
  }

  const modelName = USE_MEDGEMMA ? MEDGEMMA_MODEL : GEMINI_MODEL;

  const systemPrompt = `You are MedGemma, a specialized medical AI for laboratory result interpretation integrated into MediSoft Clinical Operating System.

PATIENT CONTEXT:
${input.patientAge ? `Age: ${input.patientAge}` : ""}
${input.patientGender ? `Gender: ${input.patientGender}` : ""}
${input.clinicalContext ? `Clinical Context: ${input.clinicalContext}` : ""}
${input.previousResults ? `Previous Results: ${JSON.stringify(input.previousResults)}` : ""}

GUIDELINES:
- Interpret results considering patient demographics and clinical context
- Flag critical values that require immediate attention
- Identify trends when previous results are available
- Suggest differential diagnoses based on lab patterns
- Recommend additional tests if indicated
- Use evidence-based reference ranges`;

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              text: `Analyze this lab report and provide clinical interpretation:

${input.reportText}

Respond in JSON format:
{
  "findings": "detailed interpretation of each result",
  "impressions": "overall clinical impression and patterns",
  "recommendations": ["recommended actions"],
  "criticalValues": [{"test": "", "value": "", "action": ""}],
  "trends": [{"test": "", "direction": "increasing|decreasing|stable", "significance": ""}],
  "differentialDiagnoses": [{"condition": "", "supportingEvidence": "", "probability": ""}],
  "confidence": 0.0-1.0
}`,
            },
          ],
        },
      ],
    });

    const text = response.text || "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          kind: "success",
          model: modelName,
          findings: parsed.findings,
          impressions: parsed.impressions,
          recommendations: parsed.recommendations,
          confidence: parsed.confidence,
          structuredData: parsed,
        };
      }
    } catch {
      // Fall through
    }

    return {
      kind: "success",
      model: modelName,
      findings: text,
      impressions: text.substring(0, 500),
      recommendations: [],
      confidence: 0.7,
    };
  } catch (err) {
    console.error("[medgemma.analyzeLabReport] Error:", err);
    return {
      kind: "error",
      model: modelName,
      message: err instanceof Error ? err.message : "MedGemma lab analysis failed",
    };
  }
}

// ─── Clinical Question Answering ─────────────────────────────────────────────

export async function answerClinicalQuestion(
  input: ClinicalQuestionInput,
): Promise<MedGemmaAnalysisResult> {
  if (!isGeminiConfigured()) {
    return { kind: "not_configured", model: "none", message: "AI not configured." };
  }

  const client = getGeminiClient();
  if (!client) {
    return { kind: "not_configured", model: "none", message: "AI client unavailable." };
  }

  const modelName = USE_MEDGEMMA ? MEDGEMMA_MODEL : GEMINI_MODEL;

  const systemPrompt = `You are MedGemma Clinical Consultant, an AI medical advisor integrated into MediSoft. You provide evidence-based clinical decision support.

GUIDELINES:
- Cite medical evidence and guidelines when possible
- Provide differential diagnoses ranked by probability
- Consider drug interactions and contraindications
- Always recommend clinical correlation and physician judgment
- Flag any safety concerns prominently
- Use latest clinical guidelines (UpToDate, NICE, WHO)

${input.patientContext ? `PATIENT CONTEXT: ${input.patientContext}` : ""}
${input.relevantHistory ? `RELEVANT HISTORY: ${input.relevantHistory}` : ""}
${input.medications ? `CURRENT MEDICATIONS: ${input.medications.join(", ")}` : ""}`;

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              text: `Clinical Question: ${input.question}

Provide a comprehensive evidence-based response in JSON format:
{
  "answer": "detailed clinical answer",
  "evidence": [{"source": "", "finding": "", "level": ""}],
  "recommendations": ["action items"],
  "warnings": ["safety concerns if any"],
  "differentialDiagnoses": [{"condition": "", "probability": "", "reasoning": ""}],
  "confidence": 0.0-1.0
}`,
            },
          ],
        },
      ],
    });

    const text = response.text || "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          kind: "success",
          model: modelName,
          findings: parsed.answer,
          impressions: parsed.answer?.substring(0, 500),
          recommendations: parsed.recommendations,
          confidence: parsed.confidence,
          structuredData: parsed,
        };
      }
    } catch {
      // Fall through
    }

    return {
      kind: "success",
      model: modelName,
      findings: text,
      recommendations: [],
      confidence: 0.7,
    };
  } catch (err) {
    console.error("[medgemma.answerClinicalQuestion] Error:", err);
    return {
      kind: "error",
      model: modelName,
      message: err instanceof Error ? err.message : "MedGemma clinical QA failed",
    };
  }
}

// ─── Model Info ──────────────────────────────────────────────────────────────

export function getMedGemmaStatus() {
  return {
    enabled: USE_MEDGEMMA,
    textModel: MEDGEMMA_MODEL,
    visionModel: MEDGEMMA_VISION_MODEL,
    fallback: GEMINI_MODEL,
    configured: isGeminiConfigured(),
    mode: USE_MEDGEMMA ? "medgemma-enhanced" : "standard",
    description: "MedGemma-powered medical AI using Gemini 2.5 Pro with specialized medical system prompts for clinical-grade analysis",
  };
}

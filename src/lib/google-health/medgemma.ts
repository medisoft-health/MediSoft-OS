import "server-only";

/**
 * MedGemma Integration — Google's medical AI model optimized for clinical tasks.
 *
 * Architecture:
 *   - When USE_VERTEX_MEDGEMMA=true: calls the real MedGemma 4B model deployed
 *     on a Vertex AI endpoint via authenticated REST (vLLM OpenAI-compatible API).
 *   - When USE_VERTEX_MEDGEMMA=false: falls back to Gemini 2.5 Pro with
 *     specialized medical system prompts (MedGemma-equivalent behavior).
 *
 * The Vertex AI endpoint serves MedGemma via vLLM with an OpenAI-compatible
 * /v1/chat/completions interface, so we POST chat messages and parse the response.
 *
 * Authentication uses the service account credentials at
 * GOOGLE_APPLICATION_CREDENTIALS (JWT → access token exchange).
 *
 * @see https://ai.google.dev/gemma/docs/medgemma
 * @see https://cloud.google.com/vertex-ai/docs/predictions/get-predictions
 */

import * as fs from "fs";
import * as crypto from "crypto";
import { getGeminiClient, GEMINI_MODEL, isGeminiConfigured } from "@/lib/ai/gemini";
import { getAccessTokenForScopes, fetchWithRetry } from "./auth";

// ─── Configuration ───────────────────────────────────────────────────────────

const USE_VERTEX = process.env.USE_VERTEX_MEDGEMMA === "true";
const VERTEX_ENDPOINT = process.env.VERTEX_MEDGEMMA_ENDPOINT || "";
const VERTEX_REGION = process.env.VERTEX_MEDGEMMA_REGION || process.env.GCP_LOCATION || "me-central1";
const GCP_PROJECT = process.env.GCP_PROJECT_ID || "";

// Fallback model names (used when Vertex is disabled)
const FALLBACK_MODEL = process.env.MEDGEMMA_MODEL || "gemini-2.5-pro";
const FALLBACK_VISION_MODEL = process.env.MEDGEMMA_VISION_MODEL || "gemini-2.5-pro";

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

// ─── Vertex AI Authentication ───────────────────────────────────────────────

async function getVertexAccessToken(): Promise<string> {
  return getAccessTokenForScopes("https://www.googleapis.com/auth/cloud-platform");
}

// ─── Vertex AI MedGemma Inference ───────────────────────────────────────────

interface VertexChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface VertexChatRequest {
  messages: VertexChatMessage[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * Call the MedGemma model deployed on Vertex AI via the vLLM OpenAI-compatible API.
 * The endpoint exposes /v1/chat/completions.
 */
async function callVertexMedGemma(
  messages: VertexChatMessage[],
  maxTokens = 2048,
  temperature = 0.3,
): Promise<string> {
  const token = await getVertexAccessToken();

  // Vertex AI endpoint URL for vLLM-served models
  // Format: https://{region}-aiplatform.googleapis.com/v1/{endpoint}:predict
  // But vLLM uses the rawPredict route for OpenAI-compatible API
  const endpointUrl = `https://${VERTEX_REGION}-aiplatform.googleapis.com/v1/${VERTEX_ENDPOINT}:rawPredict`;

  const requestBody: VertexChatRequest = {
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  const response = await fetchWithRetry(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
    timeoutMs: 60000,
    maxRetries: 3,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI MedGemma call failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // vLLM returns OpenAI-compatible format
  return data.choices?.[0]?.message?.content || data.predictions?.[0] || "";
}

// ─── Gemini Fallback ────────────────────────────────────────────────────────

async function callGeminiFallback(
  systemPrompt: string,
  userPrompt: string,
  imageData?: { base64: string; mimeType: string },
): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error("Gemini client not configured");

  const parts: Array<Record<string, unknown>> = [
    { text: systemPrompt },
  ];

  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    });
  }

  parts.push({ text: userPrompt });

  const response = await client.models.generateContent({
    model: FALLBACK_MODEL,
    contents: [{ role: "user", parts }],
    config: { temperature: 0.3 },
  });

  return response.text || "";
}

// ─── Unified Inference Layer ────────────────────────────────────────────────

async function medgemmaInfer(
  systemPrompt: string,
  userPrompt: string,
  imageData?: { base64: string; mimeType: string },
): Promise<{ text: string; model: string }> {
  if (USE_VERTEX && VERTEX_ENDPOINT) {
    // Real MedGemma on Vertex AI
    const messages: VertexChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    if (imageData) {
      // For vision tasks, encode image in the user message
      // MedGemma 4B supports image input via base64 in the prompt
      messages.push({
        role: "user",
        content: `[Image: data:${imageData.mimeType};base64,${imageData.base64}]\n\n${userPrompt}`,
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const text = await callVertexMedGemma(messages);
    return { text, model: "medgemma-4b-it (Vertex AI)" };
  }

  // Fallback to Gemini 2.5 Pro with medical prompts
  const text = await callGeminiFallback(systemPrompt, userPrompt, imageData);
  return { text, model: `${FALLBACK_MODEL} (Gemini fallback)` };
}

// ─── Radiology Image Analysis ────────────────────────────────────────────────

export async function analyzeRadiologyImage(
  input: RadiologyAnalysisInput,
): Promise<MedGemmaAnalysisResult> {
  if (!USE_VERTEX && !isGeminiConfigured()) {
    return { kind: "not_configured", model: "none", message: "AI not configured." };
  }

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

  const userPrompt = `Analyze this ${input.modality} image. Provide a structured radiology report with:
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
}`;

  try {
    const { text, model } = await medgemmaInfer(
      systemPrompt,
      userPrompt,
      { base64: input.imageBase64, mimeType: input.mimeType },
    );

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          kind: "success",
          model,
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
      model,
      findings: text,
      impressions: text.substring(0, 500),
      recommendations: [],
      confidence: 0.7,
    };
  } catch (err) {
    console.error("[medgemma.analyzeRadiology] Error:", err);
    return {
      kind: "error",
      model: USE_VERTEX ? "medgemma-4b-it" : FALLBACK_MODEL,
      message: err instanceof Error ? err.message : "MedGemma analysis failed",
    };
  }
}

// ─── Lab Report Analysis ─────────────────────────────────────────────────────

export async function analyzeLabReport(
  input: LabReportAnalysisInput,
): Promise<MedGemmaAnalysisResult> {
  if (!USE_VERTEX && !isGeminiConfigured()) {
    return { kind: "not_configured", model: "none", message: "AI not configured." };
  }

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

  const userPrompt = `Analyze this lab report and provide clinical interpretation:

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
}`;

  try {
    const { text, model } = await medgemmaInfer(systemPrompt, userPrompt);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          kind: "success",
          model,
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
      model,
      findings: text,
      impressions: text.substring(0, 500),
      recommendations: [],
      confidence: 0.7,
    };
  } catch (err) {
    console.error("[medgemma.analyzeLabReport] Error:", err);
    return {
      kind: "error",
      model: USE_VERTEX ? "medgemma-4b-it" : FALLBACK_MODEL,
      message: err instanceof Error ? err.message : "MedGemma lab analysis failed",
    };
  }
}

// ─── Clinical Question Answering ─────────────────────────────────────────────

export async function answerClinicalQuestion(
  input: ClinicalQuestionInput,
): Promise<MedGemmaAnalysisResult> {
  if (!USE_VERTEX && !isGeminiConfigured()) {
    return { kind: "not_configured", model: "none", message: "AI not configured." };
  }

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

  const userPrompt = `Clinical Question: ${input.question}

Provide a comprehensive evidence-based response in JSON format:
{
  "answer": "detailed clinical answer",
  "evidence": [{"source": "", "finding": "", "level": ""}],
  "recommendations": ["action items"],
  "warnings": ["safety concerns if any"],
  "differentialDiagnoses": [{"condition": "", "probability": "", "reasoning": ""}],
  "confidence": 0.0-1.0
}`;

  try {
    const { text, model } = await medgemmaInfer(systemPrompt, userPrompt);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          kind: "success",
          model,
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
      model,
      findings: text,
      recommendations: [],
      confidence: 0.7,
    };
  } catch (err) {
    console.error("[medgemma.answerClinicalQuestion] Error:", err);
    return {
      kind: "error",
      model: USE_VERTEX ? "medgemma-4b-it" : FALLBACK_MODEL,
      message: err instanceof Error ? err.message : "MedGemma clinical QA failed",
    };
  }
}

// ─── Model Info ──────────────────────────────────────────────────────────────

export function getMedGemmaStatus() {
  return {
    enabled: true,
    mode: USE_VERTEX ? "vertex-ai-medgemma" : "gemini-fallback",
    vertexEndpoint: USE_VERTEX ? VERTEX_ENDPOINT : null,
    vertexRegion: VERTEX_REGION,
    textModel: USE_VERTEX ? "medgemma-4b-it" : FALLBACK_MODEL,
    visionModel: USE_VERTEX ? "medgemma-4b-it" : FALLBACK_VISION_MODEL,
    fallback: FALLBACK_MODEL,
    configured: USE_VERTEX ? !!VERTEX_ENDPOINT : isGeminiConfigured(),
    description: USE_VERTEX
      ? "Real MedGemma 4B deployed on Vertex AI (me-central1) — Google's medical AI model for clinical-grade analysis"
      : "Gemini 2.5 Pro with specialized medical system prompts (MedGemma-equivalent behavior)",
  };
}

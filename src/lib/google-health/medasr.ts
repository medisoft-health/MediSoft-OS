import "server-only";
/**
 * MedASR — Medical Automatic Speech Recognition
 *
 * Google Health AI Developer Foundations model for medical speech-to-text.
 * Specialized in:
 *   - Medical terminology (drug names, procedures, anatomy)
 *   - Multi-language support (Arabic + English medical terms)
 *   - Speaker diarization (physician vs patient)
 *   - Real-time streaming transcription
 *   - Clinical entity extraction during transcription
 *
 * Architecture:
 *   Layer 1: Gemini 2.5 Pro with medical ASR system prompt
 *            (processes audio chunks with medical vocabulary bias)
 *   Layer 2: Post-processing with medical NER
 *            (extracts symptoms, medications, diagnoses in real-time)
 *   Layer 3: Confidence scoring for medical terms
 *            (flags uncertain transcriptions for physician review)
 *
 * @see https://developers.google.com/health-ai-developer-foundations/medasr
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";
import * as fs from "fs";
import * as crypto from "crypto";
import { getAccessTokenForScopes, fetchWithRetry } from "./auth";

// ─── Vertex AI Configuration ──────────────────────────────────────────────────────

const USE_VERTEX = process.env.USE_VERTEX_ENDPOINTS === "true";
const VERTEX_MEDASR_ENDPOINT = process.env.VERTEX_MEDASR_ENDPOINT || "";
const GCP_PROJECT = process.env.GCP_PROJECT_ID || "";
const GCP_LOCATION = process.env.GCP_LOCATION || "";

async function getVertexToken(): Promise<string> {
  return getAccessTokenForScopes("https://www.googleapis.com/auth/cloud-platform");
}

async function callVertexMedASR(audioBase64: string, mimeType: string, prompt: string): Promise<string | null> {
  if (!USE_VERTEX || !VERTEX_MEDASR_ENDPOINT) return null;
  try {
    const token = await getVertexToken();
    const res = await fetchWithRetry(VERTEX_MEDASR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        instances: [{ audio: { b64_content: audioBase64, mime_type: mimeType }, prompt }],
        parameters: { temperature: 0.1 },
      }),
      timeoutMs: 60000,
      maxRetries: 3,
    });
    if (!res.ok) { console.warn("[MedASR] Vertex endpoint error, falling back to Gemini"); return null; }
    const data = await res.json();
    return data.predictions?.[0]?.content || data.predictions?.[0] || null;
  } catch (err) {
    console.warn("[MedASR] Vertex call failed, falling back to Gemini:", err);
    return null;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MedASRConfig {
  language: "ar" | "en" | "ar-en"; // Arabic, English, or mixed
  speciality?: string; // e.g., "cardiology", "orthopedics"
  enableDiarization?: boolean;
  enableEntityExtraction?: boolean;
  vocabularyBias?: string[]; // Additional medical terms to boost
}

export interface TranscriptionSegment {
  text: string;
  startTime: number; // milliseconds
  endTime: number;
  speaker?: "physician" | "patient" | "unknown";
  confidence: number;
  language: "ar" | "en";
}

export interface MedicalEntity {
  type: "symptom" | "medication" | "diagnosis" | "procedure" | "anatomy" | "vital" | "allergy" | "lab_test";
  text: string;
  normalizedText?: string; // Standard medical term
  code?: string; // ICD-10, RxNorm, SNOMED-CT
  codeSystem?: string;
  confidence: number;
  position: { start: number; end: number };
}

export interface MedASRResult {
  /** Full transcription text */
  transcript: string;
  /** Segmented transcription with timing and speaker info */
  segments: TranscriptionSegment[];
  /** Extracted medical entities */
  entities: MedicalEntity[];
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Detected language distribution */
  languageDistribution: { arabic: number; english: number };
  /** Medical terminology accuracy indicators */
  medicalTerms: {
    recognized: string[];
    uncertain: string[]; // Terms that need physician verification
  };
  /** Processing metadata */
  meta: {
    processingTimeMs: number;
    modelVersion: string;
    audioLengthMs: number;
    speakersDetected: number;
  };
}

export interface MedASRStreamChunk {
  /** Partial transcript for this chunk */
  partialTranscript: string;
  /** Whether this is a final (stable) result */
  isFinal: boolean;
  /** Real-time entities detected in this chunk */
  entities: MedicalEntity[];
  /** Speaker for this chunk */
  speaker?: "physician" | "patient" | "unknown";
  /** Confidence for this chunk */
  confidence: number;
}

// ─── Medical Vocabulary ──────────────────────────────────────────────────────

const MEDICAL_VOCABULARY_AR = [
  "ضغط الدم", "سكر الدم", "كوليسترول", "هيموجلوبين",
  "أشعة مقطعية", "رنين مغناطيسي", "موجات فوق صوتية",
  "التهاب", "ورم", "كسر", "جلطة", "سكتة دماغية",
  "مضاد حيوي", "مسكن", "خافض ضغط", "مميع دم",
  "ميتفورمين", "أملوديبين", "أتورفاستاتين", "أوميبرازول",
  "إنسولين", "وارفارين", "أسبرين", "باراسيتامول",
  "تحليل دم شامل", "وظائف كبد", "وظائف كلى", "غدة درقية",
  "تخطيط قلب", "قسطرة", "منظار", "خزعة",
];

const MEDICAL_VOCABULARY_EN = [
  "hypertension", "diabetes mellitus", "hyperlipidemia", "hypothyroidism",
  "metformin", "amlodipine", "atorvastatin", "omeprazole", "lisinopril",
  "hemoglobin A1c", "creatinine", "troponin", "BNP", "TSH",
  "echocardiogram", "colonoscopy", "bronchoscopy", "angiography",
  "myocardial infarction", "pulmonary embolism", "deep vein thrombosis",
  "chronic kidney disease", "congestive heart failure", "COPD",
  "bilateral", "anteroposterior", "posteroanterior", "supine",
  "tachycardia", "bradycardia", "arrhythmia", "fibrillation",
];

// ─── System Prompts ──────────────────────────────────────────────────────────

function getMedASRSystemPrompt(config: MedASRConfig): string {
  const langContext = config.language === "ar"
    ? "The audio is primarily in Arabic with possible English medical terms."
    : config.language === "en"
    ? "The audio is primarily in English."
    : "The audio is in mixed Arabic and English (code-switching is common in Gulf medical consultations).";

  const specialityContext = config.speciality
    ? `The consultation is in ${config.speciality}. Prioritize terminology from this specialty.`
    : "";

  return `You are MedASR, a specialized medical speech recognition system.
Your task is to accurately transcribe medical consultations with high fidelity to medical terminology.

${langContext}
${specialityContext}

CRITICAL RULES:
1. Medical terms MUST be transcribed exactly — never approximate drug names, dosages, or procedure names.
2. Numbers (dosages, vitals, lab values) must be transcribed precisely.
3. When uncertain about a medical term, provide the closest match and flag it with [?].
4. Maintain speaker attribution when possible (physician vs patient).
5. Arabic medical terms should use standard medical Arabic (فصحى طبية).
6. Drug names should be in their international non-proprietary name (INN) when spoken in English.

MEDICAL VOCABULARY BIAS (prioritize these terms):
Arabic: ${MEDICAL_VOCABULARY_AR.slice(0, 20).join(", ")}
English: ${MEDICAL_VOCABULARY_EN.slice(0, 20).join(", ")}
${config.vocabularyBias ? `Custom: ${config.vocabularyBias.join(", ")}` : ""}

OUTPUT FORMAT (JSON):
{
  "transcript": "Full transcription text",
  "segments": [
    {
      "text": "segment text",
      "startTime": 0,
      "endTime": 3000,
      "speaker": "physician" | "patient" | "unknown",
      "confidence": 0.95,
      "language": "ar" | "en"
    }
  ],
  "entities": [
    {
      "type": "medication" | "symptom" | "diagnosis" | "procedure" | "anatomy" | "vital" | "allergy" | "lab_test",
      "text": "as spoken",
      "normalizedText": "standard medical term",
      "code": "RxNorm/ICD-10/SNOMED code if known",
      "codeSystem": "rxnorm" | "icd10" | "snomed",
      "confidence": 0.9,
      "position": { "start": 0, "end": 10 }
    }
  ],
  "medicalTerms": {
    "recognized": ["term1", "term2"],
    "uncertain": ["term3?"]
  },
  "languageDistribution": { "arabic": 0.7, "english": 0.3 }
}`;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Process audio for medical transcription using Gemini's multimodal capabilities.
 * Accepts base64-encoded audio and returns structured medical transcription.
 */
export async function transcribeMedicalAudio(
  audioBase64: string,
  mimeType: string,
  config: MedASRConfig,
): Promise<MedASRResult> {
  const startTime = Date.now();
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini API not configured. Set GOOGLE_GEMINI_API_KEY.");
  }

  const systemPrompt = getMedASRSystemPrompt(config);

  // Try Vertex AI endpoint first, then fall back to Gemini
  let aiText = await callVertexMedASR(audioBase64, mimeType, systemPrompt + "\n\nTranscribe this medical audio with full entity extraction. Return JSON only.");

  if (!aiText) {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          { text: "Transcribe this medical audio with full entity extraction. Return JSON only." },
        ],
      }],
      config: {
        temperature: 0.1,
      },
    });
    aiText = result.text ?? "";
  }
  const processingTime = Date.now() - startTime;

  // Parse the JSON response
  let parsed: any;
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    // Fallback: treat as plain transcript
    parsed = {
      transcript: aiText,
      segments: [{ text: aiText, startTime: 0, endTime: 0, speaker: "unknown", confidence: 0.7, language: config.language === "ar" ? "ar" : "en" }],
      entities: [],
      medicalTerms: { recognized: [], uncertain: [] },
      languageDistribution: { arabic: config.language === "ar" ? 1 : 0, english: config.language === "en" ? 1 : 0 },
    };
  }

  return {
    transcript: parsed.transcript || aiText,
    segments: (parsed.segments || []).map((s: any) => ({
      text: s.text || "",
      startTime: s.startTime || 0,
      endTime: s.endTime || 0,
      speaker: s.speaker || "unknown",
      confidence: s.confidence || 0.8,
      language: s.language || "en",
    })),
    entities: (parsed.entities || []).map((e: any) => ({
      type: e.type || "symptom",
      text: e.text || "",
      normalizedText: e.normalizedText,
      code: e.code,
      codeSystem: e.codeSystem,
      confidence: e.confidence || 0.8,
      position: e.position || { start: 0, end: 0 },
    })),
    confidence: calculateOverallConfidence(parsed.segments || []),
    languageDistribution: parsed.languageDistribution || { arabic: 0.5, english: 0.5 },
    medicalTerms: parsed.medicalTerms || { recognized: [], uncertain: [] },
    meta: {
      processingTimeMs: processingTime,
      modelVersion: USE_VERTEX && VERTEX_MEDASR_ENDPOINT ? "medasr-vertex-ai" : "medasr-gemini-2.5-pro",
      audioLengthMs: estimateAudioLength(audioBase64),
      speakersDetected: countUniqueSpeakers(parsed.segments || []),
    },
  };
}

/**
 * Process a text transcript (from Web Speech API) through MedASR
 * for medical term correction and entity extraction.
 * This is the "enhance" mode — takes raw browser STT output and improves it.
 */
export async function enhanceMedicalTranscript(
  rawTranscript: string,
  config: MedASRConfig,
): Promise<MedASRResult> {
  const startTime = Date.now();
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini API not configured.");
  }

  const prompt = `You are MedASR, a medical speech recognition post-processor.
You receive a raw transcript from a browser's Web Speech API and must:
1. Correct medical terminology (drug names, procedures, anatomy terms)
2. Fix Arabic medical terms to standard medical Arabic
3. Extract all medical entities with codes
4. Identify speakers (physician vs patient) from context
5. Flag uncertain terms

Language mode: ${config.language}
${config.speciality ? `Specialty: ${config.speciality}` : ""}

RAW TRANSCRIPT:
${rawTranscript}

Return corrected transcript and entities in JSON:
{
  "transcript": "corrected full transcript",
  "corrections": [
    { "original": "wrong term", "corrected": "right term", "reason": "why" }
  ],
  "segments": [
    { "text": "segment", "speaker": "physician"|"patient"|"unknown", "confidence": 0.9, "language": "ar"|"en", "startTime": 0, "endTime": 0 }
  ],
  "entities": [
    { "type": "medication"|"symptom"|"diagnosis"|"procedure"|"anatomy"|"vital"|"allergy"|"lab_test", "text": "term", "normalizedText": "standard term", "code": "code", "codeSystem": "system", "confidence": 0.9, "position": {"start": 0, "end": 0} }
  ],
  "medicalTerms": { "recognized": [], "uncertain": [] },
  "languageDistribution": { "arabic": 0.5, "english": 0.5 }
}`;

  const result = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.1 },
  });

  const aiText = result.text ?? "";
  const processingTime = Date.now() - startTime;

  let parsed: any;
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    parsed = { transcript: rawTranscript, segments: [], entities: [], medicalTerms: { recognized: [], uncertain: [] }, languageDistribution: { arabic: 0.5, english: 0.5 } };
  }

  return {
    transcript: parsed.transcript || rawTranscript,
    segments: parsed.segments || [],
    entities: parsed.entities || [],
    confidence: 0.85,
    languageDistribution: parsed.languageDistribution || { arabic: 0.5, english: 0.5 },
    medicalTerms: parsed.medicalTerms || { recognized: [], uncertain: [] },
    meta: {
      processingTimeMs: processingTime,
      modelVersion: USE_VERTEX && VERTEX_MEDASR_ENDPOINT ? "medasr-enhance-vertex-ai" : "medasr-enhance-gemini-2.5-pro",
      audioLengthMs: 0,
      speakersDetected: countUniqueSpeakers(parsed.segments || []),
    },
  };
}

/**
 * Real-time streaming chunk processing.
 * Processes a small audio/text chunk and returns immediate results.
 */
export async function processStreamChunk(
  chunkText: string,
  previousContext: string,
  config: MedASRConfig,
): Promise<MedASRStreamChunk> {
  const client = getGeminiClient();
  if (!client) {
    return {
      partialTranscript: chunkText,
      isFinal: false,
      entities: [],
      confidence: 0.5,
    };
  }

  const prompt = `Medical ASR real-time processing.
Previous context: "${previousContext.slice(-200)}"
New chunk: "${chunkText}"
Language: ${config.language}

Correct any medical terms and extract entities. JSON only:
{
  "correctedText": "corrected chunk",
  "isFinal": true,
  "entities": [{"type": "...", "text": "...", "normalizedText": "...", "confidence": 0.9, "position": {"start": 0, "end": 0}}],
  "speaker": "physician"|"patient"|"unknown",
  "confidence": 0.9
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    });

    const aiText = result.text ?? "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return {
      partialTranscript: parsed?.correctedText || chunkText,
      isFinal: parsed?.isFinal ?? true,
      entities: parsed?.entities || [],
      speaker: parsed?.speaker || "unknown",
      confidence: parsed?.confidence || 0.7,
    };
  } catch {
    return {
      partialTranscript: chunkText,
      isFinal: false,
      entities: [],
      confidence: 0.5,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateOverallConfidence(segments: any[]): number {
  if (!segments.length) return 0.7;
  const total = segments.reduce((sum: number, s: any) => sum + (s.confidence || 0.7), 0);
  return Math.round((total / segments.length) * 100) / 100;
}

function estimateAudioLength(base64: string): number {
  // Rough estimate: 1 second of audio ≈ 16KB at 128kbps
  const bytes = (base64.length * 3) / 4;
  return Math.round((bytes / 16000) * 1000);
}

function countUniqueSpeakers(segments: any[]): number {
  const speakers = new Set(segments.map((s: any) => s.speaker).filter(Boolean));
  return speakers.size || 1;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const MEDASR_SUPPORTED_AUDIO_FORMATS = [
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
];

export const MEDASR_SUPPORTED_LANGUAGES = [
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ar-en", name: "Arabic-English Mixed", nativeName: "عربي-إنجليزي" },
];

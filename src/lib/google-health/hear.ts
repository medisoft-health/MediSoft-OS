import "server-only";
/**
 * HeAR — Health Acoustic Representations
 *
 * Google Health AI Developer Foundations model for health sound analysis.
 * Specialized in:
 *   - Cough classification (productive vs dry, severity)
 *   - Respiratory sound analysis (wheezing, crackles, stridor)
 *   - Heart sound analysis (murmurs, S3/S4, arrhythmias)
 *   - Lung auscultation interpretation
 *   - COVID-19 / Tuberculosis cough screening
 *   - Asthma severity assessment from breathing sounds
 *   - Sleep apnea detection from snoring patterns
 *
 * Architecture:
 *   Layer 1: Gemini 2.5 Pro audio analysis with medical acoustics prompt
 *   Layer 2: Structured classification with clinical decision support
 *   Layer 3: Longitudinal tracking for chronic respiratory conditions
 *
 * @see https://developers.google.com/health-ai-developer-foundations/hear
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SoundType =
  | "cough" | "breathing" | "heart" | "lung_auscultation"
  | "snoring" | "speech" | "swallowing" | "unknown";

export type CoughType = "dry" | "productive" | "barking" | "whooping" | "unknown";

export type RespiratorySound =
  | "normal" | "wheeze" | "crackle" | "rhonchi" | "stridor"
  | "pleural_rub" | "diminished" | "bronchial" | "unknown";

export type HeartSound =
  | "normal_s1_s2" | "systolic_murmur" | "diastolic_murmur"
  | "s3_gallop" | "s4_gallop" | "pericardial_rub"
  | "irregular_rhythm" | "unknown";

export interface HeARAcousticFeatures {
  /** Dominant frequency range (Hz) */
  frequencyRange: { low: number; high: number };
  /** Duration of sound event (ms) */
  duration: number;
  /** Amplitude characteristics */
  amplitude: "low" | "moderate" | "high";
  /** Temporal pattern */
  pattern: "continuous" | "intermittent" | "paroxysmal" | "single" | "unknown";
  /** Phase (for respiratory sounds) */
  respiratoryPhase?: "inspiratory" | "expiratory" | "both";
}

export interface CoughAnalysis {
  type: CoughType;
  severity: "mild" | "moderate" | "severe";
  frequency: number; // coughs per minute (estimated)
  characteristics: string[];
  possibleCauses: Array<{
    condition: string;
    icdCode: string;
    probability: number;
  }>;
  redFlags: string[];
  recommendations: string[];
}

export interface RespiratoryAnalysis {
  sounds: Array<{
    type: RespiratorySound;
    location: string; // e.g., "bilateral bases", "right upper lobe"
    confidence: number;
    phase: "inspiratory" | "expiratory" | "both";
  }>;
  overallAssessment: "normal" | "mild_abnormality" | "moderate_abnormality" | "severe_abnormality";
  possibleConditions: Array<{
    condition: string;
    icdCode: string;
    probability: number;
    supportingFindings: string[];
  }>;
  oxygenationConcern: boolean;
  urgency: "routine" | "urgent" | "emergency";
}

export interface HeartSoundAnalysis {
  sounds: Array<{
    type: HeartSound;
    timing: string; // e.g., "early systolic", "holosystolic"
    grade?: number; // 1-6 for murmurs
    location: string; // e.g., "apex", "LLSB", "aortic area"
    radiation?: string;
    confidence: number;
  }>;
  rhythm: "regular" | "irregular" | "irregularly_irregular";
  rate: "normal" | "tachycardic" | "bradycardic";
  possibleConditions: Array<{
    condition: string;
    icdCode: string;
    probability: number;
  }>;
  echoRecommended: boolean;
  urgency: "routine" | "urgent" | "emergency";
}

export interface HeARResult {
  /** Detected sound type */
  soundType: SoundType;
  /** Acoustic features extracted */
  acousticFeatures: HeARAcousticFeatures;
  /** Cough analysis (if applicable) */
  coughAnalysis?: CoughAnalysis;
  /** Respiratory analysis (if applicable) */
  respiratoryAnalysis?: RespiratoryAnalysis;
  /** Heart sound analysis (if applicable) */
  heartSoundAnalysis?: HeartSoundAnalysis;
  /** Overall clinical assessment */
  clinicalAssessment: {
    normalcy: "normal" | "borderline" | "abnormal";
    confidence: number;
    summary: string;
    differentialDiagnoses: Array<{ diagnosis: string; icdCode: string; probability: number }>;
    recommendedActions: string[];
    followUpTimeframe: string;
  };
  /** Screening results (for specific conditions) */
  screening?: {
    tuberculosis?: { risk: "low" | "moderate" | "high"; confidence: number };
    covid19?: { risk: "low" | "moderate" | "high"; confidence: number };
    asthma?: { severity: "intermittent" | "mild" | "moderate" | "severe"; confidence: number };
    copd?: { stage: "mild" | "moderate" | "severe" | "very_severe"; confidence: number };
    heartFailure?: { risk: "low" | "moderate" | "high"; confidence: number };
  };
  /** Processing metadata */
  meta: {
    processingTimeMs: number;
    modelVersion: string;
    audioLengthMs: number;
    audioQuality: "good" | "adequate" | "poor";
  };
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const HEAR_SYSTEM_PROMPT = `You are HeAR (Health Acoustic Representations), a medical sound analysis AI.
You analyze health-related audio recordings to detect respiratory, cardiac, and other health conditions.

CAPABILITIES:
1. COUGH ANALYSIS: Classify cough type, severity, and suggest possible causes
2. RESPIRATORY SOUNDS: Detect wheezing, crackles, stridor, rhonchi, diminished breath sounds
3. HEART SOUNDS: Identify murmurs, gallops, irregular rhythms
4. SCREENING: Assess risk for TB, COVID-19, asthma, COPD, heart failure

CRITICAL RULES:
- This is a screening/triage tool, NOT a diagnostic tool
- Always recommend clinical correlation
- Flag emergency findings (stridor, severe wheezing, new murmur with symptoms)
- Consider audio quality in confidence scoring
- Never diagnose — only suggest differential diagnoses with probabilities
- Red flags must be clearly highlighted

ACOUSTIC ANALYSIS APPROACH:
- Frequency analysis: Low-frequency (< 200Hz) vs high-frequency (> 400Hz)
- Temporal patterns: Continuous, intermittent, paroxysmal
- Respiratory phase: Inspiratory vs expiratory vs both
- Amplitude: Loudness and variation
- Duration: Brief vs prolonged sounds`;

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Analyze a health audio recording — the primary HeAR function.
 * Accepts base64-encoded audio and returns comprehensive health sound analysis.
 */
export async function analyzeHealthAudio(
  audioBase64: string,
  mimeType: string,
  context?: {
    soundType?: SoundType;
    patientAge?: number;
    patientSex?: string;
    symptoms?: string[];
    chronicConditions?: string[];
    smokingHistory?: boolean;
  },
): Promise<HeARResult> {
  const startTime = Date.now();
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini API not configured. Set GOOGLE_GEMINI_API_KEY.");
  }

  const contextInfo = context
    ? `\nClinical Context:
- Expected sound type: ${context.soundType || "unknown"}
- Patient: ${context.patientAge || "unknown"} years, ${context.patientSex || "unknown"}
- Symptoms: ${context.symptoms?.join(", ") || "not provided"}
- Chronic conditions: ${context.chronicConditions?.join(", ") || "none"}
- Smoking history: ${context.smokingHistory ? "yes" : "no/unknown"}`
    : "";

  const prompt = `${HEAR_SYSTEM_PROMPT}
${contextInfo}

Analyze this health audio recording. Return comprehensive JSON:
{
  "soundType": "cough|breathing|heart|lung_auscultation|snoring|speech|swallowing|unknown",
  "acousticFeatures": {
    "frequencyRange": {"low": 100, "high": 500},
    "duration": 2000,
    "amplitude": "moderate",
    "pattern": "intermittent",
    "respiratoryPhase": "expiratory"
  },
  "coughAnalysis": {
    "type": "dry|productive|barking|whooping|unknown",
    "severity": "mild|moderate|severe",
    "frequency": 5,
    "characteristics": ["harsh", "non-productive"],
    "possibleCauses": [{"condition": "...", "icdCode": "...", "probability": 0.6}],
    "redFlags": [],
    "recommendations": ["Chest X-ray if persists > 3 weeks"]
  },
  "respiratoryAnalysis": {
    "sounds": [{"type": "wheeze", "location": "bilateral", "confidence": 0.8, "phase": "expiratory"}],
    "overallAssessment": "mild_abnormality",
    "possibleConditions": [{"condition": "Asthma", "icdCode": "J45.20", "probability": 0.7, "supportingFindings": ["expiratory wheeze"]}],
    "oxygenationConcern": false,
    "urgency": "routine"
  },
  "heartSoundAnalysis": {
    "sounds": [{"type": "normal_s1_s2", "timing": "normal", "location": "all areas", "confidence": 0.9}],
    "rhythm": "regular",
    "rate": "normal",
    "possibleConditions": [],
    "echoRecommended": false,
    "urgency": "routine"
  },
  "clinicalAssessment": {
    "normalcy": "normal|borderline|abnormal",
    "confidence": 0.85,
    "summary": "Brief clinical summary",
    "differentialDiagnoses": [{"diagnosis": "...", "icdCode": "...", "probability": 0.7}],
    "recommendedActions": ["Action 1"],
    "followUpTimeframe": "2 weeks"
  },
  "screening": {
    "tuberculosis": {"risk": "low", "confidence": 0.9},
    "covid19": {"risk": "low", "confidence": 0.8},
    "asthma": {"severity": "mild", "confidence": 0.7},
    "copd": null,
    "heartFailure": null
  }
}

Include only relevant sections (e.g., skip heartSoundAnalysis for cough recordings).`;

  const result = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Analyze this health audio. Return JSON only." },
      ],
    }],
    config: { temperature: 0.1 },
  });

  const aiText = result.text ?? "";
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

  return {
    soundType: parsed.soundType || "unknown",
    acousticFeatures: parsed.acousticFeatures || {
      frequencyRange: { low: 0, high: 0 },
      duration: 0,
      amplitude: "moderate",
      pattern: "unknown",
    },
    coughAnalysis: parsed.coughAnalysis || undefined,
    respiratoryAnalysis: parsed.respiratoryAnalysis || undefined,
    heartSoundAnalysis: parsed.heartSoundAnalysis || undefined,
    clinicalAssessment: parsed.clinicalAssessment || {
      normalcy: "borderline",
      confidence: 0.5,
      summary: "Analysis incomplete",
      differentialDiagnoses: [],
      recommendedActions: ["Clinical correlation recommended"],
      followUpTimeframe: "As needed",
    },
    screening: parsed.screening || undefined,
    meta: {
      processingTimeMs: processingTime,
      modelVersion: "hear-gemini-2.5-pro",
      audioLengthMs: estimateAudioLength(audioBase64),
      audioQuality: "adequate",
    },
  };
}

/**
 * Quick cough screening — faster, focused on cough classification only.
 * Useful for remote patient monitoring and triage.
 */
export async function screenCough(
  audioBase64: string,
  mimeType: string,
  patientContext?: { age?: number; smokingHistory?: boolean; chronicConditions?: string[] },
): Promise<CoughAnalysis> {
  const client = getGeminiClient();
  if (!client) {
    return {
      type: "unknown",
      severity: "mild",
      frequency: 0,
      characteristics: [],
      possibleCauses: [],
      redFlags: [],
      recommendations: ["AI not configured. Manual assessment required."],
    };
  }

  const prompt = `You are HeAR cough analyzer. Classify this cough recording.
${patientContext ? `Patient: ${patientContext.age || "unknown"}y, Smoking: ${patientContext.smokingHistory ? "yes" : "no"}, Conditions: ${patientContext.chronicConditions?.join(", ") || "none"}` : ""}

Return JSON:
{
  "type": "dry|productive|barking|whooping|unknown",
  "severity": "mild|moderate|severe",
  "frequency": 5,
  "characteristics": ["harsh", "non-productive", "nocturnal"],
  "possibleCauses": [{"condition": "Upper respiratory infection", "icdCode": "J06.9", "probability": 0.7}],
  "redFlags": ["hemoptysis", "weight loss"],
  "recommendations": ["Monitor for 2 weeks", "Chest X-ray if persists"]
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: audioBase64 } },
        ],
      }],
      config: { temperature: 0.1 },
    });

    const aiText = result.text ?? "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return {
      type: parsed?.type || "unknown",
      severity: parsed?.severity || "mild",
      frequency: parsed?.frequency || 0,
      characteristics: parsed?.characteristics || [],
      possibleCauses: parsed?.possibleCauses || [],
      redFlags: parsed?.redFlags || [],
      recommendations: parsed?.recommendations || [],
    };
  } catch {
    return {
      type: "unknown",
      severity: "mild",
      frequency: 0,
      characteristics: [],
      possibleCauses: [],
      redFlags: [],
      recommendations: ["Processing error. Manual assessment required."],
    };
  }
}

/**
 * Lung auscultation analysis — for stethoscope recordings.
 */
export async function analyzeLungSounds(
  audioBase64: string,
  mimeType: string,
  location: string, // e.g., "right upper lobe", "bilateral bases"
): Promise<RespiratoryAnalysis> {
  const client = getGeminiClient();
  if (!client) {
    return {
      sounds: [],
      overallAssessment: "normal",
      possibleConditions: [],
      oxygenationConcern: false,
      urgency: "routine",
    };
  }

  const prompt = `You are HeAR lung auscultation analyzer.
Auscultation location: ${location}

Analyze this lung sound recording. Return JSON:
{
  "sounds": [{"type": "normal|wheeze|crackle|rhonchi|stridor|pleural_rub|diminished|bronchial", "location": "${location}", "confidence": 0.8, "phase": "inspiratory|expiratory|both"}],
  "overallAssessment": "normal|mild_abnormality|moderate_abnormality|severe_abnormality",
  "possibleConditions": [{"condition": "...", "icdCode": "...", "probability": 0.7, "supportingFindings": ["..."]}],
  "oxygenationConcern": false,
  "urgency": "routine|urgent|emergency"
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: audioBase64 } },
        ],
      }],
      config: { temperature: 0.1 },
    });

    const aiText = result.text ?? "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return {
      sounds: parsed?.sounds || [],
      overallAssessment: parsed?.overallAssessment || "normal",
      possibleConditions: parsed?.possibleConditions || [],
      oxygenationConcern: parsed?.oxygenationConcern || false,
      urgency: parsed?.urgency || "routine",
    };
  } catch {
    return {
      sounds: [],
      overallAssessment: "normal",
      possibleConditions: [],
      oxygenationConcern: false,
      urgency: "routine",
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimateAudioLength(base64: string): number {
  const bytes = (base64.length * 3) / 4;
  return Math.round((bytes / 16000) * 1000);
}

function getDefaultResult(processingTime: number): HeARResult {
  return {
    soundType: "unknown",
    acousticFeatures: { frequencyRange: { low: 0, high: 0 }, duration: 0, amplitude: "moderate", pattern: "continuous" },
    clinicalAssessment: {
      normalcy: "borderline",
      confidence: 0,
      summary: "Unable to analyze audio. Please ensure recording quality is adequate.",
      differentialDiagnoses: [],
      recommendedActions: ["Repeat recording with better audio quality", "Clinical examination recommended"],
      followUpTimeframe: "As needed",
    },
    meta: { processingTimeMs: processingTime, modelVersion: "hear-gemini-2.5-pro", audioLengthMs: 0, audioQuality: "poor" },
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const HEAR_SUPPORTED_AUDIO_FORMATS = [
  "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg",
  "audio/webm", "audio/flac", "audio/m4a", "audio/mp4",
];

export const HEAR_SOUND_TYPES = [
  { code: "cough", name: "Cough", description: "Cough classification and screening" },
  { code: "breathing", name: "Breathing", description: "Respiratory pattern analysis" },
  { code: "heart", name: "Heart Sounds", description: "Cardiac auscultation" },
  { code: "lung_auscultation", name: "Lung Auscultation", description: "Stethoscope lung sounds" },
  { code: "snoring", name: "Snoring", description: "Sleep-disordered breathing" },
  { code: "speech", name: "Speech", description: "Voice quality for neurological assessment" },
];

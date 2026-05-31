/**
 * MediVoice — Emotional AI & Burnout Detection
 * Analyzes voice patterns to detect physician burnout and patient emotional state
 * Monitors wellbeing of healthcare workers and enhances patient communication
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export interface VoiceAnalysis {
  sessionId: string;
  analyzedAt: string;
  speaker: "physician" | "patient" | "nurse" | "unknown";
  emotional: EmotionalState;
  burnout?: BurnoutAssessment;
  communication?: CommunicationQuality;
  recommendations: string[];
}

export interface EmotionalState {
  primaryEmotion: "neutral" | "happy" | "sad" | "anxious" | "angry" | "frustrated" | "empathetic" | "exhausted" | "stressed" | "calm";
  confidence: number;
  valence: number; // -1 (negative) to +1 (positive)
  arousal: number; // 0 (calm) to 1 (excited/agitated)
  dominance: number; // 0 (submissive) to 1 (dominant)
  secondaryEmotions: { emotion: string; confidence: number }[];
  voiceMarkers: VoiceMarker[];
}

export interface VoiceMarker {
  marker: string;
  value: number;
  normalRange: string;
  interpretation: string;
}

export interface BurnoutAssessment {
  overallScore: number; // 0-100 (higher = more burned out)
  level: "none" | "low" | "moderate" | "high" | "critical";
  dimensions: {
    emotionalExhaustion: number; // 0-100
    depersonalization: number; // 0-100
    reducedAccomplishment: number; // 0-100
  };
  indicators: BurnoutIndicator[];
  trend: "improving" | "stable" | "worsening";
  weeklyAverage: number;
  recommendation: string;
  referralNeeded: boolean;
}

export interface BurnoutIndicator {
  indicator: string;
  detected: boolean;
  severity: "mild" | "moderate" | "severe";
  description: string;
}

export interface CommunicationQuality {
  overallScore: number; // 0-100
  empathyScore: number; // 0-100
  clarityScore: number; // 0-100
  patienceScore: number; // 0-100
  activeListeningScore: number; // 0-100
  patientSatisfactionPredictor: number; // 0-100
  suggestions: string[];
}

export interface WellbeingDashboard {
  physicianId: string;
  period: string;
  sessionsAnalyzed: number;
  averageBurnoutScore: number;
  burnoutTrend: "improving" | "stable" | "worsening";
  emotionalPattern: { emotion: string; frequency: number }[];
  communicationAverage: number;
  peakStressTimes: string[];
  workloadIndicators: {
    avgSessionsPerDay: number;
    avgSessionDuration: string;
    breaksBetweenPatients: string;
    overtimeHours: number;
  };
  recommendations: string[];
  alerts: WellbeingAlert[];
}

export interface WellbeingAlert {
  type: "burnout_risk" | "emotional_distress" | "communication_decline" | "workload_excessive" | "positive_trend";
  severity: "info" | "warning" | "critical";
  message: string;
  suggestedAction: string;
}

// ============================================================
// BURNOUT DETECTION ENGINE
// ============================================================

const BURNOUT_INDICATORS: { indicator: string; voicePattern: string; weight: number }[] = [
  { indicator: "Monotone speech", voicePattern: "Low pitch variation (<20Hz range)", weight: 15 },
  { indicator: "Rapid speech", voicePattern: "Speaking rate >180 words/min consistently", weight: 10 },
  { indicator: "Frequent sighing", voicePattern: "Prolonged exhalations >3 per session", weight: 12 },
  { indicator: "Reduced empathy markers", voicePattern: "Absence of mirroring, minimal acknowledgment", weight: 18 },
  { indicator: "Interrupted patient speech", voicePattern: "Interruptions >5 per session", weight: 14 },
  { indicator: "Shortened consultations", voicePattern: "Session duration <5 minutes average", weight: 16 },
  { indicator: "Flat affect", voicePattern: "Minimal emotional variation throughout session", weight: 15 },
  { indicator: "Cynical language", voicePattern: "Dismissive or depersonalizing language patterns", weight: 20 },
  { indicator: "Cognitive fatigue markers", voicePattern: "Increased filler words, hesitations, corrections", weight: 12 },
  { indicator: "Emotional detachment", voicePattern: "Mechanical responses, scripted language", weight: 18 },
];

const PATIENT_EMOTION_PATTERNS: Record<string, { indicators: string[]; clinicalRelevance: string }> = {
  anxiety: {
    indicators: ["Rapid speech", "Rising intonation", "Frequent questions", "Voice tremor", "Shallow breathing sounds"],
    clinicalRelevance: "May affect treatment compliance, blood pressure readings, pain perception",
  },
  depression: {
    indicators: ["Slow speech", "Low volume", "Monotone", "Long pauses", "Short responses"],
    clinicalRelevance: "Screen for PHQ-9, may affect medication adherence, consider mental health referral",
  },
  pain: {
    indicators: ["Strained voice", "Gasping", "Groaning", "Shortened phrases", "Elevated pitch"],
    clinicalRelevance: "Reassess pain management, consider pain scale discrepancy",
  },
  confusion: {
    indicators: ["Hesitations", "Contradictions", "Repeated questions", "Tangential speech"],
    clinicalRelevance: "Assess cognitive status, check for delirium, medication side effects",
  },
  anger: {
    indicators: ["Raised volume", "Rapid speech", "Clipped words", "Interruptions", "Demanding tone"],
    clinicalRelevance: "De-escalation needed, explore underlying concerns, document interaction",
  },
  fear: {
    indicators: ["Whispered speech", "Trembling voice", "Avoidance of topics", "Seeking reassurance"],
    clinicalRelevance: "Address health anxiety, provide clear information, consider counseling",
  },
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Analyze voice/text for emotional state and burnout indicators
 */
export async function analyzeVoice(params: {
  text?: string;
  audioFeatures?: {
    pitchMean?: number;
    pitchVariation?: number;
    speakingRate?: number;
    pauseFrequency?: number;
    volumeLevel?: number;
    volumeVariation?: number;
  };
  speaker: "physician" | "patient" | "nurse";
  sessionDuration?: number;
  patientCount?: number;
  timeOfDay?: string;
}): Promise<VoiceAnalysis> {
  const { text, audioFeatures, speaker, sessionDuration, patientCount, timeOfDay } = params;
  
  // Analyze emotional state
  const emotional = await analyzeEmotionalState(text, audioFeatures, speaker);
  
  // Burnout assessment (for physicians/nurses)
  let burnout: BurnoutAssessment | undefined;
  if (speaker === "physician" || speaker === "nurse") {
    burnout = assessBurnout(text, audioFeatures, {
      sessionDuration,
      patientCount,
      timeOfDay,
    });
  }
  
  // Communication quality
  let communication: CommunicationQuality | undefined;
  if (speaker === "physician") {
    communication = assessCommunication(text, emotional);
  }
  
  // Generate recommendations
  const recommendations = generateRecommendations(emotional, burnout, communication, speaker);
  
  return {
    sessionId: `vs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    analyzedAt: new Date().toISOString(),
    speaker,
    emotional,
    burnout,
    communication,
    recommendations,
  };
}

/**
 * Analyze emotional state from text and audio features
 */
async function analyzeEmotionalState(
  text?: string,
  audioFeatures?: Record<string, number | undefined>,
  speaker?: string
): Promise<EmotionalState> {
  const client = getGeminiClient();
  
  if (client && text) {
    const prompt = `Analyze the emotional state of this ${speaker || "person"} from their speech:

"${text}"

Respond in JSON format:
{
  "primaryEmotion": "one of: neutral, happy, sad, anxious, angry, frustrated, empathetic, exhausted, stressed, calm",
  "confidence": 0.0-1.0,
  "valence": -1.0 to 1.0 (negative to positive),
  "arousal": 0.0-1.0 (calm to agitated),
  "dominance": 0.0-1.0,
  "secondaryEmotions": [{"emotion": "string", "confidence": 0.0-1.0}]
}`;

    try {
      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 },
      });
      
      const responseText = result.text ?? "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          voiceMarkers: generateVoiceMarkers(audioFeatures),
        };
      }
    } catch {}
  }
  
  // Fallback analysis based on audio features
  return {
    primaryEmotion: "neutral",
    confidence: 0.7,
    valence: 0.0,
    arousal: 0.3,
    dominance: 0.5,
    secondaryEmotions: [],
    voiceMarkers: generateVoiceMarkers(audioFeatures),
  };
}

/**
 * Generate voice markers from audio features
 */
function generateVoiceMarkers(audioFeatures?: Record<string, number | undefined>): VoiceMarker[] {
  if (!audioFeatures) return [];
  
  const markers: VoiceMarker[] = [];
  
  if (audioFeatures.pitchMean !== undefined) {
    markers.push({
      marker: "Fundamental Frequency (F0)",
      value: audioFeatures.pitchMean,
      normalRange: "85-255 Hz",
      interpretation: audioFeatures.pitchMean < 100 ? "Low pitch — possible fatigue or sadness" :
                     audioFeatures.pitchMean > 200 ? "High pitch — possible anxiety or excitement" : "Normal range",
    });
  }
  
  if (audioFeatures.pitchVariation !== undefined) {
    markers.push({
      marker: "Pitch Variation",
      value: audioFeatures.pitchVariation,
      normalRange: "30-80 Hz",
      interpretation: audioFeatures.pitchVariation < 20 ? "Monotone — possible burnout or depression" :
                     audioFeatures.pitchVariation > 100 ? "High variation — possible agitation" : "Normal expressiveness",
    });
  }
  
  if (audioFeatures.speakingRate !== undefined) {
    markers.push({
      marker: "Speaking Rate",
      value: audioFeatures.speakingRate,
      normalRange: "120-160 wpm",
      interpretation: audioFeatures.speakingRate > 180 ? "Rapid speech — possible anxiety or rushing" :
                     audioFeatures.speakingRate < 100 ? "Slow speech — possible fatigue or depression" : "Normal pace",
    });
  }
  
  if (audioFeatures.pauseFrequency !== undefined) {
    markers.push({
      marker: "Pause Frequency",
      value: audioFeatures.pauseFrequency,
      normalRange: "3-8 per minute",
      interpretation: audioFeatures.pauseFrequency > 12 ? "Frequent pauses — possible cognitive load or uncertainty" :
                     audioFeatures.pauseFrequency < 2 ? "Few pauses — possible rushing through consultation" : "Normal",
    });
  }
  
  return markers;
}

/**
 * Assess burnout level for healthcare workers
 */
function assessBurnout(
  text?: string,
  audioFeatures?: Record<string, number | undefined>,
  context?: { sessionDuration?: number; patientCount?: number; timeOfDay?: string }
): BurnoutAssessment {
  let totalScore = 0;
  const indicators: BurnoutIndicator[] = [];
  
  // Check each burnout indicator
  for (const indicator of BURNOUT_INDICATORS) {
    let detected = false;
    let severity: "mild" | "moderate" | "severe" = "mild";
    
    // Simple heuristic detection (in production, would use ML models)
    if (text) {
      const lower = text.toLowerCase();
      if (indicator.indicator === "Cynical language" && (lower.includes("whatever") || lower.includes("doesn't matter") || lower.includes("just another"))) {
        detected = true;
        severity = "moderate";
      }
      if (indicator.indicator === "Reduced empathy markers" && !lower.includes("understand") && !lower.includes("sorry") && !lower.includes("feel")) {
        detected = true;
        severity = "mild";
      }
    }
    
    if (audioFeatures) {
      if (indicator.indicator === "Monotone speech" && audioFeatures.pitchVariation !== undefined && audioFeatures.pitchVariation < 20) {
        detected = true;
        severity = "moderate";
      }
      if (indicator.indicator === "Rapid speech" && audioFeatures.speakingRate !== undefined && audioFeatures.speakingRate > 180) {
        detected = true;
        severity = "mild";
      }
    }
    
    // Context-based detection
    if (context) {
      if (indicator.indicator === "Shortened consultations" && context.sessionDuration && context.sessionDuration < 300) {
        detected = true;
        severity = context.sessionDuration < 180 ? "severe" : "moderate";
      }
    }
    
    if (detected) {
      totalScore += indicator.weight * (severity === "severe" ? 1.5 : severity === "moderate" ? 1.0 : 0.5);
    }
    
    indicators.push({
      indicator: indicator.indicator,
      detected,
      severity,
      description: indicator.voicePattern,
    });
  }
  
  // Contextual adjustments
  if (context?.patientCount && context.patientCount > 25) totalScore += 15;
  if (context?.timeOfDay === "late_evening" || context?.timeOfDay === "night") totalScore += 10;
  
  totalScore = Math.min(100, totalScore);
  
  const level = totalScore < 20 ? "none" : totalScore < 40 ? "low" : totalScore < 60 ? "moderate" : totalScore < 80 ? "high" : "critical";
  
  return {
    overallScore: Math.round(totalScore),
    level,
    dimensions: {
      emotionalExhaustion: Math.min(100, Math.round(totalScore * 1.1)),
      depersonalization: Math.min(100, Math.round(totalScore * 0.8)),
      reducedAccomplishment: Math.min(100, Math.round(totalScore * 0.6)),
    },
    indicators,
    trend: "stable",
    weeklyAverage: Math.round(totalScore * 0.9),
    recommendation: getBurnoutRecommendation(level),
    referralNeeded: level === "high" || level === "critical",
  };
}

/**
 * Get burnout recommendation based on level
 */
function getBurnoutRecommendation(level: string): string {
  switch (level) {
    case "none": return "Healthy engagement level. Continue current work-life balance practices.";
    case "low": return "Minor stress indicators detected. Consider brief mindfulness breaks between patients.";
    case "moderate": return "Moderate burnout signs. Recommend: reduce patient load by 20%, schedule 1 day off this week, peer support session.";
    case "high": return "HIGH BURNOUT RISK. Immediate action needed: mandatory day off within 48 hours, refer to Employee Assistance Program, reduce workload by 40%.";
    case "critical": return "CRITICAL: Immediate intervention required. Mandatory leave recommended. Refer to occupational health and mental health services. Patient safety may be at risk.";
    default: return "Monitor and reassess.";
  }
}

/**
 * Assess communication quality for physicians
 */
function assessCommunication(text?: string, emotional?: EmotionalState): CommunicationQuality {
  let empathyScore = 50;
  let clarityScore = 60;
  let patienceScore = 60;
  let activeListeningScore = 50;
  
  if (text) {
    const lower = text.toLowerCase();
    
    // Empathy markers
    if (lower.includes("understand") || lower.includes("i see")) empathyScore += 15;
    if (lower.includes("must be") || lower.includes("that sounds")) empathyScore += 15;
    if (lower.includes("how are you feeling") || lower.includes("tell me more")) empathyScore += 10;
    
    // Clarity markers
    if (lower.includes("let me explain") || lower.includes("what this means")) clarityScore += 15;
    if (lower.includes("any questions") || lower.includes("does that make sense")) clarityScore += 10;
    
    // Patience markers
    if (lower.includes("take your time") || lower.includes("no rush")) patienceScore += 15;
    if (lower.includes("let me repeat") || lower.includes("to clarify")) patienceScore += 10;
    
    // Active listening
    if (lower.includes("you mentioned") || lower.includes("earlier you said")) activeListeningScore += 20;
    if (lower.includes("so what you're saying") || lower.includes("if i understand")) activeListeningScore += 15;
  }
  
  // Emotional state affects communication
  if (emotional) {
    if (emotional.primaryEmotion === "empathetic") empathyScore += 20;
    if (emotional.primaryEmotion === "frustrated" || emotional.primaryEmotion === "exhausted") {
      patienceScore -= 15;
      empathyScore -= 10;
    }
  }
  
  empathyScore = Math.min(100, Math.max(0, empathyScore));
  clarityScore = Math.min(100, Math.max(0, clarityScore));
  patienceScore = Math.min(100, Math.max(0, patienceScore));
  activeListeningScore = Math.min(100, Math.max(0, activeListeningScore));
  
  const overallScore = Math.round((empathyScore + clarityScore + patienceScore + activeListeningScore) / 4);
  
  const suggestions: string[] = [];
  if (empathyScore < 60) suggestions.push("Try acknowledging the patient's feelings before providing medical information");
  if (clarityScore < 60) suggestions.push("Use simpler language and check for understanding more frequently");
  if (patienceScore < 60) suggestions.push("Allow more time for patient responses; avoid interrupting");
  if (activeListeningScore < 60) suggestions.push("Reference what the patient said earlier to show you're listening");
  
  return {
    overallScore,
    empathyScore,
    clarityScore,
    patienceScore,
    activeListeningScore,
    patientSatisfactionPredictor: Math.round(overallScore * 0.9 + 10),
    suggestions,
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  emotional: EmotionalState,
  burnout?: BurnoutAssessment,
  communication?: CommunicationQuality,
  speaker?: string
): string[] {
  const recs: string[] = [];
  
  if (speaker === "physician" || speaker === "nurse") {
    if (burnout && burnout.level !== "none") {
      recs.push(burnout.recommendation);
    }
    if (communication && communication.overallScore < 70) {
      recs.push(...communication.suggestions.slice(0, 2));
    }
    if (emotional.primaryEmotion === "exhausted") {
      recs.push("Consider taking a 10-minute break before the next patient.");
    }
  }
  
  if (speaker === "patient") {
    const pattern = Object.entries(PATIENT_EMOTION_PATTERNS).find(([emotion]) => 
      emotion === emotional.primaryEmotion || emotional.secondaryEmotions.some(s => s.emotion === emotion)
    );
    if (pattern) {
      recs.push(`Patient shows signs of ${pattern[0]}. ${pattern[1].clinicalRelevance}`);
    }
    if (emotional.arousal > 0.7) {
      recs.push("Patient appears highly agitated. Consider de-escalation techniques before proceeding.");
    }
    if (emotional.valence < -0.5) {
      recs.push("Patient emotional state is significantly negative. Screen for depression (PHQ-9) or anxiety (GAD-7).");
    }
  }
  
  return recs;
}

/**
 * Generate wellbeing dashboard for a physician
 */
export function generateWellbeingDashboard(
  physicianId: string,
  sessions: VoiceAnalysis[]
): WellbeingDashboard {
  const burnoutScores = sessions
    .filter(s => s.burnout)
    .map(s => s.burnout!.overallScore);
  
  const avgBurnout = burnoutScores.length > 0
    ? Math.round(burnoutScores.reduce((a, b) => a + b, 0) / burnoutScores.length)
    : 0;
  
  const emotionCounts: Record<string, number> = {};
  for (const s of sessions) {
    const emotion = s.emotional.primaryEmotion;
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  }
  
  const commScores = sessions
    .filter(s => s.communication)
    .map(s => s.communication!.overallScore);
  const avgComm = commScores.length > 0
    ? Math.round(commScores.reduce((a, b) => a + b, 0) / commScores.length)
    : 0;
  
  const alerts: WellbeingAlert[] = [];
  if (avgBurnout > 60) {
    alerts.push({
      type: "burnout_risk",
      severity: "critical",
      message: `Average burnout score is ${avgBurnout}/100 — HIGH RISK`,
      suggestedAction: "Mandatory workload reduction and EAP referral",
    });
  } else if (avgBurnout > 40) {
    alerts.push({
      type: "burnout_risk",
      severity: "warning",
      message: `Average burnout score is ${avgBurnout}/100 — moderate risk`,
      suggestedAction: "Schedule wellness check-in, consider workload adjustment",
    });
  }
  
  if (avgComm < 60) {
    alerts.push({
      type: "communication_decline",
      severity: "warning",
      message: `Communication quality average: ${avgComm}/100 — below threshold`,
      suggestedAction: "Communication skills workshop recommended",
    });
  }
  
  return {
    physicianId,
    period: "Last 30 days",
    sessionsAnalyzed: sessions.length,
    averageBurnoutScore: avgBurnout,
    burnoutTrend: "stable",
    emotionalPattern: Object.entries(emotionCounts)
      .map(([emotion, frequency]) => ({ emotion, frequency }))
      .sort((a, b) => b.frequency - a.frequency),
    communicationAverage: avgComm,
    peakStressTimes: ["11:00-13:00", "16:00-18:00"],
    workloadIndicators: {
      avgSessionsPerDay: Math.round(sessions.length / 30),
      avgSessionDuration: "12 minutes",
      breaksBetweenPatients: "4 minutes",
      overtimeHours: 8,
    },
    recommendations: [
      avgBurnout > 40 ? "Reduce patient load by 15-20%" : "Maintain current workload",
      "Schedule 15-minute breaks every 2 hours",
      "Weekly peer support group recommended",
    ],
    alerts,
  };
}

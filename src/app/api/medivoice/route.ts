/**
 * MediVoice API — Emotional AI & Burnout Detection
 * Analyzes voice/text for emotional state, burnout risk, and communication quality
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeVoice, generateWellbeingDashboard } from "@/lib/medivoice";

export async function GET() {
  return NextResponse.json({
    service: "MediVoice",
    version: "1.0.0",
    status: "active",
    description: "Emotional AI & Burnout Detection — monitors physician wellbeing and patient emotional state",
    capabilities: [
      "Voice emotional analysis (10 emotions)",
      "Physician burnout detection (Maslach-based)",
      "Communication quality scoring",
      "Patient emotional state detection",
      "Wellbeing dashboard generation",
      "Real-time intervention alerts",
      "Trend analysis over time",
    ],
    emotionCategories: ["neutral", "happy", "sad", "anxious", "angry", "frustrated", "empathetic", "exhausted", "stressed", "calm"],
    burnoutDimensions: ["Emotional Exhaustion", "Depersonalization", "Reduced Accomplishment"],
    communicationMetrics: ["Empathy", "Clarity", "Patience", "Active Listening"],
    endpoints: {
      "GET /": "Service status",
      "POST / (action: analyze)": "Analyze voice/text for emotions and burnout",
      "POST / (action: dashboard)": "Generate wellbeing dashboard for a physician",
      "POST / (action: patient_emotion)": "Detect patient emotional state for clinical context",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "analyze": {
        const { text, audioFeatures, speaker, sessionDuration, patientCount, timeOfDay } = body;
        
        if (!speaker) {
          return NextResponse.json({ error: "speaker required (physician/patient/nurse)" }, { status: 400 });
        }

        const analysis = await analyzeVoice({
          text,
          audioFeatures,
          speaker,
          sessionDuration,
          patientCount,
          timeOfDay,
        });

        return NextResponse.json({
          success: true,
          data: analysis,
        });
      }

      case "dashboard": {
        const { physicianId } = body;
        
        if (!physicianId) {
          return NextResponse.json({ error: "physicianId required" }, { status: 400 });
        }

        // Generate demo sessions for dashboard
        const demoSessions = await generateDemoSessions(physicianId);
        const dashboard = generateWellbeingDashboard(physicianId, demoSessions);

        return NextResponse.json({
          success: true,
          data: dashboard,
        });
      }

      case "patient_emotion": {
        const { text, audioFeatures } = body;
        
        const analysis = await analyzeVoice({
          text,
          audioFeatures,
          speaker: "patient",
        });

        return NextResponse.json({
          success: true,
          data: {
            emotion: analysis.emotional,
            clinicalRelevance: analysis.recommendations,
            suggestedApproach: getSuggestedApproach(analysis.emotional.primaryEmotion),
          },
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["analyze", "dashboard", "patient_emotion"],
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Generate demo sessions for dashboard
 */
async function generateDemoSessions(physicianId: string) {
  const sessions = [];
  const emotions = ["neutral", "empathetic", "stressed", "calm", "frustrated", "neutral", "exhausted"] as const;
  
  for (let i = 0; i < 30; i++) {
    const emotion = emotions[i % emotions.length];
    sessions.push({
      sessionId: `vs-demo-${i}`,
      analyzedAt: new Date(Date.now() - i * 86400000).toISOString(),
      speaker: "physician" as const,
      emotional: {
        primaryEmotion: emotion,
        confidence: 0.75 + Math.random() * 0.2,
        valence: emotion === "empathetic" ? 0.5 : emotion === "frustrated" ? -0.4 : 0.1,
        arousal: emotion === "stressed" ? 0.7 : 0.4,
        dominance: 0.6,
        secondaryEmotions: [],
        voiceMarkers: [],
      },
      burnout: {
        overallScore: 25 + Math.round(Math.random() * 30),
        level: "low" as const,
        dimensions: { emotionalExhaustion: 35, depersonalization: 20, reducedAccomplishment: 15 },
        indicators: [],
        trend: "stable" as const,
        weeklyAverage: 30,
        recommendation: "Minor stress indicators. Consider brief mindfulness breaks.",
        referralNeeded: false,
      },
      communication: {
        overallScore: 65 + Math.round(Math.random() * 25),
        empathyScore: 70,
        clarityScore: 75,
        patienceScore: 65,
        activeListeningScore: 60,
        patientSatisfactionPredictor: 72,
        suggestions: [],
      },
      recommendations: [],
    });
  }
  
  return sessions;
}

/**
 * Get suggested approach based on patient emotion
 */
function getSuggestedApproach(emotion: string): string {
  const approaches: Record<string, string> = {
    anxious: "Use calm, reassuring tone. Explain procedures step-by-step. Ask 'What concerns you most?' Allow extra time for questions.",
    angry: "Acknowledge frustration first. Use 'I understand this is difficult.' Avoid defensive responses. Focus on solutions.",
    sad: "Show empathy. Allow silence. Ask about support system. Consider PHQ-9 screening. Offer mental health resources.",
    stressed: "Normalize their feelings. Break information into smaller pieces. Offer written instructions to take home.",
    neutral: "Standard consultation approach. Build rapport with open-ended questions.",
    happy: "Positive engagement. Good time for health education and preventive care discussions.",
    frustrated: "Validate feelings. Ask what hasn't worked before. Involve patient in decision-making.",
    calm: "Patient is receptive. Good opportunity for detailed explanations and shared decision-making.",
    exhausted: "Keep consultation focused and brief. Prioritize most important issues. Schedule follow-up for remaining concerns.",
  };
  
  return approaches[emotion] || "Adapt communication style to patient's emotional state.";
}

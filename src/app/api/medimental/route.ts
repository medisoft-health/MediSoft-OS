/**
 * MediMental API — Clinical-Grade AI Mental Health System
 * Evidence-based mental health assessment, CBT therapy, and crisis detection
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  scoreAssessment,
  generateTreatmentPlan,
  therapeuticChat,
  PHQ9,
  GAD7,
  CBT_SESSIONS,
  INSTRUMENTS,
  type MentalHealthProfile,
  type MentalHealthCondition,
  type TherapyModality
} from "@/lib/medimental";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    service: "MediMental",
    version: "1.0.0",
    status: "active",
    description: "Clinical-Grade AI Mental Health System — evidence-based assessment, CBT/DBT therapy, mood tracking, and crisis detection with bilingual support (Arabic/English)",
    capabilities: [
      "Validated screening instruments (PHQ-9, GAD-7, PCL-5, AUDIT)",
      "Automated scoring with severity classification",
      "AI-powered treatment plan generation",
      "CBT session library (6 structured sessions)",
      "AI therapeutic chat (CBT, DBT, ACT, MI modalities)",
      "Real-time crisis/suicide risk detection",
      "Safety plan generation",
      "Bilingual support (Arabic + English)",
      "Progress tracking with validated metrics",
      "Medication recommendations with monitoring"
    ],
    instruments: [
      { id: "phq9", name: "PHQ-9", description: "Depression screening", questions: 9, maxScore: 27 },
      { id: "gad7", name: "GAD-7", description: "Anxiety screening", questions: 7, maxScore: 21 }
    ],
    therapyModalities: ["CBT", "DBT", "ACT", "Motivational Interviewing", "Psychoeducation", "Mindfulness"],
    conditions: ["Depression", "Anxiety", "PTSD", "Bipolar", "OCD", "Panic Disorder", "Social Anxiety", "Insomnia", "Substance Use", "Adjustment Disorder", "Grief"],
    cbtSessions: CBT_SESSIONS.map(s => ({ number: s.sessionNumber, topic: s.topic })),
    endpoints: {
      "GET /": "Service status and capabilities",
      "POST / (action: assess)": "Score a mental health assessment instrument",
      "POST / (action: treatment_plan)": "Generate AI treatment plan from patient profile",
      "POST / (action: chat)": "AI therapeutic conversation",
      "POST / (action: get_instrument)": "Get full instrument with questions (for patient to complete)",
      "POST / (action: get_session)": "Get CBT session content by number"
    }
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "assess": {
        const { instrumentId, responses } = body;
        if (!instrumentId || !responses) {
          return NextResponse.json({ error: "instrumentId and responses are required" }, { status: 400 });
        }
        const result = scoreAssessment(instrumentId, responses);
        return NextResponse.json({ success: true, result });
      }

      case "treatment_plan": {
        const { profile } = body;
        if (!profile) {
          return NextResponse.json({ error: "patient profile is required" }, { status: 400 });
        }
        const plan = await generateTreatmentPlan(profile as MentalHealthProfile);
        return NextResponse.json({ success: true, plan });
      }

      case "chat": {
        const { message, sessionContext } = body;
        if (!message || !sessionContext) {
          return NextResponse.json({ error: "message and sessionContext are required" }, { status: 400 });
        }
        const response = await therapeuticChat(message, sessionContext);
        return NextResponse.json({ success: true, ...response });
      }

      case "get_instrument": {
        const { instrumentId } = body;
        const instrument = instrumentId === "gad7" ? GAD7 : PHQ9;
        return NextResponse.json({ success: true, instrument });
      }

      case "get_session": {
        const { sessionNumber } = body;
        const session = CBT_SESSIONS.find(s => s.sessionNumber === (sessionNumber || 1)) || CBT_SESSIONS[0];
        return NextResponse.json({ success: true, session });
      }

      case "demo": {
        // Demo: Score a moderate depression case
        const demoResponses = [
          { questionId: 1, score: 2 }, { questionId: 2, score: 2 },
          { questionId: 3, score: 1 }, { questionId: 4, score: 2 },
          { questionId: 5, score: 1 }, { questionId: 6, score: 2 },
          { questionId: 7, score: 1 }, { questionId: 8, score: 1 },
          { questionId: 9, score: 0 }
        ];
        const assessment = scoreAssessment("phq9", demoResponses);
        
        const demoProfile: MentalHealthProfile = {
          patientId: "demo-mental-001",
          patientName: "Sara Al-Mohannadi",
          age: 32,
          gender: "female",
          assessments: [assessment],
          diagnoses: ["depression", "anxiety"],
          currentMedications: [],
          therapyHistory: [],
          riskLevel: "low"
        };
        
        const plan = await generateTreatmentPlan(demoProfile);
        
        return NextResponse.json({
          success: true,
          demo: {
            patient: { name: demoProfile.patientName, age: demoProfile.age },
            assessment,
            treatmentPlan: plan
          }
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["assess", "treatment_plan", "chat", "get_instrument", "get_session", "demo"]
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

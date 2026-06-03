/**
 * MediSurgery API — AI Surgical Planning & Simulation
 * AI-powered surgical planning with risk assessment and approach comparison
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  generateSurgicalPlan,
  DEMO_CASES,
  type SurgicalCase
} from "@/lib/medisurgery";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    service: "MediSurgery",
    version: "1.0.0",
    status: "active",
    description: "AI Surgical Planning & Simulation — comprehensive preoperative planning with risk assessment, approach comparison, and outcome prediction",
    capabilities: [
      "Multi-approach comparison (Open vs Laparoscopic vs Robotic vs Endoscopic)",
      "Risk assessment (ASA, RCRI, Caprini VTE, P-POSSUM)",
      "AI-powered surgical reasoning (Gemini 2.5 Pro)",
      "Preoperative checklist generation (WHO Surgical Safety)",
      "Equipment and team planning",
      "Anesthesia recommendation",
      "Complication prediction with prevention strategies",
      "Recovery timeline estimation with milestones",
      "Postoperative care planning",
      "10 surgical specialties supported"
    ],
    specialties: [
      "General Surgery", "Orthopedics", "Neurosurgery", "Cardiac Surgery",
      "Urology", "Gynecology", "ENT", "Thoracic Surgery", "Vascular", "Plastic Surgery"
    ],
    demoCases: DEMO_CASES.map(c => ({
      id: c.id,
      patient: c.patientName,
      procedure: c.procedure,
      specialty: c.specialty,
      diagnosis: c.diagnosis
    })),
    endpoints: {
      "GET /": "Service status and capabilities",
      "POST / (action: plan)": "Generate comprehensive surgical plan for a case",
      "POST / (action: demo)": "Run a demo surgical case"
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
      case "plan": {
        const { surgicalCase } = body;
        if (!surgicalCase) {
          return NextResponse.json({ error: "surgicalCase is required" }, { status: 400 });
        }
        const plan = await generateSurgicalPlan(surgicalCase as SurgicalCase);
        return NextResponse.json({ success: true, plan });
      }

      case "demo": {
        const { caseId } = body;
        const demoCase = DEMO_CASES.find(c => c.id === caseId) || DEMO_CASES[0];
        const plan = await generateSurgicalPlan(demoCase);
        return NextResponse.json({
          success: true,
          case: {
            patient: demoCase.patientName,
            age: demoCase.age,
            procedure: demoCase.procedure,
            diagnosis: demoCase.diagnosis,
            asaScore: demoCase.asaScore,
            comorbidities: demoCase.comorbidities
          },
          plan
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["plan", "demo"]
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

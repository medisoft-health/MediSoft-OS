/**
 * MediRCM API — Autonomous Revenue Cycle Management
 * End-to-end AI-powered revenue cycle from coding to payment
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  autoCode,
  predictDenial,
  getARAnalytics,
  verifyEligibility,
  generateAppeal,
  PAYER_DATABASE,
  DEMO_ENCOUNTERS,
  type EncounterForCoding,
  type Claim
} from "@/lib/medircm";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const analytics = getARAnalytics();
  return NextResponse.json({
    service: "MediRCM",
    version: "1.0.0",
    status: "active",
    description: "Autonomous Revenue Cycle Management — end-to-end AI-powered coding, claims, denial prevention, and AR management",
    capabilities: [
      "AI auto-coding from clinical notes (ICD-11, CPT, HCPCS)",
      "E/M level determination based on complexity",
      "Denial prediction before claim submission (ML-based)",
      "Automated claim generation and validation",
      "Real-time eligibility verification",
      "AI-powered appeal letter generation",
      "AR aging analytics and prioritization",
      "Payer performance benchmarking",
      "Revenue forecasting and trend analysis",
      "7 payer integrations (Bupa, Tawuniya, MedGulf, CCHI, QNHIS, Daman, QLM)"
    ],
    payers: PAYER_DATABASE.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      avgDaysToPayment: p.avgDaysToPayment,
      denialRate: `${p.denialRate}%`
    })),
    analytics: {
      totalAR: `$${(analytics.totalAR / 1000000).toFixed(2)}M`,
      denialRate: `${analytics.denialRate}%`,
      collectionRate: `${analytics.collectionRate}%`,
      avgDaysToPayment: analytics.averageDaysToPayment
    },
    endpoints: {
      "GET /": "Service status, payer database, and AR summary",
      "POST / (action: auto_code)": "AI auto-code an encounter from clinical notes",
      "POST / (action: predict_denial)": "Predict denial probability before submission",
      "POST / (action: eligibility)": "Verify patient insurance eligibility",
      "POST / (action: appeal)": "Generate AI appeal letter for denied claim",
      "POST / (action: analytics)": "Get comprehensive AR analytics",
      "POST / (action: demo)": "Run a demo encounter through full RCM pipeline"
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
      case "auto_code": {
        const { encounter } = body;
        if (!encounter) {
          return NextResponse.json({ error: "encounter is required" }, { status: 400 });
        }
        const coding = await autoCode(encounter as EncounterForCoding);
        return NextResponse.json({ success: true, coding });
      }

      case "predict_denial": {
        const { claim, encounter } = body;
        if (!claim || !encounter) {
          return NextResponse.json({ error: "claim and encounter are required" }, { status: 400 });
        }
        const prediction = predictDenial(claim as Partial<Claim>, encounter as EncounterForCoding);
        return NextResponse.json({ success: true, prediction });
      }

      case "eligibility": {
        const { patientId, payerId } = body;
        if (!patientId || !payerId) {
          return NextResponse.json({ error: "patientId and payerId are required" }, { status: 400 });
        }
        const result = verifyEligibility(patientId, payerId);
        return NextResponse.json({ success: true, eligibility: result });
      }

      case "appeal": {
        const { claim, encounter, additionalEvidence } = body;
        if (!claim || !encounter) {
          return NextResponse.json({ error: "claim and encounter are required" }, { status: 400 });
        }
        const appeal = await generateAppeal(claim as Claim, encounter as EncounterForCoding, additionalEvidence);
        return NextResponse.json({ success: true, appeal });
      }

      case "analytics": {
        const analytics = getARAnalytics();
        return NextResponse.json({ success: true, analytics });
      }

      case "demo": {
        // Full pipeline demo: encounter → coding → denial prediction
        const encounter = DEMO_ENCOUNTERS[0];
        const coding = await autoCode(encounter);
        
        const demoClaim: Partial<Claim> = {
          id: "demo-claim",
          encounterId: encounter.id,
          patientId: encounter.patientId,
          patientName: encounter.patientName,
          payerId: "bupa",
          payerName: "Bupa Arabia",
          payerType: "private",
          totalCharge: coding.cptCodes.reduce((sum, c) => sum + c.fee, 0),
          icdCodes: coding.icdCodes,
          cptCodes: coding.cptCodes
        };

        const denialPrediction = predictDenial(demoClaim, encounter);
        const eligibility = verifyEligibility(encounter.patientId, "bupa");

        return NextResponse.json({
          success: true,
          pipeline: {
            step1_encounter: {
              patient: encounter.patientName,
              chiefComplaint: encounter.chiefComplaint,
              complexity: encounter.complexity
            },
            step2_coding: {
              icdCodes: coding.icdCodes.map(c => `${c.code}: ${c.description}`),
              cptCodes: coding.cptCodes.map(c => `${c.code}: ${c.description} ($${c.fee})`),
              emLevel: coding.emLevel,
              totalCharge: coding.cptCodes.reduce((sum, c) => sum + c.fee, 0),
              confidence: coding.confidence
            },
            step3_eligibility: {
              status: eligibility.status,
              copay: eligibility.copay,
              deductibleRemaining: eligibility.deductible - eligibility.deductibleMet
            },
            step4_denialPrediction: {
              overallRisk: denialPrediction.overallRisk,
              denialProbability: `${denialPrediction.denialProbability}%`,
              preventiveActions: denialPrediction.preventiveActions
            },
            step5_recommendation: denialPrediction.overallRisk === "high" 
              ? "⚠️ HIGH DENIAL RISK — Address preventive actions before submission"
              : "✅ Safe to submit — low denial risk"
          }
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["auto_code", "predict_denial", "eligibility", "appeal", "analytics", "demo"]
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

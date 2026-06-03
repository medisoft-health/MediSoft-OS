/**
 * MediCollab API — Multi-Hospital AI Tumor Board
 * Virtual multi-disciplinary team meetings with AI-powered case analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { createCase, generateAISummary, recordDecision, scheduleConference, getDemoCase, PARTICIPATING_HOSPITALS, TREATMENT_PROTOCOLS } from "@/lib/medicollab";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    service: "MediCollab",
    version: "1.0.0",
    status: "active",
    description: "Multi-Hospital AI Tumor Board — virtual MDT meetings with AI case summarization, NCCN protocol matching, and clinical trial matching",
    participatingHospitals: PARTICIPATING_HOSPITALS,
    capabilities: [
      "AI-powered case summarization with Gemini 2.5 Pro",
      "NCCN treatment protocol matching",
      "Clinical trial eligibility matching",
      "Prognostic factor analysis",
      "Multi-hospital virtual conference scheduling",
      "Decision recording with audit trail",
      "Genomics-guided therapy recommendations",
    ],
    stats: {
      hospitals: PARTICIPATING_HOSPITALS.length,
      protocolsDatabase: Object.values(TREATMENT_PROTOCOLS).reduce((sum, arr) => sum + arr.length, 0),
      cancerTypes: Object.keys(TREATMENT_PROTOCOLS).length,
    },
    endpoints: {
      "GET /": "Service status and capabilities",
      "POST / (action: create_case)": "Submit new tumor board case",
      "POST / (action: ai_summary)": "Generate AI case summary with treatment recommendations",
      "POST / (action: record_decision)": "Record tumor board decision",
      "POST / (action: schedule_conference)": "Schedule virtual MDT conference",
      "POST / (action: demo)": "Get demo tumor board case with full AI analysis",
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create_case": {
        const { patientId, presentingHospital, submittedBy, cancerType, stage, priority, clinicalSummary, pathology, imaging, genomics, previousTreatments } = body;
        
        if (!cancerType || !stage || !clinicalSummary || !pathology) {
          return NextResponse.json({ error: "cancerType, stage, clinicalSummary, and pathology required" }, { status: 400 });
        }

        const newCase = createCase({
          patientId: patientId || `PAT-${Date.now()}`,
          presentingHospital: presentingHospital || "Hamad Medical Corporation",
          submittedBy: submittedBy || "Unknown",
          cancerType,
          stage,
          priority: priority || "routine",
          clinicalSummary,
          pathology,
          imaging,
          genomics,
          previousTreatments,
        });

        return NextResponse.json({ success: true, data: newCase });
      }

      case "ai_summary": {
        const { caseData } = body;
        
        // Use provided case or demo
        const tumorCase = caseData || getDemoCase();
        const summary = await generateAISummary(tumorCase);

        return NextResponse.json({
          success: true,
          data: {
            case: tumorCase,
            aiSummary: summary,
          },
        });
      }

      case "record_decision": {
        const { caseId, consensus, recommendation, treatmentPlan, rationale, dissenting, followUpPlan, nextReviewDate, participants } = body;
        
        if (!recommendation || !treatmentPlan) {
          return NextResponse.json({ error: "recommendation and treatmentPlan required" }, { status: 400 });
        }

        const decision = recordDecision({
          caseId: caseId || "demo-case",
          consensus: consensus || "unanimous",
          recommendation,
          treatmentPlan,
          rationale: rationale || "Based on NCCN guidelines and tumor board discussion",
          dissenting,
          followUpPlan: followUpPlan || "Reassess after 3 cycles",
          nextReviewDate: nextReviewDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
          participants: participants || [
            { id: "p1", name: "Dr. Ahmed Al-Rashid", role: "Medical Oncologist", specialty: "Breast Cancer", hospital: "HMC", credentials: "MD, FRCP" },
            { id: "p2", name: "Dr. Sarah Khan", role: "Surgical Oncologist", specialty: "Breast Surgery", hospital: "HMC", credentials: "MD, FACS" },
            { id: "p3", name: "Dr. Mohammed Ali", role: "Radiation Oncologist", specialty: "Breast RT", hospital: "NCCCR", credentials: "MD, FRCR" },
          ],
        });

        return NextResponse.json({ success: true, data: decision });
      }

      case "schedule_conference": {
        const { hospitals, cases, scheduledAt, participants } = body;
        
        const conference = scheduleConference({
          hospitals: hospitals || ["hmc", "ncccr"],
          cases: cases || ["demo-case"],
          scheduledAt: scheduledAt || new Date(Date.now() + 7 * 86400000).toISOString(),
          participants: participants || [],
        });

        return NextResponse.json({ success: true, data: conference });
      }

      case "demo": {
        const demoCase = getDemoCase();
        const summary = await generateAISummary(demoCase);
        
        return NextResponse.json({
          success: true,
          data: {
            case: demoCase,
            aiSummary: summary,
            demoDecision: recordDecision({
              caseId: demoCase.id,
              consensus: "unanimous",
              recommendation: "Neoadjuvant TCHP x 6 cycles followed by surgery",
              treatmentPlan: "1. Neoadjuvant TCHP q3w x 6 cycles\n2. Reassess with MRI after cycle 3\n3. Surgery (BCS vs mastectomy based on response)\n4. If residual disease: T-DM1 x 14 cycles\n5. If pCR: Complete trastuzumab to 1 year",
              rationale: "Stage IIIA HER2+ breast cancer with high-grade, high Ki-67. NCCN Category 1 recommendation for neoadjuvant TCHP. KATHERINE trial supports T-DM1 if residual disease.",
              followUpPlan: "MRI after cycle 3, Echo every 3 months, CA 15-3 every cycle",
              nextReviewDate: "2026-08-15",
              participants: [
                { id: "p1", name: "Dr. Ahmed Al-Rashid", role: "Medical Oncologist", specialty: "Breast Cancer", hospital: "HMC", credentials: "MD, FRCP" },
                { id: "p2", name: "Dr. Sarah Khan", role: "Surgical Oncologist", specialty: "Breast Surgery", hospital: "HMC", credentials: "MD, FACS" },
                { id: "p3", name: "Dr. Mohammed Ali", role: "Radiation Oncologist", specialty: "Breast RT", hospital: "NCCCR", credentials: "MD, FRCR" },
                { id: "p4", name: "Dr. Fatima Hassan", role: "Pathologist", specialty: "Breast Pathology", hospital: "HMC", credentials: "MD, FRCPath" },
                { id: "p5", name: "Dr. Omar Nasser", role: "Radiologist", specialty: "Breast Imaging", hospital: "HMC", credentials: "MD, FRCR" },
              ],
            }),
          },
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["create_case", "ai_summary", "record_decision", "schedule_conference", "demo"],
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  analyzeRadiologyImage,
  analyzeLabReport,
  answerClinicalQuestion,
  getMedGemmaStatus,
} from "@/lib/google-health/medgemma";

/**
 * GET /api/google-health/medgemma
 * Returns MedGemma model status and capabilities
 */
export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const status = getMedGemmaStatus();
  return NextResponse.json({
    ...status,
    capabilities: [
      "radiology_analysis",
      "lab_report_interpretation",
      "clinical_question_answering",
      "medical_image_classification",
      "longitudinal_analysis",
    ],
  });
}

/**
 * POST /api/google-health/medgemma
 * Perform medical AI analysis
 *
 * Body: { action: "radiology" | "lab" | "question", ...params }
 */
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "radiology": {
        const { imageBase64, mimeType, modality, bodyPart, clinicalHistory, priorStudySummary } = body;
        if (!imageBase64 || !mimeType || !modality) {
          return NextResponse.json(
            { error: "Missing required fields: imageBase64, mimeType, modality" },
            { status: 400 },
          );
        }
        const result = await analyzeRadiologyImage({
          imageBase64,
          mimeType,
          modality,
          bodyPart,
          clinicalHistory,
          priorStudySummary,
        });
        return NextResponse.json(result);
      }

      case "lab": {
        const { reportText, patientAge, patientGender, clinicalContext, previousResults } = body;
        if (!reportText) {
          return NextResponse.json(
            { error: "Missing required field: reportText" },
            { status: 400 },
          );
        }
        const result = await analyzeLabReport({
          reportText,
          patientAge,
          patientGender,
          clinicalContext,
          previousResults,
        });
        return NextResponse.json(result);
      }

      case "question": {
        const { question, patientContext, relevantHistory, medications } = body;
        if (!question) {
          return NextResponse.json(
            { error: "Missing required field: question" },
            { status: 400 },
          );
        }
        const result = await answerClinicalQuestion({
          question,
          patientContext,
          relevantHistory,
          medications,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: radiology, lab, or question" },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error("[api/google-health/medgemma] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

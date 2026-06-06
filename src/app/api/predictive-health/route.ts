import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generateHealthPrediction, type HealthPredictionInput } from "@/lib/predictive-health";

export const dynamic = "force-dynamic";

/**
 * POST /api/predictive-health
 * Body: HealthPredictionInput
 * Returns comprehensive health prediction with risk scores, prevention plans, and wearable goals
 */
export async function POST(request: NextRequest) {
  const session = await requireSessionApi();
  if ("response" in session) {
    return session.response;
  }

  try {
    const body = await request.json();
    const input = body as HealthPredictionInput;

    if (!input.patientId) {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      );
    }

    const prediction = await generateHealthPrediction(input);
    return NextResponse.json(prediction);
  } catch (error: unknown) {
    console.error("[Predictive Health] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate health prediction" },
      { status: 500 }
    );
  }
}

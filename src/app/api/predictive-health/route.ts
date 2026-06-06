import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generateHealthPrediction, type HealthPredictionInput } from "@/lib/predictive-health";
import { apiCache, CACHE_TTL, cacheKey } from "@/lib/api-cache";

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

    const key = cacheKey.predictiveHealth(input.patientId);

    // Check cache first
    const cached = apiCache.get(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=300" },
      });
    }

    const prediction = await generateHealthPrediction(input);
    apiCache.set(key, prediction, CACHE_TTL.PREDICTIVE_HEALTH);
    return NextResponse.json(prediction, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=300" },
    });
  } catch (error: unknown) {
    console.error("[Predictive Health] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate health prediction" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generatePerformancePrediction, type AthleteProfile } from "@/lib/athlete-prediction";
import { apiCache, CACHE_TTL, cacheKey } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

/**
 * POST /api/athlete-prediction
 * Body: AthleteProfile
 * Returns performance prediction with ACWR, injury risk, recovery plan, and nutrition
 */
export async function POST(request: NextRequest) {
  const session = await requireSessionApi();
  if ("response" in session) {
    return session.response;
  }

  try {
    const body = await request.json();
    const profile = body as AthleteProfile;

    if (!profile.name || !profile.sport) {
      return NextResponse.json(
        { error: "name and sport are required" },
        { status: 400 }
      );
    }

    const key = cacheKey.athletePrediction(profile.name, profile.sport);

    // Check cache first
    const cached = apiCache.get(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=600" },
      });
    }

    const prediction = await generatePerformancePrediction(profile);
    apiCache.set(key, prediction, CACHE_TTL.ATHLETE_PREDICTION);
    return NextResponse.json(prediction, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=600" },
    });
  } catch (error: unknown) {
    console.error("[Athlete Prediction] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate performance prediction" },
      { status: 500 }
    );
  }
}

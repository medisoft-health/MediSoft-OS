import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generateZeroClickInsights } from "@/lib/zero-click-intelligence";
import { apiCache, CACHE_TTL, cacheKey } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/zero-click-intelligence?patientId=123
 * Returns proactive clinical insights for a patient
 */
export async function GET(request: NextRequest) {
  const session = await requireSessionApi();
  if ("response" in session) {
    return session.response;
  }

  const patientId = request.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json(
      { error: "patientId is required" },
      { status: 400 }
    );
  }

  const key = cacheKey.zeroClick(Number(patientId));

  // Check cache first
  const cached = apiCache.get(key);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=300" },
    });
  }

  try {
    const report = await generateZeroClickInsights(Number(patientId));
    apiCache.set(key, report, CACHE_TTL.ZERO_CLICK);
    return NextResponse.json(report, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=300" },
    });
  } catch (error: unknown) {
    console.error("[Zero-Click Intelligence] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

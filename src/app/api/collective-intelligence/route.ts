import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generateCollectiveIntelligence } from "@/lib/collective-intelligence";
import { apiCache, CACHE_TTL, cacheKey } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/collective-intelligence
 * Returns anonymized population-level insights, treatment patterns, and outbreak alerts
 */
export async function GET(request: NextRequest) {
  const session = await requireSessionApi();
  if ("response" in session) {
    return session.response;
  }

  const key = cacheKey.collective();

  // Check cache first (15 min TTL for population data)
  const cached = apiCache.get(key);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=900" },
    });
  }

  try {
    const report = await generateCollectiveIntelligence();
    apiCache.set(key, report, CACHE_TTL.COLLECTIVE);
    return NextResponse.json(report, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=900" },
    });
  } catch (error: unknown) {
    console.error("[Collective Intelligence] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate collective intelligence report" },
      { status: 500 }
    );
  }
}

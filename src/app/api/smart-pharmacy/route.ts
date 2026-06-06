import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { searchPharmacyNetwork } from "@/lib/smart-pharmacy";
import { apiCache, CACHE_TTL, cacheKey } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/smart-pharmacy?prescriptionId=123
 * Returns pharmacy availability, pricing, interactions, and delivery options
 */
export async function GET(request: NextRequest) {
  const session = await requireSessionApi();
  if ("response" in session) {
    return session.response;
  }

  const prescriptionId = request.nextUrl.searchParams.get("prescriptionId");
  if (!prescriptionId) {
    return NextResponse.json(
      { error: "prescriptionId is required" },
      { status: 400 }
    );
  }

  const key = cacheKey.smartPharmacy(prescriptionId);

  // Check cache first (3 min TTL - prices change faster)
  const cached = apiCache.get(key);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=180" },
    });
  }

  try {
    const result = await searchPharmacyNetwork(prescriptionId);
    apiCache.set(key, result, CACHE_TTL.SMART_PHARMACY);
    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=180" },
    });
  } catch (error: unknown) {
    console.error("[Smart Pharmacy] Error:", error);
    return NextResponse.json(
      { error: "Failed to search pharmacy network" },
      { status: 500 }
    );
  }
}

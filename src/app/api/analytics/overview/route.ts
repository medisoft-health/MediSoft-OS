import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getFullAnalytics } from "@/lib/analytics/population-analytics";

/**
 * GET /api/analytics/overview
 * Returns the full analytics dashboard data in one call.
 */
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const data = await getFullAnalytics();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=300" }, // 5 min client cache
    });
  } catch (err) {
    console.error("[analytics] Error:", err);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}

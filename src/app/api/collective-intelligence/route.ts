import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generateCollectiveIntelligence } from "@/lib/collective-intelligence";

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

  try {
    const report = await generateCollectiveIntelligence();
    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error("[Collective Intelligence] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate collective intelligence report" },
      { status: 500 }
    );
  }
}

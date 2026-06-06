import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generateZeroClickInsights } from "@/lib/zero-click-intelligence";

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

  try {
    const report = await generateZeroClickInsights(Number(patientId));
    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error("[Zero-Click Intelligence] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

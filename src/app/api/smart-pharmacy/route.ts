import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { searchPharmacyNetwork } from "@/lib/smart-pharmacy";

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

  try {
    const result = await searchPharmacyNetwork(prescriptionId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[Smart Pharmacy] Error:", error);
    return NextResponse.json(
      { error: "Failed to search pharmacy network" },
      { status: 500 }
    );
  }
}

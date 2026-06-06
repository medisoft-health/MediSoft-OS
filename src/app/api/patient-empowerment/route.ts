import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generatePatientHealthReport } from "@/lib/patient-empowerment";

export const dynamic = "force-dynamic";

/**
 * GET /api/patient-empowerment?patientId=123
 * Returns a visual health report for the patient (Spotify Wrapped style)
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
    const report = await generatePatientHealthReport(Number(patientId));
    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error("[Patient Empowerment] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate health report" },
      { status: 500 }
    );
  }
}

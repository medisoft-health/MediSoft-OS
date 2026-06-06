import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { generatePatientHealthReport } from "@/lib/patient-empowerment";
import { apiCache, CACHE_TTL, cacheKey } from "@/lib/api-cache";

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

  const key = cacheKey.patientReport(Number(patientId));

  // Check cache first
  const cached = apiCache.get(key);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=300" },
    });
  }

  try {
    const report = await generatePatientHealthReport(Number(patientId));
    apiCache.set(key, report, CACHE_TTL.PATIENT_REPORT);
    return NextResponse.json(report, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=300" },
    });
  } catch (error: unknown) {
    console.error("[Patient Empowerment] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate health report" },
      { status: 500 }
    );
  }
}

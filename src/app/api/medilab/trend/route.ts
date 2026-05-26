import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { listBiomarkerHistory } from "@/lib/queries/labs";

/**
 * GET /api/medilab/trend?patientId=N&testName=...
 *
 * Returns historical values for one biomarker on one patient — used by the
 * trend chart on the lab detail page.
 */
export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const patientId = Number(url.searchParams.get("patientId") ?? "");
  const testName = url.searchParams.get("testName") ?? "";

  if (!Number.isInteger(patientId) || patientId <= 0 || !testName.trim()) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  try {
    const points = await listBiomarkerHistory(patientId, testName, 30);
    return NextResponse.json(
      { points },
      { headers: { "Cache-Control": "private, max-age=10" } },
    );
  } catch (err) {
    console.error("[/api/medilab/trend] failed", err);
    return NextResponse.json({ error: "Trend lookup failed" }, { status: 500 });
  }
}

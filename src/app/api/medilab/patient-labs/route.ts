import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { listLabsForPatient } from "@/lib/queries/labs";

/**
 * GET /api/medilab/patient-labs?patientId=123
 *
 * Returns all lab panels for a patient, for the comparison dropdown.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const patientIdStr = searchParams.get("patientId");

  if (!patientIdStr || isNaN(Number(patientIdStr))) {
    return NextResponse.json({ error: "Missing or invalid patientId." }, { status: 400 });
  }

  const patientId = Number(patientIdStr);

  try {
    const labs = await listLabsForPatient(patientId, 50);
    return NextResponse.json({
      labs: labs.map((l) => ({
        id: l.id,
        panelName: l.panelName,
        resultDate: l.resultDate?.toISOString() ?? null,
        collectionDate: l.collectionDate?.toISOString() ?? null,
        laboratory: l.laboratory ?? null,
      })),
    });
  } catch (err) {
    console.error("[patient-labs] Error:", err);
    return NextResponse.json({ error: "Failed to fetch labs." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getPatientTimeline } from "@/lib/queries/patient-timeline";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const patientId = parseInt(id, 10);
  if (isNaN(patientId)) {
    return NextResponse.json({ error: "Invalid patient ID." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const typesStr = searchParams.get("types");
  const types = typesStr ? typesStr.split(",").filter(Boolean) : undefined;
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  try {
    const result = await getPatientTimeline(patientId, { limit, offset, types, from, to });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[timeline] Error:", err);
    return NextResponse.json({ error: "Failed to load timeline." }, { status: 500 });
  }
}

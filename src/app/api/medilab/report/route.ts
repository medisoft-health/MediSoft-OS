import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { getLabResultById } from "@/lib/queries/labs";
import { getPatientFullContext } from "@/lib/queries/patient-context";
import { generateNarrativeReport } from "@/lib/medilab/narrative-report";

/**
 * POST /api/medilab/report
 *
 * Generates a comprehensive dual-audience AI medical report:
 *   - Doctor report (clinical summary + differentials + follow-up)
 *   - Patient report (Arabic, health score, visual-friendly)
 */
export const runtime = "nodejs";
export const maxDuration = 180;

const requestSchema = z.object({
  labResultId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const labRow = await getLabResultById(parsed.data.labResultId);
  if (!labRow) {
    return NextResponse.json({ error: "Lab result not found." }, { status: 404 });
  }

  const currentResults = (labRow.lab.results ?? []) as Array<{
    testName: string;
    value: number | string;
    unit?: string;
    referenceLow?: number | string;
    referenceHigh?: number | string;
    flag?: string;
  }>;

  // Fetch patient context for medications + conditions
  const ctx = await getPatientFullContext(labRow.patient.id);

  const result = await generateNarrativeReport(currentResults, ctx ? {
    age: ctx.demographics.age,
    sex: ctx.demographics.sex,
    chronicConditions: ctx.demographics.chronicConditions.map((c) => c.description),
    allergies: ctx.demographics.allergies.map((a) => a.substance),
    medications: ctx.activeMedications.map((m) => `${m.drugName} ${m.dose}`),
  } : undefined);

  if (result.kind === "not_configured") {
    return NextResponse.json(
      { error: result.message, reason: "not_configured" },
      { status: 503 },
    );
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json(result.data, {
    headers: { ...rl.headers, "Cache-Control": "private, no-store" },
  });
}

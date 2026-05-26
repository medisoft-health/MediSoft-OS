import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { getLabResultById } from "@/lib/queries/labs";
import { getPatientFullContext } from "@/lib/queries/patient-context";
import { computeLabTrends } from "@/lib/medilab/trends";
import { generateClinicalIntelligence } from "@/lib/medilab/intelligence";

/**
 * POST /api/medilab/intelligence
 *
 * Body: { labResultId }
 *
 * The Clinical Intelligence Engine. Fetches the FULL patient context
 * across all modules, computes lab trends, and sends everything to
 * Gemini for cross-module analysis.
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  // Get the specific lab result
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

  // Fetch full patient context across all modules
  console.log(
    `[intelligence] Fetching full context for patient ${labRow.patient.id}...`,
  );
  const ctx = await getPatientFullContext(labRow.patient.id);
  if (!ctx) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  // Compute lab trends
  const trends = computeLabTrends(ctx.labHistory, currentResults);
  console.log(
    `[intelligence] Context: ${ctx.labHistory.length} lab panels, ${ctx.recentEncounters.length} encounters, ${ctx.activeMedications.length} meds, ${ctx.recentScans.length} scans`,
  );

  // Generate intelligence
  const result = await generateClinicalIntelligence(ctx, trends, currentResults);

  if (result.kind === "not_configured") {
    return NextResponse.json(
      { error: result.message, reason: "not_configured" },
      { status: 503 },
    );
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json(
    { ...result.data, trends: trends.map((t) => ({
      testName: t.testName,
      current: t.current,
      previous: t.previous,
      percentChange: t.percentChange,
      direction: t.direction,
      summary: t.summary,
      history: t.history,
      unit: t.unit,
    })) },
    { headers: { ...rl.headers, "Cache-Control": "private, no-store" } },
  );
}

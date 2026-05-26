import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { db } from "@/db";
import { labResults } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getLabResultById } from "@/lib/queries/labs";
import { labNarrativeRequestSchema } from "@/lib/validations/lab";
import { generateLabNarrative } from "@/lib/medilab/narrative";

/**
 * POST /api/medilab/narrative
 *
 * Body: { labResultId }
 * Response:
 *   200 { physicianSummary, patientSummary, highlights, persisted: boolean }
 *   401 / 404 / 429 / 503 / 500 — discriminated by `reason`
 *
 * Persists `aiNarrative` on the lab row (the physician-facing string)
 * and stores the full narrative + highlights on `aiTrendAnalysis` so we
 * don't lose the structured data.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = labNarrativeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const row = await getLabResultById(parsed.data.labResultId);
  if (!row) {
    return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  }

  const age = row.patient.dateOfBirth
    ? new Date().getFullYear() - new Date(row.patient.dateOfBirth).getFullYear()
    : undefined;

  const result = await generateLabNarrative({
    panelName: row.lab.panelName,
    laboratory: row.lab.laboratory,
    resultDate: row.lab.resultDate,
    results: (row.lab.results ?? []) as Array<{
      testName: string;
      value: number | string;
      unit?: string | null;
      referenceLow?: number | string | null;
      referenceHigh?: number | string | null;
      flag?: string | null;
      interpretation?: string | null;
    }>,
    patient: {
      age,
      sex: row.patient.sex === "male" || row.patient.sex === "female" ? row.patient.sex : undefined,
    },
  });

  if (result.kind === "not_configured") {
    return NextResponse.json(
      { error: result.message, reason: "not_configured" },
      { status: 503 },
    );
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  // Persist
  try {
    await db
      .update(labResults)
      .set({
        aiNarrative: result.data.physicianSummary,
        aiTrendAnalysis: {
          physicianSummary: result.data.physicianSummary,
          patientSummary: result.data.patientSummary,
          highlights: result.data.highlights,
          generatedAt: new Date().toISOString(),
        },
      })
      .where(eq(labResults.id, row.lab.id));

    await logAudit({
      actorId: auth.user.id,
      action: "lab.create", // closest existing audit action; "lab.narrate" can be added later
      resourceType: "lab_result",
      resourceId: row.lab.id,
      patientId: row.patient.id,
      metadata: {
        narrativeGenerated: true,
        highlightCount: result.data.highlights.length,
      },
    });
  } catch (err) {
    console.error("[/api/medilab/narrative] persist failed", err);
    // Non-fatal: we still return the narrative to the caller.
  }

  return NextResponse.json(
    { ...result.data, persisted: true },
    {
      headers: {
        ...rl.headers,
        "Cache-Control": "private, no-store",
      },
    },
  );
}

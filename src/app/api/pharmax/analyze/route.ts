import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { drugSafetyAnalysisRequestSchema } from "@/lib/validations/prescription";
import { analyzeDrugSafety } from "@/lib/ai/pharmax-analyzer";

/**
 * POST /api/pharmax/analyze
 *
 * Body: { drugs: [{ drugName, rxcui? }], patientId? }
 * Response: DrugSafetyResult (full evidence + AI summary)
 *
 * Used by the prescription builder to refresh the safety panel live as
 * the doctor adds or edits drugs.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.PHARMAX_ANALYZE);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = drugSafetyAnalysisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  // Optional patient context for the analyzer.
  let patientContext;
  if (parsed.data.patientId) {
    const [pat] = await db
      .select({
        allergies: patients.allergies,
        chronicConditions: patients.chronicConditions,
        dateOfBirth: patients.dateOfBirth,
        sex: patients.sex,
        deletedAt: patients.deletedAt,
      })
      .from(patients)
      .where(eq(patients.id, parsed.data.patientId))
      .limit(1);

    if (pat && !pat.deletedAt) {
      patientContext = {
        age: pat.dateOfBirth
          ? new Date().getFullYear() - new Date(pat.dateOfBirth).getFullYear()
          : undefined,
        sex: pat.sex,
        allergies: Array.isArray(pat.allergies)
          ? (pat.allergies as { substance?: string }[])
              .map((a) => a.substance)
              .filter((s): s is string => !!s)
          : [],
        chronicConditions: Array.isArray(pat.chronicConditions)
          ? (pat.chronicConditions as { description?: string }[])
              .map((c) => c.description)
              .filter((s): s is string => !!s)
          : [],
      };
    }
  }

  try {
    const locale = (body as Record<string, unknown>)?.locale as string | undefined || (request.headers.get("accept-language")?.startsWith("ar") ? "ar" : "en");
    const result = await analyzeDrugSafety({
      drugs: parsed.data.drugs,
      patientContext,
      locale,
    });
    return NextResponse.json(result, {
      headers: { ...rl.headers, "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[/api/pharmax/analyze] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}

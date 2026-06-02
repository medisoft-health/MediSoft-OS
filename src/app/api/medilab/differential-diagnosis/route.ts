import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { getPatientFullContext } from "@/lib/queries/patient-context";
import { generateDifferentialDiagnosis } from "@/lib/medilab/differential-diagnosis";

/**
 * POST /api/medilab/differential-diagnosis
 *
 * AI-powered differential diagnosis using patient context + symptoms.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  patientId: z.number().int().positive(),
  symptoms: z.array(z.string()).min(2, "At least 2 symptoms required"),
  duration: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
  onset: z.enum(["sudden", "gradual"]).optional(),
  additionalNotes: z.string().optional(),
  locale: z.string().max(10).optional(),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const ctx = await getPatientFullContext(parsed.data.patientId);
  if (!ctx) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const locale = parsed.data.locale || (request.headers.get("accept-language")?.startsWith("ar") ? "ar" : "en");

  const result = await generateDifferentialDiagnosis(ctx, {
    symptoms: parsed.data.symptoms,
    duration: parsed.data.duration,
    severity: parsed.data.severity,
    onset: parsed.data.onset,
    additionalNotes: parsed.data.additionalNotes,
  }, locale);

  if (result.kind === "not_configured") {
    return NextResponse.json({ error: result.message, reason: "not_configured" }, { status: 503 });
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json(result.data, {
    headers: { ...rl.headers, "Cache-Control": "private, no-store" },
  });
}

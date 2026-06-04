import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { soapNoteSchema } from "@/lib/validations/encounter";
import { generateBillingCodes } from "@/lib/mediscript/billing-intelligence";

/**
 * POST /api/mediscript/billing
 *
 * Analyzes a finalized SOAP note and returns suggested ICD-10-CM and CPT codes.
 *
 * Body: { soapNote: SoapNoteInput, encounterType: string, patientContext?: string, locale?: string }
 * Response:
 *   200 { billing: BillingIntelligenceResult }
 *   401 { error }
 *   429 { error, reason: "rate_limited" }
 *   503 { error, reason: "not_configured" }
 *   500 { error }
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  soapNote: soapNoteSchema,
  encounterType: z.string().max(64).default("outpatient"),
  patientContext: z.string().max(2000).optional(),
  locale: z.string().max(10).optional(),
});

export async function POST(request: Request) {
  // 1. Auth
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  // 2. Rate limit (AI policy)
  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  // 3. Check configuration
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Medical Intelligence Engine is not configured.", reason: "not_configured" },
      { status: 503 },
    );
  }

  // 4. Parse body
  let body: z.infer<typeof requestSchema>;
  try {
    const raw = await request.json();
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 5. Generate billing codes
  try {
    const billing = await generateBillingCodes(body.soapNote, body.encounterType, {
      patientContext: body.patientContext,
      locale: body.locale,
    });

    return NextResponse.json({ billing });
  } catch (err) {
    console.error("[MediScript/Billing] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Billing code generation failed: ${message}` },
      { status: 500 },
    );
  }
}

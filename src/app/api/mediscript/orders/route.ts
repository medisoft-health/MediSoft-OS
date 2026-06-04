import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { soapNoteSchema } from "@/lib/validations/encounter";
import { generateOrderSuggestions } from "@/lib/mediscript/order-automation";

/**
 * POST /api/mediscript/orders
 *
 * Analyzes a finalized SOAP note and returns suggested clinical orders:
 * prescriptions, lab orders, imaging orders, referrals, and follow-ups.
 *
 * Body: { soapNote: SoapNoteInput, patientContext?: string, locale?: string }
 * Response:
 *   200 { orders: OrderAutomationResult }
 *   401 { error }
 *   429 { error, reason: "rate_limited" }
 *   503 { error, reason: "not_configured" }
 *   500 { error }
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  soapNote: soapNoteSchema,
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

  // 5. Generate order suggestions
  try {
    const orders = await generateOrderSuggestions(body.soapNote, {
      patientContext: body.patientContext,
      locale: body.locale,
    });

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[MediScript/Orders] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Order suggestion failed: ${message}` },
      { status: 500 },
    );
  }
}

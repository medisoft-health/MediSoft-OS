import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { correctTranscript } from "@/lib/mediscript/transcript-corrector";
import { getPatientFullContext } from "@/lib/queries/patient-context";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  rawTranscript: z.string().min(10),
  patientId: z.number().int().positive().optional(),
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  let patientContext: { knownMedications?: string[]; knownConditions?: string[]; patientName?: string } | undefined;
  if (parsed.data.patientId) {
    const ctx = await getPatientFullContext(parsed.data.patientId);
    if (ctx) {
      patientContext = {
        knownMedications: ctx.activeMedications.map((m) => m.drugName),
        knownConditions: ctx.demographics.chronicConditions.map((c) => c.description),
        patientName: `${ctx.demographics.firstName} ${ctx.demographics.lastName}`,
      };
    }
  }

  const result = await correctTranscript(parsed.data.rawTranscript, patientContext);
  if (result.kind !== "ok") {
    return NextResponse.json({ error: result.message }, { status: result.kind === "not_configured" ? 503 : 502 });
  }

  return NextResponse.json(result.data, { headers: rl.headers });
}

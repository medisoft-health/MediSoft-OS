import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { generateEncounterSummary } from "@/lib/mediscript/encounter-summary";
import { db } from "@/db";
import { encounters, patients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({ encounterId: z.string().uuid() });

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

  const [encounter] = await db.select().from(encounters).where(eq(encounters.id, parsed.data.encounterId)).limit(1);
  if (!encounter) return NextResponse.json({ error: "Encounter not found." }, { status: 404 });

  const [patient] = await db.select().from(patients).where(eq(patients.id, encounter.patientId)).limit(1);

  const result = await generateEncounterSummary(
    (encounter.soapNote ?? {}) as Record<string, unknown>,
    patient ? { name: `${patient.firstName} ${patient.lastName}`, age: patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : undefined, sex: patient.sex ?? undefined } : undefined,
  );

  if (result.kind !== "ok") {
    return NextResponse.json({ error: result.message }, { status: result.kind === "not_configured" ? 503 : 502 });
  }
  return NextResponse.json(result.data, { headers: rl.headers });
}

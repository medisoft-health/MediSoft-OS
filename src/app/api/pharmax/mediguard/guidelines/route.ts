import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi, enforceRateLimit } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { validateAgainstGuidelines, getAvailableGuidelines } from "@/lib/ai/mediguard-guidelines";

/**
 * POST /api/pharmax/mediguard/guidelines
 *
 * MediGuard Clinical Guidelines Engine
 * Validates prescriptions against international medical guidelines.
 *
 * Body: {
 *   drugs: [{ drugName, dose?, frequency?, indication? }],
 *   patientContext: { age, sex, conditions, currentMedications?, labValues?, vitals? }
 * }
 *
 * GET /api/pharmax/mediguard/guidelines — Returns available guidelines
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  drugs: z.array(z.object({
    drugName: z.string().min(1).max(256),
    dose: z.string().max(100).optional(),
    frequency: z.string().max(100).optional(),
    indication: z.string().max(256).optional(),
  })).min(1).max(20),
  patientContext: z.object({
    age: z.number().int().min(0).max(150),
    sex: z.string(),
    conditions: z.array(z.string()),
    currentMedications: z.array(z.string()).optional(),
    labValues: z.record(z.string(), z.number()).optional(),
    vitals: z.object({
      bpSystolic: z.number().optional(),
      bpDiastolic: z.number().optional(),
      heartRate: z.number().optional(),
      hba1c: z.number().optional(),
      ldl: z.number().optional(),
      egfr: z.number().optional(),
    }).optional(),
  }),
});

export async function GET() {
  const guidelines = getAvailableGuidelines();
  return NextResponse.json({
    service: "MediGuard Clinical Guidelines Engine",
    version: "1.0.0",
    status: "active",
    totalGuidelines: guidelines.length,
    guidelines,
    sources: [
      "AHA/ACC 2023 (Hypertension)",
      "ESC 2024 (Hypertension, Heart Failure, AF)",
      "ADA 2024 (Diabetes)",
      "EASD 2024 (Diabetes)",
      "ESC/EAS 2024 (Dyslipidemia)",
      "GINA 2024 (Asthma)",
      "GOLD 2024 (COPD)",
      "KDIGO 2024 (CKD)",
      "CHEST 2024 (Anticoagulation)",
      "AGS Beers Criteria 2023 (Geriatrics)",
    ],
    capabilities: [
      "First-line therapy validation",
      "Contraindication detection (guideline-based)",
      "Step therapy enforcement",
      "Target assessment (BP, HbA1c, LDL, HR)",
      "Monitoring requirements",
      "Beers Criteria (elderly safety)",
      "AI-powered deep analysis with citations",
      "Compliance scoring (0-100)",
    ],
  });
}

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

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const result = await validateAgainstGuidelines(parsed.data);
    return NextResponse.json(result, {
      headers: { ...rl.headers, "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[MediGuard Guidelines] Validation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Guidelines validation failed" },
      { status: 500 },
    );
  }
}

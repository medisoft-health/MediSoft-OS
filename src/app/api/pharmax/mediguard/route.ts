import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi, enforceRateLimit } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { runMediGuardAnalysis, type MediGuardResult } from "@/lib/ai/mediguard";

/**
 * POST /api/pharmax/mediguard
 *
 * MediGuard — AI Medical Error Prevention Engine
 * Integrated into PharmaX as the 4th safety layer.
 *
 * Body: {
 *   drugs: [{ drugName, dose?, frequency?, route?, rxcui? }],
 *   patientId: number
 * }
 *
 * Returns: MediGuardResult with comprehensive safety analysis including:
 * - Dose calculations (renal/hepatic/weight/age adjusted)
 * - Drug-food interactions
 * - Drug-disease contraindications
 * - Cross-allergy detection
 * - Duplicate therapy alerts
 * - Lab-based contraindications
 * - Timing & administration guidance
 * - AI narrative summary
 * - Blocker alerts (critical errors that must stop prescribing)
 *
 * GET /api/pharmax/mediguard — Returns capabilities and status
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  drugs: z.array(z.object({
    drugName: z.string().min(1).max(256),
    dose: z.string().max(100).optional(),
    frequency: z.string().max(100).optional(),
    route: z.string().max(50).optional(),
    rxcui: z.string().max(40).optional(),
  })).min(1).max(20),
  patientId: z.number().int().positive(),
});

export async function GET() {
  return NextResponse.json({
    service: "MediGuard — AI Medical Error Prevention",
    version: "1.0.0",
    status: "active",
    description: "Real-time prescription safety engine integrated into PharmaX",
    capabilities: {
      doseCalculation: {
        status: "active",
        features: [
          "Renal-adjusted dosing (CKD-EPI eGFR)",
          "Hepatic-adjusted dosing (Child-Pugh)",
          "Weight-based dosing (enoxaparin, vancomycin, gentamicin)",
          "Geriatric dose reduction (Beers Criteria)",
          "BSA-based dosing (chemotherapy)",
        ],
      },
      foodInteractions: {
        status: "active",
        drugsTracked: 15,
        features: [
          "Drug-food interaction database",
          "Severity classification (avoid/caution/timing)",
          "Patient-friendly recommendations",
        ],
      },
      diseaseContraindications: {
        status: "active",
        features: [
          "AI-powered disease-drug checking",
          "Chronic condition screening",
          "Renal/hepatic function assessment",
        ],
      },
      crossAllergyDetection: {
        status: "active",
        allergyGroups: 8,
        features: [
          "Penicillin-Cephalosporin cross-reactivity",
          "NSAID cross-sensitivity",
          "ACE inhibitor angioedema class effect",
          "Sulfonamide cross-reactivity",
          "Opioid cross-reactivity",
        ],
      },
      duplicateTherapy: {
        status: "active",
        features: [
          "AI-powered therapeutic class matching",
          "Current medication comparison",
          "Recommendation for consolidation",
        ],
      },
      labContraindications: {
        status: "active",
        checksAvailable: 9,
        features: [
          "Potassium-sensitive drugs (ACE-I, spironolactone, digoxin)",
          "Renal-cleared drugs (metformin, dabigatran)",
          "Coagulation-dependent drugs (warfarin INR, heparin platelets)",
        ],
      },
      timingGuidance: {
        status: "active",
        drugsTracked: 12,
        features: [
          "Optimal administration time",
          "Food/fasting requirements",
          "Drug separation intervals",
          "Special instructions",
        ],
      },
      aiNarrative: {
        status: "active",
        model: "Gemini 2.5 Pro",
        features: [
          "Context-aware safety summary",
          "Alternative drug suggestions",
          "Risk score explanation",
        ],
      },
    },
    integration: {
      pharmax: "Layer 4 safety analysis",
      triggeredBy: "Prescription builder (real-time)",
      requiresPatientId: true,
      usesPatientData: ["allergies", "conditions", "medications", "labs", "vitals", "weight", "age"],
    },
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
    const result: MediGuardResult = await runMediGuardAnalysis({
      drugs: parsed.data.drugs,
      patientId: parsed.data.patientId,
    });

    return NextResponse.json(result, {
      headers: { ...rl.headers, "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[MediGuard] Analysis failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "MediGuard analysis failed" },
      { status: 500 },
    );
  }
}

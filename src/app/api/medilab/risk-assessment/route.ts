import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { getPatientFullContext } from "@/lib/queries/patient-context";
import { calculateRiskScores } from "@/lib/medilab/risk-engine";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";

/**
 * POST /api/medilab/risk-assessment
 *
 * Calculates predictive risk scores for 5 disease categories.
 * Deterministic scoring + optional AI insight.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  patientId: z.number().int().positive(),
  includeAI: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ctx = await getPatientFullContext(parsed.data.patientId);
  if (!ctx) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const result = calculateRiskScores(ctx);

  // Optional AI insight
  if (parsed.data.includeAI && isGeminiConfigured()) {
    const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
    if (rl.ok) {
      try {
        const client = getGeminiClient();
        if (client) {
          const riskSummary = result.risks
            .map((r) => `${r.nameEn}: ${r.score}/100 (${r.level}) - ${r.contributingFactors.map((f) => f.factor).join(", ")}`)
            .join("\n");

          const prompt = `أنت طبيب وقائي في MediSoft. بناءً على تقييم المخاطر التالي للمريض:

${riskSummary}

اكتب ملخصاً طبياً مختصراً بالعربية (3-4 جمل) يتضمن:
1. القلق الرئيسي
2. لماذا هو مقلق (أرقام محددة)
3. توصية عملية واحدة
4. متى يجب إعادة الفحص

اكتب بالعربية الفصحى البسيطة. لا تستخدم escape sequences.`;

          const aiResult = await client.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { temperature: 0.2 },
          });

          const text = aiResult.text?.trim();
          if (text) {
            result.aiInsight = decodeAllStrings(text);
          }
        }
      } catch (err) {
        console.error("[risk-assessment] AI insight failed:", err);
      }
    }
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

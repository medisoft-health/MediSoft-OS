import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { getLabResultById } from "@/lib/queries/labs";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";
import { findBiomarkerByName, pickRange } from "@/lib/medilab/biomarkers";

/**
 * POST /api/medilab/compare
 *
 * Compares two lab panels side-by-side. Optionally generates AI commentary.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  labResultId1: z.string().uuid(),
  labResultId2: z.string().uuid(),
  generateAI: z.boolean().optional().default(false),
});

interface LabValue {
  testName: string;
  value: number | string;
  unit?: string;
  referenceLow?: number | string;
  referenceHigh?: number | string;
  flag?: string;
}

interface ComparisonRow {
  testName: string;
  current: { value: string; unit: string; flag: string } | null;
  previous: { value: string; unit: string; flag: string } | null;
  percentChange: number | null;
  direction: "improved" | "worsened" | "stable" | "new";
  referenceLow: number | null;
  referenceHigh: number | null;
}

function toNum(v: number | string | undefined): number {
  if (v == null) return NaN;
  return typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.\-]/g, ""));
}

function getRefRange(testName: string, r: LabValue): { lo: number; hi: number } {
  // Prefer local biomarker library for stable ranges
  const bio = findBiomarkerByName(testName);
  if (bio) {
    const range = pickRange(bio);
    if (range) return { lo: range.low, hi: range.high };
  }
  const lo = toNum(r.referenceLow);
  const hi = toNum(r.referenceHigh);
  return { lo: isNaN(lo) ? 0 : lo, hi: isNaN(hi) ? 0 : hi };
}

function computeDirection(
  currentVal: number,
  previousVal: number,
  lo: number,
  hi: number,
): "improved" | "worsened" | "stable" {
  if (isNaN(currentVal) || isNaN(previousVal)) return "stable";
  const pctChange = previousVal !== 0 ? ((currentVal - previousVal) / Math.abs(previousVal)) * 100 : 0;
  if (Math.abs(pctChange) < 2) return "stable";

  // Determine if the change moved toward or away from normal range
  const mid = (lo + hi) / 2;
  const currentDist = Math.abs(currentVal - mid);
  const previousDist = Math.abs(previousVal - mid);

  if (currentDist < previousDist) return "improved";
  if (currentDist > previousDist) return "worsened";
  return "stable";
}

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

  const { labResultId1, labResultId2, generateAI } = parsed.data;

  // Fetch both lab results
  const [lab1, lab2] = await Promise.all([
    getLabResultById(labResultId1),
    getLabResultById(labResultId2),
  ]);

  if (!lab1 || !lab2) {
    return NextResponse.json({ error: "Lab result not found." }, { status: 404 });
  }

  const currentResults = (lab1.lab.results ?? []) as LabValue[];
  const previousResults = (lab2.lab.results ?? []) as LabValue[];

  // Build comparison: index previous results by testName (case-insensitive)
  const prevMap = new Map<string, LabValue>();
  for (const r of previousResults) {
    prevMap.set(r.testName.toLowerCase(), r);
  }

  const comparison: ComparisonRow[] = [];
  const processedPrev = new Set<string>();

  // Process current results
  for (const cur of currentResults) {
    const key = cur.testName.toLowerCase();
    const prev = prevMap.get(key);
    processedPrev.add(key);

    const curVal = toNum(cur.value);
    const ref = getRefRange(cur.testName, cur);

    if (!prev) {
      comparison.push({
        testName: cur.testName,
        current: { value: String(cur.value), unit: cur.unit ?? "", flag: cur.flag ?? "" },
        previous: null,
        percentChange: null,
        direction: "new",
        referenceLow: ref.lo || null,
        referenceHigh: ref.hi || null,
      });
      continue;
    }

    const prevVal = toNum(prev.value);
    const pctChange = !isNaN(curVal) && !isNaN(prevVal) && prevVal !== 0
      ? Math.round(((curVal - prevVal) / Math.abs(prevVal)) * 1000) / 10
      : null;

    const direction = !isNaN(curVal) && !isNaN(prevVal)
      ? computeDirection(curVal, prevVal, ref.lo, ref.hi)
      : "stable";

    comparison.push({
      testName: cur.testName,
      current: { value: String(cur.value), unit: cur.unit ?? "", flag: cur.flag ?? "" },
      previous: { value: String(prev.value), unit: prev.unit ?? "", flag: prev.flag ?? "" },
      percentChange: pctChange,
      direction,
      referenceLow: ref.lo || null,
      referenceHigh: ref.hi || null,
    });
  }

  // Add tests that exist only in previous (removed from current)
  for (const prev of previousResults) {
    if (!processedPrev.has(prev.testName.toLowerCase())) {
      const ref = getRefRange(prev.testName, prev);
      comparison.push({
        testName: prev.testName,
        current: null,
        previous: { value: String(prev.value), unit: prev.unit ?? "", flag: prev.flag ?? "" },
        percentChange: null,
        direction: "stable",
        referenceLow: ref.lo || null,
        referenceHigh: ref.hi || null,
      });
    }
  }

  // Sort: changed tests first, then stable
  comparison.sort((a, b) => {
    const order = { worsened: 0, improved: 1, new: 2, stable: 3 };
    return order[a.direction] - order[b.direction];
  });

  // Generate AI commentary if requested
  let aiCommentary: string | undefined;
  if (generateAI && isGeminiConfigured()) {
    const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
    if (rl.ok) {
      try {
        const client = getGeminiClient();
        if (client) {
          const changedTests = comparison
            .filter((c) => c.direction !== "stable" && c.current && c.previous)
            .map((c) => `${c.testName}: ${c.previous!.value} → ${c.current!.value} (${c.percentChange != null ? `${c.percentChange > 0 ? "+" : ""}${c.percentChange}%` : "new"}, ${c.direction})`)
            .join("\n");

          const date1 = lab1.lab.resultDate?.toISOString().slice(0, 10) ?? "current";
          const date2 = lab2.lab.resultDate?.toISOString().slice(0, 10) ?? "previous";

          const prompt = `قارن بين نتائج تحاليل المريض في تاريخين مختلفين:

التاريخ الحالي: ${date1}
التاريخ السابق: ${date2}

التغييرات:
${changedTests || "لا توجد تغييرات ملحوظة"}

اكتب تعليقاً طبياً مختصراً بالعربية (أقل من 200 كلمة) يشمل:
1. تقييم عام موجز
2. شرح للقيم التي تغيرت بشكل ملحوظ
3. التوجهات المقلقة إن وُجدت
4. التحسينات الإيجابية
5. توصيات للمتابعة

اكتب بالعربية الفصحى البسيطة. لا تستخدم Unicode escape sequences.`;

          const result = await client.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { temperature: 0.2 },
          });

          aiCommentary = result.text?.trim() ?? undefined;
          if (aiCommentary) {
            // Decode any unicode escapes
            aiCommentary = decodeAllStrings(aiCommentary);
          }
        }
      } catch (err) {
        console.error("[compare] AI commentary failed:", err);
      }
    }
  }

  return NextResponse.json({
    comparison,
    currentDate: lab1.lab.resultDate?.toISOString() ?? null,
    previousDate: lab2.lab.resultDate?.toISOString() ?? null,
    currentPanel: lab1.lab.panelName,
    previousPanel: lab2.lab.panelName,
    aiCommentary,
  });
}

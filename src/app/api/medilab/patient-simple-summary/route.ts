import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { getLabResultById } from "@/lib/queries/labs";
import { getPatientFullContext } from "@/lib/queries/patient-context";
import { getGeminiClient, GEMINI_MODEL, decodeAllStrings } from "@/lib/ai/gemini";

/**
 * POST /api/medilab/patient-simple-summary
 *
 * Generates a SIMPLIFIED patient-friendly explanation of lab results.
 * Written in simple Arabic (عامية مبسطة) that any person can understand.
 * Inspired by Atheal's approach: "What does this mean for ME?"
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  labResultId: z.string().uuid(),
});

const SYSTEM_PROMPT = `أنت مساعد صحي ودود تتحدث مع شخص عادي (ليس طبيب).
مهمتك: تشرح نتائج التحاليل بأبسط لغة ممكنة — كأنك تشرح لصديقك.

القواعد:
1. استخدم العربية الفصحى البسيطة (لا عامية، لكن سهلة جداً)
2. لا تستخدم مصطلحات طبية معقدة أبداً — اشرح كل شيء بكلمات يومية
3. استخدم تشبيهات من الحياة اليومية (مثل: "الحديد مثل الوقود لجسمك")
4. كن إيجابياً ومشجعاً — حتى لو في نتائج غير طبيعية، قدم حلول عملية
5. ركز على "ماذا أفعل؟" أكثر من "ما المشكلة؟"
6. لا تخيف المريض — لكن لا تخفي المعلومات المهمة
7. النصائح يجب أن تكون عملية وقابلة للتنفيذ اليوم

الإخراج يجب أن يكون JSON بالشكل التالي:
{
  "overallMessage": "رسالة عامة مختصرة عن حالة التحاليل (جملة أو اثنتين)",
  "healthEmoji": "إيموجي واحد يعبر عن الحالة العامة (🌟 أو 💪 أو ⚡ أو 🌱)",
  "goodNews": ["نقطة إيجابية 1", "نقطة إيجابية 2"],
  "needsAttention": ["نقطة تحتاج انتباه 1"],
  "topActions": [
    {
      "icon": "🥗",
      "action": "فعل عملي محدد",
      "reason": "سبب مختصر",
      "category": "nutrition|exercise|sleep|medical|lifestyle"
    }
  ],
  "results": [
    {
      "name": "Test Name (English)",
      "nameAr": "اسم التحليل بالعربي",
      "emoji": "🩸",
      "status": "excellent|good|attention|urgent",
      "whatItMeans": "شرح بسيط جداً ماذا يعني هذا الرقم بالنسبة لجسمك",
      "actionTip": "نصيحة عملية واحدة",
      "value": "القيمة",
      "unit": "الوحدة"
    }
  ],
  "encouragement": "رسالة تشجيعية ختامية"
}

ملاحظات مهمة:
- overallMessage: جملة أو اثنتين فقط — بسيطة ومباشرة
- goodNews: أذكر الأشياء الجيدة أولاً (حتى لو بسيطة)
- topActions: أقصى 4 أفعال — الأهم أولاً
- results: لكل تحليل اشرح "whatItMeans" كأنك تشرح لطفل ذكي (12 سنة)
- encouragement: رسالة إيجابية تحفيزية`;

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const labRow = await getLabResultById(parsed.data.labResultId);
  if (!labRow) {
    return NextResponse.json({ error: "Lab result not found." }, { status: 404 });
  }

  const results = (labRow.lab.results ?? []) as Array<{
    testName: string;
    value: number | string;
    unit?: string;
    referenceLow?: number | string;
    referenceHigh?: number | string;
    flag?: string;
  }>;

  // Get patient context for personalization
  const ctx = await getPatientFullContext(labRow.patient.id);

  // Build the user prompt
  let patientInfo = "";
  if (ctx) {
    const parts: string[] = [];
    if (ctx.demographics.age) parts.push(`العمر: ${ctx.demographics.age} سنة`);
    if (ctx.demographics.sex) parts.push(`الجنس: ${ctx.demographics.sex === "male" ? "ذكر" : "أنثى"}`);
    if (ctx.demographics.chronicConditions?.length)
      parts.push(`أمراض مزمنة: ${ctx.demographics.chronicConditions.map((c) => c.description).join("، ")}`);
    if (ctx.activeMedications?.length)
      parts.push(`أدوية حالية: ${ctx.activeMedications.map((m) => m.drugName).join("، ")}`);
    patientInfo = parts.join("\n");
  }

  const resultsText = results
    .map(
      (r) =>
        `- ${r.testName}: ${r.value} ${r.unit ?? ""} (المرجعي: ${r.referenceLow ?? "?"}-${r.referenceHigh ?? "?"}) [${r.flag ?? "normal"}]`
    )
    .join("\n");

  const userPrompt = `اشرح نتائج التحاليل التالية بلغة بسيطة جداً للمريض:

${patientInfo ? `معلومات المريض:\n${patientInfo}\n` : ""}
نتائج التحاليل:
${resultsText}

اسم المريض: ${labRow.patient.firstName}

أجب بـ JSON فقط (بدون markdown أو backticks).`;

  try {
    const client = getGeminiClient();
    if (!client) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.4,
        maxOutputTokens: 4000,
        responseMimeType: "application/json",
      },
    });

    const rawText = result.text ?? "";
    let parsed: any;
    try {
      let text = rawText.trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 502 }
      );
    }

    // Decode any escaped Unicode in Arabic text
    parsed = decodeAllStrings(parsed);

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}

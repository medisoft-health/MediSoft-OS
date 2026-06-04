import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi, enforceRateLimit } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { db } from "@/db";
import { patients, patientReadings, patientAlerts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────
//  Patient AI Chatbot — AMIE-style Medical Intelligence
//  Modes:
//  1. symptom_checker — Patient describes symptoms → AI triages
//  2. health_advisor — General health questions
//  3. medication_guide — Medication questions and interactions
//  4. report_explainer — Explain lab/scan results in simple terms
//  5. appointment_guide — Help patient prepare for appointments
// ─────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  message: z.string().min(1).max(4000),
  mode: z.enum(["symptom_checker", "health_advisor", "medication_guide", "report_explainer", "appointment_guide"]).default("health_advisor"),
  patientId: z.number().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).max(20).optional(),
  locale: z.string().max(10).default("ar"),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;
  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { message, mode, patientId, conversationHistory, locale } = parsed.data;

  try {
    // Fetch patient context if available
    let patientContext = "";
    if (patientId) {
      const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patient) {
        const recentReadings = await db.select().from(patientReadings)
          .where(eq(patientReadings.patientId, patientId))
          .orderBy(desc(patientReadings.recordedAt))
          .limit(10);

        const recentAlerts = await db.select().from(patientAlerts)
          .where(eq(patientAlerts.patientId, patientId))
          .orderBy(desc(patientAlerts.createdAt))
          .limit(5);

        patientContext = `
## بيانات المريض:
- العمر: ${patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 31557600000) : "غير محدد"} سنة
- الجنس: ${patient.sex || "غير محدد"}
- فصيلة الدم: ${patient.bloodType || "غير محدد"}
- الأمراض المزمنة: ${JSON.stringify(patient.chronicConditions) || "لا يوجد"}
- الحساسية: ${JSON.stringify(patient.allergies) || "لا يوجد"}
- الأدوية الحالية: ${JSON.stringify(patient.currentMedications) || "لا يوجد"}

## آخر القراءات:
${recentReadings.map(r => `- ${r.readingType}: ${r.valuePrimary}${r.valueSecondary ? "/" + r.valueSecondary : ""} ${r.unit || ""} (${new Date(r.recordedAt!).toLocaleDateString("ar-SA")})`).join("\n")}

## التنبيهات النشطة:
${recentAlerts.map(a => `- [${a.severity}] ${a.alertType}: ${a.message}`).join("\n")}
`;
      }
    }

    // Build system prompt based on mode
    const systemPrompts: Record<string, string> = {
      symptom_checker: `أنت مساعد طبي ذكي متخصص في تقييم الأعراض. مهمتك:
1. اسأل أسئلة منظمة عن الأعراض (متى بدأت؟ شدتها؟ أعراض مصاحبة؟)
2. قيّم مستوى الخطورة (عادي / يحتاج متابعة / طارئ)
3. اقترح إجراءات أولية
4. وجّه المريض للتخصص المناسب

⚠️ تنبيه: أنت لا تشخص أمراض. أنت تساعد المريض على فهم أعراضه وتوجيهه للرعاية المناسبة.
⚠️ في حالات الطوارئ (ألم صدر، صعوبة تنفس، نزيف حاد) → وجّه فوراً للطوارئ.`,

      health_advisor: `أنت مستشار صحي ذكي. تقدم نصائح صحية عامة مبنية على أحدث الأبحاث الطبية.
- تجيب عن أسئلة التغذية، الرياضة، النوم، الصحة النفسية
- تقدم نصائح وقائية مخصصة بناءً على بيانات المريض
- تشجع نمط الحياة الصحي
- لا تصف أدوية أبداً`,

      medication_guide: `أنت مرشد أدوية ذكي. تساعد المريض على فهم أدويته:
- شرح طريقة الاستخدام والجرعات
- التحذيرات والآثار الجانبية الشائعة
- التفاعلات الدوائية والغذائية
- ماذا يفعل لو نسي جرعة
⚠️ لا تغير جرعات أو توقف أدوية. وجّه دائماً للطبيب لأي تغيير.`,

      report_explainer: `أنت مفسر تقارير طبية ذكي. تشرح نتائج التحاليل والأشعة بلغة بسيطة:
- اشرح كل قيمة ومعناها
- وضّح ما هو طبيعي وما يحتاج متابعة
- اقترح أسئلة يسألها المريض لطبيبه
- لا تشخص أمراض من التقارير`,

      appointment_guide: `أنت مساعد تحضير للمواعيد الطبية. تساعد المريض:
- تحضير قائمة أسئلة للطبيب
- تذكيره بالمعلومات المهمة (أدوية، أعراض، تاريخ مرضي)
- نصائح ما قبل الزيارة (صيام للتحاليل، إلخ)
- تنظيم المستندات المطلوبة`,
    };

    const systemPrompt = `${systemPrompts[mode]}

## قواعد عامة:
- تحدث باللغة العربية الفصحى
- كن ودوداً ومطمئناً
- استخدم لغة بسيطة يفهمها أي شخص
- لا تستخدم مصطلحات طبية معقدة بدون شرح
- أنت جزء من نظام MediSoft للذكاء الطبي
- لا تذكر أبداً أنك ذكاء اصطناعي أو AI أو Gemini
- قدم نفسك كـ "المساعد الطبي الذكي في MediSoft"
- في نهاية كل رد، اقترح 2-3 أسئلة متابعة يمكن للمريض طرحها

${patientContext}`;

    // Build conversation
    const gemini = getGeminiClient();
    if (!gemini) {
      return NextResponse.json({ error: "Medical Intelligence Engine unavailable" }, { status: 503 });
    }

    const messages = [
      ...(conversationHistory || []).map(m => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: messages,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
        maxOutputTokens: 2000,
      },
    });

    const responseText = response.text || "عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.";

    // Detect urgency level from response
    let urgency: "normal" | "attention" | "emergency" = "normal";
    const emergencyKeywords = ["طوارئ", "فوراً", "اتصل بالإسعاف", "خطر", "لا تتأخر"];
    const attentionKeywords = ["راجع طبيبك", "يحتاج متابعة", "استشر", "موعد قريب"];

    if (emergencyKeywords.some(k => responseText.includes(k))) urgency = "emergency";
    else if (attentionKeywords.some(k => responseText.includes(k))) urgency = "attention";

    // Extract suggested follow-up questions
    const suggestedQuestions: string[] = [];
    const lines = responseText.split("\n");
    let inSuggestions = false;
    for (const line of lines) {
      if (line.includes("أسئلة") || line.includes("يمكنك") || line.includes("اسأل")) {
        inSuggestions = true;
        continue;
      }
      if (inSuggestions && (line.startsWith("-") || line.startsWith("•") || line.match(/^\d+\./))) {
        suggestedQuestions.push(line.replace(/^[-•\d.]\s*/, "").trim());
      }
    }

    await logAudit({ actorId: auth.user.id, action: "medibot.chat", resourceType: "patient", resourceId: patientId || null, patientId: patientId || null, metadata: { mode, urgency, source: "patient_chatbot" } });

    return NextResponse.json({
      response: responseText,
      urgency,
      suggestedQuestions: suggestedQuestions.slice(0, 3),
      mode,
    });

  } catch (error) {
    console.error("[PatientChatbot]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

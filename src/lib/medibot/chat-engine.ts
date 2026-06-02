import "server-only";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  decodeAllStrings,
} from "@/lib/ai/gemini";
import { db } from "@/db";
import { medibotSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { PatientFullContext } from "@/lib/queries/patient-context";

/**
 * MediBot — Evidence-based Medical AI Assistant.
 *
 * Dual persona: physician mode (clinical language, citations, DDx)
 * and patient mode (simple Arabic, no diagnosis, triage only).
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ id: number; title: string; source: string; url?: string }>;
  timestamp: string;
}

export interface ChatResponse {
  message: ChatMessage;
  suggestedFollowUps: string[];
}

export type MedibotMode = "physician" | "patient";

// ─────────────────────────────────────────────────────────────────
// System Prompts
// ─────────────────────────────────────────────────────────────────

const PHYSICIAN_SYSTEM_PROMPT = `You are MediBot, an evidence-based clinical decision support assistant for MediSoft C-OS, a medical platform used in Saudi Arabia.

RULES:
1. You are assisting a PHYSICIAN. Use clinical terminology appropriate for a medical professional.
2. EVERY medical claim MUST include an inline citation like [1], [2]. Generate a "References" section at the end.
3. References must cite real medical sources: PubMed, WHO guidelines, CDC, FDA, UpToDate, BMJ, NEJM, Lancet, or established clinical guidelines (ADA, ACC/AHA, KDIGO, etc.).
4. When patient context is provided, use it to give SPECIFIC answers. Do not ask for information already provided.
5. For drug-related queries, mention potential interactions with the patient's current medications.
6. You may generate differential diagnoses when asked, structured as: Most Likely, Expanded Differential, Must-Not-Miss.
7. Keep responses concise but thorough. Use bullet points for clarity.
8. If you are uncertain, say so explicitly. Never fabricate medical data.
9. You may suggest appending information to SOAP notes.
10. Write in English (clinical language). Include Arabic terms only when clarifying for the Saudi context.
11. DO NOT use Unicode escape sequences — write all text directly.`;

const PATIENT_SYSTEM_PROMPT = `أنت MediBot، مساعد صحي ذكي في نظام MediSoft الطبي. أنت تتحدث مع مريض وليس طبيب.

القواعد:
1. استخدم لغة عربية بسيطة يفهمها أي شخص غير طبي.
2. لا تقدم تشخيصات نهائية أبداً. استخدم عبارات مثل "قد يكون" و "يُنصح باستشارة الطبيب".
3. إذا وصف المريض أعراضاً خطيرة (ألم صدر، ضيق تنفس شديد، فقدان وعي)، انصحه بالتوجه للطوارئ فوراً.
4. فسّر نتائج التحاليل بلغة مبسطة عند السؤال عنها.
5. ساعد المريض في فهم أدويته ومواعيدها.
6. ادعم كل معلومة طبية بمرجع مثل [1]، واذكر المراجع في نهاية الإجابة.
7. لا تستخدم مصطلحات طبية معقدة بدون شرحها.
8. كن مطمئناً ولكن صادقاً. لا تقلل من أهمية الأعراض الخطيرة.
9. لا تنصح بتغيير أو إيقاف أي دواء — اطلب من المريض مراجعة طبيبه.
10. اكتب بالعربية الفصحى البسيطة.`;

// ─────────────────────────────────────────────────────────────────
// Build patient context for prompt injection
// ─────────────────────────────────────────────────────────────────

function buildPatientContext(ctx: PatientFullContext): string {
  const lines: string[] = [];
  lines.push("=== ACTIVE PATIENT CONTEXT ===");
  lines.push(`Name: ${ctx.demographics.firstName} ${ctx.demographics.lastName}`);
  lines.push(`Age: ${ctx.demographics.age} | Sex: ${ctx.demographics.sex}`);
  if (ctx.demographics.bloodType) lines.push(`Blood Type: ${ctx.demographics.bloodType}`);
  if (ctx.demographics.allergies.length > 0)
    lines.push(`Allergies: ${ctx.demographics.allergies.map((a) => `${a.substance} (${a.severity ?? "unknown"})`).join(", ")}`);
  if (ctx.demographics.chronicConditions.length > 0)
    lines.push(`Chronic Conditions: ${ctx.demographics.chronicConditions.map((c) => c.description).join(", ")}`);

  if (ctx.activeMedications.length > 0) {
    lines.push("\nCurrent Medications:");
    for (const m of ctx.activeMedications) lines.push(`  - ${m.drugName} ${m.dose} ${m.frequency} (${m.route})`);
  }

  if (ctx.latestVitals) {
    const v = ctx.latestVitals;
    lines.push("\nLatest Vitals:");
    if (v.bloodPressureSystolic) lines.push(`  BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`);
    if (v.heartRate) lines.push(`  HR: ${v.heartRate}`);
    if (v.bmi) lines.push(`  BMI: ${v.bmi}`);
  }

  if (ctx.labHistory.length > 0) {
    const latest = ctx.labHistory[0];
    lines.push(`\nLatest Labs (${latest.panelName}, ${latest.resultDate.toISOString().slice(0, 10)}):`);
    for (const r of latest.results.slice(0, 20)) {
      const flag = r.flag ? ` [${r.flag}]` : "";
      lines.push(`  ${r.testName}: ${r.value} ${r.unit ?? ""}${flag}`);
    }
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// Core chat function
// ─────────────────────────────────────────────────────────────────

const ARABIC_LOCALE_INSTRUCTION = `\n\nIMPORTANT: Generate ALL output text in Modern Standard Arabic (العربية الفصحى). Use formal medical Arabic terminology consistent with WHO and SFDA standards. Keep internationally recognized abbreviations (ICD-11, SOAP, LOINC, RxNorm, FHIR) in Latin script. Dates should use the Gregorian calendar.`;

export async function chat(
  userMessage: string,
  history: ChatMessage[],
  mode: MedibotMode,
  patientContext?: PatientFullContext,
  locale: string = "en",
): Promise<ChatResponse | { error: string }> {
  if (!isGeminiConfigured()) return { error: "Gemini not configured." };
  const client = getGeminiClient();
  if (!client) return { error: "Gemini unavailable." };

  const systemPrompt = mode === "physician" ? PHYSICIAN_SYSTEM_PROMPT : PATIENT_SYSTEM_PROMPT;
  const contextBlock = patientContext ? `\n\n${buildPatientContext(patientContext)}\n` : "";

  // Build conversation history for Gemini
  const contents = [
    ...history.map((m) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: userMessage }] },
  ];

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: systemPrompt + contextBlock + (locale === "ar" ? ARABIC_LOCALE_INSTRUCTION : ""),
        temperature: 0.3,
      },
    });

    let text = result.text?.trim() ?? "";
    text = decodeAllStrings(text);

    // Extract suggested follow-ups (if the model includes them)
    const suggestedFollowUps: string[] = [];
    if (mode === "physician") {
      suggestedFollowUps.push(
        "What are the contraindications?",
        "Show differential diagnosis",
        "Any drug interactions to consider?",
      );
    } else {
      suggestedFollowUps.push(
        "ما معنى هذا التحليل؟",
        "متى أراجع الطبيب؟",
        "ما الآثار الجانبية لهذا الدواء؟",
      );
    }

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
    };

    return { message: assistantMsg, suggestedFollowUps };
  } catch (err) {
    console.error("[medibot] Chat failed:", err);
    return { error: err instanceof Error ? err.message : "Chat failed" };
  }
}

// ─────────────────────────────────────────────────────────────────
// Session persistence
// ─────────────────────────────────────────────────────────────────

export async function createSession(userId: string, mode: MedibotMode, patientId?: number) {
  const [session] = await db.insert(medibotSessions).values({
    userId,
    patientId: patientId ?? null,
    mode,
    messages: [],
  }).returning();
  return session;
}

export async function getSession(sessionId: string) {
  const [session] = await db.select().from(medibotSessions).where(eq(medibotSessions.id, sessionId)).limit(1);
  return session ?? null;
}

export async function updateSessionMessages(sessionId: string, messages: ChatMessage[], title?: string) {
  await db.update(medibotSessions).set({
    messages,
    title: title ?? undefined,
    metadata: { totalMessages: messages.length, lastTopic: title },
  }).where(eq(medibotSessions.id, sessionId));
}

export async function listSessions(userId: string, limit = 20) {
  return db.select({
    id: medibotSessions.id,
    title: medibotSessions.title,
    mode: medibotSessions.mode,
    patientId: medibotSessions.patientId,
    createdAt: medibotSessions.createdAt,
    metadata: medibotSessions.metadata,
  }).from(medibotSessions).where(eq(medibotSessions.userId, userId)).orderBy(desc(medibotSessions.updatedAt)).limit(limit);
}

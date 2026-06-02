import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { chat, getSession, updateSessionMessages, createSession, type ChatMessage, type MedibotMode } from "@/lib/medibot/chat-engine";
import { getPatientFullContext } from "@/lib/queries/patient-context";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/medibot/chat
 *
 * Send a message to MediBot and get a response.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
  mode: z.enum(["physician", "patient"]).default("physician"),
  patientId: z.number().int().positive().optional(),
  locale: z.string().max(10).optional(),
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
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid." }, { status: 400 });

  const { message, mode, patientId } = parsed.data;
  let { sessionId } = parsed.data;
  const locale = parsed.data.locale || (request.headers.get("accept-language")?.startsWith("ar") ? "ar" : "en");

  // Get or create session
  let session;
  if (sessionId) {
    session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  } else {
    session = await createSession(auth.user.id, mode as MedibotMode, patientId);
    sessionId = session.id;
  }

  const history = (session.messages ?? []) as ChatMessage[];

  // Get patient context if available
  let patientCtx;
  const pid = patientId ?? session.patientId;
  if (pid) {
    patientCtx = await getPatientFullContext(pid) ?? undefined;
  }

  // Chat
  const result = await chat(message, history, mode as MedibotMode, patientCtx, locale);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Persist messages
  const userMsg: ChatMessage = { role: "user", content: message, timestamp: new Date().toISOString() };
  const updatedMessages = [...history, userMsg, result.message];
  const title = history.length === 0 ? message.slice(0, 60) : session.title;
  await updateSessionMessages(sessionId, updatedMessages, title ?? undefined);

  // Audit log
  void logAudit({
    actorId: auth.user.id,
    action: "medibot.chat",
    resourceType: "medibot_session",
    resourceId: sessionId,
    patientId: pid ?? undefined,
  });

  return NextResponse.json({
    sessionId,
    message: result.message,
    suggestedFollowUps: result.suggestedFollowUps,
  }, { headers: rl.headers });
}

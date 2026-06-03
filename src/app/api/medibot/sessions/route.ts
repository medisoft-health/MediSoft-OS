import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  listSessions,
  getSession,
  createSession,
  updateSessionMessages,
  type MedibotMode,
  type ChatMessage,
} from "@/lib/medibot/chat-engine";
import { db } from "@/db";
import { medibotSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET  /api/medibot/sessions           — list recent sessions (last 20)
 * GET  /api/medibot/sessions?id=xxx    — get specific session
 * POST /api/medibot/sessions           — create new session
 * PATCH /api/medibot/sessions          — update session messages/title
 * DELETE /api/medibot/sessions?id=xxx  — delete session
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");

  if (sessionId) {
    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(session);
  }

  const sessions = await listSessions(auth.user.id, 20);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  let body: { mode?: string; patientId?: number } = {};
  try {
    body = await request.json();
  } catch {
    // defaults are fine
  }

  const mode = (body.mode === "patient" ? "patient" : "physician") as MedibotMode;
  const session = await createSession(auth.user.id, mode, body.patientId);
  return NextResponse.json(session, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  let body: { id?: string; messages?: ChatMessage[]; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Session id is required." }, { status: 400 });
  }

  const session = await getSession(body.id);
  if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (session.userId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const messages = body.messages ?? (session.messages as ChatMessage[]);
  const title = body.title ?? session.title ?? undefined;
  await updateSessionMessages(body.id, messages, title);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");

  if (!sessionId) {
    return NextResponse.json({ error: "Session id is required." }, { status: 400 });
  }

  const deleted = await db
    .delete(medibotSessions)
    .where(and(eq(medibotSessions.id, sessionId), eq(medibotSessions.userId, auth.user.id)))
    .returning({ id: medibotSessions.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Not found or not owned by you." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deleted: deleted[0].id });
}

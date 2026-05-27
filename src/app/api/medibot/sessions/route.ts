import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { listSessions, getSession } from "@/lib/medibot/chat-engine";

/**
 * GET /api/medibot/sessions — list recent sessions
 * GET /api/medibot/sessions?id=xxx — get specific session
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

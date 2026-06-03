import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  startPreVisitSession,
  processPatientMessage,
  type PreVisitSession,
} from "@/lib/google-health/co-clinician";

// In-memory session store (in production, use Redis or DB)
const sessions = new Map<string, PreVisitSession>();

/**
 * GET /api/google-health/co-clinician
 * Get session status or list active sessions
 */
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const patientId = searchParams.get("patientId");

  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        language: session.language,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        messageCount: session.messages.filter((m) => m.role !== "system").length,
        summary: session.summary,
        collectedData: session.collectedData,
      },
    });
  }

  if (patientId) {
    const patientSessions = Array.from(sessions.values())
      .filter((s) => s.patientId === patientId)
      .map((s) => ({
        id: s.id,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      }));
    return NextResponse.json({ sessions: patientSessions });
  }

  return NextResponse.json({
    status: "active",
    activeSessions: sessions.size,
    capabilities: [
      "pre_visit_interview",
      "medical_history_collection",
      "symptom_assessment",
      "multi_language_support",
      "physician_summary_generation",
    ],
  });
}

/**
 * POST /api/google-health/co-clinician
 * Start a new session or send a message
 *
 * Body: { action: "start" | "message", ... }
 */
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "start") {
      const { patientId, language = "en", existingHistory } = body;
      if (!patientId) {
        return NextResponse.json(
          { error: "Missing required field: patientId" },
          { status: 400 },
        );
      }

      const session = await startPreVisitSession(patientId, language, existingHistory);
      sessions.set(session.id, session);

      // Get the greeting message
      const greeting = session.messages.find((m) => m.role === "assistant");

      return NextResponse.json({
        sessionId: session.id,
        greeting: greeting?.content || "Hello! What brings you in today?",
        status: "in_progress",
      });
    }

    if (action === "message") {
      const { sessionId, message } = body;
      if (!sessionId || !message) {
        return NextResponse.json(
          { error: "Missing required fields: sessionId, message" },
          { status: 400 },
        );
      }

      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      if (session.status === "completed") {
        return NextResponse.json({
          error: "Session already completed",
          summary: session.summary,
        }, { status: 400 });
      }

      const result = await processPatientMessage(session, message);
      sessions.set(sessionId, result.session);

      return NextResponse.json({
        response: result.response,
        isComplete: result.isComplete,
        summary: result.isComplete ? result.session.summary : undefined,
      });
    }

    if (action === "end") {
      const { sessionId } = body;
      const session = sessions.get(sessionId);
      if (session) {
        session.status = "abandoned";
        sessions.set(sessionId, session);
      }
      return NextResponse.json({ status: "ended" });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: start, message, or end" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[api/google-health/co-clinician] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

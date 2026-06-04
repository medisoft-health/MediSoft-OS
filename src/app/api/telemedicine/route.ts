import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi, enforceRateLimit } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { db } from "@/db";
import { videoCallSessions, conversations, conversationParticipants } from "@/db/schema";
import { eq, and, desc, or, gte } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────
//  GET /api/telemedicine — List video call sessions
// ─────────────────────────────────────────────────────────────────
const getSchema = z.object({
  action: z.enum(["list", "get", "upcoming", "history"]).default("list"),
  sessionId: z.string().optional(),
  patientId: z.coerce.number().optional(),
  status: z.enum(["scheduled", "waiting", "active", "completed", "cancelled", "missed"]).optional(),
});

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = getSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });

  const { action, sessionId, patientId, status } = parsed.data;

  try {
    switch (action) {
      case "get": {
        if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        const session = await db.select().from(videoCallSessions)
          .where(eq(videoCallSessions.id, sessionId))
          .limit(1);
        if (!session.length) return NextResponse.json({ error: "Session not found" }, { status: 404 });
        return NextResponse.json({ session: session[0] });
      }

      case "upcoming": {
        const now = new Date();
        const conditions = [
          or(
            eq(videoCallSessions.status, "scheduled"),
            eq(videoCallSessions.status, "waiting")
          ),
          gte(videoCallSessions.scheduledAt, now),
        ];
        if (patientId) conditions.push(eq(videoCallSessions.patientId, patientId));

        const sessions = await db.select().from(videoCallSessions)
          .where(and(...conditions))
          .orderBy(videoCallSessions.scheduledAt)
          .limit(20);
        return NextResponse.json({ sessions });
      }

      case "history": {
        const conditions = [];
        if (patientId) conditions.push(eq(videoCallSessions.patientId, patientId));
        if (status) conditions.push(eq(videoCallSessions.status, status));

        const sessions = await db.select().from(videoCallSessions)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(videoCallSessions.scheduledAt))
          .limit(50);
        return NextResponse.json({ sessions });
      }

      default: {
        // List all sessions for the current user (as physician)
        const sessions = await db.select().from(videoCallSessions)
          .where(eq(videoCallSessions.physicianId, auth.user.id))
          .orderBy(desc(videoCallSessions.scheduledAt))
          .limit(50);
        return NextResponse.json({ sessions });
      }
    }
  } catch (error) {
    console.error("[Telemedicine GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────
//  POST /api/telemedicine — Create/manage video call sessions
// ─────────────────────────────────────────────────────────────────
const postSchema = z.object({
  action: z.enum([
    "schedule",        // Schedule a new video call
    "start_waiting",   // Patient joins waiting room
    "start_call",      // Physician starts the call
    "end_call",        // End the call
    "cancel",          // Cancel scheduled call
    "generate_token",  // Generate WebRTC token for joining
    "add_notes",       // Add clinical notes after call
  ]),
  patientId: z.number().optional(),
  sessionId: z.string().optional(),
  scheduledAt: z.string().optional(),
  duration: z.number().min(5).max(120).optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  callType: z.enum(["video", "audio", "screen_share"]).default("video"),
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

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { action, patientId, sessionId, scheduledAt, duration, reason, notes } = parsed.data;

  try {
    switch (action) {
      case "schedule": {
        if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

        // Generate a unique room ID for WebRTC
        const roomId = `medisoft-${randomUUID().slice(0, 8)}`;

        // Create a conversation for this call
        const [conv] = await db.insert(conversations).values({
          patientId,
          type: "telemedicine",
          title: reason || "استشارة طبية عن بُعد",
          status: "active",
          createdBy: auth.user.id,
        }).returning();

        // Add participants
        await db.insert(conversationParticipants).values([
          { conversationId: conv.id, userId: auth.user.id, role: "physician" },
          { conversationId: conv.id, patientId, role: "patient" },
        ]);

        // Create video call session
        const [session] = await db.insert(videoCallSessions).values({
          patientId,
          physicianId: auth.user.id,
          conversationId: conv.id,
          roomId,
          status: "scheduled",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          notes: reason || null,
        }).returning();

        await logAudit({ actorId: auth.user.id, action: "encounter.create", resourceType: "session", resourceId: session.id, patientId, metadata: { roomId, source: "telemedicine.schedule" } });

        return NextResponse.json({
          session,
          roomId,
          conversationId: conv.id,
          joinUrl: `/telemedicine/${session.id}`,
        });
      }

      case "start_waiting": {
        if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

        await db.update(videoCallSessions)
          .set({ status: "waiting" })
          .where(eq(videoCallSessions.id, String(sessionId)));

        return NextResponse.json({ success: true, status: "waiting" });
      }

      case "start_call": {
        if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

        await db.update(videoCallSessions)
          .set({ status: "active", startedAt: new Date() })
          .where(eq(videoCallSessions.id, String(sessionId)));

        await logAudit({ actorId: auth.user.id, action: "encounter.view", resourceType: "session", resourceId: sessionId, metadata: { source: "telemedicine.start" } });

        return NextResponse.json({ success: true, status: "active" });
      }

      case "end_call": {
        if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

        const now = new Date();
        const [session] = await db.select().from(videoCallSessions)
          .where(eq(videoCallSessions.id, String(sessionId))).limit(1);

        const durationMinutes = session?.startedAt
          ? Math.round((now.getTime() - new Date(session.startedAt).getTime()) / 60000)
          : 0;

        const durationSeconds = durationMinutes * 60;

        await db.update(videoCallSessions)
          .set({
            status: "completed",
            endedAt: now,
            durationSeconds,
          })
          .where(eq(videoCallSessions.id, String(sessionId)));

        await logAudit({ actorId: auth.user.id, action: "encounter.update", resourceType: "session", resourceId: sessionId, metadata: { durationMinutes, source: "telemedicine.end" } });

        return NextResponse.json({ success: true, status: "completed", durationMinutes });
      }

      case "cancel": {
        if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

        await db.update(videoCallSessions)
          .set({ status: "cancelled", endedAt: new Date() })
          .where(eq(videoCallSessions.id, String(sessionId)));

        return NextResponse.json({ success: true, status: "cancelled" });
      }

      case "generate_token": {
        if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

        const [tokenSession] = await db.select().from(videoCallSessions)
          .where(eq(videoCallSessions.id, String(sessionId))).limit(1);

        if (!tokenSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // Generate a WebRTC signaling token
        // In production, this would integrate with a TURN/STUN server or service like Twilio Video/Daily.co
        const token = {
          roomId: tokenSession.roomId,
          sessionId: tokenSession.id,
          userId: auth.user.id,
          role: tokenSession.physicianId === auth.user.id ? "physician" : "patient",
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
          ],
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        };

        return NextResponse.json({ token });
      }

      case "add_notes": {
        if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

        await db.update(videoCallSessions)
          .set({ notes: notes || null })
          .where(eq(videoCallSessions.id, String(sessionId)));

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Telemedicine POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Patient Portal — Messages API
 * Patient-physician messaging system
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { patientMessages, patients, users } from "@/db/schema";
import { eq, and, desc, or } from "drizzle-orm";

// GET /api/patient-portal/messages — List messages for a patient or physician
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const physicianId = searchParams.get("physicianId");
    const unreadOnly = searchParams.get("unread") === "true";
    const threadId = searchParams.get("threadId");

    const conditions = [];
    if (patientId) conditions.push(eq(patientMessages.patientId, parseInt(patientId)));
    if (physicianId) conditions.push(eq(patientMessages.physicianId, physicianId));
    if (unreadOnly) conditions.push(eq(patientMessages.isRead, false));
    if (threadId) conditions.push(eq(patientMessages.parentMessageId, threadId));

    const results = await db
      .select({
        id: patientMessages.id,
        patientId: patientMessages.patientId,
        physicianId: patientMessages.physicianId,
        physicianName: users.name,
        senderType: patientMessages.senderType,
        subject: patientMessages.subject,
        body: patientMessages.body,
        isRead: patientMessages.isRead,
        readAt: patientMessages.readAt,
        attachments: patientMessages.attachments,
        parentMessageId: patientMessages.parentMessageId,
        channel: patientMessages.channel,
        createdAt: patientMessages.createdAt,
      })
      .from(patientMessages)
      .leftJoin(users, eq(patientMessages.physicianId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(patientMessages.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/patient-portal/messages — Send a new message
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { patientId, physicianId, senderType, subject, messageBody, parentMessageId, channel } = body;

    if (!patientId || !physicianId || !senderType || !messageBody) {
      return NextResponse.json(
        { success: false, error: "patientId, physicianId, senderType, and messageBody are required" },
        { status: 400 }
      );
    }

    const [newMessage] = await db
      .insert(patientMessages)
      .values({
        patientId,
        physicianId,
        senderType, // "patient" | "physician" | "system"
        subject,
        body: messageBody,
        parentMessageId: parentMessageId || null,
        channel: channel || "portal",
      })
      .returning();

    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/patient-portal/messages — Mark messages as read
export async function PATCH(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { messageIds } = body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ success: false, error: "messageIds array required" }, { status: 400 });
    }

    const updated = [];
    for (const id of messageIds) {
      const [msg] = await db
        .update(patientMessages)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(patientMessages.id, id))
        .returning();
      if (msg) updated.push(msg);
    }

    return NextResponse.json({ success: true, data: { markedRead: updated.length } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

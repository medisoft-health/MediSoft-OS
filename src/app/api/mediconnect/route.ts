import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import {
  conversations,
  conversationParticipants,
  mediconnectMessages,
  remotePrescriptions,
  patientNotifications,
  patients,
  users,
} from "@/db/schema";
import { eq, and, desc, sql, or, inArray } from "drizzle-orm";

/**
 * GET /api/mediconnect — Fetch conversations, messages, or prescriptions
 * Query params: action, conversationId, patientId, limit, offset
 */
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "conversations";
  const conversationId = searchParams.get("conversationId");
  const patientId = searchParams.get("patientId");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    switch (action) {
      case "conversations": {
        // Get all conversations where the current user is a participant
        const participantConvs = await db
          .select({ conversationId: conversationParticipants.conversationId })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.userId, auth.user.id));

        const convIds = participantConvs.map((p) => p.conversationId);
        if (convIds.length === 0) {
          return NextResponse.json({ success: true, data: [] });
        }

        const convs = await db
          .select({
            id: conversations.id,
            patientId: conversations.patientId,
            title: conversations.title,
            type: conversations.type,
            status: conversations.status,
            priority: conversations.priority,
            lastMessageAt: conversations.lastMessageAt,
            createdAt: conversations.createdAt,
          })
          .from(conversations)
          .where(
            and(
              inArray(conversations.id, convIds),
              eq(conversations.status, "active")
            )
          )
          .orderBy(desc(conversations.lastMessageAt))
          .limit(limit)
          .offset(offset);

        // Enrich with patient info and unread count
        const enriched = await Promise.all(
          convs.map(async (conv) => {
            const patient = conv.patientId
              ? await db
                  .select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName, phone: patients.phone })
                  .from(patients)
                  .where(eq(patients.id, conv.patientId))
                  .then((r) => r[0])
              : null;

            const participant = await db
              .select({ unreadCount: conversationParticipants.unreadCount })
              .from(conversationParticipants)
              .where(
                and(
                  eq(conversationParticipants.conversationId, conv.id),
                  eq(conversationParticipants.userId, auth.user.id)
                )
              )
              .then((r) => r[0]);

            // Get last message preview
            const lastMsg = await db
              .select({
                body: mediconnectMessages.body,
                senderType: mediconnectMessages.senderType,
                contentType: mediconnectMessages.contentType,
                createdAt: mediconnectMessages.createdAt,
              })
              .from(mediconnectMessages)
              .where(eq(mediconnectMessages.conversationId, conv.id))
              .orderBy(desc(mediconnectMessages.createdAt))
              .limit(1)
              .then((r) => r[0]);

            return {
              ...conv,
              patient,
              unreadCount: participant?.unreadCount || 0,
              lastMessage: lastMsg || null,
            };
          })
        );

        return NextResponse.json({ success: true, data: enriched });
      }

      case "messages": {
        if (!conversationId) {
          return NextResponse.json({ success: false, error: "conversationId required" }, { status: 400 });
        }

        const msgs = await db
          .select({
            id: mediconnectMessages.id,
            conversationId: mediconnectMessages.conversationId,
            senderUserId: mediconnectMessages.senderUserId,
            senderPatientId: mediconnectMessages.senderPatientId,
            senderType: mediconnectMessages.senderType,
            contentType: mediconnectMessages.contentType,
            body: mediconnectMessages.body,
            attachments: mediconnectMessages.attachments,
            metadata: mediconnectMessages.metadata,
            replyToId: mediconnectMessages.replyToId,
            isEdited: mediconnectMessages.isEdited,
            createdAt: mediconnectMessages.createdAt,
          })
          .from(mediconnectMessages)
          .where(
            and(
              eq(mediconnectMessages.conversationId, conversationId),
              eq(mediconnectMessages.isDeleted, false)
            )
          )
          .orderBy(desc(mediconnectMessages.createdAt))
          .limit(limit)
          .offset(offset);

        // Mark as read
        await db
          .update(conversationParticipants)
          .set({ unreadCount: 0, lastReadAt: new Date() })
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, auth.user.id)
            )
          );

        return NextResponse.json({ success: true, data: msgs.reverse() });
      }

      case "prescriptions": {
        const conditions = [eq(remotePrescriptions.physicianId, auth.user.id)];
        if (patientId) conditions.push(eq(remotePrescriptions.patientId, parseInt(patientId)));

        const rxs = await db
          .select()
          .from(remotePrescriptions)
          .where(and(...conditions))
          .orderBy(desc(remotePrescriptions.createdAt))
          .limit(limit);

        return NextResponse.json({ success: true, data: rxs });
      }

      case "patient_conversations": {
        // For patient portal — get conversations for a specific patient
        if (!patientId) {
          return NextResponse.json({ success: false, error: "patientId required" }, { status: 400 });
        }

        const patientConvs = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.patientId, parseInt(patientId)),
              eq(conversations.status, "active")
            )
          )
          .orderBy(desc(conversations.lastMessageAt))
          .limit(limit);

        return NextResponse.json({ success: true, data: patientConvs });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[MediConnect GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/mediconnect — Create conversations, send messages, issue prescriptions
 */
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case "create_conversation": {
        const { patientId, title, type, participantIds } = body;
        if (!patientId) {
          return NextResponse.json({ success: false, error: "patientId required" }, { status: 400 });
        }

        // Create conversation
        const [conv] = await db
          .insert(conversations)
          .values({
            patientId,
            title: title || null,
            type: type || "direct",
            createdBy: auth.user.id,
            lastMessageAt: new Date(),
          })
          .returning();

        // Add current user as participant
        await db.insert(conversationParticipants).values({
          conversationId: conv.id,
          userId: auth.user.id,
          role: "admin",
        });

        // Add patient as participant
        await db.insert(conversationParticipants).values({
          conversationId: conv.id,
          patientId,
          role: "member",
        });

        // Add additional participants
        if (participantIds && Array.isArray(participantIds)) {
          for (const pid of participantIds) {
            await db.insert(conversationParticipants).values({
              conversationId: conv.id,
              userId: pid,
              role: "member",
            });
          }
        }

        // Send system message
        await db.insert(mediconnectMessages).values({
          conversationId: conv.id,
          senderUserId: auth.user.id,
          senderType: "system",
          contentType: "text",
          body: "تم بدء المحادثة",
        });

        return NextResponse.json({ success: true, data: conv }, { status: 201 });
      }

      case "send_message": {
        const { conversationId, contentType, messageBody, attachments, metadata, replyToId } = body;
        if (!conversationId || !messageBody) {
          return NextResponse.json({ success: false, error: "conversationId and messageBody required" }, { status: 400 });
        }

        // Insert message
        const [msg] = await db
          .insert(mediconnectMessages)
          .values({
            conversationId,
            senderUserId: auth.user.id,
            senderType: "physician",
            contentType: contentType || "text",
            body: messageBody,
            attachments: attachments || [],
            metadata: metadata || {},
            replyToId: replyToId || null,
          })
          .returning();

        // Update conversation lastMessageAt
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date(), updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));

        // Increment unread count for other participants
        await db
          .update(conversationParticipants)
          .set({ unreadCount: sql`${conversationParticipants.unreadCount} + 1` })
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              sql`(${conversationParticipants.userId} != ${auth.user.id} OR ${conversationParticipants.userId} IS NULL)`
            )
          );

        // Create patient notification
        const conv = await db
          .select({ patientId: conversations.patientId })
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .then((r) => r[0]);

        if (conv?.patientId) {
          await db.insert(patientNotifications).values({
            patientId: conv.patientId,
            type: "message",
            severity: "info",
            title: "New Message from Doctor",
            titleAr: "رسالة جديدة من الطبيب",
            body: messageBody.substring(0, 200),
            bodyAr: messageBody.substring(0, 200),
            actionUrl: `/patient-portal?tab=messages&conversation=${conversationId}`,
            channelsSent: ["in_app"],
          });
        }

        return NextResponse.json({ success: true, data: msg }, { status: 201 });
      }

      case "send_prescription": {
        const { patientId, conversationId: rxConvId, medications, diagnosis, diagnosisCode, notes, validDays } = body;
        if (!patientId || !medications || medications.length === 0) {
          return NextResponse.json({ success: false, error: "patientId and medications required" }, { status: 400 });
        }

        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + (validDays || 30));

        // Generate QR code data
        const qrData = JSON.stringify({
          rxId: "pending",
          physician: auth.user.id,
          patient: patientId,
          date: new Date().toISOString(),
          medications: medications.map((m: any) => m.name),
        });

        // Create prescription
        const [rx] = await db
          .insert(remotePrescriptions)
          .values({
            patientId,
            physicianId: auth.user.id,
            conversationId: rxConvId || null,
            status: "sent",
            medications,
            diagnosis: diagnosis || null,
            diagnosisCode: diagnosisCode || null,
            notes: notes || null,
            validUntil,
            qrCode: Buffer.from(qrData).toString("base64"),
          })
          .returning();

        // If there's a conversation, send as a message
        let targetConvId = rxConvId;
        if (!targetConvId) {
          // Create a new conversation for this prescription
          const [newConv] = await db
            .insert(conversations)
            .values({
              patientId,
              title: "روشتة طبية جديدة",
              type: "prescription",
              createdBy: auth.user.id,
              lastMessageAt: new Date(),
            })
            .returning();

          await db.insert(conversationParticipants).values([
            { conversationId: newConv.id, userId: auth.user.id, role: "admin" },
            { conversationId: newConv.id, patientId, role: "member" },
          ]);

          targetConvId = newConv.id;
        }

        // Send prescription as a message
        const [rxMsg] = await db
          .insert(mediconnectMessages)
          .values({
            conversationId: targetConvId,
            senderUserId: auth.user.id,
            senderType: "physician",
            contentType: "prescription",
            body: `روشتة طبية: ${medications.map((m: any) => m.name).join("، ")}`,
            metadata: { prescriptionId: rx.id, medications, diagnosis },
          })
          .returning();

        // Update prescription with message ID
        await db
          .update(remotePrescriptions)
          .set({ messageId: rxMsg.id, conversationId: targetConvId })
          .where(eq(remotePrescriptions.id, rx.id));

        // Notify patient
        await db.insert(patientNotifications).values({
          patientId,
          type: "prescription",
          severity: "info",
          title: "New Prescription",
          titleAr: "روشتة جديدة من الطبيب",
          body: `Dr. ${auth.user.name || "Your Doctor"} has sent you a new prescription with ${medications.length} medication(s).`,
          bodyAr: `أرسل لك الطبيب روشتة جديدة تحتوي على ${medications.length} دواء`,
          actionUrl: `/patient-portal?tab=prescriptions&id=${rx.id}`,
          metadata: { prescriptionId: rx.id },
          channelsSent: ["in_app", "push"],
        });

        return NextResponse.json({ success: true, data: rx }, { status: 201 });
      }

      case "send_lab_result": {
        const { patientId: labPatientId, conversationId: labConvId, labData, summary } = body;
        if (!labPatientId || !labData) {
          return NextResponse.json({ success: false, error: "patientId and labData required" }, { status: 400 });
        }

        let targetConv = labConvId;
        if (!targetConv) {
          const [newConv] = await db
            .insert(conversations)
            .values({
              patientId: labPatientId,
              title: "نتائج التحاليل",
              type: "lab_result",
              createdBy: auth.user.id,
              lastMessageAt: new Date(),
            })
            .returning();

          await db.insert(conversationParticipants).values([
            { conversationId: newConv.id, userId: auth.user.id, role: "admin" },
            { conversationId: newConv.id, patientId: labPatientId, role: "member" },
          ]);

          targetConv = newConv.id;
        }

        await db.insert(mediconnectMessages).values({
          conversationId: targetConv,
          senderUserId: auth.user.id,
          senderType: "physician",
          contentType: "lab_result",
          body: summary || "نتائج التحاليل جاهزة",
          metadata: { labData },
        });

        await db.insert(patientNotifications).values({
          patientId: labPatientId,
          type: "lab_result",
          severity: "info",
          title: "Lab Results Ready",
          titleAr: "نتائج التحاليل جاهزة",
          body: summary || "Your lab results are ready. Please check your portal.",
          bodyAr: summary || "نتائج تحاليلك جاهزة. يرجى مراجعة البوابة.",
          actionUrl: `/patient-portal?tab=results`,
          channelsSent: ["in_app", "push"],
        });

        return NextResponse.json({ success: true, data: { conversationId: targetConv } }, { status: 201 });
      }

      case "patient_send_message": {
        // For patient portal — patient sends a message
        const { conversationId: pConvId, messageBody: pBody, patientId: pId, attachments: pAttach } = body;
        if (!pConvId || !pBody || !pId) {
          return NextResponse.json({ success: false, error: "conversationId, messageBody, and patientId required" }, { status: 400 });
        }

        const [pMsg] = await db
          .insert(mediconnectMessages)
          .values({
            conversationId: pConvId,
            senderPatientId: pId,
            senderType: "patient",
            contentType: "text",
            body: pBody,
            attachments: pAttach || [],
          })
          .returning();

        await db
          .update(conversations)
          .set({ lastMessageAt: new Date(), updatedAt: new Date() })
          .where(eq(conversations.id, pConvId));

        // Increment unread for physicians
        await db
          .update(conversationParticipants)
          .set({ unreadCount: sql`${conversationParticipants.unreadCount} + 1` })
          .where(
            and(
              eq(conversationParticipants.conversationId, pConvId),
              sql`${conversationParticipants.patientId} IS NULL`
            )
          );

        return NextResponse.json({ success: true, data: pMsg }, { status: 201 });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[MediConnect POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/mediconnect — Update conversation status, mark read, archive
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case "mark_read": {
        const { conversationId } = body;
        await db
          .update(conversationParticipants)
          .set({ unreadCount: 0, lastReadAt: new Date() })
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, auth.user.id)
            )
          );
        return NextResponse.json({ success: true });
      }

      case "archive_conversation": {
        const { conversationId } = body;
        await db
          .update(conversations)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
        return NextResponse.json({ success: true });
      }

      case "update_prescription_status": {
        const { prescriptionId, status, dispensedBy, pharmacyName } = body;
        const updates: any = { status, updatedAt: new Date() };
        if (status === "dispensed") {
          updates.dispensedAt = new Date();
          updates.dispensedBy = dispensedBy || null;
          updates.pharmacyName = pharmacyName || null;
        }
        await db
          .update(remotePrescriptions)
          .set(updates)
          .where(eq(remotePrescriptions.id, prescriptionId));
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[MediConnect PATCH]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import {
  patientNotifications,
  pushSubscriptions,
  notificationPreferences,
  patients,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * GET /api/mediconnect/notifications — Get patient notifications
 */
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = parseInt(searchParams.get("limit") || "30");

  if (!patientId) {
    return NextResponse.json({ success: false, error: "patientId required" }, { status: 400 });
  }

  try {
    const conditions = [eq(patientNotifications.patientId, parseInt(patientId))];
    if (unreadOnly) {
      conditions.push(eq(patientNotifications.isRead, false));
    }

    const notifications = await db
      .select()
      .from(patientNotifications)
      .where(and(...conditions))
      .orderBy(desc(patientNotifications.createdAt))
      .limit(limit);

    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(patientNotifications)
      .where(
        and(
          eq(patientNotifications.patientId, parseInt(patientId)),
          eq(patientNotifications.isRead, false)
        )
      )
      .then((r) => Number(r[0]?.count || 0));

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error: any) {
    console.error("[Notifications GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/mediconnect/notifications — Send notification, register push, update preferences
 */
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case "send_notification": {
        const { patientId, type, severity, title, titleAr, notifBody, bodyAr, actionUrl, channels } = body;
        if (!patientId || !title || !notifBody) {
          return NextResponse.json({ success: false, error: "patientId, title, body required" }, { status: 400 });
        }

        const [notif] = await db
          .insert(patientNotifications)
          .values({
            patientId,
            type: type || "system",
            severity: severity || "info",
            title,
            titleAr: titleAr || title,
            body: notifBody,
            bodyAr: bodyAr || notifBody,
            actionUrl: actionUrl || null,
            channelsSent: channels || ["in_app"],
          })
          .returning();

        // Send push notification if subscribed
        if (channels?.includes("push")) {
          const subs = await db
            .select()
            .from(pushSubscriptions)
            .where(
              and(
                eq(pushSubscriptions.patientId, patientId),
                eq(pushSubscriptions.isActive, true)
              )
            );

          // Web Push API (would use web-push library in production)
          for (const sub of subs) {
            try {
              // In production: await webpush.sendNotification(sub, JSON.stringify({title, body}))
              console.log(`[Push] Sending to ${sub.deviceType}: ${title}`);
            } catch (e) {
              console.error("[Push] Failed:", e);
            }
          }
        }

        // Send email if configured
        if (channels?.includes("email")) {
          const patient = await db
            .select({ email: patients.email, firstName: patients.firstName })
            .from(patients)
            .where(eq(patients.id, patientId))
            .then((r) => r[0]);

          if (patient?.email) {
            // Use Twilio SendGrid or Resend
            try {
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.RESEND_API_KEY || ""}`,
                },
                body: JSON.stringify({
                  from: "MediSoft <notifications@medisofthealth.com>",
                  to: patient.email,
                  subject: titleAr || title,
                  html: `
                    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px;">
                      <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 20px; border-radius: 12px; color: white; text-align: center;">
                        <h1 style="margin: 0;">MediSoft</h1>
                        <p style="margin: 5px 0 0; opacity: 0.8;">Medical Intelligence Platform</p>
                      </div>
                      <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 12px 12px;">
                        <h2 style="color: #1e3a5f;">${titleAr || title}</h2>
                        <p style="color: #475569; line-height: 1.8;">${bodyAr || notifBody}</p>
                        ${actionUrl ? `<a href="https://app.medisofthealth.com${actionUrl}" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none;">عرض التفاصيل</a>` : ""}
                      </div>
                      <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
                        © 2026 MediSoft Health — Medical Intelligence Platform
                      </p>
                    </div>
                  `,
                }),
              });
              console.log(`[Email] Sent to ${patient.email}: ${emailRes.status}`);
            } catch (e) {
              console.error("[Email] Failed:", e);
            }
          }
        }

        // Send SMS/WhatsApp via Twilio
        if (channels?.includes("sms") || channels?.includes("whatsapp")) {
          const patient = await db
            .select({ phone: patients.phone, firstName: patients.firstName })
            .from(patients)
            .where(eq(patients.id, patientId))
            .then((r) => r[0]);

          if (patient?.phone && process.env.TWILIO_ACCOUNT_SID) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
            const twilioAuth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");

            const msgBody = `${titleAr || title}\n${bodyAr || notifBody}`;
            const from = channels.includes("whatsapp")
              ? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
              : process.env.TWILIO_PHONE_NUMBER;
            const to = channels.includes("whatsapp")
              ? `whatsapp:${patient.phone}`
              : patient.phone;

            try {
              await fetch(twilioUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${twilioAuth}`,
                },
                body: new URLSearchParams({ From: from || "", To: to, Body: msgBody }),
              });
              console.log(`[SMS/WhatsApp] Sent to ${patient.phone}`);
            } catch (e) {
              console.error("[SMS] Failed:", e);
            }
          }
        }

        return NextResponse.json({ success: true, data: notif }, { status: 201 });
      }

      case "register_push": {
        const { endpoint, authKey, p256dhKey, fcmToken, deviceType, deviceName, patientId: pushPatientId } = body;
        if (!endpoint) {
          return NextResponse.json({ success: false, error: "endpoint required" }, { status: 400 });
        }

        const [sub] = await db
          .insert(pushSubscriptions)
          .values({
            userId: auth.user.id,
            patientId: pushPatientId || null,
            endpoint,
            authKey: authKey || null,
            p256dhKey: p256dhKey || null,
            fcmToken: fcmToken || null,
            deviceType: deviceType || "web",
            deviceName: deviceName || null,
            lastUsedAt: new Date(),
          })
          .returning();

        return NextResponse.json({ success: true, data: sub }, { status: 201 });
      }

      case "mark_read": {
        const { notificationId } = body;
        await db
          .update(patientNotifications)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(patientNotifications.id, notificationId));
        return NextResponse.json({ success: true });
      }

      case "mark_all_read": {
        const { patientId: markPatientId } = body;
        await db
          .update(patientNotifications)
          .set({ isRead: true, readAt: new Date() })
          .where(
            and(
              eq(patientNotifications.patientId, markPatientId),
              eq(patientNotifications.isRead, false)
            )
          );
        return NextResponse.json({ success: true });
      }

      case "update_preferences": {
        const { preferences } = body;
        if (!preferences || !Array.isArray(preferences)) {
          return NextResponse.json({ success: false, error: "preferences array required" }, { status: 400 });
        }

        for (const pref of preferences) {
          await db
            .insert(notificationPreferences)
            .values({
              userId: auth.user.id,
              patientId: pref.patientId || null,
              channel: pref.channel,
              notificationType: pref.notificationType,
              enabled: pref.enabled,
              quietHoursStart: pref.quietHoursStart || null,
              quietHoursEnd: pref.quietHoursEnd || null,
            })
            .onConflictDoNothing();
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Notifications POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

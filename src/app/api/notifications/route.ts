import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getNotifications, markAsRead, markAllAsRead, dismissNotification } from "@/lib/notifications/notification-engine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const type = searchParams.get("type") ?? undefined;

  const notifications = await getNotifications(auth.user.id, { unreadOnly, limit, type });
  return NextResponse.json({ notifications });
}

const actionSchema = z.object({
  action: z.enum(["mark_read", "mark_all_read", "dismiss"]),
  notificationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { action, notificationId } = parsed.data;

  if (action === "mark_all_read") {
    await markAllAsRead(auth.user.id);
  } else if (action === "mark_read" && notificationId) {
    await markAsRead(notificationId);
  } else if (action === "dismiss" && notificationId) {
    await dismissNotification(notificationId);
  }

  return NextResponse.json({ ok: true });
}

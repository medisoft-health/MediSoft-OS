import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getUnreadCount } from "@/lib/notifications/notification-engine";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const count = await getUnreadCount(auth.user.id);
  return NextResponse.json({ count });
}

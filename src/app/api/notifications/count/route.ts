import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getUnreadCount } from "@/lib/notifications/notification-engine";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireSessionApi();
    if ("response" in auth) return auth.response;

    const count = await getUnreadCount(auth.user.id);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[notifications/count] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

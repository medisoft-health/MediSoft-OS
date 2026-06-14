import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { resolveCoachDocToken } from "@/lib/storage/coach-docs";

/**
 * GET /api/sport/coach-doc?token=...
 * Streams a GCS-stored coach document.
 *
 * Avatar tokens (containing "/avatar-" in the decoded key) are served
 * without auth — they are non-sensitive profile pictures that need to
 * render in `<Image>` tags where cookies may not be forwarded.
 *
 * All other doc types (cv, cert, id) remain auth-gated.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ success: false, error: "missing_token" }, { status: 400 });
  }

  // Check if this is an avatar token (non-sensitive, allow without auth)
  let isAvatarToken = false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    isAvatarToken = decoded.includes("/avatar-");
  } catch {
    // If decode fails, treat as non-avatar and require auth
  }

  // Non-avatar docs still require authentication
  if (!isAvatarToken) {
    const auth = await requireSessionApi();
    if ("response" in auth) return auth.response;
  }

  const resolved = await resolveCoachDocToken(token);
  if (!resolved) {
    return NextResponse.json({ success: false, error: "not_found_or_expired" }, { status: 404 });
  }
  return new NextResponse(resolved.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": resolved.contentType,
      "Cache-Control": isAvatarToken ? "public, max-age=3600" : "private, max-age=600",
    },
  });
}

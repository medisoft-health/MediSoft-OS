import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { resolveCoachDocToken } from "@/lib/storage/coach-docs";

/**
 * GET /api/sport/coach-doc?token=...
 * Streams a GCS-stored coach document. Auth-gated (any signed-in user can
 * view a doc only if they possess the token, e.g. an admin reviewing a queue).
 */
export async function GET(request: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ success: false, error: "missing_token" }, { status: 400 });
  }
  const resolved = await resolveCoachDocToken(token);
  if (!resolved) {
    return NextResponse.json({ success: false, error: "not_found_or_expired" }, { status: 404 });
  }
  return new NextResponse(resolved.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": resolved.contentType,
      "Cache-Control": "private, max-age=600",
    },
  });
}

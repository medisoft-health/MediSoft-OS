import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getScanById } from "@/lib/queries/scans";
import { getSignedScanUrl } from "@/lib/storage/scans";

/**
 * GET /api/mediscan/image/[id]
 *
 * Returns a short-lived signed URL for the scan's image. Session-gated;
 * never exposes the storage bucket structure to unauthenticated callers.
 */
export const runtime = "nodejs";
export const maxDuration = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const row = await getScanById(id);
  if (!row) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const url = await getSignedScanUrl(row.scan.imageStorageKey, 600);
  if (!url) {
    return NextResponse.json(
      {
        error: "Image not available — Storage may not be configured.",
        reason: "not_configured",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { url, expiresIn: 600 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

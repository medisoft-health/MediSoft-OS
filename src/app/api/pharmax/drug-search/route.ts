import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { searchRxNorm } from "@/lib/ai/rxnorm";

/**
 * GET /api/pharmax/drug-search?q=<text>
 *
 * Returns RxNorm-normalized drug candidates for the autocomplete picker.
 * RxNorm is keyless and rate-limited generously — no env gate required.
 */
export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ candidates: [] });
  }

  try {
    const candidates = await searchRxNorm(q, 8);
    return NextResponse.json(
      { candidates },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (err) {
    console.error("[/api/pharmax/drug-search] failed", err);
    return NextResponse.json({ error: "Drug search failed" }, { status: 500 });
  }
}

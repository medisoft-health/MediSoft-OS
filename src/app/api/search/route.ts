import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { searchEverything } from "@/lib/queries/search";

/**
 * GET /api/search?q=<query>
 *
 * Returns the flat list of results for the Cmd+K palette. Requires an
 * authenticated session. Empty / short queries return an empty list quickly.
 */
export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchEverything(q, { limit: 20 });
    return NextResponse.json(
      { results },
      {
        headers: {
          // Don't cache user-specific search results.
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (err) {
    console.error("[/api/search] failed", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

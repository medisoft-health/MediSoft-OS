import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { searchSymptoms, SYMPTOM_DATABASE, getSuggestedSymptoms } from "@/lib/medilab/symptom-checker";

/**
 * GET /api/medilab/symptoms?q=xxx&selected=id1,id2
 *
 * Returns symptom suggestions for autocomplete + association-based suggestions.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const selectedStr = searchParams.get("selected") ?? "";
  const selectedIds = selectedStr ? selectedStr.split(",").filter(Boolean) : [];

  let results;
  if (query.trim().length >= 2) {
    results = searchSymptoms(query);
  } else if (selectedIds.length > 0) {
    results = getSuggestedSymptoms(selectedIds);
  } else {
    // Return all symptoms grouped by category (for initial display)
    results = SYMPTOM_DATABASE.slice(0, 20);
  }

  return NextResponse.json({ symptoms: results });
}

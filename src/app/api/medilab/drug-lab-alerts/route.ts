import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getLabResultById } from "@/lib/queries/labs";
import { getPatientFullContext } from "@/lib/queries/patient-context";
import { detectDrugLabInteractions } from "@/lib/medilab/drug-lab-alerts";

/**
 * POST /api/medilab/drug-lab-alerts
 *
 * Detects drug-lab interactions for a patient's lab result.
 * Cross-references active medications against abnormal lab values
 * using a clinical knowledge base.
 */
export const runtime = "nodejs";

const requestSchema = z.object({
  labResultId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const labRow = await getLabResultById(parsed.data.labResultId);
  if (!labRow) {
    return NextResponse.json({ error: "Lab result not found." }, { status: 404 });
  }

  // Normalize lab results: handle old format (test, reference_range, status) and new format (testName, referenceLow/referenceHigh, flag)
  const rawResults = (labRow.lab.results ?? []) as Array<Record<string, unknown>>;
  const currentResults = rawResults.map((r) => {
    const testName = (r.testName ?? r.test ?? "") as string;
    const value = r.value as number | string;
    const unit = (r.unit ?? "") as string;
    let referenceLow = r.referenceLow as number | string | undefined;
    let referenceHigh = r.referenceHigh as number | string | undefined;
    if (!referenceLow && !referenceHigh && r.reference_range) {
      const rangeStr = String(r.reference_range);
      const match = rangeStr.match(/([\d.]+)\s*[-\u2013]\s*([\d.]+)/);
      if (match) { referenceLow = match[1]; referenceHigh = match[2]; }
    }
    const flag = (r.flag ?? r.status ?? "") as string;
    return { testName, value, unit, referenceLow, referenceHigh, flag };
  });

  // Fetch patient's active medications
  const ctx = await getPatientFullContext(labRow.patient.id);
  if (!ctx) {
    return NextResponse.json({
      alerts: [],
      totalActiveDrugs: 0,
      analyzedTests: currentResults.length,
      aiEnhanced: false,
    });
  }

  // Filter to active medications (or completed within last 90 days)
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const activeMeds = ctx.activeMedications.filter((m) => {
    if (m.status === "active") return true;
    // Include recently completed prescriptions
    if (m.status === "completed" && m.startDate) {
      const start = new Date(m.startDate);
      return start >= ninetyDaysAgo;
    }
    return false;
  });

  console.log(
    `[drug-lab-alerts] Patient ${labRow.patient.id}: ${activeMeds.length} active meds, ${currentResults.length} lab results`,
  );

  const result = detectDrugLabInteractions(activeMeds, currentResults);

  console.log(
    `[drug-lab-alerts] Found ${result.alerts.length} alerts: ${result.alerts.map((a) => `${a.drugName}->${a.affectedTest}(${a.severity})`).join(", ") || "none"}`,
  );

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getPatientFullContext } from "@/lib/queries/patient-context";
import { calculateRiskScores } from "@/lib/medilab/risk-engine";
import { detectDrugLabInteractions } from "@/lib/medilab/drug-lab-alerts";

/**
 * GET /api/patients/[id]/dashboard
 *
 * Aggregates all patient health data for the visual dashboard.
 */
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const patientId = parseInt(id, 10);
  if (isNaN(patientId)) {
    return NextResponse.json({ error: "Invalid patient ID." }, { status: 400 });
  }

  try {
    const ctx = await getPatientFullContext(patientId);
    if (!ctx) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

    // Calculate risk scores
    const riskResult = calculateRiskScores(ctx);

    // Detect drug-lab alerts using latest lab results
    const latestLab = ctx.labHistory[0];
    const latestResults = latestLab?.results ?? [];
    const drugAlerts = detectDrugLabInteractions(ctx.activeMedications, latestResults);

    // Extract key biomarker trends (abnormal ones)
    const keyTrends: Array<{ testName: string; values: Array<{ date: string; value: number }>; direction: string }> = [];
    if (ctx.labHistory.length >= 2) {
      // Find tests that appear in multiple panels
      const testHistory = new Map<string, Array<{ date: string; value: number }>>();
      for (const panel of ctx.labHistory.slice(0, 6)) {
        for (const r of panel.results) {
          const key = r.testName.toLowerCase();
          const val = typeof r.value === "number" ? r.value : parseFloat(String(r.value));
          if (isNaN(val)) continue;
          if (!testHistory.has(key)) testHistory.set(key, []);
          testHistory.get(key)!.push({ date: panel.resultDate.toISOString().slice(0, 10), value: val });
        }
      }
      // Pick top 5 with most data points
      const sorted = [...testHistory.entries()]
        .filter(([, vals]) => vals.length >= 2)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5);
      for (const [name, vals] of sorted) {
        const chronological = vals.reverse();
        const first = chronological[0].value;
        const last = chronological[chronological.length - 1].value;
        const direction = last > first * 1.05 ? "worsening" : last < first * 0.95 ? "improving" : "stable";
        keyTrends.push({ testName: name, values: chronological, direction });
      }
    }

    return NextResponse.json({
      patient: {
        id: ctx.demographics.id,
        firstName: ctx.demographics.firstName,
        lastName: ctx.demographics.lastName,
        age: ctx.demographics.age,
        sex: ctx.demographics.sex,
      },
      // MediBot context fields
      conditions: ctx.demographics.chronicConditions?.map((c) => c.description) ?? [],
      medications: ctx.activeMedications?.map((m) => `${m.drugName} ${m.dose}`) ?? [],
      allergies: ctx.demographics.allergies?.map((a) => a.substance) ?? [],
      overallHealthScore: riskResult.overallHealthScore,
      risks: riskResult.risks.map((r) => ({ id: r.id, name: r.name, nameEn: r.nameEn, score: r.score, level: r.level })),
      stats: {
        lastLabDate: ctx.labHistory[0]?.resultDate?.toISOString() ?? null,
        lastLabPanel: ctx.labHistory[0]?.panelName ?? null,
        lastLabAbnormal: latestResults.filter((r) => r.flag && r.flag !== "normal").length,
        activeMeds: ctx.activeMedications.length,
        drugAlertCount: drugAlerts.alerts.length,
        lastVitalDate: ctx.latestVitals?.recordedAt?.toISOString() ?? null,
        lastBP: ctx.latestVitals?.bloodPressureSystolic ? `${ctx.latestVitals.bloodPressureSystolic}/${ctx.latestVitals.bloodPressureDiastolic}` : null,
        lastEncounterDate: ctx.recentEncounters[0]?.encounterDate?.toISOString() ?? null,
      },
      keyTrends,
      alerts: drugAlerts.alerts.slice(0, 5).map((a) => ({
        severity: a.severity,
        message: `${a.drugName} → ${a.expectedEffect}`,
      })),
    });
  } catch (err) {
    console.error("[dashboard] Error:", err);
    return NextResponse.json({ error: "Failed to load dashboard." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  predictDeterioration,
  screenAllPatients,
  screenForSepsis,
  type PatientContext,
  type VitalSignInput,
  type LabInput,
} from "@/lib/medipredict";
import { db } from "@/db";
import { patients, vitals, labResults, prescriptions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// MediPredict API — AI Early Warning System
// GET: Dashboard overview (all patients risk scores)
// POST: Individual patient prediction, batch screening, sepsis check
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    // Get all patients and their latest vitals for dashboard overview
    const allPatients = await db.select().from(patients);

    const dashboard = await Promise.all(
      allPatients.map(async (patient) => {
        const patientVitals = await db
          .select()
          .from(vitals)
          .where(eq(vitals.patientId, patient.id))
          .orderBy(desc(vitals.recordedAt))
          .limit(5);

        const latestVital = patientVitals[0];

        // Calculate quick MEWS for dashboard
        let mewsScore = 0;
        let riskLevel: "critical" | "high" | "moderate" | "low" | "minimal" = "minimal";
        let alertType: "red" | "amber" | "yellow" | "green" = "green";

        if (latestVital) {
          // Quick MEWS calculation
          const bp = latestVital.bloodPressureSystolic ?? 120;
          const hr = latestVital.heartRate ?? 75;
          const rr = latestVital.respiratoryRate ?? 16;
          const temp = Number(latestVital.temperature ?? 37);
          const spo2 = latestVital.spO2 ?? 98;

          if (bp <= 70) mewsScore += 3;
          else if (bp <= 80) mewsScore += 2;
          else if (bp <= 100) mewsScore += 1;

          if (hr >= 130) mewsScore += 3;
          else if (hr >= 110) mewsScore += 2;
          else if (hr >= 100 || hr <= 50) mewsScore += 1;
          else if (hr < 40) mewsScore += 2;

          if (rr >= 30) mewsScore += 3;
          else if (rr >= 21) mewsScore += 2;
          else if (rr >= 15 || rr < 9) mewsScore += 1;

          if (temp < 35 || temp >= 38.5) mewsScore += 2;
          else if (temp < 36 || temp >= 38) mewsScore += 1;

          if (spo2 <= 91) mewsScore += 3;
          else if (spo2 <= 93) mewsScore += 2;
          else if (spo2 <= 95) mewsScore += 1;

          // Determine risk level
          if (mewsScore >= 7) { riskLevel = "critical"; alertType = "red"; }
          else if (mewsScore >= 5) { riskLevel = "high"; alertType = "amber"; }
          else if (mewsScore >= 3) { riskLevel = "moderate"; alertType = "yellow"; }
          else if (mewsScore >= 1) { riskLevel = "low"; alertType = "green"; }
        }

        return {
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          mrn: patient.mrn,
          mewsScore,
          riskLevel,
          alertType,
          lastVitalsAt: latestVital?.recordedAt ?? null,
          vitals: latestVital
            ? {
                bp: `${latestVital.bloodPressureSystolic}/${latestVital.bloodPressureDiastolic}`,
                hr: latestVital.heartRate,
                rr: latestVital.respiratoryRate,
                temp: latestVital.temperature,
                spo2: latestVital.spO2,
              }
            : null,
        };
      })
    );

    // Sort by risk (highest first)
    dashboard.sort((a, b) => {
      const riskOrder = { critical: 5, high: 4, moderate: 3, low: 2, minimal: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });

    const stats = {
      totalPatients: dashboard.length,
      critical: dashboard.filter((p) => p.riskLevel === "critical").length,
      high: dashboard.filter((p) => p.riskLevel === "high").length,
      moderate: dashboard.filter((p) => p.riskLevel === "moderate").length,
      low: dashboard.filter((p) => p.riskLevel === "low").length,
      minimal: dashboard.filter((p) => p.riskLevel === "minimal").length,
    };

    return NextResponse.json({
      success: true,
      system: "MediPredict — AI Early Warning System",
      version: "1.0.0",
      capabilities: [
        "Real-time patient deterioration prediction (12-24h ahead)",
        "MEWS, NEWS2, qSOFA scoring",
        "Vital sign trend analysis",
        "Sepsis early detection",
        "Automated Rapid Response Team activation",
        "AI-powered risk factor identification",
        "Batch patient screening",
      ],
      dashboard: {
        stats,
        patients: dashboard,
      },
      scoringSystems: {
        MEWS: "Modified Early Warning Score (0-14)",
        NEWS2: "National Early Warning Score 2 (0-20)",
        qSOFA: "Quick Sequential Organ Failure Assessment (0-3)",
      },
      alertLevels: {
        red: "Critical — Immediate intervention required, consider ICU",
        amber: "High — Activate Rapid Response Team within 30 minutes",
        yellow: "Moderate — Increase monitoring frequency, reassess in 1 hour",
        green: "Low/Minimal — Continue routine monitoring",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action, patientId, patientIds } = body;

    switch (action) {
      case "predict": {
        // Full AI prediction for a single patient
        if (!patientId) {
          return NextResponse.json(
            { success: false, error: "patientId is required" },
            { status: 400 }
          );
        }

        const context = await buildPatientContext(patientId);
        if (!context) {
          return NextResponse.json(
            { success: false, error: "Patient not found" },
            { status: 404 }
          );
        }

        const prediction = await predictDeterioration(context);

        return NextResponse.json({
          success: true,
          action: "predict",
          patientId,
          prediction,
          generatedAt: new Date().toISOString(),
        });
      }

      case "screen_all": {
        // Batch screening of all (or specified) patients
        const targetIds = patientIds || (await db.select({ id: patients.id }).from(patients)).map((p) => p.id);

        const contexts: PatientContext[] = [];
        for (const id of targetIds) {
          const ctx = await buildPatientContext(id);
          if (ctx) contexts.push(ctx);
        }

        const alerts = await screenAllPatients(contexts);

        return NextResponse.json({
          success: true,
          action: "screen_all",
          totalScreened: contexts.length,
          alertsGenerated: alerts.length,
          alerts,
          generatedAt: new Date().toISOString(),
        });
      }

      case "sepsis_screen": {
        // Sepsis-specific screening
        if (!patientId) {
          return NextResponse.json(
            { success: false, error: "patientId is required" },
            { status: 400 }
          );
        }

        const context = await buildPatientContext(patientId);
        if (!context) {
          return NextResponse.json(
            { success: false, error: "Patient not found" },
            { status: 404 }
          );
        }

        const sepsisResult = await screenForSepsis(context);

        return NextResponse.json({
          success: true,
          action: "sepsis_screen",
          patientId,
          result: sepsisResult,
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}. Valid actions: predict, screen_all, sepsis_screen`,
          },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Helper: Build Patient Context from DB ───────────────────────────────────

async function buildPatientContext(patientId: number): Promise<PatientContext | null> {
  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
  if (!patient) return null;

  // Get recent vitals
  const patientVitals = await db
    .select()
    .from(vitals)
    .where(eq(vitals.patientId, patientId))
    .orderBy(desc(vitals.recordedAt))
    .limit(10);

  // Get recent labs
  const patientLabs = await db
    .select()
    .from(labResults)
    .where(eq(labResults.patientId, patientId))
    .orderBy(desc(labResults.resultDate))
    .limit(5);

  // Get current medications
  const patientMeds = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId));

  // Transform vitals
  const recentVitals: VitalSignInput[] = patientVitals.map((v) => ({
    bpSystolic: v.bloodPressureSystolic ?? undefined,
    bpDiastolic: v.bloodPressureDiastolic ?? undefined,
    heartRate: v.heartRate ?? undefined,
    respiratoryRate: v.respiratoryRate ?? undefined,
    temperature: v.temperature ? Number(v.temperature) : undefined,
    spo2: v.spO2 ?? undefined,
    painScore: v.pain ?? undefined,
    consciousnessLevel: "alert" as const,
    recordedAt: v.recordedAt.toISOString(),
  }));

  // Transform labs
  const recentLabs: LabInput[] = [];
  for (const lab of patientLabs) {
    const results = lab.results as unknown as Array<{ name: string; value: number; unit: string; referenceRange?: string }>;
    if (Array.isArray(results)) {
      for (const r of results) {
        recentLabs.push({
          name: r.name,
          value: r.value,
          unit: r.unit,
          referenceRange: r.referenceRange,
          resultDate: lab.resultDate.toISOString(),
        });
      }
    }
  }

  // Calculate age
  const birthDate = patient.dateOfBirth ? new Date(patient.dateOfBirth) : new Date(1980, 0, 1);
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  // Extract conditions from patient data
  const conditions: string[] = [];
  if (patient.chronicConditions) {
    const cc = patient.chronicConditions as Array<{ description: string }>;
    if (Array.isArray(cc)) conditions.push(...cc.map(c => c.description));
  }





  // Extract medications
  const medications = patientMeds.map((m) => `${m.drugName} ${m.dose || ""}`);

  // Extract allergies
  const allergies: string[] = [];
  if (patient.allergies) {
    const allergyData = patient.allergies as Array<{ substance: string }>;
    if (Array.isArray(allergyData)) allergies.push(...allergyData.map(a => a.substance));
  }

  return {
    patientId,
    age,
    gender: patient.sex || "unknown",
    conditions,
    medications,
    allergies,
    recentVitals,
    recentLabs,
  };
}

/**
 * MediTimeline API — AI Disease Trajectory Prediction
 * Predicts patient health trajectory 5-20 years into the future
 */

import { NextRequest, NextResponse } from "next/server";
import { predictTrajectory, compareScenarios, type TimelinePatient } from "@/lib/meditimeline";
import { db } from "@/db";
import { patients, vitals, prescriptions, labResults } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  return NextResponse.json({
    service: "MediTimeline",
    version: "1.0.0",
    status: "active",
    description: "AI Disease Trajectory Prediction — forecasts patient health 5-20 years ahead",
    capabilities: [
      "Disease progression modeling (DM, HTN, CKD, HF, COPD, Obesity)",
      "Multi-scenario comparison (baseline, optimistic, pessimistic)",
      "Intervention impact simulation",
      "Cardiovascular risk scoring (Framingham-based)",
      "Cost projection (SAR)",
      "Evidence-based recommendations with evidence levels",
      "Modifiable risk factor identification",
      "AI-powered personalized predictions (Gemini 2.5 Pro)",
    ],
    diseaseModels: [
      "Type 2 Diabetes", "Hypertension", "Chronic Kidney Disease",
      "Heart Failure", "COPD", "Obesity"
    ],
    endpoints: {
      "GET /": "Service status",
      "POST / (action: predict)": "Generate full trajectory prediction",
      "POST / (action: compare)": "Compare two treatment scenarios",
      "POST / (action: quick_risk)": "Quick cardiovascular risk assessment",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, patientId, horizonYears = 10, scenario1, scenario2 } = body;

    switch (action) {
      case "predict": {
        if (!patientId) {
          return NextResponse.json({ error: "patientId required" }, { status: 400 });
        }

        // Fetch patient data from database
        const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
        if (!patient.length) {
          return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        const p = patient[0];

        // Fetch latest vitals
        const latestVitals = await db.select().from(vitals)
          .where(eq(vitals.patientId, patientId))
          .orderBy(desc(vitals.recordedAt))
          .limit(1);

        // Fetch medications
        const meds = await db.select().from(prescriptions)
          .where(eq(prescriptions.patientId, patientId));

        // Fetch lab results
        const labs = await db.select().from(labResults)
          .where(eq(labResults.patientId, patientId))
          .orderBy(desc(labResults.resultDate))
          .limit(5);

        // Build patient profile for timeline
        const v = latestVitals[0];
        const chronicConditions = (p.chronicConditions as unknown as string[]) || [];
        const allergiesData = (p.allergies as unknown as Array<{ substance: string }>) || [];

        // Extract lab values
        let hba1c: number | undefined;
        let ldl: number | undefined;
        let hdl: number | undefined;
        let egfr: number | undefined;
        let creatinine: number | undefined;
        
        for (const lab of labs) {
          const results = (lab.results as unknown as Array<{ test: string; value: string | number }>) || [];
          for (const r of results) {
            const testName = r.test?.toLowerCase() || "";
            const val = typeof r.value === "string" ? parseFloat(r.value) : r.value;
            if (testName.includes("hba1c") || testName.includes("a1c")) hba1c = val;
            if (testName.includes("ldl")) ldl = val;
            if (testName.includes("hdl")) hdl = val;
            if (testName.includes("egfr") || testName.includes("gfr")) egfr = val;
            if (testName.includes("creatinine")) creatinine = val;
          }
        }

        const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
        const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 50;

        const timelinePatient: TimelinePatient = {
          id: patientId,
          age,
          sex: (p.sex as "male" | "female") || "male",
          weight: v?.weightKg ? Number(v.weightKg) : undefined,
          height: v?.heightCm ? Number(v.heightCm) : undefined,
          bmi: (v?.weightKg && v?.heightCm) ? Number(v.weightKg) / Math.pow(Number(v.heightCm) / 100, 2) : undefined,
          smokingStatus: (body.smokingStatus as "current" | "former" | "never") || "never",
          alcoholUse: body.alcoholUse || "none",
          exerciseLevel: body.exerciseLevel || "light",
          familyHistory: body.familyHistory || [],
          currentConditions: chronicConditions,
          currentMedications: meds.map(m => m.drugName),
          vitals: {
            systolic: v?.bloodPressureSystolic ? Number(v.bloodPressureSystolic) : undefined,
            diastolic: v?.bloodPressureDiastolic ? Number(v.bloodPressureDiastolic) : undefined,
            heartRate: v?.heartRate ? Number(v.heartRate) : undefined,
            hba1c,
            ldl,
            hdl,
            egfr,
            creatinine,
            bmi: (v?.weightKg && v?.heightCm) ? Number(v.weightKg) / Math.pow(Number(v.heightCm) / 100, 2) : undefined,
          },
        };

        const trajectory = await predictTrajectory(timelinePatient, horizonYears);
        
        return NextResponse.json({
          success: true,
          data: trajectory,
        });
      }

      case "compare": {
        if (!patientId || !scenario1 || !scenario2) {
          return NextResponse.json({ error: "patientId, scenario1, and scenario2 required" }, { status: 400 });
        }

        const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
        if (!patient.length) {
          return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        const p = patient[0];
        const chronicConditions = (p.chronicConditions as unknown as string[]) || [];
        const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
        const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 50;

        const timelinePatient: TimelinePatient = {
          id: patientId,
          age,
          sex: (p.sex as "male" | "female") || "male",
          currentConditions: chronicConditions,
          currentMedications: [],
        };

        const comparison = await compareScenarios(timelinePatient, scenario1, scenario2, horizonYears);
        
        return NextResponse.json({
          success: true,
          data: comparison,
        });
      }

      case "quick_risk": {
        if (!patientId) {
          return NextResponse.json({ error: "patientId required" }, { status: 400 });
        }

        const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
        if (!patient.length) {
          return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        const p = patient[0];
        const latestVitals = await db.select().from(vitals)
          .where(eq(vitals.patientId, patientId))
          .orderBy(desc(vitals.recordedAt))
          .limit(1);

        const v = latestVitals[0];
        const chronicConditions = (p.chronicConditions as unknown as string[]) || [];
        const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
        const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 50;

        const timelinePatient: TimelinePatient = {
          id: patientId,
          age,
          sex: (p.sex as "male" | "female") || "male",
          currentConditions: chronicConditions,
          currentMedications: [],
          vitals: {
            systolic: v?.bloodPressureSystolic ? Number(v.bloodPressureSystolic) : undefined,
            diastolic: v?.bloodPressureDiastolic ? Number(v.bloodPressureDiastolic) : undefined,
            bmi: (v?.weightKg && v?.heightCm) ? Number(v.weightKg) / Math.pow(Number(v.heightCm) / 100, 2) : undefined,
          },
        };

        // Quick health score
        let healthScore = 100;
        healthScore -= chronicConditions.length * 8;
        if (v?.bloodPressureSystolic && Number(v.bloodPressureSystolic) > 140) healthScore -= 10;
        if (age > 65) healthScore -= 10;
        healthScore = Math.max(20, healthScore);

        return NextResponse.json({
          success: true,
          data: {
            patientId,
            healthScore,
            riskLevel: healthScore > 70 ? "low" : healthScore > 50 ? "moderate" : "high",
            conditions: chronicConditions.length,
            message: `Patient health score: ${healthScore}/100. ${chronicConditions.length} active conditions.`,
          },
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["predict", "compare", "quick_risk"],
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

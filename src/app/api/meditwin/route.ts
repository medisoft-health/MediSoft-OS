import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  simulateTreatment,
  simulateRegimen,
  simulateDiseaseProgression,
  type PatientBiologicalProfile,
} from "@/lib/meditwin";

// ─────────────────────────────────────────────────────────────────────────────
// MediTwin API — Patient Digital Twin
// GET: Capabilities and demo
// POST: Simulate treatment, regimen, or disease progression
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    success: true,
    system: "MediTwin — Patient Digital Twin",
    version: "1.0.0",
    description: "Virtual simulation of patient physiology for precision medicine. Test treatments on the patient's digital twin before administering.",
    capabilities: [
      "Individual drug response prediction",
      "Pharmacokinetic/pharmacodynamic modeling",
      "Multi-drug regimen optimization",
      "Side effect probability estimation",
      "Organ impact assessment (renal, hepatic, cardiac)",
      "Pharmacogenomic-guided dosing",
      "Disease progression modeling",
      "Treatment comparison simulation",
      "Dose adjustment calculation",
    ],
    actions: {
      simulate_treatment: "Simulate a single drug on the patient's digital twin",
      simulate_regimen: "Simulate a multi-drug regimen with interaction analysis",
      simulate_progression: "Model disease progression over time",
      compare_treatments: "Compare two treatment options head-to-head",
    },
    demo: {
      description: "Simulate Metformin on a diabetic patient",
      example: {
        action: "simulate_treatment",
        profile: {
          patientId: 4,
          demographics: { age: 51, gender: "female", weight: 72, height: 160, bmi: 28.1 },
          organFunction: {
            renalFunction: { egfr: 72, creatinine: 1.1, stage: "mild" },
            hepaticFunction: { alt: 28, ast: 25, bilirubin: 0.8, albumin: 4.0 },
            cardiacFunction: { ejectionFraction: 60 },
          },
          currentMedications: [
            { name: "Metformin", dose: "2000mg", frequency: "daily", route: "oral", startDate: "2024-01-01" },
            { name: "Amlodipine", dose: "5mg", frequency: "daily", route: "oral", startDate: "2024-06-01" },
          ],
          conditions: ["Type 2 Diabetes", "Hypertension", "Obesity"],
          allergies: ["Sulfonamides"],
          vitals: { bpSystolic: 135, bpDiastolic: 85, heartRate: 78, temperature: 36.8, spo2: 98 },
          labResults: [
            { name: "HbA1c", value: 9.2, unit: "%", date: "2026-05-15" },
            { name: "eGFR", value: 72, unit: "mL/min", date: "2026-05-15" },
            { name: "ALT", value: 28, unit: "U/L", date: "2026-05-15" },
          ],
        },
        proposedTreatment: {
          medication: "Empagliflozin (Jardiance)",
          dose: "10mg",
          route: "oral",
          frequency: "once daily",
          duration: "12 months",
        },
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "simulate_treatment": {
        const { profile, proposedTreatment } = body;

        if (!profile || !proposedTreatment) {
          return NextResponse.json(
            { success: false, error: "profile and proposedTreatment are required" },
            { status: 400 }
          );
        }

        const simulation = await simulateTreatment(
          profile as PatientBiologicalProfile,
          proposedTreatment
        );

        return NextResponse.json({
          success: true,
          action: "simulate_treatment",
          simulation,
          message: `Digital twin simulation complete. Safety: ${simulation.overallSafetyScore}/100, Efficacy: ${simulation.prediction.efficacyScore}/100`,
        });
      }

      case "simulate_regimen": {
        const { profile, regimen } = body;

        if (!profile || !regimen) {
          return NextResponse.json(
            { success: false, error: "profile and regimen are required" },
            { status: 400 }
          );
        }

        const result = await simulateRegimen(
          profile as PatientBiologicalProfile,
          regimen
        );

        return NextResponse.json({
          success: true,
          action: "simulate_regimen",
          simulation: result,
          message: `Regimen simulation complete. Efficacy: ${result.overallEfficacy}/100, Safety: ${result.overallSafety}/100, Synergy: ${result.synergyScore}/100`,
        });
      }

      case "simulate_progression": {
        const { profile, condition, timeframeMonths } = body;

        if (!profile || !condition) {
          return NextResponse.json(
            { success: false, error: "profile and condition are required" },
            { status: 400 }
          );
        }

        const result = await simulateDiseaseProgression(
          profile as PatientBiologicalProfile,
          condition,
          timeframeMonths || 12
        );

        return NextResponse.json({
          success: true,
          action: "simulate_progression",
          simulation: result,
          message: `Disease progression modeled over ${timeframeMonths || 12} months`,
        });
      }

      case "compare_treatments": {
        const { profile, treatmentA, treatmentB } = body;

        if (!profile || !treatmentA || !treatmentB) {
          return NextResponse.json(
            { success: false, error: "profile, treatmentA, and treatmentB are required" },
            { status: 400 }
          );
        }

        const [simA, simB] = await Promise.all([
          simulateTreatment(profile as PatientBiologicalProfile, treatmentA),
          simulateTreatment(profile as PatientBiologicalProfile, treatmentB),
        ]);

        const winner =
          simA.prediction.efficacyScore + simA.overallSafetyScore >
          simB.prediction.efficacyScore + simB.overallSafetyScore
            ? "A"
            : "B";

        return NextResponse.json({
          success: true,
          action: "compare_treatments",
          comparison: {
            treatmentA: {
              name: treatmentA.medication,
              efficacy: simA.prediction.efficacyScore,
              safety: simA.overallSafetyScore,
              sideEffects: simA.sideEffects.length,
              interactions: simA.interactions.length,
            },
            treatmentB: {
              name: treatmentB.medication,
              efficacy: simB.prediction.efficacyScore,
              safety: simB.overallSafetyScore,
              sideEffects: simB.sideEffects.length,
              interactions: simB.interactions.length,
            },
            recommendation: winner === "A" ? treatmentA.medication : treatmentB.medication,
            reason: `${winner === "A" ? treatmentA.medication : treatmentB.medication} shows better combined efficacy+safety profile for this patient`,
          },
          simulationA: simA,
          simulationB: simB,
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}. Valid: simulate_treatment, simulate_regimen, simulate_progression, compare_treatments`,
          },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

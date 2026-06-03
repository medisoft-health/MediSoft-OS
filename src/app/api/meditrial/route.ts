/**
 * MediTrial API — AI Clinical Trial Matching & Recruitment
 * Automatically matches patients with eligible clinical trials
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  matchPatientToTrials,
  searchTrialsByCondition,
  getTrialStats,
  TRIAL_DATABASE,
  DEMO_PATIENTS,
  type PatientProfile
} from "@/lib/meditrial";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const stats = getTrialStats();
  return NextResponse.json({
    service: "MediTrial",
    version: "1.0.0",
    status: "active",
    description: "AI Clinical Trial Matching & Recruitment — automatically matches patients with eligible clinical trials using NLP eligibility analysis",
    stats,
    capabilities: [
      "Patient-to-trial matching with compatibility scoring (0-100%)",
      "Inclusion/exclusion criteria analysis",
      "Biomarker and genomic marker matching",
      "ECOG performance status verification",
      "Multi-site trial search (Qatar, Saudi Arabia, UAE)",
      "AI-generated match summaries (Gemini 2.5 Pro)",
      "ClinicalTrials.gov integration",
      "Prior therapy requirement checking",
      "Eligibility status classification (eligible/likely/possibly/ineligible)",
      "Actionable next steps for each match"
    ],
    trials: TRIAL_DATABASE.map(t => ({
      nctId: t.nctId,
      title: t.title,
      phase: t.phase,
      status: t.status,
      condition: t.condition,
      sponsor: t.sponsor,
      locations: t.locations.map(l => `${l.facility}, ${l.city}`)
    })),
    demoPatients: DEMO_PATIENTS.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      diagnoses: p.diagnoses
    })),
    endpoints: {
      "GET /": "Service status, trial database, and statistics",
      "POST / (action: match)": "Match a patient against all available trials",
      "POST / (action: search)": "Search trials by condition",
      "POST / (action: demo)": "Run a demo patient match"
    }
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "match": {
        const { patient } = body;
        if (!patient) {
          return NextResponse.json({ error: "patient profile is required" }, { status: 400 });
        }
        const result = await matchPatientToTrials(patient as PatientProfile);
        return NextResponse.json({ success: true, result });
      }

      case "search": {
        const { condition } = body;
        if (!condition) {
          return NextResponse.json({ error: "condition is required" }, { status: 400 });
        }
        const trials = searchTrialsByCondition(condition);
        return NextResponse.json({
          success: true,
          condition,
          totalResults: trials.length,
          trials: trials.map(t => ({
            nctId: t.nctId,
            title: t.title,
            phase: t.phase,
            status: t.status,
            intervention: t.intervention,
            locations: t.locations,
            eligibility: {
              ageRange: `${t.eligibility.minAge}-${t.eligibility.maxAge === 999 ? "no limit" : t.eligibility.maxAge}`,
              gender: t.eligibility.gender,
              keyInclusion: t.eligibility.inclusionCriteria.slice(0, 3)
            }
          }))
        });
      }

      case "demo": {
        const { patientId } = body;
        const patient = DEMO_PATIENTS.find(p => p.id === patientId) || DEMO_PATIENTS[0];
        const result = await matchPatientToTrials(patient);
        return NextResponse.json({
          success: true,
          patient: {
            name: patient.name,
            age: patient.age,
            diagnoses: patient.diagnoses,
            genomicMarkers: patient.genomicMarkers
          },
          result
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["match", "search", "demo"]
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

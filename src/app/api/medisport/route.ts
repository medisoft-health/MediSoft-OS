import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  analyzeAthleteLabs,
  analyzeBodyComposition,
  calculateACWR,
  predictInjuryRisk,
  checkWADACompliance,
  generateTUEApplication,
  assessConcussion,
  performPCMA,
  generateNutritionPlan,
  analyzeRecovery,
  analyzeMovement,
  assessMentalPerformance,
  generateHeatSafetyPlan,
  generateTeamOverview,
  generateRehabProtocol,
  analyzeCardiacScreening,
  analyzePerformanceTest,
  generateFitnessProfile,
  generateAthleteReport,
  type AthleteLabPanel,
  type BodyComposition,
  type TrainingLoad,
  type SleepAnalysis,
  type SCAT6Assessment,
  type PCMAAssessment,
  type MovementAssessment,
  type MentalPerformanceAssessment,
  type CardiacScreening,
  type PerformanceTest,
} from "@/lib/medisport";

// ─────────────────────────────────────────────────────────────────────────────
// MediSport API — World's First Clinical-Grade Sports Medicine AI Platform
// GET: Dashboard overview with all 14 module statuses
// POST: Individual module actions (lab analysis, injury prediction, WADA check, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const overview = {
      platform: "MediSport",
      version: "1.0.0",
      status: "active",
      modules: [
        { id: "lab-body-comp", name: "Lab & Body Composition Tracker", status: "active", description: "Periodic blood work with sport-specific ranges + DEXA/BIA body composition trending" },
        { id: "athlete-monitoring", name: "Athlete Monitoring & Injury Prediction", status: "active", description: "ACWR calculation, training load monitoring, AI injury risk prediction" },
        { id: "anti-doping", name: "Anti-Doping & Sports Pharmacy (WADA)", status: "active", description: "WADA 2026 Prohibited List check, TUE application generation, safe alternatives" },
        { id: "concussion", name: "Concussion Management (SCAT6)", status: "active", description: "SCAT6 protocol, return-to-play staging, baseline comparison" },
        { id: "pcma", name: "Pre-Competition Medical Assessment", status: "active", description: "FIFA/IOC PCMA, cardiac screening, Seattle ECG criteria" },
        { id: "nutrition", name: "Sports Nutrition & Hydration AI", status: "active", description: "Periodized nutrition, supplement safety, hydration protocols" },
        { id: "sleep-recovery", name: "Sleep & Recovery Intelligence", status: "active", description: "Sleep analysis, HRV tracking, recovery scoring, readiness assessment" },
        { id: "biomechanics", name: "Biomechanics & Movement Analysis", status: "active", description: "FMS scoring, force plate analysis, gait analysis, asymmetry detection" },
        { id: "psychology", name: "Sports Psychology & Mental Performance", status: "active", description: "PHQ-9/GAD-7, burnout detection, performance anxiety, mental coaching" },
        { id: "heat-safety", name: "Heat & Environmental Safety", status: "active", description: "WBGT monitoring, acclimatization tracking, emergency protocols" },
        { id: "team-dashboard", name: "Team Dashboard", status: "active", description: "Squad availability, risk alerts, performance trends, upcoming assessments" },
        { id: "rehab-rtp", name: "Rehabilitation & Return-to-Play", status: "active", description: "Phased rehab protocols, objective criteria, re-injury risk scoring" },
        { id: "cardiac", name: "Cardiac Screening & SCD Prevention", status: "active", description: "ECG interpretation (Seattle criteria), echo analysis, stress test evaluation" },
        { id: "performance-testing", name: "Performance Testing & Fitness Assessment", status: "active", description: "VO2max, lactate threshold, sprint, strength, power profiling" },
      ],
      compliance: ["WADA 2026", "FIFA Medical", "IOC Medical Code", "FHIR R4", "HIPAA", "GDPR"],
      integrations: ["Google Health Connect", "MediSense IoT", "PharmaX Drug Safety", "MediLab", "MediScan"],
      capabilities: {
        totalModules: 14,
        aiPowered: true,
        evidenceBased: true,
        multiSport: true,
        teamManagement: true,
        regulatoryCompliance: true,
        wearableIntegration: true,
        reportGeneration: true,
      },
    };

    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load MediSport overview" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      // ── MODULE 1: Lab & Body Composition ──
      case "analyze-labs": {
        const panel: AthleteLabPanel = data;
        const results = await analyzeAthleteLabs(panel);
        return NextResponse.json({ success: true, action, results });
      }

      case "analyze-body-composition": {
        const { current, history } = data as { current: BodyComposition; history: BodyComposition[] };
        const results = await analyzeBodyComposition(current, history);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 2: Athlete Monitoring & Injury Prediction ──
      case "calculate-acwr": {
        const sessions: TrainingLoad[] = data.sessions;
        const results = calculateACWR(sessions);
        return NextResponse.json({ success: true, action, results });
      }

      case "predict-injury": {
        const { athleteId, athleteName, trainingHistory, sleepData, bodyComp, previousInjuries } = data;
        const results = await predictInjuryRisk(athleteId, athleteName, trainingHistory, sleepData, bodyComp, previousInjuries);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 3: Anti-Doping (WADA) ──
      case "check-wada": {
        const { medication, ingredients } = data;
        const results = await checkWADACompliance(medication, ingredients);
        return NextResponse.json({ success: true, action, results });
      }

      case "generate-tue": {
        const results = await generateTUEApplication(data);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 4: Concussion Management ──
      case "assess-concussion": {
        const assessment: SCAT6Assessment = data;
        const results = await assessConcussion(assessment);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 5: Pre-Competition Medical Assessment ──
      case "perform-pcma": {
        const pcma: PCMAAssessment = data;
        const results = await performPCMA(pcma);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 6: Sports Nutrition ──
      case "generate-nutrition-plan": {
        const { athleteId, sport, weight, goal, seasonPhase, labResults, trainingLoad } = data;
        const results = await generateNutritionPlan(athleteId, sport, weight, goal, seasonPhase, labResults, trainingLoad);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 7: Sleep & Recovery ──
      case "analyze-recovery": {
        const { athleteId, sleepData, trainingLoad, wellnessScores } = data;
        const results = await analyzeRecovery(athleteId, sleepData, trainingLoad, wellnessScores);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 8: Biomechanics ──
      case "analyze-movement": {
        const movement: MovementAssessment = data;
        const results = await analyzeMovement(movement);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 9: Sports Psychology ──
      case "assess-mental-performance": {
        const mental: MentalPerformanceAssessment = data;
        const results = await assessMentalPerformance(mental);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 10: Heat Safety ──
      case "assess-heat-safety": {
        const { wbgt, temperature, humidity, athletes } = data;
        const results = await generateHeatSafetyPlan(wbgt, temperature, humidity, athletes);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 11: Team Dashboard ──
      case "team-overview": {
        const { teamName, sport, athletes } = data;
        const results = await generateTeamOverview(teamName, sport, athletes);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 12: Rehabilitation & Return-to-Play ──
      case "generate-rehab-protocol": {
        const { athleteId, injuryType, bodyPart, severity, sport } = data;
        const results = await generateRehabProtocol(athleteId, injuryType, bodyPart, severity, sport);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 13: Cardiac Screening ──
      case "analyze-cardiac": {
        const cardiac: CardiacScreening = data;
        const results = await analyzeCardiacScreening(cardiac);
        return NextResponse.json({ success: true, action, results });
      }

      // ── MODULE 14: Performance Testing ──
      case "analyze-performance-test": {
        const test: PerformanceTest = data;
        const results = await analyzePerformanceTest(test);
        return NextResponse.json({ success: true, action, results });
      }

      case "generate-fitness-profile": {
        const { athleteId, tests } = data as { athleteId: number; tests: PerformanceTest[] };
        const results = await generateFitnessProfile(athleteId, tests);
        return NextResponse.json({ success: true, action, results });
      }

      // ── REPORT GENERATION ──
      case "generate-report": {
        const { athleteId, athleteName, reportType, reportData } = data;
        const results = await generateAthleteReport(athleteId, athleteName, reportType, reportData);
        return NextResponse.json({ success: true, action, results });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            availableActions: [
              "analyze-labs", "analyze-body-composition",
              "calculate-acwr", "predict-injury",
              "check-wada", "generate-tue",
              "assess-concussion",
              "perform-pcma",
              "generate-nutrition-plan",
              "analyze-recovery",
              "analyze-movement",
              "assess-mental-performance",
              "assess-heat-safety",
              "team-overview",
              "generate-rehab-protocol",
              "analyze-cardiac",
              "analyze-performance-test", "generate-fitness-profile",
              "generate-report",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

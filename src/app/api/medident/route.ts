import { NextRequest, NextResponse } from "next/server";
import {
  analyzeDentalChart,
  analyzeRadiograph,
  analyzePeriodontalChart,
  generateTreatmentPlan,
  planImplant,
  analyzeOrthodontics,
  assessEndodontic,
  planProsthodontics,
  assessPediatric,
  planOralSurgery,
  assessTMJ,
  queryDentalAI,
  estimateDentalCosts,
  triageDentalEmergency,
  recommendMaterial,
  type DentalChart,
  type DentalRadiograph,
  type PeriodontalChart,
  type DentalAIQuery,
} from "@/lib/medident";

// ─────────────────────────────────────────────────────────────────────────────
// MediDent API — World's First Clinical-Grade AI Dental Platform
// GET: Dashboard overview with all 12 module statuses
// POST: Individual module actions
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const overview = {
      platform: "MediDent",
      version: "1.0.0",
      status: "active",
      tagline: "World's First Clinical-Grade AI Dental Platform",
      modules: [
        {
          id: "dental-chart",
          name: "Interactive Dental Chart",
          status: "active",
          description: "FDI/Universal/Palmer notation, per-surface charting, condition tracking, AI risk analysis",
          icon: "🦷",
        },
        {
          id: "radiograph-ai",
          name: "AI Radiograph Analysis",
          status: "active",
          description: "Periapical, bitewing, panoramic, CBCT, cephalometric AI interpretation with findings",
          icon: "📷",
        },
        {
          id: "periodontal",
          name: "Periodontal Charting & AI",
          status: "active",
          description: "6-point probing, BOP, CAL, AAP/EFP 2017 staging/grading, risk assessment",
          icon: "📊",
        },
        {
          id: "treatment-planning",
          name: "AI Treatment Planning",
          status: "active",
          description: "Phased treatment plans, CDT coding, cost estimation, insurance coverage, alternatives",
          icon: "📋",
        },
        {
          id: "implant",
          name: "Implant Planning AI",
          status: "active",
          description: "Bone assessment, implant selection, surgical approach, prosthetic planning, risk scoring",
          icon: "🔩",
        },
        {
          id: "orthodontics",
          name: "Orthodontic Analysis AI",
          status: "active",
          description: "Cephalometric analysis, skeletal classification, treatment options, extraction decisions",
          icon: "😁",
        },
        {
          id: "endodontics",
          name: "Endodontic Module AI",
          status: "active",
          description: "Pulp/periapical diagnosis, canal morphology, treatment protocol, prognosis assessment",
          icon: "🔬",
        },
        {
          id: "prosthodontics",
          name: "Prosthodontic Planning AI",
          status: "active",
          description: "Kennedy classification, abutment assessment, design, material selection, lab prescription",
          icon: "👑",
        },
        {
          id: "pediatric",
          name: "Pediatric Dentistry AI",
          status: "active",
          description: "Caries risk (CAMBRA), behavior management, eruption tracking, preventive planning",
          icon: "👶",
        },
        {
          id: "oral-surgery",
          name: "Oral Surgery Planning AI",
          status: "active",
          description: "Difficulty scoring, surgical planning, anesthesia, post-op protocols, complication management",
          icon: "🏥",
        },
        {
          id: "tmj",
          name: "TMJ Assessment AI",
          status: "active",
          description: "DC/TMD criteria, pain assessment, ROM analysis, splint therapy, treatment sequencing",
          icon: "🦴",
        },
        {
          id: "dental-ai",
          name: "Dental AI Assistant",
          status: "active",
          description: "Clinical decisions, patient education, differential diagnosis, material selection, evidence search",
          icon: "🤖",
        },
      ],
      additionalFeatures: [
        { name: "Cost Estimation", description: "Saudi market dental procedure cost estimates with CDT codes" },
        { name: "Emergency Triage", description: "AI-powered dental emergency assessment and prioritization" },
        { name: "Material Recommendation", description: "Evidence-based dental material selection for any procedure" },
      ],
      compliance: ["FDI ISO 3950", "ADA CDT", "AAP/EFP 2017", "AAE Guidelines", "AAPD Guidelines", "DC/TMD", "ITI Protocols", "FHIR R4"],
      integrations: ["MediScan (Radiology)", "PharmaX (Drug Safety)", "MediBot (AI Chat)", "FHIR Store", "Insurance (NPHIES)"],
      capabilities: {
        totalModules: 12,
        aiPowered: true,
        evidenceBased: true,
        multiNotation: true, // FDI + Universal + Palmer
        bilingualReports: true, // Arabic + English
        insuranceIntegration: true,
        fhirCompatible: true,
      },
    };
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load MediDent overview" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing 'action' field. Available actions: analyze-chart, analyze-radiograph, analyze-perio, generate-treatment-plan, plan-implant, analyze-orthodontics, assess-endodontic, plan-prosthodontics, assess-pediatric, plan-oral-surgery, assess-tmj, dental-ai-query, estimate-costs, triage-emergency, recommend-material" },
        { status: 400 }
      );
    }

    let result: unknown;

    switch (action) {
      // ── Module 1: Dental Chart Analysis ──
      case "analyze-chart": {
        const chart = data as DentalChart;
        if (!chart.patientId || !chart.teeth) {
          return NextResponse.json({ error: "Missing required fields: patientId, teeth" }, { status: 400 });
        }
        result = await analyzeDentalChart(chart);
        break;
      }

      // ── Module 2: Radiograph Analysis ──
      case "analyze-radiograph": {
        const radiograph = data as DentalRadiograph;
        if (!radiograph.patientId || !radiograph.imageType) {
          return NextResponse.json({ error: "Missing required fields: patientId, imageType" }, { status: 400 });
        }
        result = await analyzeRadiograph(radiograph);
        break;
      }

      // ── Module 3: Periodontal Analysis ──
      case "analyze-perio": {
        const perioChart = data as PeriodontalChart;
        if (!perioChart.patientId || !perioChart.teeth) {
          return NextResponse.json({ error: "Missing required fields: patientId, teeth" }, { status: 400 });
        }
        result = await analyzePeriodontalChart(perioChart);
        break;
      }

      // ── Module 4: Treatment Planning ──
      case "generate-treatment-plan": {
        if (!data.patientId || !data.chiefComplaint || !data.dentalChart) {
          return NextResponse.json({ error: "Missing required fields: patientId, chiefComplaint, dentalChart" }, { status: 400 });
        }
        result = await generateTreatmentPlan(data);
        break;
      }

      // ── Module 5: Implant Planning ──
      case "plan-implant": {
        if (!data.patientId || !data.site) {
          return NextResponse.json({ error: "Missing required fields: patientId, site" }, { status: 400 });
        }
        result = await planImplant(data);
        break;
      }

      // ── Module 6: Orthodontic Analysis ──
      case "analyze-orthodontics": {
        if (!data.patientId || !data.age || !data.chiefComplaint) {
          return NextResponse.json({ error: "Missing required fields: patientId, age, chiefComplaint" }, { status: 400 });
        }
        result = await analyzeOrthodontics(data);
        break;
      }

      // ── Module 7: Endodontic Assessment ──
      case "assess-endodontic": {
        if (!data.patientId || !data.toothId || !data.chiefComplaint) {
          return NextResponse.json({ error: "Missing required fields: patientId, toothId, chiefComplaint" }, { status: 400 });
        }
        result = await assessEndodontic(data);
        break;
      }

      // ── Module 8: Prosthodontic Planning ──
      case "plan-prosthodontics": {
        if (!data.patientId || !data.type || !data.missingTeeth) {
          return NextResponse.json({ error: "Missing required fields: patientId, type, missingTeeth" }, { status: 400 });
        }
        result = await planProsthodontics(data);
        break;
      }

      // ── Module 9: Pediatric Assessment ──
      case "assess-pediatric": {
        if (!data.patientId || !data.ageMonths || !data.dentitionStage) {
          return NextResponse.json({ error: "Missing required fields: patientId, ageMonths, dentitionStage" }, { status: 400 });
        }
        result = await assessPediatric(data);
        break;
      }

      // ── Module 10: Oral Surgery Planning ──
      case "plan-oral-surgery": {
        if (!data.patientId || !data.procedure) {
          return NextResponse.json({ error: "Missing required fields: patientId, procedure" }, { status: 400 });
        }
        result = await planOralSurgery(data);
        break;
      }

      // ── Module 11: TMJ Assessment ──
      case "assess-tmj": {
        if (!data.patientId || !data.chiefComplaint) {
          return NextResponse.json({ error: "Missing required fields: patientId, chiefComplaint" }, { status: 400 });
        }
        result = await assessTMJ(data);
        break;
      }

      // ── Module 12: Dental AI Assistant ──
      case "dental-ai-query": {
        const query = data as DentalAIQuery;
        if (!query.query || !query.mode) {
          return NextResponse.json({ error: "Missing required fields: query, mode" }, { status: 400 });
        }
        result = await queryDentalAI(query);
        break;
      }

      // ── Additional: Cost Estimation ──
      case "estimate-costs": {
        if (!data.procedures || !data.region) {
          return NextResponse.json({ error: "Missing required fields: procedures, region" }, { status: 400 });
        }
        result = await estimateDentalCosts(data);
        break;
      }

      // ── Additional: Emergency Triage ──
      case "triage-emergency": {
        if (!data.patientId || !data.symptoms) {
          return NextResponse.json({ error: "Missing required fields: patientId, symptoms" }, { status: 400 });
        }
        result = await triageDentalEmergency(data);
        break;
      }

      // ── Additional: Material Recommendation ──
      case "recommend-material": {
        if (!data.procedure || !data.tooth) {
          return NextResponse.json({ error: "Missing required fields: procedure, tooth" }, { status: 400 });
        }
        result = await recommendMaterial(data);
        break;
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            availableActions: [
              "analyze-chart",
              "analyze-radiograph",
              "analyze-perio",
              "generate-treatment-plan",
              "plan-implant",
              "analyze-orthodontics",
              "assess-endodontic",
              "plan-prosthodontics",
              "assess-pediatric",
              "plan-oral-surgery",
              "assess-tmj",
              "dental-ai-query",
              "estimate-costs",
              "triage-emergency",
              "recommend-material",
            ],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[MediDent API Error]", message);
    return NextResponse.json(
      { error: "MediDent processing failed", details: message },
      { status: 500 }
    );
  }
}

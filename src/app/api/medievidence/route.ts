/**
 * MediEvidence API — Living Clinical Guidelines
 * Real-time evidence-based medicine engine
 */

import { NextRequest, NextResponse } from "next/server";
import { queryGuidelines, getDrugEvidence, validateTreatmentPlan, GUIDELINE_DATABASE, RECENT_UPDATES } from "@/lib/medievidence";

export async function GET() {
  const totalGuidelines = Object.values(GUIDELINE_DATABASE).reduce((sum, arr) => sum + arr.length, 0);
  const conditions = Object.keys(GUIDELINE_DATABASE);
  
  return NextResponse.json({
    service: "MediEvidence",
    version: "1.0.0",
    status: "active",
    description: "Living Clinical Guidelines — real-time evidence-based medicine engine with auto-updates from latest research",
    stats: {
      totalConditions: conditions.length,
      totalRecommendations: totalGuidelines,
      recentUpdates: RECENT_UPDATES.length,
      sources: ["ADA", "ESC", "AHA/ACC", "GINA", "GOLD", "KDIGO", "NICE", "WHO"],
      lastDatabaseUpdate: "2025-12-15",
    },
    conditions,
    endpoints: {
      "GET /": "Service status and available conditions",
      "POST / (action: query)": "Query guidelines for a condition with optional patient context",
      "POST / (action: drug_evidence)": "Get evidence report for a specific drug",
      "POST / (action: validate_plan)": "Validate treatment plan against guidelines",
      "POST / (action: recent_updates)": "Get recent guideline updates",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "query": {
        const { condition, patientContext, specificQuestion, includeEvidence } = body;
        
        if (!condition) {
          return NextResponse.json({ error: "condition required" }, { status: 400 });
        }

        const result = await queryGuidelines({
          condition,
          patientContext,
          specificQuestion,
          includeEvidence,
        });

        return NextResponse.json({ success: true, data: result });
      }

      case "drug_evidence": {
        const { drug } = body;
        
        if (!drug) {
          return NextResponse.json({ error: "drug name required" }, { status: 400 });
        }

        const result = await getDrugEvidence(drug);
        return NextResponse.json({ success: true, data: result });
      }

      case "validate_plan": {
        const { condition, medications, patientContext } = body;
        
        if (!condition || !medications) {
          return NextResponse.json({ error: "condition and medications required" }, { status: 400 });
        }

        const result = await validateTreatmentPlan({
          condition,
          medications,
          patientContext: patientContext || {},
        });

        return NextResponse.json({ success: true, data: result });
      }

      case "recent_updates": {
        const { condition, timeRange } = body;
        
        let updates = [...RECENT_UPDATES];
        
        if (condition) {
          updates = updates.filter(u => 
            u.change.toLowerCase().includes(condition.toLowerCase()) ||
            u.affectedPopulations?.some(p => p.toLowerCase().includes(condition.toLowerCase()))
          );
        }
        
        if (timeRange) {
          const cutoff = new Date();
          cutoff.setMonth(cutoff.getMonth() - (timeRange === "6months" ? 6 : timeRange === "1year" ? 12 : 3));
          updates = updates.filter(u => new Date(u.date) >= cutoff);
        }

        return NextResponse.json({
          success: true,
          data: {
            totalUpdates: updates.length,
            updates,
            majorChanges: updates.filter(u => u.impact === "major").length,
          },
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["query", "drug_evidence", "validate_plan", "recent_updates"],
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

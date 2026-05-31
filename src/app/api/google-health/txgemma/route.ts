/**
 * TxGemma API — Therapeutic Prediction & Drug Safety
 *
 * Endpoints:
 *   GET  — Status and capabilities
 *   POST — Analyze drug regimen, check interactions, predict response
 *
 * Actions:
 *   - analyze: Full therapeutic regimen analysis
 *   - interactions: Quick drug-drug interaction check
 *   - response: Predict treatment response for drug-patient pair
 *   - alternatives: Suggest safer drug alternatives
 *   - dosage: Calculate optimal dosage for patient
 *
 * @see https://developers.google.com/health-ai-developer-foundations/txgemma
 */
import { NextRequest, NextResponse } from "next/server";
import {
  analyzeTherapeuticRegimen,
  checkInteractions,
  predictTreatmentResponse,
  suggestAlternatives,
  type DrugProfile,
  type PatientProfile,
} from "@/lib/google-health/txgemma";
import { isGeminiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 90;

// ─── GET /api/google-health/txgemma ──────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: isGeminiConfigured() ? "active" : "not_configured",
    model: "TxGemma (Gemini 2.5 Pro — Therapeutic Prediction)",
    version: "1.0.0",
    description: "Therapeutic prediction AI — drug interactions, treatment response, dosage optimization, and adverse reaction prediction",
    capabilities: {
      analyze: {
        description: "Full therapeutic regimen analysis for a patient",
        input: "Drug list + patient profile",
        output: "Interactions, responses, dosing, ADRs, alternatives",
      },
      interactions: {
        description: "Quick drug-drug interaction check",
        input: "List of drug names",
        output: "Interaction predictions with severity and management",
      },
      response: {
        description: "Predict treatment response",
        input: "Drug + patient + condition",
        output: "Efficacy prediction with pharmacogenomic factors",
      },
      alternatives: {
        description: "Suggest safer drug alternatives",
        input: "Problematic drug + reason + patient",
        output: "Ranked alternatives with switching notes",
      },
    },
    pharmacokineticModels: [
      "CYP3A4 interaction prediction",
      "CYP2D6 metabolizer phenotype",
      "CYP2C19 metabolizer phenotype",
      "P-glycoprotein substrate prediction",
      "Protein binding displacement",
      "Renal clearance adjustment",
      "Hepatic extraction ratio",
    ],
    evidenceSources: [
      "OpenFDA Drug Labels",
      "DrugBank (when available)",
      "Clinical Pharmacology Database",
      "PubMed Clinical Trials",
      "UpToDate Drug Interactions",
      "WHO Essential Medicines",
    ],
    features: [
      "Drug-drug interaction prediction (severity + mechanism)",
      "Pharmacogenomic response prediction",
      "Patient-specific dosage optimization",
      "Adverse drug reaction risk scoring",
      "Safer alternative suggestions",
      "Renal/hepatic dose adjustment",
      "Pregnancy safety classification",
      "Integration with PharmaX drug safety module",
    ],
    integration: {
      pharmax: "Enhances PharmaX with predictive capabilities",
      medibot: "Enables drug queries in MediBot",
      prescriptions: "Real-time safety check during prescription writing",
    },
  });
}

// ─── POST /api/google-health/txgemma ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "TxGemma not configured. Set GOOGLE_GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    // ─── ANALYZE: Full therapeutic regimen analysis ───────────────────
    if (action === "analyze") {
      const { drugs, patient } = body;

      if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
        return NextResponse.json({ error: "drugs array is required" }, { status: 400 });
      }
      if (!patient) {
        return NextResponse.json({ error: "patient profile is required" }, { status: 400 });
      }

      const drugProfiles: DrugProfile[] = drugs.map((d: any) => ({
        name: d.name || d.drugName,
        rxcui: d.rxcui,
        atcCode: d.atcCode,
        mechanismOfAction: d.mechanismOfAction || d.moa,
        therapeuticClass: d.therapeuticClass,
        halfLife: d.halfLife,
        metabolism: d.metabolism,
        excretion: d.excretion,
      }));

      const patientProfile: PatientProfile = {
        age: patient.age || 50,
        sex: patient.sex || "male",
        weight: patient.weight,
        height: patient.height,
        renalFunction: patient.renalFunction,
        hepaticFunction: patient.hepaticFunction,
        geneticMarkers: patient.geneticMarkers,
        currentMedications: patient.currentMedications,
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
        pregnancyStatus: patient.pregnancyStatus,
      };

      const result = await analyzeTherapeuticRegimen(drugProfiles, patientProfile);

      return NextResponse.json({
        success: true,
        action: "analyze",
        ...result,
      });
    }

    // ─── INTERACTIONS: Quick drug-drug interaction check ─────────────
    if (action === "interactions") {
      const { drugs, patientContext } = body;

      if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
        return NextResponse.json({ error: "At least 2 drugs are required" }, { status: 400 });
      }

      const drugNames = drugs.map((d: any) => typeof d === "string" ? d : d.name || d.drugName);
      const interactions = await checkInteractions(drugNames, patientContext);

      // Calculate overall severity
      const severityOrder = { contraindicated: 5, major: 4, moderate: 3, minor: 2, none: 1 };
      const maxSeverity = interactions.reduce((max, i) => {
        const score = severityOrder[i.severity] || 0;
        return score > max.score ? { severity: i.severity, score } : max;
      }, { severity: "none" as string, score: 0 });

      return NextResponse.json({
        success: true,
        action: "interactions",
        drugCount: drugNames.length,
        interactionCount: interactions.length,
        highestSeverity: maxSeverity.severity,
        interactions,
      });
    }

    // ─── RESPONSE: Predict treatment response ────────────────────────
    if (action === "response") {
      const { drug, patient, condition } = body;

      if (!drug || !patient || !condition) {
        return NextResponse.json({ error: "drug, patient, and condition are required" }, { status: 400 });
      }

      const drugProfile: DrugProfile = {
        name: drug.name || drug.drugName || drug,
        rxcui: drug.rxcui,
        mechanismOfAction: drug.mechanismOfAction,
        therapeuticClass: drug.therapeuticClass,
      };

      const patientProfile: PatientProfile = {
        age: patient.age || 50,
        sex: patient.sex || "male",
        weight: patient.weight,
        renalFunction: patient.renalFunction,
        hepaticFunction: patient.hepaticFunction,
        geneticMarkers: patient.geneticMarkers,
        currentMedications: patient.currentMedications,
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
      };

      const response = await predictTreatmentResponse(drugProfile, patientProfile, condition);

      return NextResponse.json({
        success: true,
        action: "response",
        ...response,
      });
    }

    // ─── ALTERNATIVES: Suggest safer alternatives ────────────────────
    if (action === "alternatives") {
      const { drug, reason, patient, condition } = body;

      if (!drug || !reason || !condition) {
        return NextResponse.json({ error: "drug, reason, and condition are required" }, { status: 400 });
      }

      const patientProfile: PatientProfile = {
        age: patient?.age || 50,
        sex: patient?.sex || "male",
        chronicConditions: patient?.chronicConditions,
        allergies: patient?.allergies,
        currentMedications: patient?.currentMedications,
        renalFunction: patient?.renalFunction,
        hepaticFunction: patient?.hepaticFunction,
      };

      const alternatives = await suggestAlternatives(
        typeof drug === "string" ? drug : drug.name,
        reason,
        patientProfile,
        condition,
      );

      return NextResponse.json({
        success: true,
        action: "alternatives",
        originalDrug: typeof drug === "string" ? drug : drug.name,
        reason,
        condition,
        alternativeCount: alternatives.length,
        alternatives,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("[api/google-health/txgemma] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TxGemma processing failed" },
      { status: 500 },
    );
  }
}

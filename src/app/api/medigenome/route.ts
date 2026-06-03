/**
 * MediGenome API — Pharmacogenomics AI
 * Bridges genetics and daily prescribing for precision medicine
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { analyzePharmacogenomics, generateDemoProfile, checkDrugGenomics, type GenomicProfile } from "@/lib/medigenome";
import { db } from "@/db";
import { patients, prescriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    service: "MediGenome",
    version: "1.0.0",
    status: "active",
    description: "Pharmacogenomics AI — precision medicine through genetic-guided prescribing",
    capabilities: [
      "CPIC guideline-based drug-gene interaction analysis",
      "10 pharmacogenes (CYP2D6, CYP2C19, CYP2C9, VKORC1, HLA-B, TPMT, DPYD, SLCO1B1, CYP3A5, HLA-B*1502)",
      "Metabolizer status classification (poor/intermediate/normal/rapid/ultra-rapid)",
      "Drug safety check against genomic profile",
      "Risk allele identification (BRCA1/2, APOE4, Factor V Leiden, etc.)",
      "AI-enhanced clinical summary (Gemini 2.5 Pro)",
      "Demo genomic profiles (normal, high_risk, complex)",
      "Evidence level classification (CPIC 1A-4)",
    ],
    endpoints: {
      "GET /": "Service status",
      "POST / (action: analyze)": "Full pharmacogenomic analysis against current medications",
      "POST / (action: check_drug)": "Check a specific drug against patient's genomic profile",
      "POST / (action: demo_profile)": "Generate demo genomic profile for testing",
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { action, patientId, drug, scenario, genomicProfile } = body;

    switch (action) {
      case "analyze": {
        if (!patientId) {
          return NextResponse.json({ error: "patientId required" }, { status: 400 });
        }

        // Fetch patient and medications
        const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
        if (!patient.length) {
          return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        const meds = await db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId));
        const currentMedications = meds.map(m => m.drugName);

        // Use provided genomic profile or generate demo
        const profile: GenomicProfile = genomicProfile || generateDemoProfile(patientId, scenario || "high_risk");

        const result = await analyzePharmacogenomics(profile, currentMedications);

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case "check_drug": {
        if (!patientId || !drug) {
          return NextResponse.json({ error: "patientId and drug required" }, { status: 400 });
        }

        // Use provided profile or generate demo
        const profile: GenomicProfile = genomicProfile || generateDemoProfile(patientId, scenario || "high_risk");
        const result = checkDrugGenomics(drug, profile);

        return NextResponse.json({
          success: true,
          data: {
            drug,
            patientId,
            ...result,
            genomicProfile: {
              metabolizerStatus: profile.metabolizerStatus.map(m => ({
                gene: m.gene,
                status: m.status,
              })),
              hlaTypes: profile.hlaTypes,
            },
          },
        });
      }

      case "demo_profile": {
        const profile = generateDemoProfile(
          patientId || "demo-patient",
          scenario || "high_risk"
        );

        return NextResponse.json({
          success: true,
          data: profile,
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["analyze", "check_drug", "demo_profile"],
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

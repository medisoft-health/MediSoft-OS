/**
 * Path Foundation API — Histopathology Image Analysis
 *
 * Endpoints:
 *   GET  — Status and capabilities
 *   POST — Analyze pathology images (tumor detection, biomarkers, grading)
 *
 * Actions:
 *   - analyze: Full pathology image analysis with synoptic report
 *   - screen: Quick malignancy screening (triage)
 *   - biomarker: Score specific biomarker from IHC slide
 *
 * @see https://developers.google.com/health-ai-developer-foundations/path-foundation
 */
import { NextRequest, NextResponse } from "next/server";
import {
  analyzePathologyImage,
  screenForMalignancy,
  scoreBiomarker,
  PATH_SUPPORTED_IMAGE_FORMATS,
  PATH_STAIN_TYPES,
  PATH_BIOMARKERS,
  PATH_SPECIMEN_TYPES,
} from "@/lib/google-health/path-foundation";
import { isGeminiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── GET /api/google-health/path-foundation ──────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: isGeminiConfigured() ? "active" : "not_configured",
    model: "Path Foundation (Gemini 2.5 Pro — Digital Pathology Analysis)",
    version: "1.0.0",
    description: "AI-powered histopathology image analysis for tumor detection, grading, biomarker scoring, and synoptic reporting",
    capabilities: {
      analyze: {
        description: "Full pathology analysis with CAP-compliant synoptic report",
        input: "Base64-encoded pathology image or multipart/form-data",
        output: "Classification, morphology, biomarkers, staging, differential diagnoses",
      },
      screen: {
        description: "Quick malignancy screening for triage",
        input: "Pathology image + optional specimen site",
        output: "Malignancy detection, urgency, suggested diagnosis",
      },
      biomarker: {
        description: "IHC biomarker scoring (ER, PR, HER2, Ki-67, PD-L1, etc.)",
        input: "IHC-stained slide image + biomarker name",
        output: "Status, intensity, percentage, clinical significance",
      },
    },
    supportedFormats: PATH_SUPPORTED_IMAGE_FORMATS,
    stainTypes: PATH_STAIN_TYPES,
    biomarkers: PATH_BIOMARKERS,
    specimenTypes: PATH_SPECIMEN_TYPES,
    reportingStandards: [
      "CAP (College of American Pathologists) Synoptic Reporting",
      "AJCC 8th Edition Staging",
      "WHO Classification of Tumours (5th Edition)",
      "ASCO/CAP Biomarker Guidelines",
      "ICD-O-3 Morphology Codes",
      "SNOMED-CT Pathology Terms",
    ],
    features: [
      "Tumor tissue identification and classification",
      "Histological grading (Nottingham, WHO, Gleason, etc.)",
      "Biomarker scoring (ER, PR, HER2, Ki-67, PD-L1)",
      "Surgical margin assessment",
      "Pathological TNM staging",
      "Lymphovascular and perineural invasion detection",
      "Differential diagnosis with ICD codes",
      "CAP-compliant synoptic reporting",
      "Quality assessment of slide preparation",
      "Similar image retrieval (embedding-based)",
    ],
    integration: {
      mediScan: "Pathology module within MediScan",
      fhir: "DiagnosticReport and Observation resources",
      dicom: "WSI (Whole Slide Image) via DICOM",
    },
  });
}

// ─── POST /api/google-health/path-foundation ─────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Path Foundation not configured. Set GOOGLE_GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart image upload
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const imageFile = form.get("image") as File | null;
      const action = (form.get("action") as string) || "analyze";
      const specimenSite = form.get("specimenSite") as string | null;
      const specimenType = form.get("specimenType") as string | null;
      const clinicalHistory = form.get("clinicalHistory") as string | null;
      const stainType = form.get("stainType") as string | null;
      const biomarkerName = form.get("biomarkerName") as string | null;

      if (!imageFile) {
        return NextResponse.json({ error: "Missing image file" }, { status: 400 });
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const imageBase64 = buffer.toString("base64");

      if (action === "screen") {
        const result = await screenForMalignancy(imageBase64, imageFile.type, specimenSite || undefined);
        return NextResponse.json({ success: true, action: "screen", ...result });
      }

      if (action === "biomarker") {
        if (!biomarkerName) {
          return NextResponse.json({ error: "biomarkerName is required for biomarker action" }, { status: 400 });
        }
        const result = await scoreBiomarker(imageBase64, imageFile.type, biomarkerName);
        return NextResponse.json({ success: true, action: "biomarker", ...result });
      }

      // Default: full analysis
      const result = await analyzePathologyImage(imageBase64, imageFile.type, {
        specimenSite: specimenSite || undefined,
        specimenType: (specimenType as any) || undefined,
        clinicalHistory: clinicalHistory || undefined,
        stainType: (stainType as any) || undefined,
      });

      return NextResponse.json({ success: true, action: "analyze", ...result });
    }

    // Handle JSON body
    const body = await req.json();
    const { action } = body;

    // ─── ANALYZE: Full pathology analysis ────────────────────────────
    if (action === "analyze") {
      const { imageBase64, mimeType, specimenSite, specimenType, clinicalHistory, previousDiagnosis, stainType, requestedBiomarkers, magnification } = body;

      if (!imageBase64) {
        return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
      }

      const result = await analyzePathologyImage(imageBase64, mimeType || "image/jpeg", {
        specimenSite,
        specimenType,
        clinicalHistory,
        previousDiagnosis,
        stainType,
        requestedBiomarkers,
        magnification,
      });

      return NextResponse.json({ success: true, action: "analyze", ...result });
    }

    // ─── SCREEN: Quick malignancy screening ──────────────────────────
    if (action === "screen") {
      const { imageBase64, mimeType, specimenSite } = body;

      if (!imageBase64) {
        return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
      }

      const result = await screenForMalignancy(imageBase64, mimeType || "image/jpeg", specimenSite);
      return NextResponse.json({ success: true, action: "screen", ...result });
    }

    // ─── BIOMARKER: Score specific biomarker ─────────────────────────
    if (action === "biomarker") {
      const { imageBase64, mimeType, biomarkerName, scoringGuideline } = body;

      if (!imageBase64) {
        return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
      }
      if (!biomarkerName) {
        return NextResponse.json({ error: "biomarkerName is required" }, { status: 400 });
      }

      const result = await scoreBiomarker(imageBase64, mimeType || "image/jpeg", biomarkerName, scoringGuideline);
      return NextResponse.json({ success: true, action: "biomarker", ...result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("[api/google-health/path-foundation] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Path Foundation processing failed" },
      { status: 500 },
    );
  }
}

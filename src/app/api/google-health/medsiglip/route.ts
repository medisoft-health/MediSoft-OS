/**
 * MedSigLIP API — Medical Image Classification & Triage
 *
 * Endpoints:
 *   GET  — Status and capabilities
 *   POST — Classify, triage, or match medical images
 *
 * Actions:
 *   - classify: Full classification (modality, anatomy, quality, urgency, pathology)
 *   - triage: Quick urgency assessment for worklist prioritization
 *   - match: Image-text relevance matching for clinical queries
 *
 * @see https://developers.google.com/health-ai-developer-foundations/medsiglip
 */
import { NextRequest, NextResponse } from "next/server";
import {
  classifyMedicalImage,
  triageMedicalImage,
  matchImageToQuery,
  RADIOLOGY_CONDITIONS,
} from "@/lib/google-health/medsiglip";
import { isGeminiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── GET /api/google-health/medsiglip ────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: isGeminiConfigured() ? "active" : "not_configured",
    model: "MedSigLIP (Gemini 2.5 Pro Vision — Medical Image Classification)",
    version: "1.0.0",
    description: "Medical image classification, triage, and image-text matching using SigLIP-style zero-shot classification",
    capabilities: {
      classify: {
        description: "Full medical image classification",
        output: "Modality, anatomy, quality, urgency, pathologies, condition scores",
      },
      triage: {
        description: "Quick urgency triage for radiologist worklist",
        output: "Urgency level with time-to-report recommendation",
      },
      match: {
        description: "Image-text relevance matching",
        output: "Relevance score, matched features, suggested diagnoses",
      },
    },
    supportedModalities: [
      "X-ray", "CT", "MRI", "Ultrasound", "Mammography",
      "PET", "Nuclear Medicine", "Fluoroscopy", "Angiography",
      "Dermoscopy", "Fundoscopy", "Pathology", "Endoscopy",
    ],
    supportedRegions: [
      "Head", "Neck", "Chest", "Abdomen", "Pelvis",
      "Spine", "Upper Extremity", "Lower Extremity",
      "Whole Body", "Breast", "Cardiac",
    ],
    conditionsDetected: RADIOLOGY_CONDITIONS.length,
    features: [
      "Zero-shot medical image classification",
      "Urgency triage (critical/urgent/routine/normal)",
      "Anatomical region detection",
      "Image quality assessment",
      "Pathology detection with confidence scores",
      "ICD-10 condition scoring",
      "Image-text clinical matching",
      "Integration with MediScan and DICOM Store",
    ],
    integration: {
      mediscan: "Pre-screening before full Gemini Vision analysis",
      dicom: "Automatic classification on DICOM upload",
      worklist: "Radiologist worklist prioritization",
    },
  });
}

// ─── POST /api/google-health/medsiglip ───────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "MedSigLIP not configured. Set GOOGLE_GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart image upload (default: classify)
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const imageFile = form.get("image") as File | null;
      const action = (form.get("action") as string) || "classify";
      const clinicalQuestion = form.get("clinicalQuestion") as string | null;
      const patientAge = form.get("patientAge") as string | null;
      const patientSex = form.get("patientSex") as string | null;
      const query = form.get("query") as string | null;

      if (!imageFile) {
        return NextResponse.json({ error: "Missing image file" }, { status: 400 });
      }

      if (!imageFile.type.startsWith("image/")) {
        return NextResponse.json({ error: `Unsupported file type: ${imageFile.type}` }, { status: 415 });
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const imageBase64 = buffer.toString("base64");

      if (action === "triage") {
        const result = await triageMedicalImage(imageBase64, imageFile.type);
        return NextResponse.json({ success: true, action: "triage", ...result });
      }

      if (action === "match" && query) {
        const result = await matchImageToQuery(imageBase64, imageFile.type, query);
        return NextResponse.json({ success: true, action: "match", ...result });
      }

      // Default: full classify
      const result = await classifyMedicalImage(imageBase64, imageFile.type, {
        clinicalQuestion: clinicalQuestion || undefined,
        patientAge: patientAge ? parseInt(patientAge) : undefined,
        patientSex: patientSex || undefined,
      });

      return NextResponse.json({ success: true, action: "classify", ...result });
    }

    // Handle JSON actions
    const body = await req.json();
    const { action } = body;

    // ─── CLASSIFY: Full medical image classification ─────────────────
    if (action === "classify") {
      const { imageBase64, mimeType, clinicalQuestion, patientAge, patientSex, suspectedCondition } = body;

      if (!imageBase64) {
        return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
      }

      const result = await classifyMedicalImage(
        imageBase64,
        mimeType || "image/png",
        { clinicalQuestion, patientAge, patientSex, suspectedCondition },
      );

      return NextResponse.json({ success: true, action: "classify", ...result });
    }

    // ─── TRIAGE: Quick urgency assessment ────────────────────────────
    if (action === "triage") {
      const { imageBase64, mimeType } = body;

      if (!imageBase64) {
        return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
      }

      const result = await triageMedicalImage(imageBase64, mimeType || "image/png");
      return NextResponse.json({ success: true, action: "triage", ...result });
    }

    // ─── MATCH: Image-text relevance ─────────────────────────────────
    if (action === "match") {
      const { imageBase64, mimeType, query } = body;

      if (!imageBase64 || !query) {
        return NextResponse.json({ error: "imageBase64 and query are required" }, { status: 400 });
      }

      const result = await matchImageToQuery(imageBase64, mimeType || "image/png", query);
      return NextResponse.json({ success: true, action: "match", ...result });
    }

    // ─── BATCH_TRIAGE: Multiple images for worklist ──────────────────
    if (action === "batch_triage") {
      const { images } = body; // Array of { imageBase64, mimeType, id }

      if (!images || !Array.isArray(images)) {
        return NextResponse.json({ error: "images array is required" }, { status: 400 });
      }

      const results = await Promise.all(
        images.slice(0, 10).map(async (img: any) => {
          const triage = await triageMedicalImage(img.imageBase64, img.mimeType || "image/png");
          return { id: img.id, ...triage };
        }),
      );

      // Sort by urgency (critical first)
      const urgencyOrder = { critical: 0, urgent: 1, routine: 2, normal: 3 };
      results.sort((a, b) => (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3));

      return NextResponse.json({
        success: true,
        action: "batch_triage",
        totalImages: results.length,
        results,
        summary: {
          critical: results.filter(r => r.urgency === "critical").length,
          urgent: results.filter(r => r.urgency === "urgent").length,
          routine: results.filter(r => r.urgency === "routine").length,
          normal: results.filter(r => r.urgency === "normal").length,
        },
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("[api/google-health/medsiglip] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "MedSigLIP processing failed" },
      { status: 500 },
    );
  }
}

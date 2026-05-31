/**
 * HeAR API — Health Acoustic Representations
 *
 * Endpoints:
 *   GET  — Status and capabilities
 *   POST — Analyze health audio (cough, breathing, heart, lung sounds)
 *
 * Actions:
 *   - analyze: Full health audio analysis
 *   - cough: Quick cough screening
 *   - lung: Lung auscultation analysis
 *   - screen: Disease screening from audio (TB, COVID, Asthma, COPD)
 *
 * @see https://developers.google.com/health-ai-developer-foundations/hear
 */
import { NextRequest, NextResponse } from "next/server";
import {
  analyzeHealthAudio,
  screenCough,
  analyzeLungSounds,
  HEAR_SUPPORTED_AUDIO_FORMATS,
  HEAR_SOUND_TYPES,
} from "@/lib/google-health/hear";
import { isGeminiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 90;

// ─── GET /api/google-health/hear ─────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: isGeminiConfigured() ? "active" : "not_configured",
    model: "HeAR (Gemini 2.5 Pro — Health Acoustic Representations)",
    version: "1.0.0",
    description: "Health sound analysis AI — cough classification, respiratory sounds, heart sounds, and disease screening from audio",
    capabilities: {
      analyze: {
        description: "Full health audio analysis with clinical assessment",
        input: "Base64-encoded audio or multipart/form-data",
        output: "Sound classification, clinical assessment, screening results",
      },
      cough: {
        description: "Quick cough classification and screening",
        input: "Cough audio recording",
        output: "Cough type, severity, possible causes, red flags",
      },
      lung: {
        description: "Lung auscultation interpretation",
        input: "Stethoscope recording + location",
        output: "Respiratory sounds, conditions, urgency",
      },
      screen: {
        description: "Disease screening from health audio",
        input: "Audio + target conditions",
        output: "Risk assessment for TB, COVID, Asthma, COPD",
      },
    },
    supportedFormats: HEAR_SUPPORTED_AUDIO_FORMATS,
    soundTypes: HEAR_SOUND_TYPES,
    screeningCapabilities: [
      { condition: "Tuberculosis", method: "Cough pattern analysis" },
      { condition: "COVID-19", method: "Cough and breathing analysis" },
      { condition: "Asthma", method: "Wheeze detection and severity" },
      { condition: "COPD", method: "Breathing pattern and cough" },
      { condition: "Heart Failure", method: "Crackles + S3 gallop detection" },
      { condition: "Pneumonia", method: "Crackles + bronchial breathing" },
      { condition: "Sleep Apnea", method: "Snoring pattern analysis" },
    ],
    features: [
      "Cough classification (dry/productive/barking/whooping)",
      "Respiratory sound detection (wheeze, crackle, stridor, rhonchi)",
      "Heart sound analysis (murmurs, gallops, rhythm)",
      "Disease screening (TB, COVID-19, Asthma, COPD)",
      "Urgency triage for respiratory emergencies",
      "Longitudinal tracking for chronic conditions",
      "Integration with AI Nurse for remote monitoring",
      "Arabic + English patient instructions",
    ],
    integration: {
      aiNurse: "Remote patient monitoring via cough/breathing recordings",
      patientPortal: "Patient self-screening tool",
      mediscript: "Auscultation findings documentation",
      medibot: "Voice-based health queries with acoustic analysis",
    },
  });
}

// ─── POST /api/google-health/hear ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "HeAR not configured. Set GOOGLE_GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart audio upload
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const audioFile = form.get("audio") as File | null;
      const action = (form.get("action") as string) || "analyze";
      const soundType = form.get("soundType") as string | null;
      const patientAge = form.get("patientAge") as string | null;
      const patientSex = form.get("patientSex") as string | null;
      const location = form.get("location") as string | null;

      if (!audioFile) {
        return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
      }

      if (!HEAR_SUPPORTED_AUDIO_FORMATS.includes(audioFile.type) && !audioFile.type.startsWith("audio/")) {
        return NextResponse.json(
          { error: `Unsupported audio format: ${audioFile.type}` },
          { status: 415 },
        );
      }

      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const audioBase64 = buffer.toString("base64");

      if (action === "cough") {
        const result = await screenCough(audioBase64, audioFile.type, {
          age: patientAge ? parseInt(patientAge) : undefined,
        });
        return NextResponse.json({ success: true, action: "cough", ...result });
      }

      if (action === "lung") {
        const result = await analyzeLungSounds(audioBase64, audioFile.type, location || "bilateral");
        return NextResponse.json({ success: true, action: "lung", ...result });
      }

      // Default: full analysis
      const result = await analyzeHealthAudio(audioBase64, audioFile.type, {
        soundType: (soundType as any) || undefined,
        patientAge: patientAge ? parseInt(patientAge) : undefined,
        patientSex: patientSex || undefined,
      });

      return NextResponse.json({ success: true, action: "analyze", ...result });
    }

    // Handle JSON actions
    const body = await req.json();
    const { action } = body;

    // ─── ANALYZE: Full health audio analysis ─────────────────────────
    if (action === "analyze") {
      const { audioBase64, mimeType, soundType, patientAge, patientSex, symptoms, chronicConditions, smokingHistory } = body;

      if (!audioBase64) {
        return NextResponse.json({ error: "audioBase64 is required" }, { status: 400 });
      }

      const result = await analyzeHealthAudio(audioBase64, mimeType || "audio/webm", {
        soundType: soundType || undefined,
        patientAge,
        patientSex,
        symptoms,
        chronicConditions,
        smokingHistory,
      });

      return NextResponse.json({ success: true, action: "analyze", ...result });
    }

    // ─── COUGH: Quick cough screening ────────────────────────────────
    if (action === "cough") {
      const { audioBase64, mimeType, patientAge, smokingHistory, chronicConditions } = body;

      if (!audioBase64) {
        return NextResponse.json({ error: "audioBase64 is required" }, { status: 400 });
      }

      const result = await screenCough(audioBase64, mimeType || "audio/webm", {
        age: patientAge,
        smokingHistory,
        chronicConditions,
      });

      return NextResponse.json({ success: true, action: "cough", ...result });
    }

    // ─── LUNG: Lung auscultation ─────────────────────────────────────
    if (action === "lung") {
      const { audioBase64, mimeType, location } = body;

      if (!audioBase64) {
        return NextResponse.json({ error: "audioBase64 is required" }, { status: 400 });
      }

      const result = await analyzeLungSounds(
        audioBase64,
        mimeType || "audio/webm",
        location || "bilateral",
      );

      return NextResponse.json({ success: true, action: "lung", location: location || "bilateral", ...result });
    }

    // ─── SCREEN: Disease screening ───────────────────────────────────
    if (action === "screen") {
      const { audioBase64, mimeType, targetConditions, patientAge, patientSex, symptoms } = body;

      if (!audioBase64) {
        return NextResponse.json({ error: "audioBase64 is required" }, { status: 400 });
      }

      // Full analysis includes screening
      const result = await analyzeHealthAudio(audioBase64, mimeType || "audio/webm", {
        patientAge,
        patientSex,
        symptoms,
      });

      // Filter screening results to requested conditions
      let screening = result.screening;
      if (targetConditions && Array.isArray(targetConditions) && screening) {
        const filtered: any = {};
        for (const condition of targetConditions) {
          const key = condition.toLowerCase().replace(/[-\s]/g, "");
          if (key.includes("tb") || key.includes("tuberculosis")) filtered.tuberculosis = screening.tuberculosis;
          if (key.includes("covid")) filtered.covid19 = screening.covid19;
          if (key.includes("asthma")) filtered.asthma = screening.asthma;
          if (key.includes("copd")) filtered.copd = screening.copd;
          if (key.includes("heart")) filtered.heartFailure = screening.heartFailure;
        }
        screening = filtered;
      }

      return NextResponse.json({
        success: true,
        action: "screen",
        targetConditions: targetConditions || ["all"],
        screening,
        clinicalAssessment: result.clinicalAssessment,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("[api/google-health/hear] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "HeAR processing failed" },
      { status: 500 },
    );
  }
}

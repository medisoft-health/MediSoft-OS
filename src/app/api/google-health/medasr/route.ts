/**
 * MedASR API — Medical Automatic Speech Recognition
 *
 * Endpoints:
 *   GET  — Status and capabilities
 *   POST — Transcribe audio or enhance text transcript
 *
 * Actions:
 *   - transcribe: Process audio file with medical ASR
 *   - enhance: Correct medical terms in existing transcript
 *   - stream_chunk: Process real-time streaming chunk
 *
 * @see https://developers.google.com/health-ai-developer-foundations/medasr
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  transcribeMedicalAudio,
  enhanceMedicalTranscript,
  processStreamChunk,
  MEDASR_SUPPORTED_AUDIO_FORMATS,
  MEDASR_SUPPORTED_LANGUAGES,
  type MedASRConfig,
} from "@/lib/google-health/medasr";
import { isGeminiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 120; // Audio processing can take time

// ─── GET /api/google-health/medasr ───────────────────────────────────────────
export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    status: isGeminiConfigured() ? "active" : "not_configured",
    model: "MedASR (Gemini 2.5 Pro Medical ASR)",
    version: "1.0.0",
    description: "Medical Automatic Speech Recognition — specialized in medical terminology, multi-language support, and clinical entity extraction",
    capabilities: {
      transcribe: {
        description: "Transcribe audio with medical terminology accuracy",
        input: "Base64-encoded audio or multipart/form-data",
        output: "Structured transcription with entities and speaker diarization",
      },
      enhance: {
        description: "Correct medical terms in existing transcript (from Web Speech API)",
        input: "Raw text transcript",
        output: "Corrected transcript with medical entity extraction",
      },
      stream_chunk: {
        description: "Real-time processing of streaming audio chunks",
        input: "Text chunk with previous context",
        output: "Corrected chunk with entities",
      },
    },
    supportedFormats: MEDASR_SUPPORTED_AUDIO_FORMATS,
    supportedLanguages: MEDASR_SUPPORTED_LANGUAGES,
    features: [
      "Medical terminology correction (drug names, procedures, anatomy)",
      "Arabic-English code-switching support",
      "Speaker diarization (physician vs patient)",
      "Real-time clinical entity extraction (ICD-10, RxNorm, SNOMED-CT)",
      "Confidence scoring with uncertain term flagging",
      "Specialty-specific vocabulary bias",
      "Integration with MediScript Ambient Scribe",
    ],
    integration: {
      mediscript: "Enhances Ambient Scribe transcription accuracy",
      ambientScribe: "Provides real-time medical term correction",
      medibot: "Enables voice-based clinical queries",
    },
  });
}

// ─── POST /api/google-health/medasr ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "MedASR not configured. Set GOOGLE_GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart audio upload
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const audioFile = form.get("audio") as File | null;
      const language = (form.get("language") as string) || "ar-en";
      const speciality = form.get("speciality") as string | null;
      const vocabularyBias = form.get("vocabularyBias") as string | null;

      if (!audioFile) {
        return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
      }

      if (!MEDASR_SUPPORTED_AUDIO_FORMATS.includes(audioFile.type)) {
        return NextResponse.json(
          { error: `Unsupported audio format: ${audioFile.type}. Supported: ${MEDASR_SUPPORTED_AUDIO_FORMATS.join(", ")}` },
          { status: 415 },
        );
      }

      // Convert to base64
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const audioBase64 = buffer.toString("base64");

      const config: MedASRConfig = {
        language: language as "ar" | "en" | "ar-en",
        speciality: speciality || undefined,
        enableDiarization: true,
        enableEntityExtraction: true,
        vocabularyBias: vocabularyBias ? vocabularyBias.split(",").map(s => s.trim()) : undefined,
      };

      const result = await transcribeMedicalAudio(audioBase64, audioFile.type, config);

      return NextResponse.json({
        success: true,
        action: "transcribe",
        ...result,
      });
    }

    // Handle JSON actions
    const body = await req.json();
    const { action } = body;

    // ─── TRANSCRIBE: Process base64 audio ────────────────────────────
    if (action === "transcribe") {
      const { audioBase64, mimeType, language, speciality, vocabularyBias } = body;

      if (!audioBase64) {
        return NextResponse.json({ error: "audioBase64 is required" }, { status: 400 });
      }

      const config: MedASRConfig = {
        language: language || "ar-en",
        speciality: speciality || undefined,
        enableDiarization: true,
        enableEntityExtraction: true,
        vocabularyBias: vocabularyBias || undefined,
      };

      const result = await transcribeMedicalAudio(
        audioBase64,
        mimeType || "audio/webm",
        config,
      );

      return NextResponse.json({
        success: true,
        action: "transcribe",
        ...result,
      });
    }

    // ─── ENHANCE: Correct medical terms in existing transcript ───────
    if (action === "enhance") {
      const { transcript, language, speciality } = body;

      if (!transcript) {
        return NextResponse.json({ error: "transcript is required" }, { status: 400 });
      }

      const config: MedASRConfig = {
        language: language || "ar-en",
        speciality: speciality || undefined,
        enableDiarization: true,
        enableEntityExtraction: true,
      };

      const result = await enhanceMedicalTranscript(transcript, config);

      return NextResponse.json({
        success: true,
        action: "enhance",
        ...result,
      });
    }

    // ─── STREAM_CHUNK: Real-time chunk processing ────────────────────
    if (action === "stream_chunk") {
      const { chunkText, previousContext, language, speciality } = body;

      if (!chunkText) {
        return NextResponse.json({ error: "chunkText is required" }, { status: 400 });
      }

      const config: MedASRConfig = {
        language: language || "ar-en",
        speciality: speciality || undefined,
      };

      const result = await processStreamChunk(
        chunkText,
        previousContext || "",
        config,
      );

      return NextResponse.json({
        success: true,
        action: "stream_chunk",
        ...result,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("[api/google-health/medasr] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "MedASR processing failed" },
      { status: 500 },
    );
  }
}

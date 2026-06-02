import { NextResponse } from "next/server";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { transcribeWithGemini } from "@/lib/ai/gemini-transcribe";
import {
  isGcpSpeechConfigured,
  transcribeWithMedicalModel,
} from "@/lib/ai/gcp-speech";
import { getOpenAIClient, isOpenAIConfigured } from "@/lib/ai/openai";

/**
 * POST /api/mediscript/transcribe
 *
 * 3-tier transcription fallback:
 *
 *   TIER 1 — Gemini Multimodal Audio (primary)
 *     Best language auto-detection. Handles Arabic dialects + English
 *     + code-switching naturally. Uses the existing GOOGLE_GEMINI_API_KEY.
 *
 *   TIER 2 — Google Cloud Speech-to-Text Medical Model (fallback)
 *     95%+ accuracy on medical terminology. Requires
 *     GOOGLE_APPLICATION_CREDENTIALS.
 *
 *   TIER 3 — OpenAI Whisper (emergency)
 *     Last resort. Requires OPENAI_API_KEY.
 *
 * Each tier catches its own errors and falls through to the next.
 * The response includes `model` so the client knows which tier was used.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.AI_TRANSCRIBE);
  if (!rl.ok) return rl.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an `audio` file." },
      { status: 400 },
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Missing `audio` file." }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Audio file is empty." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio exceeds 25 MB limit." }, { status: 413 });
  }

  const audioBytes = Buffer.from(await audio.arrayBuffer());
  const mimeType = audio.type || "audio/webm";

  console.log(
    `[transcribe] Received: ${audio.name} | ${mimeType} | ${(audio.size / 1024).toFixed(0)} KB`,
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 1: Gemini Multimodal Audio (best language detection)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("[transcribe] TIER 1 → Gemini Multimodal Audio");
  const geminiResult = await transcribeWithGemini(audioBytes, mimeType);

  if (geminiResult.kind === "ok" && geminiResult.transcript.length > 0) {
    console.log(
      `[transcribe] ✓ TIER 1 SUCCESS (gemini-multimodal) | ${geminiResult.transcript.length} chars`,
    );
    return NextResponse.json(
      {
        transcript: geminiResult.transcript,
        model: "gemini-multimodal",
        tier: 1,
      },
      { headers: { ...rl.headers, "Cache-Control": "private, no-store" } },
    );
  }

  if (geminiResult.kind === "error") {
    console.warn(`[transcribe] ✗ TIER 1 FAILED: ${geminiResult.message}`);
  } else if (geminiResult.kind === "not_configured") {
    console.log("[transcribe] ✗ TIER 1 SKIPPED: Gemini not configured");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 2: Google Cloud Speech-to-Text Medical Model
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isGcpSpeechConfigured()) {
    console.log("[transcribe] TIER 2 → GCP Speech-to-Text (medical_dictation)");
    const gcpResult = await transcribeWithMedicalModel(
      audioBytes,
      mimeType,
      "ar", // Default Arabic for Saudi clinical context
    );

    if (gcpResult.kind === "ok" && gcpResult.data.transcript.length > 0) {
      console.log(
        `[transcribe] ✓ TIER 2 SUCCESS (gcp-medical-dictation) | lang: ${gcpResult.data.languageCode} | confidence: ${(gcpResult.data.confidence * 100).toFixed(1)}% | ${gcpResult.data.transcript.length} chars`,
      );
      return NextResponse.json(
        {
          transcript: gcpResult.data.transcript,
          model: "gcp-medical-dictation",
          tier: 2,
          confidence: gcpResult.data.confidence,
          languageCode: gcpResult.data.languageCode,
        },
        { headers: { ...rl.headers, "Cache-Control": "private, no-store" } },
      );
    }

    if (gcpResult.kind === "error") {
      console.warn(`[transcribe] ✗ TIER 2 FAILED: ${gcpResult.message}`);
    }
  } else {
    console.log("[transcribe] ✗ TIER 2 SKIPPED: GCP Speech not configured");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 3: OpenAI Whisper (emergency fallback)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isOpenAIConfigured()) {
    console.log("[transcribe] TIER 3 → OpenAI Whisper (emergency fallback)");
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const result = await openai.audio.transcriptions.create({
          file: audio,
          model: "whisper-1",
          response_format: "json",
          prompt:
            "Clinical consultation transcript. Vital signs, medication names, " +
            "dosages, ICD diagnoses, anatomy, lab values. Arabic and English.",
        });

        if (result.text && result.text.trim().length > 0) {
          console.log(
            `[transcribe] ✓ TIER 3 SUCCESS (whisper-fallback) | ${result.text.length} chars`,
          );
          return NextResponse.json(
            {
              transcript: result.text,
              model: "whisper-fallback",
              tier: 3,
            },
            { headers: { ...rl.headers, "Cache-Control": "private, no-store" } },
          );
        }
      } catch (err) {
        console.error(
          `[transcribe] ✗ TIER 3 FAILED: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      }
    }
  } else {
    console.log("[transcribe] ✗ TIER 3 SKIPPED: Whisper not configured");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ALL TIERS FAILED
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.error("[transcribe] ✗ ALL 3 TIERS FAILED — no transcription available");
  return NextResponse.json(
    {
      error:
        "All transcription services failed. Check that at least one of " +
        "the Medical Intelligence speech recognition service is enabled. Contact your administrator.",
      reason: "all_tiers_failed",
    },
    { status: 502 },
  );
}

import "server-only";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
} from "@/lib/ai/gemini";

/**
 * Tier 1: Gemini multimodal audio transcription.
 *
 * Sends the raw audio as base64 inline_data to Gemini 2.5 Pro.
 * Gemini auto-detects ALL languages and dialects without configuration —
 * Arabic (Egyptian, Saudi, Gulf, Levantine), English, and code-switching.
 *
 * This is the preferred tier because:
 *   - No language pre-configuration needed
 *   - Handles dialect mixing naturally
 *   - Same API key as SOAP generation (no extra credentials)
 */

const TRANSCRIPTION_PROMPT = `You are a medical transcription AI. Transcribe the following audio EXACTLY as spoken. The speaker may use Arabic (any dialect: Egyptian, Saudi, Gulf, Levantine) or English or a mix of both. Output ONLY the transcription text, nothing else. Do not add punctuation that wasn't spoken. Do not translate. Do not summarize. Do not add headers or labels. Just the exact words spoken.`;

export type GeminiTranscribeResult =
  | { kind: "ok"; transcript: string }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function transcribeWithGemini(
  audioBytes: Buffer,
  mimeType: string,
): Promise<GeminiTranscribeResult> {
  if (!isGeminiConfigured()) {
    return {
      kind: "not_configured",
      message: "GOOGLE_GEMINI_API_KEY not set.",
    };
  }

  const client = getGeminiClient();
  if (!client) {
    return { kind: "not_configured", message: "Gemini client unavailable." };
  }

  // Normalize mime type for Gemini's accepted audio types
  const normalizedMime = normalizeAudioMime(mimeType);

  console.log(
    `[gemini-transcribe] Sending ${(audioBytes.length / 1024).toFixed(0)} KB audio (${normalizedMime}) to Gemini...`,
  );

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: normalizedMime,
                data: audioBytes.toString("base64"),
              },
            },
            { text: TRANSCRIPTION_PROMPT },
          ],
        },
      ],
      config: {
        temperature: 0.0, // Zero temperature for exact transcription
      },
    });

    const transcript = (result.text ?? "").trim();

    if (!transcript) {
      return { kind: "error", message: "Gemini returned empty transcription." };
    }

    console.log(
      `[gemini-transcribe] ✓ Success | ${transcript.length} chars`,
    );

    return { kind: "ok", transcript };
  } catch (err) {
    console.error("[gemini-transcribe] ✗ Failed:", err);
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Gemini transcription failed",
    };
  }
}

/**
 * Normalize browser MIME types to what Gemini accepts.
 * Gemini supports: audio/wav, audio/mp3, audio/aiff, audio/aac,
 * audio/ogg, audio/flac, audio/mpeg, audio/webm
 */
function normalizeAudioMime(mime: string): string {
  const lower = mime.toLowerCase();
  // Strip codec parameters: "audio/webm;codecs=opus" → "audio/webm"
  const base = lower.split(";")[0].trim();

  const map: Record<string, string> = {
    "audio/webm": "audio/webm",
    "audio/ogg": "audio/ogg",
    "audio/mp4": "audio/mp4",
    "audio/m4a": "audio/mp4",
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mp3",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/flac": "audio/flac",
    "audio/aac": "audio/aac",
  };

  return map[base] ?? "audio/webm"; // Default to webm
}

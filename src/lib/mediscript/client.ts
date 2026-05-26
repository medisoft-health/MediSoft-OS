"use client";

import type { SoapNoteInput } from "@/lib/validations/encounter";

/**
 * Client helpers that talk to the MediScript route handlers built in PR-4c.
 *
 * Each helper returns a discriminated union so the caller can handle the
 * three cases the server can produce:
 *   - ok: feature ran successfully
 *   - not_configured: env var missing, show the "configure to enable" UI
 *   - error: something went wrong upstream
 */

export type TranscribeResult =
  | { kind: "ok"; transcript: string }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function transcribeAudio(
  blob: Blob,
  mimeType: string,
): Promise<TranscribeResult> {
  const form = new FormData();
  // Whisper accepts a wide range; we pass through whatever MediaRecorder gave us.
  const filename =
    mimeType.includes("ogg")
      ? "audio.ogg"
      : mimeType.includes("mp4")
        ? "audio.mp4"
        : "audio.webm";
  form.append("audio", new File([blob], filename, { type: mimeType }));

  let res: Response;
  try {
    res = await fetch("/api/mediscript/transcribe", {
      method: "POST",
      body: form,
    });
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  let payload: {
    transcript?: string;
    error?: string;
    reason?: string;
  } = {};
  try {
    payload = await res.json();
  } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }

  if (res.status === 503 && payload.reason === "not_configured") {
    return {
      kind: "not_configured",
      message:
        payload.error ??
        "OpenAI not configured. Set OPENAI_API_KEY to enable transcription.",
    };
  }
  if (!res.ok || !payload.transcript) {
    return {
      kind: "error",
      message: payload.error ?? `Transcription failed (HTTP ${res.status}).`,
    };
  }
  return { kind: "ok", transcript: payload.transcript };
}

export type SoapResult =
  | {
      kind: "ok";
      soapNote: SoapNoteInput;
      meta: {
        model: string;
        diagnosisCount: number;
        icdVerifiedCount: number;
        whoIcdConfigured: boolean;
      };
    }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function generateSoapFromTranscript(
  transcript: string,
  patientHint?: string,
): Promise<SoapResult> {
  let res: Response;
  try {
    res = await fetch("/api/mediscript/soap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, patientHint }),
    });
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  let payload: {
    soapNote?: SoapNoteInput;
    meta?: {
      model: string;
      diagnosisCount: number;
      icdVerifiedCount: number;
      whoIcdConfigured: boolean;
    };
    error?: string;
    reason?: string;
  } = {};
  try {
    payload = await res.json();
  } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }

  if (res.status === 503 && payload.reason === "not_configured") {
    return {
      kind: "not_configured",
      message:
        payload.error ??
        "Gemini not configured. Set GOOGLE_GEMINI_API_KEY to enable SOAP generation.",
    };
  }
  if (!res.ok || !payload.soapNote || !payload.meta) {
    return {
      kind: "error",
      message: payload.error ?? `SOAP generation failed (HTTP ${res.status}).`,
    };
  }

  return { kind: "ok", soapNote: payload.soapNote, meta: payload.meta };
}

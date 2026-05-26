import "server-only";

/**
 * Google Cloud Speech-to-Text client with medical model.
 *
 * Uses `medical_dictation` for clinical transcription.
 * Arabic (ar-SA) is the primary language; English (en-US) is alternative.
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS in .env.local pointing to
 * a service account JSON with Speech-to-Text API enabled.
 */

let clientInstance: InstanceType<
  typeof import("@google-cloud/speech").SpeechClient
> | null | undefined;

export function isGcpSpeechConfigured(): boolean {
  return !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

async function getClient() {
  if (clientInstance !== undefined) return clientInstance;
  if (!isGcpSpeechConfigured()) {
    clientInstance = null;
    return null;
  }
  try {
    const { SpeechClient } = await import("@google-cloud/speech");
    clientInstance = new SpeechClient();
    console.log("[gcp-speech] Client initialized successfully");
    return clientInstance;
  } catch (err) {
    console.error("[gcp-speech] Failed to initialize client", err);
    clientInstance = null;
    return null;
  }
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  languageCode: string;
}

export type SpeechResult =
  | { kind: "ok"; data: TranscriptionResult }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

/**
 * Transcribe audio using Google Cloud Speech-to-Text medical model.
 */
export async function transcribeWithMedicalModel(
  audioBytes: Buffer,
  mimeType: string,
  hint?: "ar" | "en",
): Promise<SpeechResult> {
  if (!isGcpSpeechConfigured()) {
    return {
      kind: "not_configured",
      message: "Set GOOGLE_APPLICATION_CREDENTIALS to enable medical transcription.",
    };
  }

  const client = await getClient();
  if (!client) {
    return { kind: "not_configured", message: "Speech client unavailable." };
  }

  const encoding = mimeToEncoding(mimeType);

  // Default to Arabic for Saudi clinical context
  const primaryLang = hint === "en" ? "en-US" : "ar-SA";
  const alternativeLangs = hint === "en" ? ["ar-SA"] : ["en-US"];

  console.log(
    `[gcp-speech] Encoding: ${encoding} | Primary: ${primaryLang} | Alt: ${alternativeLangs.join(",")} | Size: ${(audioBytes.length / 1024).toFixed(0)} KB`,
  );

  try {
    // Use longRunningRecognize for files > 1 min; recognize for shorter
    // For clinical recordings, most are 1-10 min, so use long-running
    const useSync = audioBytes.length < 1_000_000; // ~1 MB → likely < 1 min

    if (useSync) {
      const [response] = await client.recognize({
        audio: { content: audioBytes.toString("base64") },
        config: buildConfig(encoding, primaryLang, alternativeLangs),
      });
      return processResponse(response, primaryLang);
    } else {
      // Long-running for larger files
      console.log("[gcp-speech] Using longRunningRecognize for large file");
      const [operation] = await client.longRunningRecognize({
        audio: { content: audioBytes.toString("base64") },
        config: buildConfig(encoding, primaryLang, alternativeLangs),
      });
      const [response] = await operation.promise();
      return processResponse(response, primaryLang);
    }
  } catch (err) {
    console.error("[gcp-speech] Transcription error:", err);
    const message = err instanceof Error ? err.message : "Transcription failed";

    // If the medical model isn't available, try the default model
    if (
      message.includes("model") ||
      message.includes("not found") ||
      message.includes("INVALID_ARGUMENT")
    ) {
      console.log("[gcp-speech] Medical model failed, trying default model...");
      try {
        const [response] = await client.recognize({
          audio: { content: audioBytes.toString("base64") },
          config: buildConfig(encoding, primaryLang, alternativeLangs, "default"),
        });
        return processResponse(response, primaryLang);
      } catch (err2) {
        console.error("[gcp-speech] Default model also failed:", err2);
        return {
          kind: "error",
          message: err2 instanceof Error ? err2.message : "Transcription failed",
        };
      }
    }

    return { kind: "error", message };
  }
}

function buildConfig(
  encoding: string,
  primaryLang: string,
  alternativeLangs: string[],
  model: string = "medical_dictation",
) {
  // WebM/Opus doesn't need explicit sample rate — GCP auto-detects
  const needsSampleRate = encoding === "LINEAR16" || encoding === "FLAC";

  return {
    encoding: encoding as never,
    ...(needsSampleRate ? { sampleRateHertz: 48000 } : {}),
    languageCode: primaryLang,
    alternativeLanguageCodes: alternativeLangs,
    model,
    useEnhanced: true,
    enableAutomaticPunctuation: true,
    speechContexts: [
      {
        phrases: [
          // English medical terms
          "blood pressure", "diabetes", "hypertension", "prescription",
          "milligrams", "twice daily", "three times daily", "ICD",
          "SOAP note", "chief complaint", "physical examination",
          "hemoglobin", "creatinine", "glucose", "cholesterol",
          // Arabic medical terms
          "ضغط الدم", "السكري", "الوصفة", "ملغ", "مرتين يوميا",
          "الفحص السريري", "الشكوى الرئيسية", "التاريخ المرضي",
          "الهيموجلوبين", "الكرياتينين", "الجلوكوز",
        ],
        boost: 15,
      },
    ],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processResponse(response: any, fallbackLang: string): SpeechResult {
  const results = response?.results ?? [];
  if (results.length === 0) {
    return { kind: "error", message: "No speech detected in the audio." };
  }

  const transcript = results
    .map((r: { alternatives?: Array<{ transcript?: string }> }) =>
      r.alternatives?.[0]?.transcript ?? "",
    )
    .filter(Boolean)
    .join(" ");

  if (!transcript.trim()) {
    return { kind: "error", message: "Transcription was empty." };
  }

  const confidence =
    results[0]?.alternatives?.[0]?.confidence ?? 0;
  const detectedLang =
    (results[0] as { languageCode?: string })?.languageCode ?? fallbackLang;

  return {
    kind: "ok",
    data: {
      transcript: transcript.trim(),
      confidence,
      languageCode: detectedLang,
    },
  };
}

function mimeToEncoding(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("webm") || lower.includes("opus")) return "WEBM_OPUS";
  if (lower.includes("ogg")) return "OGG_OPUS";
  if (lower.includes("mp4") || lower.includes("m4a")) return "MP4";
  if (lower.includes("wav")) return "LINEAR16";
  if (lower.includes("flac")) return "FLAC";
  // For unknown types, let GCP auto-detect
  return "ENCODING_UNSPECIFIED";
}

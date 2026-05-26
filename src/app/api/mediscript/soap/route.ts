import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
} from "@/lib/ai/gemini";
import {
  isWhoIcdConfigured,
  verifyDiagnoses,
} from "@/lib/ai/who-icd";
import {
  SOAP_RESPONSE_SCHEMA,
  SOAP_SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/lib/mediscript/soap-prompt";
import { emptySoapNote } from "@/lib/encounter-soap";
import { soapNoteSchema, type SoapNoteInput } from "@/lib/validations/encounter";

/**
 * POST /api/mediscript/soap
 *
 * Body: { transcript: string, patientHint?: string }
 * Response:
 *   200 { soapNote, geminiConfigured: boolean, whoIcdConfigured: boolean }
 *   401 { error }
 *   429 { error, reason: "rate_limited", retryAfterSeconds }
 *   503 { error, reason: "not_configured" } — when no GOOGLE_GEMINI_API_KEY
 *   500 { error }
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  transcript: z.string().min(10, "Transcript is too short").max(100_000),
  patientHint: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Gemini is not configured. Set GOOGLE_GEMINI_API_KEY in .env.local to enable SOAP generation.",
        reason: "not_configured",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const client = getGeminiClient();
  if (!client) {
    return NextResponse.json(
      { error: "Gemini client unavailable." },
      { status: 503 },
    );
  }

  const { transcript, patientHint } = parsed.data;

  // ── Gemini call ─────────────────────────────────────────────────
  let rawJson: string;
  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(transcript, patientHint) }] }],
      config: {
        systemInstruction: SOAP_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: SOAP_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    rawJson = result.text ?? "";
    if (!rawJson) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[mediscript.soap] Gemini failed", err);
    return NextResponse.json(
      {
        error: `SOAP generation failed: ${err instanceof Error ? err.message : "unexpected error"}`,
      },
      { status: 502 },
    );
  }

  // ── Validate the model's output against our Zod schema ─────────
  let aiSoap: SoapNoteInput;
  try {
    const obj = JSON.parse(rawJson);
    const validated = soapNoteSchema.safeParse(obj);
    if (!validated.success) {
      console.error("[mediscript.soap] AI output failed Zod", validated.error.issues);
      // Fallback: return an empty SOAP rather than 500. The doctor can fill it in.
      aiSoap = soapNoteSchema.parse(emptySoapNote());
    } else {
      aiSoap = validated.data;
    }
  } catch (err) {
    console.error("[mediscript.soap] AI output not JSON", err);
    aiSoap = soapNoteSchema.parse(emptySoapNote());
  }

  // ── WHO ICD-11 verification (best-effort) ─────────────────────
  let icdNote: SoapNoteInput = aiSoap;
  let icdVerifiedCount = 0;
  if (isWhoIcdConfigured() && aiSoap.assessment.diagnoses.length > 0) {
    try {
      const verified = await verifyDiagnoses(aiSoap.assessment.diagnoses);
      icdVerifiedCount = verified.filter((d) => d.verified).length;
      icdNote = {
        ...aiSoap,
        assessment: { ...aiSoap.assessment, diagnoses: verified },
      };
    } catch (err) {
      console.warn("[mediscript.soap] WHO ICD verification failed (non-fatal)", err);
    }
  }

  return NextResponse.json(
    {
      soapNote: icdNote,
      meta: {
        model: GEMINI_MODEL,
        geminiConfigured: true,
        whoIcdConfigured: isWhoIcdConfigured(),
        diagnosisCount: aiSoap.assessment.diagnoses.length,
        icdVerifiedCount,
      },
    },
    {
      headers: {
        ...rl.headers,
        "Cache-Control": "private, no-store",
      },
    },
  );
}

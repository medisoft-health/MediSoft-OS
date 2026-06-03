/**
 * AI Interpreter — Backend API
 * Real-time medical translation using Gemini with medical terminology awareness
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { translationSessions, patients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// Supported languages
const SUPPORTED_LANGUAGES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  ur: "Urdu",
  hi: "Hindi",
  bn: "Bengali",
  tl: "Filipino/Tagalog",
  id: "Indonesian",
  fr: "French",
  es: "Spanish",
  tr: "Turkish",
  fa: "Persian/Farsi",
  ml: "Malayalam",
  ta: "Tamil",
  te: "Telugu",
  zh: "Chinese (Mandarin)",
  ko: "Korean",
  ja: "Japanese",
  pt: "Portuguese",
  ru: "Russian",
  de: "German",
};

// GET /api/ai-interpreter — Get translation sessions history
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const patientId = searchParams.get("patientId");
    const physicianId = searchParams.get("physicianId");

    if (action === "languages") {
      return NextResponse.json({ success: true, data: SUPPORTED_LANGUAGES });
    }

    if (action === "stats") {
      const allSessions = await db.select().from(translationSessions);
      const stats = {
        totalSessions: allSessions.length,
        totalWords: allSessions.reduce((sum, s) => sum + (s.wordCount || 0), 0),
        totalMedicalTerms: allSessions.reduce((sum, s) => sum + (s.medicalTermsDetected || 0), 0),
        languagePairs: [...new Set(allSessions.map(s => `${s.sourceLanguage}-${s.targetLanguage}`))],
        avgDuration: allSessions.length > 0
          ? Math.round(allSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / allSessions.length)
          : 0,
      };
      return NextResponse.json({ success: true, data: stats });
    }

    // List sessions
    const conditions = [];
    if (patientId) conditions.push(eq(translationSessions.patientId, parseInt(patientId)));
    if (physicianId) conditions.push(eq(translationSessions.physicianId, physicianId));

    const sessions = await db
      .select()
      .from(translationSessions)
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(desc(translationSessions.startedAt))
      .limit(50);

    return NextResponse.json({ success: true, data: sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/ai-interpreter — Translate text or manage sessions
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action } = body;

    // Real-time translation
    if (action === "translate") {
      const { text, sourceLanguage, targetLanguage, medicalContext } = body;

      if (!text || !sourceLanguage || !targetLanguage) {
        return NextResponse.json(
          { success: false, error: "text, sourceLanguage, and targetLanguage are required" },
          { status: 400 }
        );
      }

      const sourceLang = SUPPORTED_LANGUAGES[sourceLanguage] || sourceLanguage;
      const targetLang = SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage;

      const translationPrompt = `You are a professional medical interpreter. Translate the following text from ${sourceLang} to ${targetLang}.

IMPORTANT RULES:
1. Maintain medical accuracy — use correct medical terminology in the target language
2. Preserve the tone and intent of the speaker
3. If a medical term has no direct translation, transliterate it and add a brief explanation
4. Flag any potentially dangerous misinterpretations

${medicalContext ? `Medical context: ${medicalContext}` : ""}

Text to translate: "${text}"

Respond in JSON format:
{
  "translation": "The translated text",
  "medicalTerms": [
    { "original": "term in source", "translated": "term in target", "definition": "brief medical definition" }
  ],
  "confidence": 0.95,
  "notes": "Any important notes about the translation (cultural context, ambiguity, etc.)"
}`;

      const aiResult = await getGeminiClient()!.models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts: [{ text: translationPrompt }] }], config: { temperature: 0.3 } });
      const aiText = aiResult.text ?? "";

      let translationResult;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        translationResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        translationResult = { translation: "Translation failed. Please try again.", confidence: 0 };
      }

      return NextResponse.json({
        success: true,
        data: {
          original: text,
          sourceLanguage,
          targetLanguage,
          ...translationResult,
          wordCount: text.split(/\s+/).length,
        },
      });
    }

    // Start a new translation session
    if (action === "start_session") {
      const { patientId, physicianId, sourceLanguage, targetLanguage, encounterId } = body;

      if (!physicianId || !sourceLanguage || !targetLanguage) {
        return NextResponse.json(
          { success: false, error: "physicianId, sourceLanguage, and targetLanguage are required" },
          { status: 400 }
        );
      }

      const [session] = await db
        .insert(translationSessions)
        .values({
          patientId: patientId || null,
          physicianId,
          encounterId: encounterId || null,
          sourceLanguage,
          targetLanguage,
          transcript: [],
          wordCount: 0,
          medicalTermsDetected: 0,
        })
        .returning();

      return NextResponse.json({ success: true, data: session }, { status: 201 });
    }

    // Add translation to session transcript
    if (action === "add_to_session") {
      const { sessionId, speaker, original, translated, language } = body;

      if (!sessionId || !original || !translated) {
        return NextResponse.json(
          { success: false, error: "sessionId, original, and translated are required" },
          { status: 400 }
        );
      }

      const [session] = await db.select().from(translationSessions).where(eq(translationSessions.id, sessionId));
      if (!session) {
        return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
      }

      const currentTranscript = (session.transcript as any[]) || [];
      currentTranscript.push({
        timestamp: new Date().toISOString(),
        speaker: speaker || "unknown",
        original,
        translated,
        language: language || session.sourceLanguage,
      });

      await db
        .update(translationSessions)
        .set({
          transcript: currentTranscript,
          wordCount: (session.wordCount || 0) + original.split(/\s+/).length,
        })
        .where(eq(translationSessions.id, sessionId));

      return NextResponse.json({ success: true, data: { entriesCount: currentTranscript.length } });
    }

    // End session
    if (action === "end_session") {
      const { sessionId } = body;

      const [session] = await db.select().from(translationSessions).where(eq(translationSessions.id, sessionId));
      if (!session) {
        return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
      }

      const duration = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      const transcript = (session.transcript as any[]) || [];

      // Count medical terms across all translations
      const medicalTermCount = transcript.length; // simplified

      const [updated] = await db
        .update(translationSessions)
        .set({
          endedAt: new Date(),
          durationSeconds: duration,
          medicalTermsDetected: medicalTermCount,
        })
        .where(eq(translationSessions.id, sessionId))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    }

    // Translate medical phrase from library
    if (action === "medical_phrase") {
      const { phrase, targetLanguage } = body;

      const phrasesPrompt = `Translate this common medical phrase to ${SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage}:
"${phrase}"

Respond in JSON: { "translation": "...", "pronunciation": "phonetic guide if applicable" }`;

      const aiResult = await getGeminiClient()!.models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts: [{ text: phrasesPrompt }] }], config: { temperature: 0.3 } });
      const aiText = aiResult.text ?? "";

      let result;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { translation: phrase };
      } catch {
        result = { translation: phrase };
      }

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/env";

/**
 * Lazy Google GenAI client (Gemini). Returns null when no API key is
 * configured so route handlers can degrade gracefully.
 *
 * Note: this uses the **Generative Language API** (Gemini Developer API)
 * because that's what GOOGLE_GEMINI_API_KEY authenticates. The Vertex AI
 * path (recommended for KSA / SDAIA-compliant deployment) is a separate
 * follow-up — it uses ADC, not an API key.
 */
let client: GoogleGenAI | null | undefined;

export function getGeminiClient(): GoogleGenAI | null {
  if (client !== undefined) return client;
  const key = env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!key) {
    client = null;
    return null;
  }
  client = new GoogleGenAI({ apiKey: key });
  return client;
}

export function isGeminiConfigured(): boolean {
  return !!env.GOOGLE_GEMINI_API_KEY?.trim();
}

/** Default model — Gemini 2.5 Pro for the best clinical reasoning. */
export const GEMINI_MODEL = "gemini-2.5-pro";

// ─────────────────────────────────────────────────────────────────
// Unicode decode utility — fixes Gemini double-escaped Arabic text.
//
// When Gemini returns JSON with responseMimeType "application/json",
// Arabic strings sometimes arrive as literal \uXXXX escape sequences
// (double-escaped: the backslash is part of the string content, not
// a JSON escape). After JSON.parse, the string contains literal
// characters `\`, `u`, `0`, `6`, `2`, `7` instead of `ا`.
//
// decodeAllStrings() recursively walks any object/array and decodes
// these sequences. Safe to call on already-decoded text (no-op).
// ─────────────────────────────────────────────────────────────────

/** Decode \\uXXXX and \\u{XXXXX} sequences in a string to real characters. */
function decodeUnicodeEscapes(text: string): string {
  if (!text || typeof text !== "string") return text;
  // Handle \u{XXXXX} (extended, 1-6 hex digits)
  let result = text.replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
  // Handle \uXXXX (BMP, exactly 4 hex digits)
  result = result.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return result;
}

/**
 * Recursively decode all string values in an object/array.
 * Apply this to every parsed Gemini response before using it.
 */
export function decodeAllStrings<T>(obj: T): T {
  if (typeof obj === "string") return decodeUnicodeEscapes(obj) as T;
  if (Array.isArray(obj)) return obj.map(decodeAllStrings) as T;
  if (obj && typeof obj === "object") {
    const decoded: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      decoded[key] = decodeAllStrings(value);
    }
    return decoded as T;
  }
  return obj;
}

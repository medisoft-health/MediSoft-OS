import "server-only";
import OpenAI from "openai";
import { env } from "@/env";

/**
 * Lazy OpenAI client. Returns null when no API key is configured so
 * route handlers can return a friendly "configure to enable" response
 * instead of crashing at runtime.
 */
let client: OpenAI | null | undefined;

export function getOpenAIClient(): OpenAI | null {
  if (client !== undefined) return client;
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) {
    client = null;
    return null;
  }
  client = new OpenAI({ apiKey: key });
  return client;
}

export function isOpenAIConfigured(): boolean {
  return !!env.OPENAI_API_KEY?.trim();
}

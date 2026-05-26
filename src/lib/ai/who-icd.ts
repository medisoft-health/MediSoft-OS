import "server-only";
import { env } from "@/env";

/**
 * WHO ICD-11 API client (lightweight, native fetch).
 *
 * The WHO ICD-API uses OAuth2 client_credentials. We cache the bearer
 * token in module-scope (process-local) and refresh ~30s before expiry.
 *
 * Spec: https://icd.who.int/icdapi/docs2/APIDoc-Version2/
 *
 * Default release: `2024-01` (latest available at time of writing). The
 * `?releaseId=` query parameter pins the lookup against a specific release
 * for reproducibility of clinical records.
 */

const TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token";
const ICD_BASE = "https://id.who.int/icd";
const DEFAULT_RELEASE = "2024-01";
const DEFAULT_LANG = "en";

interface TokenRecord {
  accessToken: string;
  expiresAt: number; // ms epoch
}

let cachedToken: TokenRecord | null = null;
let inflightToken: Promise<string> | null = null;

export function isWhoIcdConfigured(): boolean {
  return !!(env.WHO_ICD_CLIENT_ID?.trim() && env.WHO_ICD_CLIENT_SECRET?.trim());
}

async function fetchToken(): Promise<string> {
  if (!isWhoIcdConfigured()) {
    throw new Error("WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET not configured");
  }
  const body = new URLSearchParams({
    client_id: env.WHO_ICD_CLIENT_ID!,
    client_secret: env.WHO_ICD_CLIENT_SECRET!,
    scope: "icdapi_access",
    grant_type: "client_credentials",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    // No Next.js caching — token endpoint is auth, not data.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`WHO ICD token request failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number; // seconds
  };
  const expiresAt = Date.now() + (data.expires_in - 30) * 1000;
  cachedToken = { accessToken: data.access_token, expiresAt };
  return data.access_token;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }
  if (inflightToken) return inflightToken;
  inflightToken = fetchToken().finally(() => {
    inflightToken = null;
  });
  return inflightToken;
}

interface WhoSearchHit {
  /** Stem URL of the entity (e.g. https://id.who.int/icd/release/11/2024-01/mms/123456) */
  id: string;
  /** Highlighted HTML title — may include <em> tags */
  title: string;
  /** Plaintext title we extract */
  cleanTitle: string;
  /** ICD-11 code like "1A02.Y" (may be empty for some entities) */
  theCode: string;
  score: number;
}

interface WhoRawSearchHit {
  id: string;
  title?: string;
  matchingPVs?: Array<{ propertyId: string; label?: string }>;
  theCode?: string;
  score?: number;
}

interface WhoSearchResponse {
  destinationEntities?: WhoRawSearchHit[];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

/**
 * Search the ICD-11 MMS linearization for a free-text diagnosis label.
 * Returns the top 3 hits ordered by ICD-API score.
 */
export async function searchIcd11(query: string): Promise<WhoSearchHit[]> {
  if (!isWhoIcdConfigured()) return [];
  const q = query.trim();
  if (q.length < 3) return [];

  let token: string;
  try {
    token = await getToken();
  } catch (err) {
    console.error("[who-icd] token error", err);
    return [];
  }

  const url = new URL(`${ICD_BASE}/release/11/${DEFAULT_RELEASE}/mms/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("subtreeFilterUsesFoundationDescendants", "false");
  url.searchParams.set("includeKeywordResult", "true");
  url.searchParams.set("useFlexisearch", "true");
  url.searchParams.set("flatResults", "true");
  url.searchParams.set("highlightingEnabled", "false");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Accept-Language": DEFAULT_LANG,
      "API-Version": "v2",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`[who-icd] search failed: ${res.status}`);
    return [];
  }
  const data = (await res.json()) as WhoSearchResponse;
  const entities = data.destinationEntities ?? [];
  return entities.slice(0, 3).map((e) => ({
    id: e.id,
    title: e.title ?? "",
    cleanTitle: stripHtml(e.title ?? ""),
    theCode: (e.theCode ?? "").trim(),
    score: typeof e.score === "number" ? e.score : 0,
  }));
}

export interface VerifiedDiagnosis {
  description: string;
  icdCode?: string;
  icdDescription?: string;
  verified: boolean;
}

/**
 * Take a list of free-text diagnoses (typically from Gemini's SOAP output)
 * and attach verified ICD-11 codes when the WHO API returns a confident
 * match. If WHO is not configured or the lookup fails, returns the input
 * unchanged with `verified: false`.
 */
export async function verifyDiagnoses(
  diagnoses: Array<{ description: string; icdCode?: string; icdDescription?: string }>,
): Promise<VerifiedDiagnosis[]> {
  if (!isWhoIcdConfigured() || diagnoses.length === 0) {
    return diagnoses.map((d) => ({ ...d, verified: false }));
  }

  // Bound concurrency to avoid hammering the API.
  const results: VerifiedDiagnosis[] = [];
  for (const dx of diagnoses) {
    const hits = await searchIcd11(dx.description).catch(() => []);
    const top = hits[0];
    if (top && top.theCode && top.score >= 0.7) {
      results.push({
        description: dx.description,
        icdCode: top.theCode,
        icdDescription: top.cleanTitle,
        verified: true,
      });
    } else {
      results.push({
        description: dx.description,
        icdCode: dx.icdCode,
        icdDescription: dx.icdDescription,
        verified: false,
      });
    }
  }
  return results;
}

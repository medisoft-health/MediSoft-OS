import "server-only";

/**
 * RxNorm API client (NIH / NLM, free, no API key required).
 *
 * Spec: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
 *
 * We use it for:
 *   1) Approximate name search (free-text → candidate RxCUI list)
 *   2) Concept lookup by RxCUI (display name, term type, ATC mapping)
 *   3) "Get drug-drug interactions" was officially deprecated by NIH in
 *      January 2024 — we no longer use that endpoint. Interactions come
 *      from OpenFDA + the Gemini layer.
 *
 * RxNorm has a generous rate limit (20 requests/sec/IP). Caching is
 * not strictly required but we add a tiny in-memory cache to dedupe
 * back-to-back identical queries.
 */

const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";
const SEARCH_TTL_MS = 60_000;

// ─────────────────────────────────────────────────────────────────
// Tiny in-process cache
// ─────────────────────────────────────────────────────────────────
const cache = new Map<string, { value: unknown; expiresAt: number }>();

async function cachedJson<T>(
  url: string,
  ttlMs = SEARCH_TTL_MS,
): Promise<T | null> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  const value = (await res.json()) as T;
  cache.set(url, { value, expiresAt: now + ttlMs });
  return value;
}

// ─────────────────────────────────────────────────────────────────
// Approximate search
// ─────────────────────────────────────────────────────────────────
export interface RxNormCandidate {
  rxcui: string;
  name: string;
  /** Term type: SBD (semantic branded drug), SCD (clinical drug), IN (ingredient), etc. */
  tty: string;
  /** Approximate match score from the upstream API (higher = better). */
  score: number;
}

interface ApproxResponse {
  approximateGroup?: {
    candidate?: Array<{ rxcui: string; score?: string; name?: string }>;
  };
}

interface RxConceptResponse {
  idGroup?: {
    rxnormId?: string[];
  };
  rxcuiStatusHistory?: unknown;
}

interface RxNormConceptProps {
  properties?: {
    rxcui: string;
    name: string;
    tty?: string;
    synonym?: string;
  };
}

/**
 * Search RxNorm for candidate drugs matching a free-text query.
 * Returns the top N candidates ordered by approximation score.
 */
export async function searchRxNorm(
  query: string,
  limit = 8,
): Promise<RxNormCandidate[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(q)}&maxEntries=${limit}&option=1`;
  const data = await cachedJson<ApproxResponse>(url);
  if (!data?.approximateGroup?.candidate) return [];

  // Dedupe by rxcui — the API often returns multiple rows per concept.
  const seen = new Set<string>();
  const candidates: RxNormCandidate[] = [];

  for (const c of data.approximateGroup.candidate) {
    if (!c.rxcui || seen.has(c.rxcui)) continue;
    seen.add(c.rxcui);

    // Get the canonical name + tty from the concept endpoint.
    const props = await getRxNormConcept(c.rxcui);
    if (!props) continue;

    candidates.push({
      rxcui: c.rxcui,
      name: props.name,
      tty: props.tty,
      score: Number(c.score ?? 0),
    });
    if (candidates.length >= limit) break;
  }
  return candidates;
}

// ─────────────────────────────────────────────────────────────────
// Concept lookup
// ─────────────────────────────────────────────────────────────────
export interface RxNormConcept {
  rxcui: string;
  name: string;
  tty: string;
  /** WHO ATC classification when available (e.g. "C09AA02" for enalapril). */
  atcCode: string | null;
}

interface RxConceptDetailResponse {
  properties?: {
    rxcui: string;
    name: string;
    synonym?: string;
    tty?: string;
  };
}

interface RxClassResponse {
  rxclassDrugInfoList?: {
    rxclassDrugInfo?: Array<{
      rxclassMinConceptItem?: { classId?: string; className?: string; classType?: string };
    }>;
  };
}

export async function getRxNormConcept(rxcui: string): Promise<RxNormConcept | null> {
  if (!rxcui.trim()) return null;
  const url = `${RXNORM_BASE}/rxcui/${encodeURIComponent(rxcui)}/properties.json`;
  const data = await cachedJson<RxConceptDetailResponse>(url, 5 * 60_000);
  if (!data?.properties) return null;

  // Best-effort ATC lookup (separate endpoint, may 404).
  const atc = await getAtcForRxcui(rxcui).catch(() => null);

  return {
    rxcui: data.properties.rxcui,
    name: data.properties.name,
    tty: data.properties.tty ?? "Unknown",
    atcCode: atc,
  };
}

async function getAtcForRxcui(rxcui: string): Promise<string | null> {
  const url = `${RXNORM_BASE}/rxclass/class/byRxcui.json?rxcui=${encodeURIComponent(rxcui)}&relaSource=ATC`;
  const data = await cachedJson<RxClassResponse>(url, 60 * 60_000);
  const first = data?.rxclassDrugInfoList?.rxclassDrugInfo?.[0];
  return first?.rxclassMinConceptItem?.classId ?? null;
}

import "server-only";
import { env } from "@/env";

/**
 * OpenFDA Drug Label API client (US FDA, free, optional API key).
 *
 * Spec: https://open.fda.gov/apis/drug/label/
 *
 * Without a key: 240 requests/minute, 1000/day per IP.
 * With a key (`OPENFDA_API_KEY`): 240/min, 120,000/day.
 *
 * We query the structured-product-labeling dataset (`/drug/label.json`)
 * by ingredient name to extract:
 *   - drug_interactions (free-text per FDA label section 7)
 *   - warnings_and_cautions, contraindications, boxed_warning
 *   - dosage_and_administration, indications_and_usage
 *
 * Each label can be large (50–500 KB). We narrow with explicit field
 * selection and cap to 1 result by default.
 */

const OPENFDA_BASE = "https://api.fda.gov/drug/label.json";

const cache = new Map<string, { value: OpenFdaLabel | null; expiresAt: number }>();
const CACHE_TTL = 30 * 60_000; // 30 minutes

export interface OpenFdaLabel {
  /** SPL Set ID — stable identifier for an FDA drug label. */
  setId: string | null;
  /** Drug-interactions free-text from label section 7. */
  drugInteractions: string[];
  warnings: string[];
  contraindications: string[];
  /** Boxed (black-box) warning content if any. */
  boxedWarning: string | null;
  dosageAndAdministration: string[];
  indicationsAndUsage: string[];
  /** Effective time of this label (YYYYMMDD). */
  effectiveTime: string | null;
  /** Original brand or generic name from the label header. */
  brandName: string | null;
  genericName: string | null;
}

interface OpenFdaResponse {
  results?: Array<{
    set_id?: string;
    drug_interactions?: string[];
    warnings_and_cautions?: string[];
    warnings?: string[];
    contraindications?: string[];
    boxed_warning?: string[];
    dosage_and_administration?: string[];
    indications_and_usage?: string[];
    effective_time?: string;
    openfda?: {
      brand_name?: string[];
      generic_name?: string[];
      rxcui?: string[];
    };
  }>;
}

function appendKey(url: URL): URL {
  const key = env.OPENFDA_API_KEY?.trim();
  if (key) url.searchParams.set("api_key", key);
  return url;
}

/**
 * Look up the FDA label for an ingredient. Returns null when no label
 * is on file (rare for branded drugs, possible for unlicensed products).
 */
export async function getFdaLabelByIngredient(
  ingredient: string,
): Promise<OpenFdaLabel | null> {
  const i = ingredient.trim();
  if (i.length < 2) return null;

  const cacheKey = `ingr:${i.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  // Search the openfda subfield for generic_name OR brand_name.
  const url = new URL(OPENFDA_BASE);
  url.searchParams.set(
    "search",
    `openfda.generic_name:"${i}"+openfda.brand_name:"${i}"`,
  );
  url.searchParams.set("limit", "1");
  appendKey(url);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[openfda] network error", err);
    return null;
  }

  if (res.status === 404) {
    // OpenFDA returns 404 when no rows match. That's a valid "no label found" answer.
    cache.set(cacheKey, { value: null, expiresAt: Date.now() + CACHE_TTL });
    return null;
  }
  if (!res.ok) {
    console.warn(`[openfda] HTTP ${res.status}`);
    return null;
  }

  const data = (await res.json()) as OpenFdaResponse;
  const row = data.results?.[0];
  if (!row) {
    cache.set(cacheKey, { value: null, expiresAt: Date.now() + CACHE_TTL });
    return null;
  }

  const label: OpenFdaLabel = {
    setId: row.set_id ?? null,
    drugInteractions: cleanArray(row.drug_interactions),
    warnings: cleanArray(row.warnings_and_cautions ?? row.warnings),
    contraindications: cleanArray(row.contraindications),
    boxedWarning: cleanArray(row.boxed_warning)[0] ?? null,
    dosageAndAdministration: cleanArray(row.dosage_and_administration),
    indicationsAndUsage: cleanArray(row.indications_and_usage),
    effectiveTime: row.effective_time ?? null,
    brandName: row.openfda?.brand_name?.[0] ?? null,
    genericName: row.openfda?.generic_name?.[0] ?? null,
  };

  cache.set(cacheKey, { value: label, expiresAt: Date.now() + CACHE_TTL });
  return label;
}

function cleanArray(input: string[] | undefined): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
}

/**
 * Fetch FDA labels for multiple ingredients in parallel. Returns a map
 * keyed by the original ingredient string (case-preserved) so callers
 * can look results up directly.
 */
export async function getFdaLabelsByIngredients(
  ingredients: string[],
): Promise<Map<string, OpenFdaLabel | null>> {
  const unique = Array.from(new Set(ingredients.map((s) => s.trim()).filter(Boolean)));
  const pairs = await Promise.all(
    unique.map(async (i) => [i, await getFdaLabelByIngredient(i)] as const),
  );
  const map = new Map<string, OpenFdaLabel | null>();
  for (const [k, v] of pairs) map.set(k, v);
  return map;
}

/** Lightweight: is OpenFDA reachable + an API key configured? */
export function isOpenFdaKeyed(): boolean {
  return !!env.OPENFDA_API_KEY?.trim();
}

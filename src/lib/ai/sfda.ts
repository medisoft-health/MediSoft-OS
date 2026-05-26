import "server-only";

/**
 * SFDA (Saudi Food and Drug Authority) drug registry — extension point.
 *
 * Status: NOT YET CONNECTED.
 *
 * The SFDA does not currently publish a public, programmatic drug-registry
 * API. To enable this layer, one of the following is required:
 *
 *   1. Licensed access to the SFDA registry (multi-month procurement)
 *   2. A static snapshot of the registry seeded into our DB
 *   3. A scraping pipeline (high ToS risk; not recommended)
 *
 * When access is procured, replace the bodies of the functions below
 * with the real implementation. The PharmaX UI, audit log, and queries
 * already consume this interface — no other files need to change.
 *
 * Returning empty / "unavailable" markers is intentional and safe.
 */

export interface SfdaDrugMatch {
  /** SFDA registration number, e.g. "20-25-1234". */
  sfdaCode: string;
  /** Marketed name in Saudi Arabia (often the brand name). */
  saudiName: string;
  saudiNameAr?: string;
  /** Manufacturer / agent. */
  manufacturer?: string;
  /** Whether this product appears on the SFDA shortage list. */
  inShortage: boolean;
  /** Cross-references to RxNorm and ATC when known. */
  rxcui?: string;
  atcCode?: string;
}

export type SfdaLookupStatus =
  | { kind: "ok"; match: SfdaDrugMatch | null }
  | { kind: "unavailable"; reason: "not_connected" | "error"; message: string };

export function isSfdaConfigured(): boolean {
  // When SFDA access is procured, gate this on the appropriate env var.
  return false;
}

/**
 * Look up a drug in the SFDA registry by name or RxCUI.
 *
 * Current behaviour: returns { kind: "unavailable", reason: "not_connected" }.
 * Once integrated, returns { kind: "ok", match: SfdaDrugMatch | null }.
 */
export async function lookupSfdaDrug(
  _query: { name?: string; rxcui?: string },
): Promise<SfdaLookupStatus> {
  if (!isSfdaConfigured()) {
    return {
      kind: "unavailable",
      reason: "not_connected",
      message:
        "SFDA registry integration is not yet connected. " +
        "See src/lib/ai/sfda.ts for the extension point.",
    };
  }
  // Real implementation will live here.
  return { kind: "ok", match: null };
}

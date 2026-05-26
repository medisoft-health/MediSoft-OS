import "server-only";

/**
 * Patient-code helpers.
 *
 * The public patient identifier (`MS-000123`) is derived from the integer
 * primary key on `patients.id`. Generation is therefore automatic — the
 * sequence allocates a new id on INSERT and we only need to format it.
 *
 * Compare with `formatPatientId()` in src/lib/utils.ts which is the
 * client-safe formatter (no "server-only" guard).
 */

const PATIENT_CODE_RE = /^MS-(\d{1,10})$/i;

/**
 * Parse a patient code like "MS-000123" into the numeric id. Returns null
 * for inputs that don't match the canonical shape. Case-insensitive on
 * the prefix; leading zeros tolerated.
 */
export function parsePatientCode(input: string): number | null {
  if (!input) return null;
  const m = PATIENT_CODE_RE.exec(input.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Format a numeric patient id as the public-facing code. Identical to the
 * client-side helper in utils.ts but exported from a server-only module
 * for symmetry with `parsePatientCode`.
 */
export function formatPatientCode(id: number | string): string {
  return `MS-${String(id).padStart(6, "0")}`;
}

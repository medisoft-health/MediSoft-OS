import "server-only";
import { and, desc, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";

/**
 * Cross-resource search for the Cmd+K palette.
 *
 * Phase 2 only searches the `patients` table. Encounters and prescriptions
 * will be added in later PRs (they're text-light until MediScript ships).
 *
 * Returns a typed, flat list grouped client-side by `type`.
 */

export type SearchResult = {
  type: "patient";
  id: number;
  label: string;
  sublabel: string;
  href: string;
};

interface SearchOptions {
  /** Hard cap on results to keep the palette snappy. */
  limit?: number;
}

/**
 * Patient search backing the global Cmd-K palette.
 *
 * **Performance**: hard-capped at `limit` (default 20) + 2-char minimum
 * to avoid full-table scans on single-character keystrokes. The route
 * handler sets `Cache-Control: private, no-store` to prevent shared
 * cache leaks of PHI.
 *
 * **Index coverage** (see src/db/schema.ts):
 *   - `patients_name_idx` (last_name, first_name)
 *   - `patients_phone_idx` (phone)
 *   - `patients_saudi_id_idx` (saudi_id, UNIQUE)
 *   - `patients_mrn_idx` (mrn, UNIQUE)
 *
 * Past ~50k rows, add a `pg_trgm` GIN index for true substring search.
 */
export async function searchEverything(
  query: string,
  { limit = 20 }: SearchOptions = {},
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const needle = `%${q}%`;

  const rows = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      firstNameAr: patients.firstNameAr,
      lastNameAr: patients.lastNameAr,
      saudiId: patients.saudiId,
      mrn: patients.mrn,
      phone: patients.phone,
    })
    .from(patients)
    .where(
      and(
        isNull(patients.deletedAt),
        or(
          ilike(patients.firstName, needle),
          ilike(patients.lastName, needle),
          ilike(patients.firstNameAr, needle),
          ilike(patients.lastNameAr, needle),
          ilike(patients.saudiId, needle),
          ilike(patients.mrn, needle),
          ilike(patients.phone, needle),
        )!,
      ),
    )
    .orderBy(desc(patients.updatedAt))
    .limit(limit);

  return rows.map((p) => {
    const name = `${p.firstName} ${p.lastName}`;
    const id = `MS-${String(p.id).padStart(6, "0")}`;
    // Build a useful subline — show whichever identifier matched.
    const parts: string[] = [id];
    if (p.saudiId) parts.push(p.saudiId);
    if (p.mrn && p.mrn !== p.saudiId) parts.push(`MRN ${p.mrn}`);
    if (p.phone) parts.push(p.phone);
    return {
      type: "patient" as const,
      id: p.id,
      label: name,
      sublabel: parts.slice(0, 2).join(" · "),
      href: `/patients/${p.id}`,
    };
  });
}

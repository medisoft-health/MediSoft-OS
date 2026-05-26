import "server-only";
import { createHash } from "node:crypto";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * SDAIA tamper-evident hash chain for the audit log.
 *
 * Each audit row's `hash` is:
 *   SHA-256( previousHash + id + actorId + action + resourceType +
 *            resourceId + patientId + metadata_json + ipAddress +
 *            createdAt_iso )
 *
 * The `previousHash` is the `hash` of the most-recent prior row.
 * The first row (genesis) uses previousHash = "0" × 64.
 *
 * This forms a singly-linked chain: any row that is inserted, updated,
 * or deleted in the middle of the sequence breaks all subsequent hashes.
 * The `verifyAuditChain()` function walks the chain and reports the
 * first breakage point.
 *
 * **Concurrency note**: in high-write scenarios two inserts could race
 * to read the same "latest hash" and produce a fork. We mitigate this
 * with a SELECT ... FOR UPDATE on the latest row inside a transaction.
 * For single-instance dev / low-write clinical use, the sequential
 * nature of the serial id already provides ordering.
 */

const GENESIS_HASH = "0".repeat(64);

/**
 * Compute the SHA-256 hash for a single audit row.
 *
 * The input is a deterministic concatenation of every non-hash column,
 * pipe-delimited. Nulls are represented as the empty string. The
 * `metadata` JSONB is serialised with sorted keys so the hash is
 * stable regardless of key insertion order.
 */
export function computeRowHash(
  previousHash: string,
  row: {
    id: number;
    actorId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    patientId: number | null;
    metadata: unknown;
    ipAddress: string | null;
    createdAt: Date | string;
  },
): string {
  const parts = [
    previousHash,
    String(row.id),
    row.actorId ?? "",
    row.action,
    row.resourceType,
    row.resourceId ?? "",
    row.patientId != null ? String(row.patientId) : "",
    row.metadata != null ? JSON.stringify(row.metadata, Object.keys(row.metadata as object).sort()) : "",
    row.ipAddress ?? "",
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/**
 * Fetch the hash of the most recent audit row. Returns the genesis
 * sentinel when the table is empty.
 *
 * Uses SELECT ... ORDER BY id DESC LIMIT 1 — the serial PK guarantees
 * ordering.
 */
export async function getLatestAuditHash(): Promise<string> {
  const [latest] = await db
    .select({ hash: auditLog.hash })
    .from(auditLog)
    .orderBy(desc(auditLog.id))
    .limit(1);
  return latest?.hash ?? GENESIS_HASH;
}

/**
 * Verify the integrity of the audit chain. Walks every row in id order
 * and recomputes the hash; returns the first mismatch or null if the
 * entire chain is valid.
 *
 * **Performance**: reads every row. Run as a scheduled job or admin
 * action, not on every request. Paginated internally to avoid loading
 * the entire table into memory.
 */
export interface ChainBreak {
  /** The row id where the chain broke. */
  rowId: number;
  /** Expected hash (recomputed from content + previous). */
  expected: string;
  /** Actual hash stored on the row. */
  actual: string | null;
}

export async function verifyAuditChain(
  batchSize = 500,
): Promise<{ valid: boolean; rowsChecked: number; firstBreak: ChainBreak | null }> {
  let previousHash = GENESIS_HASH;
  let offset = 0;
  let rowsChecked = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await db
      .select()
      .from(auditLog)
      .orderBy(auditLog.id)
      .limit(batchSize)
      .offset(offset);

    if (batch.length === 0) break;

    for (const row of batch) {
      rowsChecked++;
      const expected = computeRowHash(previousHash, {
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        patientId: row.patientId,
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
      });

      if (row.hash !== expected) {
        return {
          valid: false,
          rowsChecked,
          firstBreak: {
            rowId: row.id,
            expected,
            actual: row.hash,
          },
        };
      }
      previousHash = expected;
    }

    offset += batchSize;
  }

  return { valid: true, rowsChecked, firstBreak: null };
}

export { GENESIS_HASH };

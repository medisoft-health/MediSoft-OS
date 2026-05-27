import "server-only";
import { headers } from "next/headers";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { computeRowHash, getLatestAuditHash } from "@/lib/audit-chain";

/**
 * SDAIA / NDMO-required audit logging for all PHI access and mutations.
 *
 * Every server action or route handler that touches patient data MUST call
 * this helper. The audit_log table is tamper-evident:
 *   - Each row stores a SHA-256 `hash` computed from its content + the
 *     `previousHash` of the preceding row.
 *   - No UPDATE/DELETE permissions should be granted in production.
 *   - The chain can be verified end-to-end via `verifyAuditChain()` in
 *     src/lib/audit-chain.ts.
 *
 * @see src/db/schema.ts → auditLog
 * @see src/lib/audit-chain.ts → computeRowHash, verifyAuditChain
 */
export type AuditAction =
  // patients
  | "patient.create"
  | "patient.view"
  | "patient.update"
  | "patient.delete"
  | "patient.list"
  // encounters
  | "encounter.create"
  | "encounter.view"
  | "encounter.update"
  | "encounter.sign"
  | "encounter.delete"
  // prescriptions
  | "prescription.create"
  | "prescription.update"
  | "prescription.delete"
  // labs
  | "lab.create"
  | "lab.view"
  // scans
  | "scan.create"
  | "scan.view"
  // vitals
  | "vitals.record"
  | "vitals.view"
  // documents
  | "document.upload"
  | "document.view"
  | "document.delete"
  // auth
  | "auth.signin"
  | "auth.signout"
  | "auth.signup"
  // medibot
  | "medibot.chat";

export type AuditResourceType =
  | "patient"
  | "encounter"
  | "prescription"
  | "lab_result"
  | "scan"
  | "vital"
  | "document"
  | "user"
  | "session"
  | "medibot_session";

interface AuditInput {
  /** The user performing the action. `null` for unauthenticated events (rare). */
  actorId: string | null;
  /** Canonical action name from the union above. */
  action: AuditAction;
  /** What kind of resource was touched. */
  resourceType: AuditResourceType;
  /** The resource ID (string-coerced — patients are int, others are uuid). */
  resourceId?: string | number | null;
  /** Optional patient FK so we can quickly query "everything that touched patient X". */
  patientId?: number | null;
  /** Structured details (what fields changed, before/after, etc.). Avoid PII bodies; reference IDs. */
  metadata?: Record<string, unknown>;
}

/**
 * Insert a tamper-evident audit-log row. Never throws — failure to audit
 * must not break the user's request.
 *
 * The hash chain works as follows:
 *   1) Fetch the `hash` of the most recent row (or the genesis sentinel).
 *   2) INSERT the new row (gets a serial `id` + `created_at` from the DB).
 *   3) Compute SHA-256( previousHash + row content ) and UPDATE the hash.
 *
 * Step 2-then-3 is a pragmatic choice: Drizzle's `returning()` gives us
 * the auto-generated `id` + `createdAt`, which we need for the hash input.
 * A single INSERT with a pre-computed hash would require us to predict the
 * serial id, which is fragile under concurrency.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    // Best-effort extraction of request headers for forensic context.
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ipAddress =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null;
      userAgent = h.get("user-agent") ?? null;
    } catch {
      // headers() can throw outside of a request context; not fatal.
    }

    // 1) Get the previous row's hash for the chain link.
    const previousHash = await getLatestAuditHash();

    // 2) INSERT with hash=null initially (we need the auto-generated id + createdAt).
    const resourceId = input.resourceId != null ? String(input.resourceId) : null;
    const metadata = input.metadata ?? null;
    const [inserted] = await db
      .insert(auditLog)
      .values({
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId,
        patientId: input.patientId ?? null,
        metadata,
        ipAddress,
        userAgent,
        previousHash,
        hash: null, // set in step 3
      })
      .returning({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
      });

    if (!inserted) return;

    // 3) Compute the hash now that we have the row's final id + createdAt.
    const hash = computeRowHash(previousHash, {
      id: inserted.id,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId,
      patientId: input.patientId ?? null,
      metadata,
      ipAddress,
      createdAt: inserted.createdAt,
    });

    // 4) UPDATE the hash on the row we just inserted.
    const { eq } = await import("drizzle-orm");
    await db
      .update(auditLog)
      .set({ hash })
      .where(eq(auditLog.id, inserted.id));
  } catch (err) {
    // Audit failures are critical signals but must not propagate to the user.
    console.error("[audit] failed to log entry", { input, err });
  }
}

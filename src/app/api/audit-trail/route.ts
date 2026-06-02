import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { and, eq, gte, lte, desc, count, type SQL } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * Audit Trail API — Admin-only read access to the tamper-evident audit log.
 *
 * GET /api/audit-trail?userId=...&patientId=...&action=...&from=...&to=...&limit=50&offset=0
 *
 * Returns: { success: true, data: AuditLogEntry[], total: number }
 *
 * Access: Requires an active session with role = "admin".
 */
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  // Admin-only guard
  if (auth.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin access required" },
      { status: 403 },
    );
  }

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  const patientId = searchParams.get("patientId");
  const action = searchParams.get("action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Number(searchParams.get("offset")) || 0;

  try {
    // Build dynamic filter conditions
    const conditions: SQL[] = [];

    if (userId) {
      conditions.push(eq(auditLog.actorId, userId));
    }
    if (patientId) {
      const pid = Number(patientId);
      if (!isNaN(pid)) {
        conditions.push(eq(auditLog.patientId, pid));
      }
    }
    if (action) {
      conditions.push(eq(auditLog.action, action));
    }
    if (from) {
      conditions.push(gte(auditLog.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(auditLog.createdAt, new Date(to)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch rows + total count in parallel
    const [rows, [totalRow]] = await Promise.all([
      db
        .select()
        .from(auditLog)
        .where(whereClause)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(auditLog)
        .where(whereClause),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      total: totalRow?.count ?? 0,
    });
  } catch (err) {
    console.error("[Audit Trail API] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 },
    );
  }
}

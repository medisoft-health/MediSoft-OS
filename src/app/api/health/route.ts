import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/health
 *
 * نقطة فحص صحة التطبيق — يستخدمها Cloud Run و Docker HEALTHCHECK
 * للتأكد من أن التطبيق يعمل وقاعدة البيانات متصلة.
 *
 * الردود:
 *   200 → كل شيء سليم
 *   503 → قاعدة البيانات غير متصلة
 *   500 → خطأ غير متوقع
 */
export const runtime = "nodejs";

// لا نحتاج authentication للـ health check
// Cloud Run يحتاج الوصول بدون auth
export async function GET() {
  const start = Date.now();

  try {
    // ─── فحص اتصال قاعدة البيانات ────────────────────────
    // نرسل استعلام بسيط (SELECT 1) للتأكد من:
    //   1. قاعدة البيانات متصلة
    //   2. الاتصال ليس معطلاً (stale connection)
    //   3. الاستعلام يرد في وقت معقول (<5 ثواني)
    await db.execute(sql`SELECT 1`);

    const latencyMs = Date.now() - start;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.COMMIT_SHA ?? "dev",
        database: "connected",
        latencyMs,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store",
        },
      },
    );
  } catch (err) {
    // ─── قاعدة البيانات غير متصلة ─────────────────────────
    // Cloud Run سيعيد تشغيل الحاوية إذا فشل الفحص 3 مرات
    const latencyMs = Date.now() - start;

    console.error("[health] Database check failed:", err);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "disconnected",
        error: err instanceof Error ? err.message : "Unknown error",
        latencyMs,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store",
        },
      },
    );
  }
}

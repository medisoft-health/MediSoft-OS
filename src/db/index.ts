import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * MediSoft C-OS — Production-Grade Database Connection
 *
 * Build-safe: During `next build` inside Docker, DATABASE_URL is a placeholder
 * that cannot connect. We detect this and create a dummy connection that will
 * never be called (all pages are force-dynamic, so no DB queries run at build time).
 * At runtime on Cloud Run, the real DATABASE_URL from Secret Manager is used.
 *
 * Improvements:
 * - Connection pooling with proper limits for Cloud SQL
 * - Idle timeout tuned for healthcare workloads (long shifts)
 * - Connection lifetime limit to prevent stale connections
 * - Global singleton pattern to prevent connection leaks during HMR
 */

const DATABASE_URL = process.env.DATABASE_URL ?? "";

/**
 * Detect if we're in a build environment with a placeholder DATABASE_URL.
 * During `next build`, the Dockerfile sets a fake URL that can't connect.
 */
const isBuildTime =
  DATABASE_URL.includes("placeholder") ||
  DATABASE_URL === "" ||
  process.env.NEXT_PHASE === "phase-production-build";

const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof postgres> | undefined;
};

function createConnection() {
  if (isBuildTime) {
    // Return a postgres instance that won't actually be used at build time.
    // All pages under (app) are force-dynamic, so no queries execute during build.
    // We still need to return a valid postgres instance for type-checking.
    return postgres(DATABASE_URL, {
      max: 1,
      idle_timeout: 1,
      connect_timeout: 1,
      prepare: false,
    });
  }

  return postgres(DATABASE_URL, {
    // Pool configuration — tuned for Cloud SQL Standard tier
    max: 15,                    // max concurrent connections (Cloud SQL default limit: 100)
    idle_timeout: 30,           // close idle connections after 30s
    connect_timeout: 15,        // allow more time for Cloud SQL public IP
    max_lifetime: 60 * 30,      // recycle connections every 30 minutes

    // Query configuration
    prepare: false,             // required for transaction poolers & Cloud SQL

    // SSL — scoped to DB connection only (not global NODE_TLS)
    ssl: { rejectUnauthorized: false },

    // Connection reliability
    connection: {
      application_name: "medisoft-cos",
    },

    // Transform configuration for healthcare data types
    transform: {
      undefined: null,          // convert undefined to null for safety
    },

    // Error handling — log connection issues
    onnotice: (notice) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[DB Notice]", notice.message);
      }
    },
  });
}

const conn = globalForDb.conn ?? createConnection();

// Cache connection in development to survive HMR, and in production
// to prevent creating new pools on every module import
if (!isBuildTime) {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export type DB = typeof db;
export { schema };

/**
 * Health check function — used by monitoring and API health endpoints.
 * Returns true if the database is reachable.
 */
export async function checkDbHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  if (isBuildTime) {
    return { healthy: false, latencyMs: 0, error: "Build-time placeholder" };
  }
  const start = Date.now();
  try {
    await conn`SELECT 1 as health_check`;
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

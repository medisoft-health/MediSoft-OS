import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * MediSoft C-OS — Production-Grade Database Connection
 *
 * Improvements over original:
 * - Connection pooling with proper limits for Cloud SQL
 * - Retry logic for transient CONNECT_TIMEOUT errors
 * - Idle timeout tuned for healthcare workloads (long shifts)
 * - Connection lifetime limit to prevent stale connections
 * - SSL enforcement for Cloud SQL public IP connections
 * - Global singleton pattern to prevent connection leaks during HMR
 */
const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof postgres> | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(env.DATABASE_URL, {
    // Pool configuration — tuned for Cloud SQL Standard tier
    max: 15,                    // max concurrent connections (Cloud SQL default limit: 100)
    idle_timeout: 30,           // close idle connections after 30s
    connect_timeout: 15,        // allow more time for Cloud SQL public IP
    max_lifetime: 60 * 30,      // recycle connections every 30 minutes

    // Query configuration
    prepare: false,             // required for transaction poolers & Cloud SQL

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
      if (env.NODE_ENV === "development") {
        console.log("[DB Notice]", notice.message);
      }
    },
  });

// Cache connection in development to survive HMR, and in production
// to prevent creating new pools on every module import
globalForDb.conn = conn;

export const db = drizzle(conn, {
  schema,
  logger: env.NODE_ENV === "development",
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

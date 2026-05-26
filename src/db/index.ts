import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Postgres connection (Supabase-compatible).
 *
 * We use a single pooled client for the app. Drizzle handles query type-safety.
 * In development we cache the connection on globalThis to survive HMR.
 */
const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof postgres> | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required for Supabase transaction pooler
  });

if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema, logger: env.NODE_ENV === "development" });

export type DB = typeof db;
export { schema };

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Type-safe environment variables.
 * Add new variables here so misconfigurations fail at build time, not at runtime.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // --- Database (Supabase Postgres) ---
    DATABASE_URL: z.string().url().describe("Postgres connection string (pooled, for app)"),
    DIRECT_URL: z
      .string()
      .url()
      .optional()
      .describe("Postgres direct connection (for migrations)"),

    // --- Auth (Better-Auth) ---
    BETTER_AUTH_SECRET: z.string().min(32).describe("Secret for signing auth tokens"),
    BETTER_AUTH_URL: z.string().url().describe("Canonical app URL"),

    // --- AI (Phase 3+) ---
    GOOGLE_GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),

    // --- External medical APIs (Phase 4) ---
    OPENFDA_API_KEY: z.string().optional(),
    WHO_ICD_CLIENT_ID: z.string().optional(),
    WHO_ICD_CLIENT_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  },
  // Next.js bundles env vars at build time. Map them here so client vars survive bundling.
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENFDA_API_KEY: process.env.OPENFDA_API_KEY,
    WHO_ICD_CLIENT_ID: process.env.WHO_ICD_CLIENT_ID,
    WHO_ICD_CLIENT_SECRET: process.env.WHO_ICD_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Skip validation during builds where env may not be present (e.g. CI lint).
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

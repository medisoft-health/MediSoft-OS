import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load .env.local first (Next.js convention), fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for drizzle-kit. Add it to .env.local");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  casing: "snake_case",
});

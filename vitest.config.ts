import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration for MediSoft C-OS.
 *
 * Scope:
 *   - Pure-function unit tests for everything under src/lib/**
 *   - Validation schemas, formatters, classifiers, AI prompt builders
 *
 * Out of scope (handled by PR-8b/8c):
 *   - Server-action integration tests (need a real DB)
 *   - End-to-end browser tests (Playwright)
 *   - React component snapshot tests
 *
 * Why happy-dom and not jsdom: ~2x faster, less surface area, and we
 * only need it for the handful of tests that touch `URL`, `crypto`, or
 * web-API globals.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Skip @t3-oss/env validation in tests — modules that import env.ts
    // (e.g. lib/email, lib/rate-limit) would otherwise fail to load.
    env: {
      SKIP_ENV_VALIDATION: "1",
      BASE_URL: process.env.BASE_URL || "https://app.medisofthealth.com",
    },
    include: [
      "src/**/__tests__/**/*.test.ts",
      "src/**/__tests__/**/*.test.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/**/index.ts",
        // Server-only modules can't run under vitest's default env.
        // We'll cover these in PR-8b with a separate suite.
        "src/lib/audit.ts",
        "src/lib/actions/**",
        "src/lib/queries/**",
        "src/lib/storage/**",
        "src/lib/ai/openai.ts",
        "src/lib/ai/gemini.ts",
        "src/lib/ai/who-icd.ts",
        "src/lib/ai/openfda.ts",
        "src/lib/ai/rxnorm.ts",
        "src/lib/ai/pharmax-analyzer.ts",
        "src/lib/medilab/narrative.ts",
        "src/lib/mediscan/vision.ts",
        "src/lib/mediscript/soap-prompt.ts",
      ],
      thresholds: {
        // Modest baseline; PR-8b raises these.
        lines: 60,
        functions: 60,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" is a Next.js runtime guard that throws if imported
      // outside of a server context. In tests we stub it to a no-op so
      // we can test pure server-side helpers (e.g. patient-id formatters).
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
});

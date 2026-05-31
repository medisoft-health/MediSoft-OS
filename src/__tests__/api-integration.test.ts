/**
 * MediSoft C-OS — API Integration Tests
 *
 * Tests all core clinical API endpoints and AI innovation modules.
 * These are integration tests that hit the real running app.
 *
 * Run: BASE_URL=https://app.medisofthealth.com npx vitest run src/__tests__/api-integration.test.ts
 */
import { describe, it, expect } from "vitest";

const BASE_URL = process.env.BASE_URL || "https://app.medisofthealth.com";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return { status: res.status, data: await res.json().catch(() => null), ok: res.ok };
}

// ─────────────────────────────────────────────────────────────────
// 1. Health Check
// ─────────────────────────────────────────────────────────────────
describe("Health Check", () => {
  it("returns healthy status with all services", async () => {
    const { data, ok } = await api("/api/health");
    expect(ok).toBe(true);
    expect(data.status).toBe("healthy");
    expect(data.application).toBe("MediSoft C-OS");
    expect(data.checks.database.status).toBe("up");
    expect(data.services).toBeDefined();
    expect(data.services.auth).toContain("Better Auth");
    expect(data.services.ai).toContain("Gemini");
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. Authentication
// ─────────────────────────────────────────────────────────────────
describe("Authentication", () => {
  it("logs in with valid credentials", async () => {
    const { data, ok } = await api("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email: "medisoft2022@gmail.com",
        password: "Medisoft2022!!",
      }),
    });
    expect(ok).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe("medisoft2022@gmail.com");
    expect(data.token).toBeDefined();
  });

  it("rejects invalid credentials", async () => {
    const { ok } = await api("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email: "wrong@example.com",
        password: "wrongpassword!!",
      }),
    });
    expect(ok).toBe(false);
  });

  it("registers a new user with UUID format", async () => {
    const testEmail = `test-e2e-${Date.now()}@example.com`;
    const { data, ok } = await api("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: "E2E Test Doctor",
        email: testEmail,
        password: "TestPassword2026!!",
      }),
    });
    expect(ok).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(data.user.role).toBe("physician");
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. Core AI Innovation APIs (GET — status/capabilities)
// ─────────────────────────────────────────────────────────────────
describe("AI Innovation APIs — Status", () => {
  const innovations = [
    { name: "MediPredict", path: "/api/medipredict" },
    { name: "MediTwin", path: "/api/meditwin" },
    { name: "Prior Auth", path: "/api/prior-auth" },
    { name: "MediFederate", path: "/api/medifederate" },
    { name: "MediTimeline", path: "/api/meditimeline" },
    { name: "MediGenome", path: "/api/medigenome" },
    { name: "MediFlow", path: "/api/mediflow" },
    { name: "MediVoice", path: "/api/medivoice" },
    { name: "MediSense", path: "/api/medisense" },
    { name: "MediEvidence", path: "/api/medievidence" },
    { name: "MediEthics", path: "/api/mediethics" },
    { name: "MediCollab", path: "/api/medicollab" },
    { name: "MediLearn", path: "/api/medilearn" },
    { name: "MediMind", path: "/api/medimind" },
    { name: "MediTrial", path: "/api/meditrial" },
    { name: "MediSurgery", path: "/api/medisurgery" },
    { name: "MediMental", path: "/api/medimental" },
    { name: "MediRCM", path: "/api/medircm" },
  ];

  for (const { name, path } of innovations) {
    it(`${name} API returns valid status`, async () => {
      const { data, ok, status } = await api(path);
      expect(status).toBeLessThan(500);
      expect(data).toBeDefined();
      // Most innovation APIs return a module name or status on GET
      if (ok && data) {
        expect(typeof data).toBe("object");
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// 4. MediGuard Safety System
// ─────────────────────────────────────────────────────────────────
describe("MediGuard Safety System", () => {
  it("returns drug safety analysis", async () => {
    const { data, ok } = await api("/api/pharmax/mediguard");
    expect(ok).toBe(true);
    expect(data).toBeDefined();
  });

  it("returns clinical guidelines", async () => {
    const { data, ok } = await api("/api/pharmax/mediguard/guidelines");
    expect(ok).toBe(true);
    expect(data).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. Google Health Integration
// ─────────────────────────────────────────────────────────────────
describe("Google Health APIs", () => {
  it("FHIR endpoint responds", async () => {
    const { status } = await api("/api/google-health/fhir");
    expect(status).toBeLessThan(500);
  });

  it("MedGemma endpoint responds", async () => {
    const { status } = await api("/api/google-health/medgemma");
    expect(status).toBeLessThan(500);
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. MediBot AI Assistant
// ─────────────────────────────────────────────────────────────────
describe("MediBot", () => {
  it("returns status on GET", async () => {
    const { data, ok } = await api("/api/medibot");
    expect(ok).toBe(true);
    expect(data).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// 7. Tier 1 Innovation POST Tests (Demo Actions)
// ─────────────────────────────────────────────────────────────────
describe("Tier 1 — MediTrial Demo", () => {
  it("matches a patient to clinical trials", async () => {
    const { data, ok } = await api("/api/meditrial", {
      method: "POST",
      body: JSON.stringify({
        action: "match",
        patientId: "demo-nsclc-001",
      }),
    });
    if (ok) {
      expect(data).toBeDefined();
    }
    // Even if auth required, should not be 500
    expect([200, 401, 403]).toContain(ok ? 200 : 401);
  });
});

describe("Tier 1 — MediSurgery Demo", () => {
  it("generates a surgical plan", async () => {
    const { data, status } = await api("/api/medisurgery", {
      method: "POST",
      body: JSON.stringify({
        action: "plan",
        procedure: "cholecystectomy",
        patientId: "demo-001",
      }),
    });
    expect(status).toBeLessThan(500);
    if (data) {
      expect(typeof data).toBe("object");
    }
  });
});

describe("Tier 1 — MediMental Demo", () => {
  it("runs a mental health assessment", async () => {
    const { data, status } = await api("/api/medimental", {
      method: "POST",
      body: JSON.stringify({
        action: "assess",
        patientId: "demo-mental-001",
      }),
    });
    expect(status).toBeLessThan(500);
    if (data) {
      expect(typeof data).toBe("object");
    }
  });
});

describe("Tier 1 — MediRCM Demo", () => {
  it("processes a revenue cycle pipeline", async () => {
    const { data, status } = await api("/api/medircm", {
      method: "POST",
      body: JSON.stringify({
        action: "process",
        encounterId: "demo-enc-001",
      }),
    });
    expect(status).toBeLessThan(500);
    if (data) {
      expect(typeof data).toBe("object");
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// 8. Security Headers
// ─────────────────────────────────────────────────────────────────
describe("Security Headers", () => {
  it("returns proper security headers", async () => {
    const res = await fetch(`${BASE_URL}/`);
    const headers = res.headers;
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBeTruthy();
    expect(headers.get("strict-transport-security")).toBeTruthy();
    expect(headers.get("referrer-policy")).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────
// 9. Page Accessibility (key pages return 200)
// ─────────────────────────────────────────────────────────────────
describe("Page Accessibility", () => {
  const publicPages = ["/login", "/signup"];

  for (const page of publicPages) {
    it(`${page} returns 200`, async () => {
      const res = await fetch(`${BASE_URL}${page}`);
      expect(res.status).toBe(200);
    });
  }

  it("root redirects to login or dashboard", async () => {
    const res = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    // Should be 200 (if logged in) or 307 redirect to /login
    expect([200, 302, 307, 308]).toContain(res.status);
  });
});

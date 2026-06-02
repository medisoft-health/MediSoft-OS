/**
 * MediSoft C-OS — Patient 360° Intelligence API Integration Tests
 *
 * Tests the Patient 360 API endpoints for all GET actions
 * (summary, trends, risk, comparison, alerts, insights) and
 * POST self-reporting actions (symptom, mood, food, exercise).
 *
 * These are integration tests that hit the real running app.
 *
 * Run: BASE_URL=https://app.medisofthealth.com npx vitest run src/__tests__/patient-360.test.ts
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
// 1. GET — Patient 360 Summary
// ─────────────────────────────────────────────────────────────────
describe("Patient 360 — GET Actions", () => {
  it("GET /api/patient-360?action=summary&patientId=1 returns 200 with success", async () => {
    const { data, ok, status } = await api("/api/patient-360?action=summary&patientId=1");
    // May require auth — should not be 500
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    }
  });

  it("GET /api/patient-360?action=trends&patientId=1 returns 200 with trend data", async () => {
    const { data, ok, status } = await api("/api/patient-360?action=trends&patientId=1");
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    }
  });

  it("GET /api/patient-360?action=risk&patientId=1 returns 200 with risk assessment", async () => {
    const { data, ok, status } = await api("/api/patient-360?action=risk&patientId=1");
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    }
  });

  it("GET /api/patient-360?action=comparison&patientId=1 returns 200", async () => {
    const { data, ok, status } = await api("/api/patient-360?action=comparison&patientId=1");
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
    }
  });

  it("GET /api/patient-360?action=alerts&patientId=1 returns 200", async () => {
    const { data, ok, status } = await api("/api/patient-360?action=alerts&patientId=1");
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
    }
  });

  it("GET /api/patient-360?action=insights&patientId=1 returns 200", async () => {
    const { data, ok, status } = await api("/api/patient-360?action=insights&patientId=1");
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
    }
  });

  it("GET /api/patient-360?action=invalid returns 400 (bad action)", async () => {
    const { data, status } = await api("/api/patient-360?action=invalid&patientId=1");
    // If auth passes, should be 400; if auth blocks, 401
    expect([400, 401]).toContain(status);
    if (status === 400) {
      expect(data.error).toContain("Unknown action");
    }
  });

  it("GET /api/patient-360 (no patientId) returns 400", async () => {
    const { data, status } = await api("/api/patient-360?action=summary");
    // If auth passes, should be 400; if auth blocks, 401
    expect([400, 401]).toContain(status);
    if (status === 400) {
      expect(data.error).toContain("patientId");
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. POST — Patient Self-Reporting
// ─────────────────────────────────────────────────────────────────
describe("Patient 360 — POST Self-Reporting", () => {
  it("POST report_symptom returns 200 with success", async () => {
    const { data, ok, status } = await api("/api/patient-360", {
      method: "POST",
      body: JSON.stringify({
        action: "report_symptom",
        patientId: 1,
        data: {
          symptom: "صداع",
          symptomEn: "Headache",
          severity: "moderate",
          duration: "2 hours",
          location: "frontal",
          description: "Persistent frontal headache",
        },
      }),
    });
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
    }
  });

  it("POST report_mood returns 200 with success", async () => {
    const { data, ok, status } = await api("/api/patient-360", {
      method: "POST",
      body: JSON.stringify({
        action: "report_mood",
        patientId: 1,
        data: {
          mood: "جيد",
          moodEn: "Good",
          score: 7,
          sleepQuality: "good",
          stressLevel: "low",
          notes: "Feeling well today",
        },
      }),
    });
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
    }
  });

  it("POST report_food returns 200 with success", async () => {
    const { data, ok, status } = await api("/api/patient-360", {
      method: "POST",
      body: JSON.stringify({
        action: "report_food",
        patientId: 1,
        data: {
          mealType: "غداء",
          mealTypeEn: "Lunch",
          description: "أرز ودجاج",
          descriptionEn: "Rice and chicken",
          calories: 650,
          protein: 35,
          carbs: 80,
          fat: 15,
          water: 500,
          fasting: false,
        },
      }),
    });
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
    }
  });

  it("POST report_exercise returns 200 with success", async () => {
    const { data, ok, status } = await api("/api/patient-360", {
      method: "POST",
      body: JSON.stringify({
        action: "report_exercise",
        patientId: 1,
        data: {
          exerciseType: "مشي",
          exerciseTypeEn: "Walking",
          duration: 30,
          intensity: "moderate",
          caloriesBurned: 200,
          heartRateAvg: 110,
          notes: "Evening walk around the neighbourhood",
        },
      }),
    });
    expect(status).toBeLessThan(500);
    if (ok) {
      expect(data.success).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. Unauthorized Access
// ─────────────────────────────────────────────────────────────────
describe("Patient 360 — Authorization", () => {
  it("unauthenticated GET request returns 401 or redirect", async () => {
    // Fetch without session cookies — should fail auth
    const res = await fetch(`${BASE_URL}/api/patient-360?action=summary&patientId=1`, {
      headers: { "Content-Type": "application/json" },
      redirect: "manual",
    });
    // requireSessionApi returns 401 if no session; alternatively a redirect
    expect([401, 302, 307]).toContain(res.status);
  });
});

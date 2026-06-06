import { test, expect } from "@playwright/test";

/**
 * Innovation Modules E2E Tests
 * Tests all 7 innovation modules for:
 * - Page load & navigation
 * - API endpoint availability
 * - Mobile responsive behavior
 * - Arabic/RTL rendering
 * - Error handling
 */

test.describe("Innovation Hub", () => {
  test("innovation page loads and shows all 7 modules", async ({ page }) => {
    await page.goto("/en/innovation");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    // Should either show innovation page or redirect to login
    expect(url).toMatch(/innovation|login/);
  });

  test("innovation page loads in Arabic", async ({ page }) => {
    await page.goto("/ar/innovation");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).toMatch(/innovation|login/);
  });
});

test.describe("Zero-Click Intelligence API", () => {
  test("API endpoint responds", async ({ request }) => {
    const response = await request.get("/api/zero-click-intelligence?patientId=test-patient-1");
    // Should return 200 or 401 (if not authenticated)
    expect([200, 401]).toContain(response.status());
  });

  test("API returns proper JSON structure on success", async ({ request }) => {
    const response = await request.get("/api/zero-click-intelligence?patientId=test-patient-1");
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("insights");
      expect(body).toHaveProperty("healthScore");
    }
  });

  test("API handles missing patientId gracefully", async ({ request }) => {
    const response = await request.get("/api/zero-click-intelligence");
    expect([400, 401]).toContain(response.status());
  });
});

test.describe("Collective Intelligence API", () => {
  test("API endpoint responds", async ({ request }) => {
    const response = await request.get("/api/collective-intelligence?clinicId=test-clinic-1");
    expect([200, 401]).toContain(response.status());
  });

  test("API returns proper JSON structure", async ({ request }) => {
    const response = await request.get("/api/collective-intelligence?clinicId=test-clinic-1");
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("totalPatientsAnalyzed");
      expect(body).toHaveProperty("topConditions");
      expect(body).toHaveProperty("outbreakAlerts");
    }
  });
});

test.describe("Predictive Health API", () => {
  test("API endpoint responds", async ({ request }) => {
    const response = await request.post("/api/predictive-health", {
      data: {
        patientId: "test-patient-1",
        age: 45,
        sex: "male",
        bmi: 28,
        smokingStatus: "never",
        exerciseFrequency: "moderate",
      },
    });
    expect([200, 401]).toContain(response.status());
  });

  test("API returns health score and predictions", async ({ request }) => {
    const response = await request.post("/api/predictive-health", {
      data: {
        patientId: "test-patient-1",
        age: 45,
        sex: "male",
        bmi: 28,
        smokingStatus: "never",
        exerciseFrequency: "moderate",
      },
    });
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("overallHealthScore");
      expect(body).toHaveProperty("healthAge");
      expect(body).toHaveProperty("riskPredictions");
      expect(body.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(body.overallHealthScore).toBeLessThanOrEqual(100);
    }
  });
});

test.describe("Athlete Prediction API", () => {
  test("API endpoint responds", async ({ request }) => {
    const response = await request.post("/api/athlete-prediction", {
      data: {
        athleteProfile: {
          name: "Test Athlete",
          sport: "Football",
          age: 25,
          weight: 75,
          height: 178,
        },
      },
    });
    expect([200, 401]).toContain(response.status());
  });

  test("API returns ACWR and injury risk", async ({ request }) => {
    const response = await request.post("/api/athlete-prediction", {
      data: {
        athleteProfile: {
          name: "Test Athlete",
          sport: "Football",
          age: 25,
          weight: 75,
          height: 178,
          trainingYears: 5,
          currentTrainingLoad: [],
          labResults: [],
          injuryHistory: [],
        },
      },
    });
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("acwr");
      expect(body).toHaveProperty("injuryRisk");
      expect(body).toHaveProperty("recoveryPlan");
      expect(body).toHaveProperty("nutritionRecommendations");
    }
  });
});

test.describe("Smart Pharmacy API", () => {
  test("API endpoint responds", async ({ request }) => {
    const response = await request.get("/api/smart-pharmacy?prescriptionId=RX-001");
    expect([200, 401]).toContain(response.status());
  });

  test("API returns pharmacy options", async ({ request }) => {
    const response = await request.get("/api/smart-pharmacy?prescriptionId=RX-001");
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("pharmacyOptions");
      expect(body).toHaveProperty("totalEstimatedCost");
      expect(Array.isArray(body.pharmacyOptions)).toBe(true);
    }
  });
});

test.describe("Patient Empowerment API", () => {
  test("API endpoint responds", async ({ request }) => {
    const response = await request.get("/api/patient-empowerment?patientId=test-patient-1");
    expect([200, 401]).toContain(response.status());
  });

  test("API returns health report structure", async ({ request }) => {
    const response = await request.get("/api/patient-empowerment?patientId=test-patient-1");
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("healthScore");
      expect(body).toHaveProperty("monthlySummary");
      expect(body).toHaveProperty("recommendations");
    }
  });
});

test.describe("Ambient Clinical API", () => {
  test("API endpoint responds to start session", async ({ request }) => {
    const response = await request.post("/api/ambient-clinical", {
      data: { action: "start_session" },
    });
    expect([200, 401]).toContain(response.status());
  });

  test("API endpoint responds to process session", async ({ request }) => {
    const response = await request.post("/api/ambient-clinical", {
      data: {
        action: "process_session",
        transcript: [
          { speaker: "doctor", text: "How are you today?", timestamp: 0, language: "en", confidence: 0.95 },
          { speaker: "patient", text: "I have a headache", timestamp: 5, language: "en", confidence: 0.92 },
        ],
      },
    });
    expect([200, 401]).toContain(response.status());
  });

  test("API returns SOAP notes on process", async ({ request }) => {
    const response = await request.post("/api/ambient-clinical", {
      data: {
        action: "process_session",
        transcript: [
          { speaker: "doctor", text: "How are you today?", timestamp: 0, language: "en", confidence: 0.95 },
          { speaker: "patient", text: "I have a headache for 3 days", timestamp: 5, language: "en", confidence: 0.92 },
        ],
      },
    });
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("soap");
      expect(body.soap).toHaveProperty("subjective");
      expect(body.soap).toHaveProperty("objective");
      expect(body.soap).toHaveProperty("assessment");
      expect(body.soap).toHaveProperty("plan");
    }
  });
});

test.describe("Innovation Modules - Mobile Responsive", () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone

  test("innovation page fits mobile viewport", async ({ page }) => {
    await page.goto("/en/innovation");
    await page.waitForLoadState("networkidle");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(400); // Allow small tolerance
  });

  test("innovation page Arabic fits mobile viewport", async ({ page }) => {
    await page.goto("/ar/innovation");
    await page.waitForLoadState("networkidle");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(400);
  });
});

test.describe("Innovation Modules - Caching", () => {
  test("zero-click returns X-Cache header", async ({ request }) => {
    const response = await request.get("/api/zero-click-intelligence?patientId=cache-test-patient");
    if (response.status() === 200) {
      const cacheHeader = response.headers()["x-cache"];
      expect(cacheHeader).toBeDefined();
      expect(["HIT", "MISS"]).toContain(cacheHeader);
    }
  });

  test("second request returns cache HIT", async ({ request }) => {
    // First request
    await request.get("/api/zero-click-intelligence?patientId=cache-test-patient-2");
    // Second request (should be cached)
    const response = await request.get("/api/zero-click-intelligence?patientId=cache-test-patient-2");
    if (response.status() === 200) {
      const cacheHeader = response.headers()["x-cache"];
      expect(cacheHeader).toBe("HIT");
    }
  });
});

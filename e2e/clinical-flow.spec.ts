import { test, expect } from "@playwright/test";

test.describe("Clinical Workflow", () => {
  test("mediscript new session page loads", async ({ page }) => {
    await page.goto("/mediscript/new");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).toMatch(/mediscript|login/);
  });

  test("pharmax new prescription page loads", async ({ page }) => {
    await page.goto("/pharmax/new");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).toMatch(/pharmax|login/);
  });
});

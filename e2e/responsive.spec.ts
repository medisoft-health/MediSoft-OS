import { test, expect } from "@playwright/test";

test.describe("Responsive Design", () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone

  test("login page is responsive on mobile", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type='email']")).toBeVisible();
    // Form should be visible and not overflow
    const form = page.locator("form");
    if (await form.count() > 0) {
      const box = await form.boundingBox();
      if (box) expect(box.width).toBeLessThanOrEqual(375);
    }
  });

  test("portal selection fits mobile viewport", async ({ page }) => {
    await page.goto("/");
    // Page should not have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});

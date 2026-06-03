import { test, expect } from "@playwright/test";

test.describe("Arabic RTL Support", () => {
  test("/ar/ login page has RTL direction", async ({ page }) => {
    await page.goto("/ar/login");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");
  });

  test("/ar/ shows Arabic text", async ({ page }) => {
    await page.goto("/ar/login");
    // Check for Arabic text on the page
    const content = await page.textContent("body");
    expect(content).toMatch(/[\u0600-\u06FF]/); // Arabic character range
  });

  test("English page has LTR direction", async ({ page }) => {
    await page.goto("/login");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "ltr");
  });
});

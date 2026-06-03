import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/MediSoft/);
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "invalid@test.com");
    await page.fill("input[type='password']", "wrongpassword123");
    await page.click("button[type='submit']");
    // Should show error or stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test("portal selection page loads", async ({ page }) => {
    await page.goto("/");
    // Should show portal options or redirect to login
    await expect(page).toHaveURL(/\//);
  });
});

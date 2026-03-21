import { expect, test } from "@playwright/test";
import { getAdminCredentials } from "./helpers/auth";

test("redirects unauthenticated /admin access to /login", async ({ browser, baseURL }) => {
  if (!baseURL) {
    throw new Error("Playwright baseURL is not configured.");
  }
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/admin`);
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  await context.close();
});

test("allows admin login and lands on admin overview", async ({ page }) => {
  test.skip(!getAdminCredentials(), "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for admin login e2e.");

  await page.goto("/admin");
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin");
  await expect(page.locator('a[href="/admin/posts/new"]')).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { getAdminCredentials } from "./helpers/auth";

test("fills new post form in admin panel", async ({ page }) => {
  test.skip(!getAdminCredentials(), "Set E2E admin credentials for post creation e2e.");

  const unique = Date.now();
  const title = `Playwright E2E Post ${unique}`;
  const slug = `playwright-e2e-post-${unique}`;
  const content = "Playwright tarafından üretilen test içeriği en az on karakterden uzundur.";

  await page.goto("/admin/posts/new");
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/posts/new");

  await page.locator('input[name="title"]').fill(title);
  await page.locator('input[name="slug"]').fill(slug);
  await page.locator('textarea[name="excerpt"]').fill("Kısa test özeti.");

  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type(content);
  await page.evaluate((value) => {
    const input = document.querySelector('input[name="content"]') as HTMLInputElement | null;
    if (!input) {
      return;
    }
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, content);
  await expect(page.locator('input[name="content"]')).toHaveValue(content);

  await expect(page.locator('button[type="submit"]').first()).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("home page responds successfully", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/$/);
});

test("sitemap endpoint responds with xml", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("<urlset");
});

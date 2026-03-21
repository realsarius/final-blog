import { expect, type Page } from "@playwright/test";

export const AUTH_STATE_PATH = "output/playwright/auth-state.json";

type AdminCredentials = {
  email: string;
  password: string;
};

export function getAdminCredentials(): AdminCredentials | null {
  const explicitEmail = (process.env.E2E_ADMIN_EMAIL ?? "").trim();
  const explicitPassword = (process.env.E2E_ADMIN_PASSWORD ?? "").trim();

  if (explicitEmail && explicitPassword) {
    return {
      email: explicitEmail,
      password: explicitPassword,
    };
  }

  const email = (process.env.ADMIN_EMAIL ?? "").trim();
  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  const placeholderValues = new Set(["replace-me", "change-me", "admin@example.com"]);
  const isPlaceholder = placeholderValues.has(email.toLowerCase()) || placeholderValues.has(password.toLowerCase());

  if (!email || !password || isPlaceholder) {
    return null;
  }
  return { email, password };
}

export async function loginAsAdmin(page: Page) {
  const credentials = getAdminCredentials();
  if (!credentials) {
    throw new Error("E2E admin credentials are missing.");
  }

  await page.goto("/login?callbackUrl=/admin");
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.locator('button[type="submit"]').click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin");
}

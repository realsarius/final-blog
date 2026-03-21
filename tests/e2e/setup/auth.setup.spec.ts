import { mkdir, writeFile } from "fs/promises";
import { test as setup } from "@playwright/test";
import { hash } from "bcryptjs";
import { createClient } from "redis";
import { prisma } from "@/lib/prisma";
import { AUTH_STATE_PATH, getAdminCredentials, loginAsAdmin } from "../helpers/auth";

async function ensureAdminUser() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return;
  }

  const passwordHash = await hash(credentials.password, 10);
  const username = credentials.email.split("@")[0]?.slice(0, 32) || "admin";

  await prisma.user.upsert({
    where: { email: credentials.email },
    create: {
      firstName: "E2E",
      lastName: "Admin",
      email: credentials.email,
      username,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    update: {
      passwordHash,
      isActive: true,
      role: "ADMIN",
    },
  });
}

async function clearLoginRateLimit(email: string) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return;
  }

  const client = createClient({ url: redisUrl });
  const key = `ratelimit:default:login:email:${email.toLowerCase().trim()}`;

  try {
    await client.connect();
    await client.del(key);
  } finally {
    await client.quit();
  }
}

setup("authenticate admin session", async ({ page }) => {
  await mkdir("output/playwright", { recursive: true });
  await writeFile("output/playwright/setup-ran.txt", new Date().toISOString());
  const credentials = getAdminCredentials();
  await writeFile(
    "output/playwright/setup-meta.json",
    JSON.stringify({ hasCredentials: Boolean(credentials) }),
  );
  if (!credentials) {
    await page.context().storageState({ path: AUTH_STATE_PATH });
    return;
  }

  await ensureAdminUser();
  await clearLoginRateLimit(credentials.email);
  await loginAsAdmin(page);
  const cookies = await page.context().cookies();
  await writeFile(
    "output/playwright/setup-meta.json",
    JSON.stringify({ hasCredentials: true, cookieCount: cookies.length, url: page.url() }),
  );
  await page.context().storageState({ path: AUTH_STATE_PATH });
});

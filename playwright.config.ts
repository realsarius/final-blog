import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { AUTH_STATE_PATH } from "./tests/e2e/helpers/auth";

const port = Number(process.env.E2E_PORT ?? 3007);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/playwright/report", open: "never" }],
  ],
  outputDir: "output/playwright/test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.E2E_SKIP_WEBSERVER === "true"
    ? undefined
    : {
      command: `npm run dev -- --port ${port}`,
      env: {
        ...process.env,
        RATE_LIMIT_MAX: process.env.E2E_RATE_LIMIT_MAX ?? "1000",
        RATE_LIMIT_WINDOW_SEC: process.env.E2E_RATE_LIMIT_WINDOW_SEC ?? "60",
      },
      url: baseURL,
      timeout: 120_000,
      reuseExistingServer: true,
    },
  projects: [
    {
      name: "setup",
      testMatch: "setup/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ["setup"],
      testIgnore: "setup/**/*.spec.ts",
    },
  ],
});

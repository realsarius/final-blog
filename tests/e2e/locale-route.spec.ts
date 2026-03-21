import { expect, test } from "@playwright/test";

test("sanitizes malicious redirect on locale GET route", async ({ request }) => {
  const response = await request.get("/api/locale?redirect=https://evil.example", {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  const location = response.headers().location ?? "";
  expect(location).not.toContain("evil.example");
  expect(location).toMatch(/\/$/);
});

test("sets locale cookie and redirects safely on locale POST route", async ({ request }) => {
  const response = await request.post("/api/locale", {
    maxRedirects: 0,
    form: {
      locale: "en",
      redirect: "https://evil.example/phish",
    },
  });

  expect(response.status()).toBe(303);
  const headers = response.headers();
  expect(headers.location ?? "").not.toContain("evil.example");
  expect(headers["set-cookie"] ?? "").toContain("site_locale=en");
});

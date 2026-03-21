import { expect, test } from "@playwright/test";

test("accepts honeypot submission without sending mail", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: {
      firstName: "Bot",
      lastName: "User",
      email: "bot@example.com",
      topic: "diger",
      message: "Bu bir honeypot test mesajidir.",
      website: "https://spam.example",
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { ok?: boolean };
  expect(body.ok).toBe(true);
});

test("rejects invalid contact payload", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: {
      firstName: "",
      lastName: "",
      email: "invalid",
      topic: "invalid-topic",
      message: "kisa",
      website: "",
    },
  });

  expect(response.status()).toBe(400);
  const body = await response.json() as { ok?: boolean; error?: string };
  expect(body.ok).toBe(false);
  expect(body.error).toBeTruthy();
});

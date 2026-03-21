import { expect, test } from "@playwright/test";
import { getAdminCredentials } from "./helpers/auth";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=",
  "base64",
);

test("uploads, lists and deletes an image through upload api", async ({ page }) => {
  test.skip(!getAdminCredentials(), "Set E2E admin credentials for upload api e2e.");

  await page.goto("/admin");
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin");

  const uploadResponse = await page.request.post("/api/uploads", {
    multipart: {
      file: {
        name: `e2e-${Date.now()}.png`,
        mimeType: "image/png",
        buffer: tinyPng,
      },
      folder: "uploads",
    },
  });

  if (!uploadResponse.ok()) {
    throw new Error(`Upload failed with status ${uploadResponse.status()}: ${await uploadResponse.text()}`);
  }
  const uploadJson = await uploadResponse.json() as {
    success: number;
    file?: { key: string; url: string; provider: string };
  };
  expect(uploadJson.success).toBe(1);
  expect(uploadJson.file?.key).toBeTruthy();

  const listResponse = await page.request.get("/api/uploads?folder=uploads&limit=20");
  if (!listResponse.ok()) {
    throw new Error(`List failed with status ${listResponse.status()}: ${await listResponse.text()}`);
  }
  const listJson = await listResponse.json() as {
    success: number;
    files?: Array<{ key: string }>;
  };
  expect(listJson.success).toBe(1);
  expect(listJson.files?.some((item) => item.key === uploadJson.file?.key)).toBeTruthy();

  const deleteResponse = await page.request.delete("/api/uploads", {
    data: {
      key: uploadJson.file?.key,
      url: uploadJson.file?.url,
    },
  });
  if (!deleteResponse.ok()) {
    throw new Error(`Delete failed with status ${deleteResponse.status()}: ${await deleteResponse.text()}`);
  }
  const deleteJson = await deleteResponse.json() as { success: number };
  expect(deleteJson.success).toBe(1);
});

import { afterEach, describe, expect, it } from "vitest";
import { validateUploadFile } from "@/modules/upload/upload.validator";

const originalMaxSize = process.env.UPLOAD_MAX_FILE_SIZE_MB;

function createPngBytes() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
  ]);
}

afterEach(() => {
  if (originalMaxSize === undefined) {
    delete process.env.UPLOAD_MAX_FILE_SIZE_MB;
    return;
  }
  process.env.UPLOAD_MAX_FILE_SIZE_MB = originalMaxSize;
});

describe("validateUploadFile", () => {
  it("rejects unsupported file type", () => {
    const file = new File([createPngBytes()], "test.svg", { type: "image/svg+xml" });
    const result = validateUploadFile(file, createPngBytes());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Desteklenmeyen");
    }
  });

  it("rejects files that exceed configured max size", () => {
    process.env.UPLOAD_MAX_FILE_SIZE_MB = "1";
    const largeBuffer = Buffer.alloc(2 * 1024 * 1024, 0);
    const file = new File([largeBuffer], "large.png", { type: "image/png" });
    const result = validateUploadFile(file, largeBuffer);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Dosya boyutu çok büyük");
    }
  });

  it("accepts valid png file", () => {
    process.env.UPLOAD_MAX_FILE_SIZE_MB = "6";
    const pngBytes = createPngBytes();
    const file = new File([pngBytes], "ok.png", { type: "image/png" });
    const result = validateUploadFile(file, pngBytes);

    expect(result).toEqual({ ok: true, detectedMime: "image/png" });
  });
});

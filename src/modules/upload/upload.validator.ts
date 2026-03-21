import { formatMaxUploadSizeMb, resolveMaxUploadSizeBytes } from "@/lib/upload/config";
import { detectImageMime, isAllowedImageType } from "@/lib/upload/mime";
import type { UploadValidationResult } from "@/modules/upload/upload.types";

export function validateUploadFile(file: File, buffer: Buffer): UploadValidationResult {
  if (!isAllowedImageType(file.type)) {
    return { ok: false, error: "Desteklenmeyen dosya.", status: 400 };
  }

  const maxUploadSizeBytes = resolveMaxUploadSizeBytes();
  if (file.size > maxUploadSizeBytes) {
    return {
      ok: false,
      error: `Dosya boyutu çok büyük. En fazla ${formatMaxUploadSizeMb(maxUploadSizeBytes)} MB yükleyebilirsiniz.`,
      status: 400,
    };
  }

  const detectedMime = detectImageMime(buffer);
  if (!detectedMime || !isAllowedImageType(detectedMime)) {
    return {
      ok: false,
      error: "Dosya içeriği geçerli bir görsel değil.",
      status: 400,
      auditEvent: "upload_rejected_invalid_mime",
      auditContext: { claimedMime: file.type, detectedMime: detectedMime ?? "unknown" },
    };
  }

  if (file.type && file.type !== detectedMime) {
    return {
      ok: false,
      error: "MIME bilgisi dosya içeriğiyle uyuşmuyor.",
      status: 400,
      auditEvent: "upload_rejected_mime_mismatch",
      auditContext: { claimedMime: file.type, detectedMime },
    };
  }

  return {
    ok: true,
    detectedMime,
  };
}

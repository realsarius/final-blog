import { scanForMalware } from "@/lib/malwareScan";
import { logSecurityEvent } from "@/lib/securityLog";
import { sanitizeUploadFolder } from "@/lib/uploadStorage";
import { deleteImageRecord, listImageRecords, uploadImageRecord } from "@/modules/upload/upload.repository";
import type { UploadServiceInput } from "@/modules/upload/upload.types";
import { validateUploadFile } from "@/modules/upload/upload.validator";

export async function createUploadedImage(input: UploadServiceInput) {
  const folder = sanitizeUploadFolder(input.folder);
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const validation = validateUploadFile(input.file, buffer);

  if (!validation.ok) {
    if (validation.auditEvent) {
      logSecurityEvent({
        event: validation.auditEvent,
        severity: "warn",
        requestId: input.requestId,
        actorUserId: input.actorUserId ?? undefined,
        context: { ...validation.auditContext, folder },
      });
    }
    return { ok: false as const, error: validation.error, status: validation.status };
  }

  const scanResult = await scanForMalware(buffer);
  if (scanResult.status === "infected") {
    logSecurityEvent({
      event: "upload_rejected_malware",
      severity: "warn",
      requestId: input.requestId,
      actorUserId: input.actorUserId ?? undefined,
      context: { signature: scanResult.signature, folder },
    });
    return {
      ok: false as const,
      error: `Dosya zararlı olarak işaretlendi (${scanResult.signature}).`,
      status: 400,
    };
  }

  const uploaded = await uploadImageRecord({
    buffer,
    mimeType: validation.detectedMime,
    folder,
  });

  return {
    ok: true as const,
    file: {
      url: uploaded.url,
      key: uploaded.key,
      provider: uploaded.provider,
    },
  };
}

export async function removeUploadedImage(input: {
  key?: string;
  url?: string;
}) {
  return deleteImageRecord(input);
}

export async function findUploadedImages(input: { folder?: string; limit?: number }) {
  return listImageRecords(input);
}

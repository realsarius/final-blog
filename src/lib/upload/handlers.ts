import { NextResponse } from "next/server";
import { scanForMalware } from "@/lib/malwareScan";
import { parsePositiveInt } from "@/lib/parsing";
import { logSecurityEvent } from "@/lib/securityLog";
import { deleteImage, listImages, sanitizeUploadFolder, uploadImage } from "@/lib/uploadStorage";
import { formatMaxUploadSizeMb, resolveMaxUploadSizeBytes } from "@/lib/upload/config";
import { jsonWithCors, resolveCorsHeaders, withCors } from "@/lib/upload/cors";
import { detectImageMime, isAllowedImageType } from "@/lib/upload/mime";
import { authorizeUploadRequestForAction, enforceUploadRateLimit } from "@/lib/upload/security";

export async function handleUploadPost(request: Request) {
  const authResult = await authorizeUploadRequestForAction("post");
  if (authResult.errorResponse) {
    return jsonWithCors(
      request,
      { success: authResult.errorResponse.success, error: authResult.errorResponse.error },
      { status: authResult.errorResponse.status },
    );
  }

  const rateLimitResponse = await enforceUploadRateLimit(request, authResult.userId, "upload");
  if (rateLimitResponse) {
    return withCors(request, rateLimitResponse);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folderField = formData.get("folder");
  const folder = sanitizeUploadFolder(typeof folderField === "string" ? folderField : undefined);

  if (!file || !(file instanceof File)) {
    return jsonWithCors(request, { success: 0, error: "Dosya bulunamadı." }, { status: 400 });
  }

  if (!isAllowedImageType(file.type)) {
    return jsonWithCors(request, { success: 0, error: "Desteklenmeyen dosya." }, { status: 400 });
  }

  const maxUploadSizeBytes = resolveMaxUploadSizeBytes();
  if (file.size > maxUploadSizeBytes) {
    return jsonWithCors(
      request,
      { success: 0, error: `Dosya boyutu çok büyük. En fazla ${formatMaxUploadSizeMb(maxUploadSizeBytes)} MB yükleyebilirsiniz.` },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = detectImageMime(buffer);
    if (!detectedMime || !isAllowedImageType(detectedMime)) {
      logSecurityEvent({
        event: "upload_rejected_invalid_mime",
        severity: "warn",
        context: { claimedMime: file.type, detectedMime: detectedMime ?? "unknown", folder },
      });
      return jsonWithCors(
        request,
        { success: 0, error: "Dosya içeriği geçerli bir görsel değil." },
        { status: 400 },
      );
    }

    if (file.type && file.type !== detectedMime) {
      logSecurityEvent({
        event: "upload_rejected_mime_mismatch",
        severity: "warn",
        context: { claimedMime: file.type, detectedMime, folder },
      });
      return jsonWithCors(
        request,
        { success: 0, error: "MIME bilgisi dosya içeriğiyle uyuşmuyor." },
        { status: 400 },
      );
    }

    const scanResult = await scanForMalware(buffer);
    if (scanResult.status === "infected") {
      logSecurityEvent({
        event: "upload_rejected_malware",
        severity: "warn",
        context: { signature: scanResult.signature, folder },
      });
      return jsonWithCors(
        request,
        { success: 0, error: `Dosya zararlı olarak işaretlendi (${scanResult.signature}).` },
        { status: 400 },
      );
    }

    const uploaded = await uploadImage({
      buffer,
      mimeType: detectedMime,
      folder,
    });

    return jsonWithCors(request, {
      success: 1,
      file: {
        url: uploaded.url,
        key: uploaded.key,
        provider: uploaded.provider,
      },
    });
  } catch (error) {
    logSecurityEvent({
      event: "upload_post_failed",
      severity: "error",
      context: { message: error instanceof Error ? error.message : "unknown" },
    });
    console.error("Upload failed:", error);
    return jsonWithCors(
      request,
      { success: 0, error: "Yükleme sırasında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function handleUploadDelete(request: Request) {
  const authResult = await authorizeUploadRequestForAction("delete");
  if (authResult.errorResponse) {
    return jsonWithCors(
      request,
      { success: authResult.errorResponse.success, error: authResult.errorResponse.error },
      { status: authResult.errorResponse.status },
    );
  }

  const rateLimitResponse = await enforceUploadRateLimit(request, authResult.userId, "upload-delete");
  if (rateLimitResponse) {
    return withCors(request, rateLimitResponse);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonWithCors(request, { success: 0, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const payloadData = payload && typeof payload === "object"
    ? payload as { key?: unknown; url?: unknown }
    : {};
  const key = typeof payloadData.key === "string" ? payloadData.key : undefined;
  const url = typeof payloadData.url === "string" ? payloadData.url : undefined;

  if (!key && !url) {
    return jsonWithCors(request, { success: 0, error: "Silinecek görsel bulunamadı." }, { status: 400 });
  }

  try {
    const deleted = await deleteImage({ key, url });

    return jsonWithCors(request, {
      success: 1,
      file: {
        key: deleted.key,
        provider: deleted.provider,
      },
    });
  } catch (error) {
    logSecurityEvent({
      event: "upload_delete_failed",
      severity: "error",
      context: { message: error instanceof Error ? error.message : "unknown" },
    });
    console.error("Upload delete failed:", error);
    const message = error instanceof Error ? error.message : "Silme sırasında bir hata oluştu.";
    const status = message.includes("çözümlenemedi") ? 400 : 500;
    return jsonWithCors(
      request,
      { success: 0, error: status === 400 ? message : "Silme sırasında bir hata oluştu." },
      { status },
    );
  }
}

export async function handleUploadGet(request: Request) {
  const authResult = await authorizeUploadRequestForAction("get");
  if (authResult.errorResponse) {
    return jsonWithCors(
      request,
      { success: authResult.errorResponse.success, error: authResult.errorResponse.error },
      { status: authResult.errorResponse.status },
    );
  }

  const url = new URL(request.url);
  const folder = sanitizeUploadFolder(url.searchParams.get("folder"));
  const limit = Math.min(200, parsePositiveInt(url.searchParams.get("limit"), 60));

  try {
    const files = await listImages({ folder, limit });
    return jsonWithCors(request, {
      success: 1,
      files,
    });
  } catch (error) {
    logSecurityEvent({
      event: "upload_list_failed",
      severity: "error",
      context: { message: error instanceof Error ? error.message : "unknown", folder, limit },
    });
    console.error("Upload list failed:", error);
    return jsonWithCors(
      request,
      { success: 0, error: "Dosyalar listelenirken bir hata oluştu." },
      { status: 500 },
    );
  }
}

export function handleUploadOptions(request: Request) {
  const corsHeaders = resolveCorsHeaders(request);
  if (!("Access-Control-Allow-Origin" in corsHeaders)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

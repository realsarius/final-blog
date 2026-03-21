import { NextResponse } from "next/server";
import { captureException } from "@/lib/errorTracking";
import { parsePositiveInt } from "@/lib/parsing";
import { getOrCreateRequestId } from "@/lib/requestId";
import { logSecurityEvent } from "@/lib/securityLog";
import { jsonWithCors, resolveCorsHeaders, withCors } from "@/lib/upload/cors";
import { authorizeUploadRequestForAction, enforceUploadRateLimit } from "@/lib/upload/security";
import { createUploadedImage, findUploadedImages, removeUploadedImage } from "@/modules/upload/upload.service";

export async function handleUploadPost(request: Request) {
  const requestId = getOrCreateRequestId(request.headers);
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
  const folder = typeof folderField === "string" ? folderField : undefined;

  if (!file || !(file instanceof File)) {
    return jsonWithCors(request, { success: 0, error: "Dosya bulunamadı." }, { status: 400 });
  }

  try {
    const result = await createUploadedImage({
      file,
      folder,
      requestId,
      actorUserId: authResult.userId,
    });

    if (!result.ok) {
      return jsonWithCors(
        request,
        { success: 0, error: result.error },
        { status: result.status },
      );
    }

    return jsonWithCors(request, {
      success: 1,
      file: {
        url: result.file.url,
        key: result.file.key,
        provider: result.file.provider,
      },
    });
  } catch (error) {
    logSecurityEvent({
      event: "upload_post_failed",
      severity: "error",
      requestId,
      actorUserId: authResult.userId ?? undefined,
      context: { message: error instanceof Error ? error.message : "unknown" },
    });
    captureException(error, {
      event: "upload_post_failed",
      requestId,
      actorUserId: authResult.userId ?? null,
    });
    return jsonWithCors(
      request,
      { success: 0, error: "Yükleme sırasında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function handleUploadDelete(request: Request) {
  const requestId = getOrCreateRequestId(request.headers);
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
    const deleted = await removeUploadedImage({ key, url });

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
      requestId,
      actorUserId: authResult.userId ?? undefined,
      context: { message: error instanceof Error ? error.message : "unknown" },
    });
    captureException(error, {
      event: "upload_delete_failed",
      requestId,
      actorUserId: authResult.userId ?? null,
    });
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
  const requestId = getOrCreateRequestId(request.headers);
  const authResult = await authorizeUploadRequestForAction("get");
  if (authResult.errorResponse) {
    return jsonWithCors(
      request,
      { success: authResult.errorResponse.success, error: authResult.errorResponse.error },
      { status: authResult.errorResponse.status },
    );
  }

  const url = new URL(request.url);
  const folder = url.searchParams.get("folder") ?? undefined;
  const limit = Math.min(200, parsePositiveInt(url.searchParams.get("limit"), 60));

  try {
    const files = await findUploadedImages({ folder, limit });
    return jsonWithCors(request, {
      success: 1,
      files,
    });
  } catch (error) {
    logSecurityEvent({
      event: "upload_list_failed",
      severity: "error",
      requestId,
      actorUserId: authResult.userId ?? undefined,
      context: { message: error instanceof Error ? error.message : "unknown", folder, limit },
    });
    captureException(error, {
      event: "upload_list_failed",
      requestId,
      actorUserId: authResult.userId ?? null,
      folder,
      limit,
    });
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

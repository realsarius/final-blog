import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { scanForMalware } from "@/lib/malwareScan";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { deleteImage, listImages, sanitizeUploadFolder, uploadImage } from "@/lib/uploadStorage";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const CORS_METHODS = "GET, POST, DELETE, OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization";
const DEFAULT_MAX_FILE_SIZE_MB = 6;

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function resolveMaxUploadSizeBytes() {
  const parsedValue = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? DEFAULT_MAX_FILE_SIZE_MB);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_MAX_FILE_SIZE_MB * 1024 * 1024;
  }
  const clampedMb = Math.min(40, Math.max(1, parsedValue));
  return Math.floor(clampedMb * 1024 * 1024);
}

function formatMaxUploadSizeMb(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
}

function parseOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function parseAllowedOrigins(value: string | undefined): Set<string> {
  const origins = (value ?? "")
    .split(",")
    .map((item) => parseOrigin(item.trim()))
    .filter((item): item is string => Boolean(item));
  return new Set(origins);
}

function isPrivateNetworkOrigin(origin: string): boolean {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?$/i.test(origin);
}

function resolveCorsHeaders(request: Request): HeadersInit {
  const requestOrigin = parseOrigin(request.headers.get("origin"));
  if (!requestOrigin) {
    return {};
  }

  const allowPrivateNetworkOrigins = parseBoolean(process.env.UPLOAD_CORS_ALLOW_PRIVATE_NETWORK, false);
  const allowedOrigins = parseAllowedOrigins(process.env.UPLOAD_CORS_ALLOWED_ORIGINS);
  const appOrigin = parseOrigin(process.env.NEXTAUTH_URL);
  const publicSiteOrigin = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  if (appOrigin) {
    allowedOrigins.add(appOrigin);
  }
  if (publicSiteOrigin) {
    allowedOrigins.add(publicSiteOrigin);
  }

  const isAllowed = allowedOrigins.has(requestOrigin)
    || (allowPrivateNetworkOrigins && isPrivateNetworkOrigin(requestOrigin));

  if (!isAllowed) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS,
    "Vary": "Origin",
  };
}

function withCors(request: Request, response: NextResponse) {
  const corsHeaders = resolveCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function jsonWithCors(request: Request, body: unknown, init?: ResponseInit) {
  return withCors(request, NextResponse.json(body, init));
}

function resolveUploadActionAdminRequirement(action: "get" | "post" | "delete") {
  if (process.env.NODE_ENV === "production" && (action === "get" || action === "delete")) {
    return true;
  }

  const fallback = parseBoolean(process.env.UPLOAD_REQUIRE_ADMIN, true);
  const actionRaw = action === "get"
    ? process.env.UPLOAD_GET_REQUIRE_ADMIN
    : action === "post"
      ? process.env.UPLOAD_POST_REQUIRE_ADMIN
      : process.env.UPLOAD_DELETE_REQUIRE_ADMIN;
  return parseBoolean(actionRaw, fallback);
}

async function authorizeUploadRequestForAction(action: "get" | "post" | "delete") {
  const requireAdmin = resolveUploadActionAdminRequirement(action);
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const userRole = session?.user?.role;

  if (requireAdmin) {
    if (!userId) {
      logSecurityEvent({
        event: "upload_unauthorized_no_session",
        severity: "warn",
        context: { action },
      });
      return {
        userId,
        errorResponse: { success: 0, error: "Oturum gerekli.", status: 401 },
      };
    }

    if (userRole !== "ADMIN") {
      logSecurityEvent({
        event: "upload_unauthorized_role_denied",
        severity: "warn",
        context: { action, role: userRole ?? "unknown", userId },
      });
      return {
        userId,
        errorResponse: { success: 0, error: "Bu işlem için yetkiniz yok.", status: 403 },
      };
    }
  }

  return {
    userId,
    errorResponse: null as {
      success: 0;
      error: string;
      status: number;
    } | null,
  };
}

async function enforceUploadRateLimit(request: Request, userId: string | null, namespace: string) {
  const rateLimitMax = parsePositiveInt(process.env.UPLOAD_RATE_LIMIT_MAX, 30);
  const rateLimitWindow = parsePositiveInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_SEC, 60);

  if (rateLimitMax <= 0) {
    return null;
  }

  const ip = getClientIp({ headers: request.headers });
  const limiterKey = userId ? `user:${userId}` : `ip:${ip}`;
  const limiter = await rateLimit(limiterKey, {
    namespace,
    maxAttempts: rateLimitMax,
    windowSeconds: rateLimitWindow,
  });

  if (limiter.allowed) {
    return null;
  }

  logSecurityEvent({
    event: "upload_rate_limited",
    severity: "warn",
    context: { namespace, userId, ip },
  });
  const retryAfterSeconds = Math.max(1, Math.ceil((limiter.reset - Date.now()) / 1000));
  return NextResponse.json(
    { success: 0, error: `Çok fazla yükleme denemesi. ${retryAfterSeconds} saniye sonra tekrar deneyin.` },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(rateLimitMax),
        "X-RateLimit-Remaining": String(limiter.remaining),
        "X-RateLimit-Reset": String(Math.floor(limiter.reset / 1000)),
      },
    },
  );
}

function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 6
    && buffer[0] === 0x47
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x38
    && (buffer[4] === 0x39 || buffer[4] === 0x37)
    && buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  if (
    buffer.length >= 12
    && buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
    && buffer[8] === 0x57
    && buffer[9] === 0x45
    && buffer[10] === 0x42
    && buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

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

  if (!ALLOWED_TYPES.has(file.type)) {
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
    if (!detectedMime || !ALLOWED_TYPES.has(detectedMime)) {
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
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 60;

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

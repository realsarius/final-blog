import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { parseBoolean, parsePositiveInt } from "@/lib/parsing";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

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

export async function authorizeUploadRequestForAction(action: "get" | "post" | "delete") {
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

export async function enforceUploadRateLimit(request: Request, userId: string | null, namespace: string) {
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

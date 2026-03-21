import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOrCreateRequestId, setRequestIdHeader } from "@/lib/requestId";
import { logSecurityEvent } from "@/lib/securityLog";

export async function proxy(request: NextRequest) {
  const requestId = getOrCreateRequestId(request.headers);

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    logSecurityEvent({
      event: "admin_middleware_no_token",
      severity: "warn",
      requestId,
      path: request.nextUrl.pathname,
      context: { path: request.nextUrl.pathname },
    });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return setRequestIdHeader(NextResponse.redirect(loginUrl), requestId);
  }

  if (token.role !== "ADMIN") {
    logSecurityEvent({
      event: "admin_middleware_role_denied",
      severity: "warn",
      requestId,
      path: request.nextUrl.pathname,
      context: { path: request.nextUrl.pathname, role: token.role ?? "unknown" },
    });
    return setRequestIdHeader(NextResponse.redirect(new URL("/", request.url)), requestId);
  }

  return setRequestIdHeader(NextResponse.next(), requestId);
}

export const config = {
  matcher: ["/admin/:path*"],
};

import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logSecurityEvent } from "@/lib/securityLog";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    logSecurityEvent({
      event: "admin_middleware_no_token",
      severity: "warn",
      context: { path: request.nextUrl.pathname },
    });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.role !== "ADMIN") {
    logSecurityEvent({
      event: "admin_middleware_role_denied",
      severity: "warn",
      context: { path: request.nextUrl.pathname, role: token.role ?? "unknown" },
    });
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

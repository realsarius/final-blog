import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME } from "@/lib/i18n";

function sanitizeRedirectPath(rawValue: string | null | undefined): string {
  if (!rawValue) {
    return "/";
  }

  if (!rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return "/";
  }

  try {
    const parsed = new URL(rawValue, "http://localhost");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function buildRedirectResponse(targetPath: string, baseUrl: string, status?: 303 | 307) {
  return NextResponse.redirect(new URL(targetPath, baseUrl), status);
}

function setLocaleCookie(response: NextResponse, locale: "tr" | "en") {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectPath = sanitizeRedirectPath(url.searchParams.get("redirect"));
  return buildRedirectResponse(redirectPath, url.origin);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const rawLocale = formData.get("locale");
  const rawRedirect = formData.get("redirect");

  const localeValue = typeof rawLocale === "string" ? rawLocale : null;
  const redirectValue = typeof rawRedirect === "string" ? rawRedirect : null;
  const locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE;
  const redirectPath = sanitizeRedirectPath(redirectValue);

  const response = buildRedirectResponse(redirectPath, url.origin, 303);
  setLocaleCookie(response, locale);
  return response;
}

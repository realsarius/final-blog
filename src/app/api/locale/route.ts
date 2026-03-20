import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME } from "@/lib/i18n";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLocale = url.searchParams.get("locale");
  const redirectTo = url.searchParams.get("redirect") || "/";
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const response = NextResponse.redirect(new URL(redirectTo, url.origin));
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

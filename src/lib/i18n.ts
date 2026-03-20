import { cookies, headers } from "next/headers";
import en from "@/i18n/messages/en";
import tr from "@/i18n/messages/tr";

const catalogs = { tr, en } as const;

export type Locale = keyof typeof catalogs;
export const LOCALE_COOKIE_NAME = "site_locale";
export const DEFAULT_LOCALE: Locale = "tr";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "tr" || value === "en";
}

function resolveLocaleFromAcceptLanguage(raw: string | null): Locale {
  if (!raw) {
    return DEFAULT_LOCALE;
  }

  const normalized = raw.toLowerCase();
  if (normalized.includes("tr")) {
    return "tr";
  }
  if (normalized.includes("en")) {
    return "en";
  }
  return DEFAULT_LOCALE;
}

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerStore = await headers();
  return resolveLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}

export async function getMessages(locale?: Locale) {
  const resolvedLocale = locale ?? (await getServerLocale());
  return catalogs[resolvedLocale];
}

export function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

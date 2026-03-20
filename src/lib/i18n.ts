import "server-only";
import en from "@/i18n/messages/en";
import tr from "@/i18n/messages/tr";
import { getResolvedSiteSettings } from "@/lib/siteSettings";

const catalogs = { tr, en } as const;

export type Locale = keyof typeof catalogs;
export const LOCALE_COOKIE_NAME = "site_locale";
export const DEFAULT_LOCALE: Locale = "tr";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "tr" || value === "en";
}

export async function getServerLocale(): Promise<Locale> {
  const settings = await getResolvedSiteSettings();
  return isLocale(settings.language) ? settings.language : DEFAULT_LOCALE;
}

export async function getMessages(locale?: Locale) {
  const resolvedLocale = locale ?? (await getServerLocale());
  return catalogs[resolvedLocale];
}

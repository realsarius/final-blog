import { prisma } from "@/lib/prisma";
import { cache } from "react";

const DEFAULT_SITE_NAME = "Kişisel Blog";
const DEFAULT_SITE_DESCRIPTION = "Yazılar, notlar ve kişisel çalışmalar için sade bir blog.";
const DEFAULT_ADMIN_EMAIL = "hello@berkansozer.com";
const DEFAULT_ADMIN_FULL_NAME = "Berkan Sozer";
const DEFAULT_SITE_URL = "http://localhost:3007";

export type ResolvedSiteSettings = {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  weekStartsOn: string;
  language: string;
};

export type SiteSettingsInput = Partial<ResolvedSiteSettings>;

function normalizeNonEmpty(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSiteUrl(value: string | null | undefined): string {
  const raw = normalizeNonEmpty(value, DEFAULT_SITE_URL);
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function resolveEnvDefaults(): ResolvedSiteSettings {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL;
  const firstName = normalizeNonEmpty(process.env.ADMIN_FIRST_NAME, DEFAULT_ADMIN_FULL_NAME.split(" ")[0] ?? "Admin");
  const lastName = normalizeNonEmpty(
    process.env.ADMIN_LAST_NAME,
    DEFAULT_ADMIN_FULL_NAME.split(" ").slice(1).join(" ") || "User",
  );

  return {
    siteName: normalizeNonEmpty(process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME, DEFAULT_SITE_NAME),
    siteDescription: normalizeNonEmpty(
      process.env.NEXT_PUBLIC_SITE_DESCRIPTION || process.env.SITE_DESCRIPTION,
      DEFAULT_SITE_DESCRIPTION,
    ),
    siteUrl: normalizeSiteUrl(rawSiteUrl),
    adminEmail: normalizeNonEmpty(process.env.ADMIN_EMAIL, DEFAULT_ADMIN_EMAIL).toLowerCase(),
    adminFirstName: firstName,
    adminLastName: lastName,
    timezone: normalizeNonEmpty(process.env.SITE_TIMEZONE, "Europe/Istanbul"),
    dateFormat: normalizeNonEmpty(process.env.SITE_DATE_FORMAT, "dd.MM.yyyy"),
    timeFormat: normalizeNonEmpty(process.env.SITE_TIME_FORMAT, "HH:mm"),
    weekStartsOn: normalizeNonEmpty(process.env.SITE_WEEK_STARTS_ON, "Monday"),
    language: normalizeNonEmpty(process.env.SITE_LANGUAGE, "tr"),
  };
}

function mergeWithDefaults(record: {
  siteName: string | null;
  siteDescription: string | null;
  siteUrl: string | null;
  adminEmail: string | null;
  adminFirstName: string | null;
  adminLastName: string | null;
  timezone: string | null;
  dateFormat: string | null;
  timeFormat: string | null;
  weekStartsOn: string | null;
  language: string | null;
} | null): ResolvedSiteSettings {
  const defaults = resolveEnvDefaults();
  if (!record) {
    return defaults;
  }

  return {
    siteName: normalizeNonEmpty(record.siteName, defaults.siteName),
    siteDescription: normalizeNonEmpty(record.siteDescription, defaults.siteDescription),
    siteUrl: normalizeSiteUrl(record.siteUrl || defaults.siteUrl),
    adminEmail: normalizeNonEmpty(record.adminEmail, defaults.adminEmail).toLowerCase(),
    adminFirstName: normalizeNonEmpty(record.adminFirstName, defaults.adminFirstName),
    adminLastName: normalizeNonEmpty(record.adminLastName, defaults.adminLastName),
    timezone: normalizeNonEmpty(record.timezone, defaults.timezone),
    dateFormat: normalizeNonEmpty(record.dateFormat, defaults.dateFormat),
    timeFormat: normalizeNonEmpty(record.timeFormat, defaults.timeFormat),
    weekStartsOn: normalizeNonEmpty(record.weekStartsOn, defaults.weekStartsOn),
    language: normalizeNonEmpty(record.language, defaults.language),
  };
}

export const getResolvedSiteSettings = cache(async (): Promise<ResolvedSiteSettings> => {
  try {
    const record = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        siteName: true,
        siteDescription: true,
        siteUrl: true,
        adminEmail: true,
        adminFirstName: true,
        adminLastName: true,
        timezone: true,
        dateFormat: true,
        timeFormat: true,
        weekStartsOn: true,
        language: true,
      },
    });
    return mergeWithDefaults(record);
  } catch {
    return resolveEnvDefaults();
  }
});

export async function upsertSiteSettings(input: SiteSettingsInput): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      siteName: normalizeOptional(input.siteName),
      siteDescription: normalizeOptional(input.siteDescription),
      siteUrl: normalizeOptional(input.siteUrl),
      adminEmail: normalizeOptional(input.adminEmail),
      adminFirstName: normalizeOptional(input.adminFirstName),
      adminLastName: normalizeOptional(input.adminLastName),
      timezone: normalizeOptional(input.timezone),
      dateFormat: normalizeOptional(input.dateFormat),
      timeFormat: normalizeOptional(input.timeFormat),
      weekStartsOn: normalizeOptional(input.weekStartsOn),
      language: normalizeOptional(input.language),
    },
    update: {
      siteName: normalizeOptional(input.siteName),
      siteDescription: normalizeOptional(input.siteDescription),
      siteUrl: normalizeOptional(input.siteUrl),
      adminEmail: normalizeOptional(input.adminEmail),
      adminFirstName: normalizeOptional(input.adminFirstName),
      adminLastName: normalizeOptional(input.adminLastName),
      timezone: normalizeOptional(input.timezone),
      dateFormat: normalizeOptional(input.dateFormat),
      timeFormat: normalizeOptional(input.timeFormat),
      weekStartsOn: normalizeOptional(input.weekStartsOn),
      language: normalizeOptional(input.language),
    },
  });
}

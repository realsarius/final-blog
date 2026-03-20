import { prisma } from "@/lib/prisma";
import { cache } from "react";

const DEFAULT_SITE_NAME = "Kişisel Blog";
const DEFAULT_SITE_DESCRIPTION = "Yazılar, notlar ve kişisel çalışmalar için sade bir blog.";
const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_ADMIN_FULL_NAME = "Admin User";
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

function resolveDbDefaults(): ResolvedSiteSettings {
  const firstName = normalizeNonEmpty(DEFAULT_ADMIN_FULL_NAME.split(" ")[0], "Admin");
  const lastName = normalizeNonEmpty(DEFAULT_ADMIN_FULL_NAME.split(" ").slice(1).join(" "), "User");

  return {
    siteName: DEFAULT_SITE_NAME,
    siteDescription: DEFAULT_SITE_DESCRIPTION,
    siteUrl: normalizeSiteUrl(DEFAULT_SITE_URL),
    adminEmail: DEFAULT_ADMIN_EMAIL.toLowerCase(),
    adminFirstName: firstName,
    adminLastName: lastName,
    timezone: "Europe/Istanbul",
    dateFormat: "dd.MM.yyyy",
    timeFormat: "HH:mm",
    weekStartsOn: "Monday",
    language: "tr",
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
  const defaults = resolveDbDefaults();
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
  const defaults = resolveDbDefaults();

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
    if (record) {
      return mergeWithDefaults(record);
    }

    try {
      const created = await prisma.siteSettings.create({
        data: {
          id: "default",
          siteName: defaults.siteName,
          siteDescription: defaults.siteDescription,
          siteUrl: defaults.siteUrl,
          adminEmail: defaults.adminEmail,
          adminFirstName: defaults.adminFirstName,
          adminLastName: defaults.adminLastName,
          timezone: defaults.timezone,
          dateFormat: defaults.dateFormat,
          timeFormat: defaults.timeFormat,
          weekStartsOn: defaults.weekStartsOn,
          language: defaults.language,
        },
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
      return mergeWithDefaults(created);
    } catch {
      // A parallel request might have created the default record just now.
      const afterRace = await prisma.siteSettings.findUnique({
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
      return mergeWithDefaults(afterRace);
    }
  } catch {
    return defaults;
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

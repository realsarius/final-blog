import { getResolvedSiteSettings } from "@/lib/siteSettings";

export async function getSiteName() {
  const settings = await getResolvedSiteSettings();
  return settings.siteName;
}

export async function getSiteDescription() {
  const settings = await getResolvedSiteSettings();
  return settings.siteDescription;
}

export async function getSiteUrl() {
  const settings = await getResolvedSiteSettings();

  try {
    return new URL(settings.siteUrl);
  } catch {
    return new URL("http://localhost:3007");
  }
}

export async function getAdminEmail() {
  const settings = await getResolvedSiteSettings();
  return settings.adminEmail;
}

export async function getAdminFullName() {
  const settings = await getResolvedSiteSettings();
  const fullName = `${settings.adminFirstName} ${settings.adminLastName}`.trim();
  return fullName.length > 0 ? fullName : "Admin User";
}

function normalizeOptionalUrl(value: string | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getLinkedinUrl() {
  return normalizeOptionalUrl(process.env.LINKEDIN_URL);
}

export function getGithubUrl() {
  return normalizeOptionalUrl(process.env.GITHUB_URL);
}

export function getDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/g, "");
  } catch {
    return url;
  }
}

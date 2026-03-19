const DEFAULT_SITE_NAME = "Kişisel Blog";
const DEFAULT_SITE_DESCRIPTION = "Yazılar, notlar ve kişisel çalışmalar için sade bir blog.";
const DEFAULT_ADMIN_EMAIL = "hello@berkansozer.com";
const DEFAULT_ADMIN_FULL_NAME = "Berkan Sozer";

export function getSiteName() {
  const rawName =
    process.env.NEXT_PUBLIC_SITE_NAME ||
    process.env.SITE_NAME ||
    DEFAULT_SITE_NAME;

  const normalizedName = rawName.trim();
  return normalizedName.length > 0 ? normalizedName : DEFAULT_SITE_NAME;
}

export function getSiteDescription() {
  const rawDescription =
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    process.env.SITE_DESCRIPTION ||
    DEFAULT_SITE_DESCRIPTION;

  const normalizedDescription = rawDescription.trim();
  return normalizedDescription.length > 0
    ? normalizedDescription
    : DEFAULT_SITE_DESCRIPTION;
}

export function getSiteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3007";

  try {
    return new URL(envUrl);
  } catch {
    return new URL("http://localhost:3007");
  }
}

export function getAdminEmail() {
  const rawEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const normalizedEmail = rawEmail.trim().toLowerCase();
  return normalizedEmail.length > 0 ? normalizedEmail : DEFAULT_ADMIN_EMAIL;
}

export function getAdminFullName() {
  const firstName = (process.env.ADMIN_FIRST_NAME ?? "").trim();
  const lastName = (process.env.ADMIN_LAST_NAME ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName.length > 0 ? fullName : DEFAULT_ADMIN_FULL_NAME;
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

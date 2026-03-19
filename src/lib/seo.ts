const DEFAULT_SITE_NAME = "Kişisel Blog";
const DEFAULT_SITE_DESCRIPTION = "Yazılar, notlar ve kişisel çalışmalar için sade bir blog.";

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

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

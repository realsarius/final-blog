import type { Metadata } from "next";
import { Space_Grotesk, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSiteDescription, getSiteName, getSiteUrl } from "@/lib/seo";
import { Toaster } from "sonner";
import { getServerLocale } from "@/lib/i18n";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [siteName, siteDescription, siteUrl] = await Promise.all([
    getSiteName(),
    getSiteDescription(),
    getSiteUrl(),
  ]);

  return {
    title: {
      default: siteName,
      template: `%s - ${siteName}`,
    },
    description: siteDescription,
    metadataBase: siteUrl,
    applicationName: siteName,
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteName,
      description: siteDescription,
      siteName,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: siteName,
      description: siteDescription,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale}>
      <body className={`${spaceGrotesk.variable} ${playfairDisplay.variable}`}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}

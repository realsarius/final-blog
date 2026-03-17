import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/seo";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kişisel Blog",
  description: "Yazılar, notlar ve kişisel çalışmalar için sade bir blog.",
  metadataBase: getSiteUrl(),
  openGraph: {
    title: "Kişisel Blog",
    description: "Yazılar, notlar ve kişisel çalışmalar için sade bir blog.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Kişisel Blog",
    description: "Yazılar, notlar ve kişisel çalışmalar için sade bir blog.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={spaceGrotesk.variable}>{children}</body>
    </html>
  );
}

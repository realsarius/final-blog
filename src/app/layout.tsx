import type { Metadata } from "next";
import { Space_Grotesk, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/seo";
import { Toaster } from "sonner";

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
      <body className={`${spaceGrotesk.variable} ${playfairDisplay.variable}`}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}

import { isPrivatePreview, siteOrigin } from "@/lib/seo";
import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/PwaRegistration";
import localFont from "next/font/local";
import "./base.css";

const cormorant = localFont({
  src: "./fonts/cormorant-garamond.woff2",
  weight: "300 600",
  adjustFontFallback: "Times New Roman",
  variable: "--font-serif",
  display: "swap",
});

const outfit = localFont({
  src: "./fonts/outfit.woff2",
  weight: "300 700",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  ...(isPrivatePreview() ? { robots: { index: false, follow: false } } : {}),
  applicationName: "MASH",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MASH", statusBarStyle: "default" },
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "MASH | Martinez Star Home",
    template: "%s | MASH",
  },
  description:
    "Muebles de exterior en Santiago, Republica Dominicana para terrazas, patios, balcones, piscinas, hoteles y restaurantes.",
  icons: {
    icon: "/assets/images/logo.png",
    apple: "/pwa/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#113221" };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await headers()).get("x-mash-locale") === "en" ? "en" : "es";
  return (
    <html lang={locale} className={`${cormorant.variable} ${outfit.variable}`}>
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}

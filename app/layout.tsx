import { siteOrigin } from "@/lib/seo";
import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/PwaRegistration";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
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

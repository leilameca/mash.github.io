import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/PwaRegistration";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif",
  display: "swap"
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  applicationName: "MASH",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MASH", statusBarStyle: "default" },
  metadataBase: new URL("https://mashoficial.com"),
  title: {
    default: "MASH | Martinez Star Home",
    template: "%s | MASH"
  },
  description:
    "Muebles de exterior en Santiago, Republica Dominicana para terrazas, patios, balcones, piscinas, hoteles y restaurantes.",
  icons: {
    icon: "/assets/images/logo.png",
    apple: "/pwa/apple-touch-icon.png"
  }
};

export const viewport: Viewport = { themeColor: "#113221" };

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${cormorant.variable} ${outfit.variable}`}>
      <body>{children}<PwaRegistration /></body>
    </html>
  );
}

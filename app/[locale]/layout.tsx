import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MotionEnhancer } from "@/components/MotionEnhancer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { dictionary } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";
import { getSiteChromeContent } from "@/lib/supabase/site-content";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [{ locale: "es" }, { locale: "en" }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const meta = dictionary[locale].meta;

  return {
    title: meta.homeTitle,
    description: meta.homeDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        es: "/es",
        en: "/en"
      }
    },
    openGraph: {
      title: meta.homeTitle,
      description: meta.homeDescription,
      url: `https://mashoficial.com/${locale}`,
      siteName: "MASH | Martinez Star Home",
      locale: locale === "es" ? "es_DO" : "en_US",
      type: "website",
      images: [
        {
          url: "/assets/images/oasis-hero-v2.jpg",
          width: 1672,
          height: 941,
          alt: locale === "es" ? "Muebles de exterior MASH" : "MASH outdoor furniture"
        }
      ]
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const siteContent = await getSiteChromeContent(locale);

  return (
    <SiteSettingsProvider value={{ whatsapp: siteContent.whatsapp }}>
      <a href="#main-content" className="skip-link">
        {locale === "es" ? "Saltar al contenido" : "Skip to content"}
      </a>
      <Header locale={locale} content={siteContent} />
      <main id="main-content" className="page-shell">
        {children}
      </main>
      <Footer locale={locale} content={siteContent} />
      <WhatsAppFloat locale={locale} href={siteContent.whatsapp} label={siteContent.requestQuoteLabel} />
      <MotionEnhancer />
    </SiteSettingsProvider>
  );
}

import { PublishedVisual } from "@/components/visual/PublishedVisual";
import { readHomeBaseline, readVisualPublication } from "@/lib/visual/queries";
import type { Metadata } from "next";
import { routeAlternates, siteOrigin } from "@/lib/seo";
import { safeJsonLd } from "@/lib/security";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  getHomeHeroContent,
  getSiteChromeContent,
} from "@/lib/supabase/site-content";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [hero, visual] = await Promise.all([
    getHomeHeroContent(locale),
    readVisualPublication("home"),
  ]);
  const english = visual?.englishReady ? visual.en : visual?.inheritedEnglish;
  const content = locale === "en" ? english : visual?.es;
  const title = content?.["legacy-hero__title"] || hero.title;
  const description = content?.["legacy-hero__body"] || hero.description;
  return {
    title,
    description,
    alternates: routeAlternates(locale),
    openGraph: {
      title,
      description,
      url: `${siteOrigin()}/${locale}`,
      images: hero.image ? [{ url: hero.image }] : [],
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const [visual, heroContent, site] = await Promise.all([
    readVisualPublication("home"),
    getHomeHeroContent(locale),
    getSiteChromeContent(locale),
  ]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    name: site.fullName,
    url: siteOrigin(),
    image: new URL(heroContent.image, siteOrigin()).href,
    logo: "https://mashoficial.com/assets/images/logo.png",
    telephone: site.phone,
    email: site.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Santiago",
      addressCountry: "DO",
    },
    areaServed: ["Santiago", "Republica Dominicana"],
    sameAs: [site.instagram],
  };

  const structuredMarkup = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
    />
  );
  return (
    <>
      {structuredMarkup}
      <PublishedVisual doc={visual ?? await readHomeBaseline()} locale={locale} />
    </>
  );
}

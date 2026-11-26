import { ContactSection } from "@/components/editorial/ContactSection";
import { PublishedVisual } from "@/components/visual/PublishedVisual";
import { readVisualPublication } from "@/lib/visual/queries";
import { routeAlternates } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  getMarketingPageContent,
  getSiteChromeContent,
} from "@/lib/supabase/site-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: routeAlternates(locale, `/contacto`),
    title: locale === "es" ? "Contacto" : "Contact",
    description:
      locale === "es"
        ? "Contacta a MASH para cotizar muebles de exterior."
        : "Contact MASH to quote outdoor furniture.",
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const visual = await readVisualPublication("contact");
  if (visual)
    return <PublishedVisual doc={visual} locale={locale} />;
  const [site, content] = await Promise.all([
    getSiteChromeContent(locale),
    getMarketingPageContent("contact", locale),
  ]);

  return <ContactSection locale={locale} site={site} content={content} heading="h1" />;
}

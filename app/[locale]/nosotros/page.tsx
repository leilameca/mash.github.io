import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";
import { getMarketingPageContent } from "@/lib/supabase/site-content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Nosotros" : "About",
    description: locale === "es" ? "Conoce la filosofia de MASH." : "Learn about the MASH philosophy."
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const content = await getMarketingPageContent("about", locale);

  return (
    <section className="section-shell editorial-split page-editorial">
      <div className="editorial-split__image">
        <Image src={content.image ?? "/assets/images/yascari.jpeg"} alt={content.title} fill sizes="(max-width: 900px) 92vw, 42vw" />
      </div>
      <div className="editorial-split__copy">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.description}</p>
        <QuoteLink className="button button--gold">{dictionary[locale].common.requestQuote}</QuoteLink>
      </div>
    </section>
  );
}

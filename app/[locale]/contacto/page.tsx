import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";
import { getMarketingPageContent, getSiteChromeContent } from "@/lib/supabase/site-content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Contacto" : "Contact",
    description: locale === "es" ? "Contacta a MASH para cotizar muebles de exterior." : "Contact MASH to quote outdoor furniture."
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const [site, content] = await Promise.all([getSiteChromeContent(locale), getMarketingPageContent("contact", locale)]);

  return (
    <section className="section-shell contact-page">
      <div>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.description}</p>
        <QuoteLink className="button button--gold">{dictionary[locale].common.requestQuote}</QuoteLink>
      </div>
      <address className="contact-card">
        <a href={site.phoneHref}>{site.phone}</a>
        <a href={site.emailHref}>{site.email}</a>
        <a href={site.instagram} target="_blank" rel="noreferrer">
          {site.instagramHandle}
        </a>
        <span>{site.location}</span>
      </address>
    </section>
  );
}

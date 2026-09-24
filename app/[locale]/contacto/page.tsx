import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary, site } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";

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

  return (
    <section className="section-shell contact-page">
      <div>
        <p className="eyebrow">{dictionary[locale].nav.contact}</p>
        <h1>{locale === "es" ? "Cuéntanos qué espacio quieres transformar." : "Tell us what space you want to transform."}</h1>
        <p>
          {locale === "es"
            ? "El canal principal de cotizacion se mantiene por WhatsApp para responder con asesoria, disponibilidad y siguientes pasos."
            : "The main quotation channel remains WhatsApp so we can reply with guidance, availability and next steps."}
        </p>
        <QuoteLink className="button button--gold">{dictionary[locale].common.requestQuote}</QuoteLink>
      </div>
      <address className="contact-card">
        <a href={site.phoneHref}>{site.phone}</a>
        <a href={site.emailHref}>{site.email}</a>
        <a href={site.instagram} target="_blank" rel="noreferrer">
          {site.instagramHandle}
        </a>
        <span>{site.location[locale]}</span>
      </address>
    </section>
  );
}

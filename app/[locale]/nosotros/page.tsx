import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";

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

  return (
    <section className="section-shell editorial-split page-editorial">
      <div className="editorial-split__image">
        <Image src="/assets/images/yascari.jpeg" alt={locale === "es" ? "Asesoria personalizada MASH" : "MASH personal guidance"} fill sizes="(max-width: 900px) 92vw, 42vw" />
      </div>
      <div className="editorial-split__copy">
        <p className="eyebrow">MASH | Martinez Star Home</p>
        <h1>{locale === "es" ? "Más que muebles, creamos espacios que se viven." : "More than furniture, we shape outdoor spaces to be lived in."}</h1>
        <p>
          {locale === "es"
            ? "MASH es una muebleria en Santiago, Republica Dominicana, especializada en muebles de exterior para balcones, patios, terrazas, piscinas, hoteles, restaurantes, villas y proyectos comerciales."
            : "MASH is a furniture brand in Santiago, Dominican Republic, specializing in outdoor furniture for balconies, patios, terraces, pools, hotels, restaurants, villas and commercial projects."}
        </p>
        <QuoteLink className="button button--gold">{dictionary[locale].common.requestQuote}</QuoteLink>
      </div>
    </section>
  );
}

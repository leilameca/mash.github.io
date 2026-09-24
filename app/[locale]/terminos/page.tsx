import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dictionary } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Terminos"
};

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;

  return (
    <section className="section-shell legal-page">
      <p className="eyebrow">{locale === "es" ? "Terminos" : "Terms"}</p>
      <h1>{locale === "es" ? "Terminos y condiciones" : "Terms and conditions"}</h1>
      <p>{dictionary[locale].common.legalNotice}</p>
    </section>
  );
}

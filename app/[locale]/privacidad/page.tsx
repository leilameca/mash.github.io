import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dictionary } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Privacidad"
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;

  return (
    <section className="section-shell legal-page">
      <p className="eyebrow">{locale === "es" ? "Privacidad" : "Privacy"}</p>
      <h1>{locale === "es" ? "Politica de privacidad" : "Privacy policy"}</h1>
      <p>{dictionary[locale].common.legalNotice}</p>
    </section>
  );
}

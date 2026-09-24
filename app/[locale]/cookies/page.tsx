import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dictionary } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Cookies"
};

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;

  return (
    <section className="section-shell legal-page">
      <p className="eyebrow">Cookies</p>
      <h1>{locale === "es" ? "Politica de cookies" : "Cookie policy"}</h1>
      <p>{dictionary[locale].common.legalNotice}</p>
      <p>
        {locale === "es"
          ? "La configuracion de consentimiento se implementara cuando se confirmen los servicios reales usados por el sitio."
          : "Consent preferences will be implemented once the real services used by the site are confirmed."}
      </p>
    </section>
  );
}

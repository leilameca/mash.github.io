import { NewsCards } from "@/components/editorial/NewsCards";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n";
import { routeAlternates } from "@/lib/seo";
import { getNews } from "@/lib/editorial/queries";
import "@/components/editorial/editorial.css";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "News" : "Noticias",
    alternates: routeAlternates(locale, "/noticias"),
  };
}
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es",
    entries = await getNews(locale);
  return (
    <section className="section-shell editorial-published">
      <h1>{es ? "Noticias" : "News"}</h1>
      {entries.length ? (
        <NewsCards entries={entries} locale={locale} />
      ) : (
        <p>
          {es
            ? "Aún no hay noticias publicadas."
            : "No news has been published yet."}
        </p>
      )}
    </section>
  );
}

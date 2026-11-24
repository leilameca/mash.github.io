/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, localizedPath } from "@/lib/i18n";
import { routeAlternates } from "@/lib/seo";
import { getNews } from "@/lib/editorial/queries";
import { categories, categoriesEn } from "@/lib/editorial/schema";
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
        <div className="editorial-public-list">
          {entries.map((entry) => (
            <article key={entry.id} className="editorial-entry">
              <Link href={localizedPath(locale, "/noticias/" + entry.slug)}>
                {entry.data.cover && (
                  <img
                    src={entry.data.cover}
                    alt={entry.text.cover_alt || ""}
                    loading="lazy"
                  />
                )}
                <h2>{entry.text.title || entry.original.title}</h2>
              </Link>
              <p className="eyebrow">
                {(es ? categories : categoriesEn)[entry.data.category]}
                {entry.data.date && " · " + entry.data.date}
              </p>
              <p>{entry.text.excerpt || entry.original.excerpt}</p>
            </article>
          ))}
        </div>
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

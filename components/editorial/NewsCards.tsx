/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { getNews } from "@/lib/editorial/queries";
import { categories, categoriesEn } from "@/lib/editorial/schema";
import "./editorial.css";

export function NewsCards({
  entries,
  locale,
  heading: Heading = "h2",
}: {
  entries: Awaited<ReturnType<typeof getNews>>;
  locale: Locale;
  heading?: "h2" | "h3";
}) {
  return (
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
            <Heading>{entry.text.title || entry.original.title}</Heading>
          </Link>
          <p className="eyebrow">
            {(locale === "es" ? categories : categoriesEn)[entry.data.category]}
            {entry.data.date && " · " + entry.data.date}
          </p>
          <p>{entry.text.excerpt || entry.original.excerpt}</p>
        </article>
      ))}
    </div>
  );
}

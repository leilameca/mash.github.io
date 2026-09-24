import Image from "next/image";
import Link from "next/link";
import type { Collection } from "@/lib/content";
import { dictionary } from "@/lib/content";
import { localizedPath, type Locale } from "@/lib/i18n";

export function CollectionCard({ collection, locale, featured = false }: { collection: Collection; locale: Locale; featured?: boolean }) {
  return (
    <article className={`collection-card${featured ? " collection-card--wide" : ""}`}>
      <Link href={localizedPath(locale, `/colecciones/${collection.slug}`)} className="collection-card__image">
        <Image
          src={collection.image}
          alt={collection.alt[locale]}
          fill
          sizes={featured ? "(max-width: 900px) 92vw, 58vw" : "(max-width: 900px) 92vw, 32vw"}
          priority={featured}
        />
      </Link>
      <div className="collection-card__content">
        <p>{collection.label[locale]}</p>
        <h3>{collection.title[locale]}</h3>
        <span>{dictionary[locale].common.viewProducts}</span>
      </div>
    </article>
  );
}

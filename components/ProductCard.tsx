import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/content";
import { dictionary, getCollectionLabel } from "@/lib/content";
import { localizedPath, type Locale } from "@/lib/i18n";

export function ProductCard({ product, locale, priority = false }: { product: Product; locale: Locale; priority?: boolean }) {
  const t = dictionary[locale].common;

  return (
    <article className="product-card">
      <Link href={localizedPath(locale, `/productos/${product.slug}`)} className="product-card__image">
        <span className="product-card__favorite" aria-hidden="true" />
        <Image
          src={product.image}
          alt={product.alt[locale]}
          fill
          sizes="(max-width: 720px) 88vw, (max-width: 1180px) 42vw, 28vw"
          priority={priority}
        />
      </Link>
      <div className="product-card__body">
        <p>{getCollectionLabel(product, locale)}</p>
        <h3>
          <Link href={localizedPath(locale, `/productos/${product.slug}`)}>{product.name}</Link>
        </h3>
        <Link className="text-link" href={localizedPath(locale, `/productos/${product.slug}`)}>
          {t.viewDetails}
        </Link>
      </div>
    </article>
  );
}

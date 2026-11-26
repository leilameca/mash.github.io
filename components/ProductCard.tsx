import Image from "next/image";
import { AddToQuote } from "./QuoteSelection";
import Link from "next/link";
import type { Product } from "@/lib/content";
import { dictionary, getCollectionLabel } from "@/lib/content";
import { localizedPath, type Locale } from "@/lib/i18n";

export function ProductCard({
  product,
  locale,
  priority = false,
  preview = false,
}: {
  product: Product;
  locale: Locale;
  priority?: boolean;
  preview?: boolean;
}) {
  const t = dictionary[locale].common;
  const catalogImage = product.galleryVariants?.[0]?.catalog;

  return (
    <article className="product-card">
      <Link
        href={localizedPath(locale, `/productos/${product.slug}`)}
        className="product-card__image"
      >
        <Image
          src={catalogImage ?? product.image}
          unoptimized={Boolean(catalogImage)}
          alt={product.alt[locale]}
          fill
          sizes="(max-width: 720px) 88vw, (max-width: 1180px) 42vw, 28vw"
          priority={priority}
        />
      </Link>
      <div className="product-card__body">
        <p>{getCollectionLabel(product, locale)}</p>
        <h3>
          <Link href={localizedPath(locale, `/productos/${product.slug}`)}>
            {product.name}
          </Link>
        </h3>
        <Link
          className="text-link"
          href={localizedPath(locale, `/productos/${product.slug}`)}
        >
          {t.viewDetails}
        </Link>
        {preview ? (
          <span className="quote-selection-add">{locale === "es" ? "+ Agregar a cotización" : "+ Add to quote"}</span>
        ) : <AddToQuote slug={product.slug} name={product.name} locale={locale} />}
      </div>
    </article>
  );
}

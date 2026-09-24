import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary, getCollectionLabel, products as fallbackProducts } from "@/lib/content";
import { isLocale, localizedPath, type Locale } from "@/lib/i18n";
import { getCatalogCollection, getCatalogProduct, getCatalogProducts } from "@/lib/supabase/catalog";

export function generateStaticParams() {
  return ["es", "en"].flatMap((locale) =>
    fallbackProducts.map((product) => ({
      locale,
      slug: product.slug
    }))
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const product = await getCatalogProduct(rawLocale, slug);
  if (!product) notFound();

  return {
    title: product.name,
    description: product.description[rawLocale],
    openGraph: {
      title: product.name,
      description: product.description[rawLocale],
      images: [{ url: product.image, alt: product.alt[rawLocale] }]
    }
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const product = await getCatalogProduct(locale, slug);
  if (!product) notFound();
  const t = dictionary[locale].common;
  const collection = await getCatalogCollection(product.collectionSlug);
  const catalogProducts = await getCatalogProducts(locale);
  const related = catalogProducts.filter((item) => item.collectionSlug === product.collectionSlug && item.slug !== product.slug).slice(0, 3);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.gallery,
    description: product.description[locale],
    category: getCollectionLabel(product, locale),
    brand: {
      "@type": "Brand",
      name: "MASH"
    },
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "DOP"
      },
      url: "https://wa.me/18093272139"
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <section className="product-detail section-shell">
        <div className="product-gallery">
          {product.gallery.map((image, index) => (
            <div className={index === 0 ? "product-gallery__main" : "product-gallery__thumb"} key={image}>
              <Image src={image} alt={product.alt[locale]} fill priority={index === 0} sizes={index === 0 ? "(max-width: 900px) 92vw, 52vw" : "(max-width: 900px) 44vw, 18vw"} />
            </div>
          ))}
        </div>
        <div className="product-detail__content">
          <p className="eyebrow">{collection?.label[locale]}</p>
          <h1>{product.name}</h1>
          <p>{product.description[locale]}</p>
          <dl className="spec-list">
            <div>
              <dt>{t.materials}</dt>
              <dd>{product.materials[locale]}</dd>
            </div>
            <div>
              <dt>{t.dimensions}</dt>
              <dd>{product.dimensions[locale]}</dd>
            </div>
            <div>
              <dt>{t.finishes}</dt>
              <dd>{product.finishes[locale]}</dd>
            </div>
            <div>
              <dt>{t.care}</dt>
              <dd>{product.care[locale]}</dd>
            </div>
          </dl>
          <div className="detail-actions">
            <QuoteLink className="button button--gold">{t.requestQuote}</QuoteLink>
            <Link href={localizedPath(locale, "/productos")} className="button button--dark">
              {locale === "es" ? "Volver" : "Back"}
            </Link>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="section-shell product-feature related-products">
          <div className="section-heading">
            <p className="eyebrow">{t.relatedProducts}</p>
            <h2>{locale === "es" ? "Piezas de la misma coleccion." : "Pieces from the same collection."}</h2>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

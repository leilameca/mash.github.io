import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { collections as fallbackCollections } from "@/lib/content";
import { isLocale, localizedPath, type Locale } from "@/lib/i18n";
import { getCatalogCollection, getCatalogProductsByCollection } from "@/lib/supabase/catalog";

export function generateStaticParams() {
  return ["es", "en"].flatMap((locale) =>
    fallbackCollections.map((collection) => ({
      locale,
      slug: collection.slug
    }))
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const collection = await getCatalogCollection(slug);
  if (!collection) notFound();

  return {
    title: collection.label[rawLocale],
    description: collection.description[rawLocale]
  };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const collection = await getCatalogCollection(slug);
  if (!collection) notFound();
  const collectionProducts = await getCatalogProductsByCollection(locale, slug);

  return (
    <>
      <section className="detail-hero">
        <Image src={collection.image} alt={collection.alt[locale]} fill priority sizes="100vw" />
        <div className="detail-hero__content section-shell">
          <p className="eyebrow">{collection.label[locale]}</p>
          <h1>{collection.title[locale]}</h1>
          <p>{collection.description[locale]}</p>
        </div>
      </section>
      <section className="section-shell product-feature">
        <div className="section-heading">
          <p className="eyebrow">{locale === "es" ? "Productos" : "Products"}</p>
          <h2>{collection.note[locale]}</h2>
        </div>
        <div className="product-grid">
          {collectionProducts.map((product) => (
            <ProductCard key={product.slug} product={product} locale={locale} />
          ))}
        </div>
        <Link href={localizedPath(locale, "/colecciones")} className="button button--dark">
          {locale === "es" ? "Volver a colecciones" : "Back to collections"}
        </Link>
      </section>
    </>
  );
}

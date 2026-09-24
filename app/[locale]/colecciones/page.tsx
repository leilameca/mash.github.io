import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionCard } from "@/components/CollectionCard";
import { isLocale, type Locale } from "@/lib/i18n";
import { getCatalogCollections } from "@/lib/supabase/catalog";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Colecciones" : "Collections",
    description:
      locale === "es"
        ? "Colecciones MASH para terraza, dining exterior y piscina."
        : "MASH collections for terraces, outdoor dining and pool areas."
  };
}

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const collections = await getCatalogCollections();

  return (
    <section className="section-shell page-hero">
      <p className="eyebrow">{locale === "es" ? "Colecciones" : "Collections"}</p>
      <h1>{locale === "es" ? "El exterior organizado por momentos de uso." : "Outdoor living organized by use."}</h1>
      <p>
        {locale === "es"
          ? "Explora las categorias principales del catalogo MASH, preparadas para crecer con contenido editable en la proxima fase."
          : "Explore the main MASH catalog categories, prepared to grow with editable content in the next phase."}
      </p>
      <div className="collection-grid page-grid">
        {collections.map((collection, index) => (
          <CollectionCard key={collection.slug} collection={collection} locale={locale} featured={index === 0} />
        ))}
      </div>
    </section>
  );
}

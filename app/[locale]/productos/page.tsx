import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { isLocale, type Locale } from "@/lib/i18n";
import { getCatalogPage } from "@/lib/supabase/catalog";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Productos" : "Products",
    description:
      locale === "es"
        ? "Catalogo de productos MASH para muebles de exterior y cotizacion por WhatsApp."
        : "MASH product catalog for outdoor furniture and WhatsApp quotation."
  };
}

export default async function ProductsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(query.page)) || 1));
  const { products, total } = await getCatalogPage(locale, page);
  const pages = Math.max(1, Math.ceil(total / 12));

  return (
    <section className="section-shell page-hero">
      <p className="eyebrow">{locale === "es" ? "Productos" : "Products"}</p>
      <h1>{locale === "es" ? "Catalogo visual preparado para cotizacion." : "A visual catalog prepared for quotation."}</h1>
      <p>
        {locale === "es"
          ? "Cada producto se presenta con imagen, coleccion y detalle suficiente para iniciar una conversacion por WhatsApp."
          : "Each product is presented with imagery, collection context and enough detail to begin a WhatsApp conversation."}
      </p>
      <div className="product-grid page-grid">
        {products.map((product, index) => (
          <ProductCard key={product.slug} product={product} locale={locale} priority={index < 4} />
        ))}
      </div>
      {!products.length && <p>{locale === "es" ? "No hay productos en esta página." : "No products on this page."}</p>}
      {(pages > 1 || page > 1) && <nav className="catalog-pagination" aria-label={locale === "es" ? "Páginas del catálogo" : "Catalog pages"}>
        {page > 1 && <Link className="button button--dark" href={`/${locale}/productos?page=${Math.min(page - 1, pages)}`}>{locale === "es" ? "Anterior" : "Previous"}</Link>}
        <span>{locale === "es" ? "Página" : "Page"} {page} / {pages}</span>
        {page < pages && <Link className="button button--dark" href={`/${locale}/productos?page=${page + 1}`}>{locale === "es" ? "Siguiente" : "Next"}</Link>}
      </nav>}
    </section>
  );
}

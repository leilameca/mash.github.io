import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { isLocale, type Locale } from "@/lib/i18n";
import { getCatalogProducts } from "@/lib/supabase/catalog";

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

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const products = await getCatalogProducts(locale);

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
    </section>
  );
}

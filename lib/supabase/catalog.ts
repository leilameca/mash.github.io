import type { Collection, Product, Project } from "@/lib/content";
import { collections as fallbackCollections, products as fallbackProducts, projects as fallbackProjects } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { isSupabaseCatalogEnabled } from "./env";
import { createSupabaseServerClient } from "./server";

type ProductRow = {
  id: string;
  slug: string;
  featured: boolean | null;
  status: string;
  collections?: { slug: string } | null;
  product_translations?: Array<{
    locale: Locale;
    name: string;
    description: string | null;
    materials: string | null;
    care: string | null;
  }>;
  product_images?: Array<{ storage_path: string; alt_es: string | null; alt_en: string | null; sort_order: number | null; is_primary: boolean | null }>;
};

function localizeProduct(row: ProductRow, locale: Locale): Product | null {
  const translation = row.product_translations?.find((item) => item.locale === locale) ?? row.product_translations?.[0];
  if (!translation) return null;

  const gallery = row.product_images?.map((image) => image.storage_path).filter(Boolean) ?? [];
  const image = gallery[0];
  if (!image) return null;

  return {
    slug: row.slug,
    name: translation.name,
    collectionSlug: row.collections?.slug ?? "terraza",
    image,
    gallery: gallery.length > 0 ? gallery : [image],
    alt: { es: translation.name, en: translation.name },
    description: { es: translation.description ?? "", en: translation.description ?? "" },
    materials: { es: translation.materials ?? "", en: translation.materials ?? "" },
    dimensions: { es: "", en: "" },
    finishes: { es: "", en: "" },
    care: { es: translation.care ?? "", en: translation.care ?? "" },
    featured: Boolean(row.featured)
  };
}

export async function getCatalogProducts(locale: Locale) {
  if (!isSupabaseCatalogEnabled()) return fallbackProducts;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fallbackProducts;

  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,featured,status,collections(slug),product_translations(locale,name,description,materials,care),product_images(storage_path,alt_es,alt_en,sort_order,is_primary)"
    )
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error || !data) return fallbackProducts;

  const mapped = (data as unknown as ProductRow[]).map((row) => localizeProduct(row, locale)).filter((item): item is Product => Boolean(item));
  return mapped.length > 0 ? mapped : fallbackProducts;
}

export async function getCatalogProduct(locale: Locale, slug: string) {
  const products = await getCatalogProducts(locale);
  return products.find((product) => product.slug === slug);
}

export async function getCatalogProductsByCollection(locale: Locale, collectionSlug: string) {
  const products = await getCatalogProducts(locale);
  return products.filter((product) => product.collectionSlug === collectionSlug);
}

export async function getCatalogCollections() {
  if (!isSupabaseCatalogEnabled()) return fallbackCollections;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fallbackCollections;

  const { data, error } = await supabase
    .from("collections")
    .select("slug,status,cover_image_path,collection_translations(locale,name,description)")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error || !data) return fallbackCollections;

  const mapped = data
    .map((row: any): Collection | null => {
      const es = row.collection_translations?.find((item: any) => item.locale === "es") ?? row.collection_translations?.[0];
      const en = row.collection_translations?.find((item: any) => item.locale === "en") ?? es;
      if (!es || !row.cover_image_path) return null;
      return {
        slug: row.slug,
        label: { es: es.name, en: en.name ?? es.name },
        title: { es: es.name, en: en.name ?? es.name },
        description: { es: es.description ?? "", en: en.description ?? es.description ?? "" },
        image: row.cover_image_path,
        alt: { es: es.name, en: en.name ?? es.name },
        note: { es: es.description ?? "", en: en.description ?? es.description ?? "" }
      };
    })
    .filter((item: Collection | null): item is Collection => Boolean(item));

  return mapped.length > 0 ? mapped : fallbackCollections;
}

export async function getCatalogCollection(slug: string) {
  const collections = await getCatalogCollections();
  return collections.find((collection) => collection.slug === slug);
}

export async function getCatalogProjects(): Promise<Project[]> {
  return fallbackProjects;
}

import type { Collection, Product, Project } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { cache } from "react";
import { ContentError } from "./errors";
import { restorePublicEnglish, restoredProductSpecs } from "./public-english";
import {
  readPublished,
  publicContentClient,
  localizedTranslation,
  type ContentSnapshot,
  type Publication,
} from "./published";

const pair = (es = "", en = es) => ({ es, en });
const outdatedEnglishAlts: Record<string, string> = {
  "trap-set": "Oasis terrace set for a spacious patio",
  "dulce-luna": "Media Luna terrace set",
};
export function mapProduct(
  snapshot: ContentSnapshot,
  locale: Locale,
  collections: Publication[],
): Product | null {
  const row = restorePublicEnglish("product", snapshot.slug ?? "", snapshot);
  const { text, pending } = localizedTranslation(row.translations, locale);
  const original = localizedTranslation(row.translations, "es").text;
  const english = localizedTranslation(row.translations, "en").text;
  const specs = restoredProductSpecs(row);
  const images = [...row.images].sort(
    (a, b) =>
      Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) ||
      a.sort_order - b.sort_order,
  );
  if (!text?.name || !images.length) return null;
  const collection = collections.find((c) => c.entity_id === row.collection_id);
  const ct = localizedTranslation(
    collection?.snapshot.translations ?? [],
    locale,
  ).text;
  const fallbackAlt = text.name;
  const outdatedAlt = outdatedEnglishAlts[row.slug ?? ""];
  const alts = images.map((image) => {
    if (locale === "es") return image.alt_es || fallbackAlt;
    return image.alt_en && image.alt_en !== outdatedAlt ? image.alt_en : fallbackAlt;
  });
  return {
    slug: row.slug!,
    name: text.name,
    collectionSlug: collection?.slug ?? "",
    collectionSlugs: collections
      .filter((entry) =>
        (row.collection_ids ?? [row.collection_id]).includes(entry.entity_id),
      )
      .map((entry) => entry.slug),
    collectionLabel: pair(ct?.name ?? ""),
    image: images[0].storage_path,
    gallery: images.map((i) => i.storage_path),
    galleryAlts: alts,
    galleryVariants: images.map((image) => image.variants ?? {}),
    seoTitle: text.seo_title,
    seoDescription: text.seo_description,
    alt: pair(alts[0]),
    description: pair(original?.description ?? "", english?.description ?? ""),
    materials: pair(original?.materials ?? "", english?.materials ?? ""),
    dimensions: pair(row.dimensions ?? "", specs?.dimensions),
    finishes: pair(row.finishes?.join(", ") ?? "", specs?.finishes),
    care: pair(original?.care ?? "", english?.care ?? ""),
    featured: row.featured,
    translationPending: pending,
  };
}
export const getCatalogProducts = cache(async (locale: Locale) => {
  const [rows, collections] = await Promise.all([
    readPublished("product"),
    readPublished("collection"),
  ]);
  return rows
    .map((r) => mapProduct(r.snapshot, locale, collections))
    .filter((r): r is Product => !!r);
});
export const getCatalogProduct = cache(async (locale: Locale, slug: string) => {
  const client = await publicContentClient();
  const { data, error } = await client
    .from("published_content")
    .select("snapshot")
    .eq("entity_kind", "product")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error)
    throw new ContentError("connection", "No pudimos cargar el producto.");
  if (!data) return undefined;
  return (
    mapProduct(
      data.snapshot as ContentSnapshot,
      locale,
      await readPublished("collection"),
    ) ?? undefined
  );
});
export async function getRelatedProducts(
  locale: Locale,
  collectionSlug: string,
  slug: string,
) {
  const collections = await readPublished("collection");
  const collection = collections.find((c) => c.slug === collectionSlug);
  if (!collection) return [];
  const client = await publicContentClient();
  const { data, error } = await client
    .from("published_product_collections")
    .select("snapshot")
    .eq("collection_id", collection.entity_id)
    .neq("slug", slug)
    .order("sort_order")
    .order("entity_id")
    .limit(3);
  if (error || !data)
    throw new ContentError(
      "connection",
      "No pudimos cargar los productos relacionados.",
    );
  return data
    .map((r) => mapProduct(r.snapshot as ContentSnapshot, locale, collections))
    .filter((r): r is Product => !!r);
}
export async function getCatalogProductsByCollection(
  locale: Locale,
  slug: string,
) {
  return (await getCatalogProducts(locale)).filter((p) =>
    (p.collectionSlugs ?? [p.collectionSlug]).includes(slug),
  );
}
export const getCatalogCollections = cache(async (): Promise<Collection[]> => {
  return (await readPublished("collection"))
    .map<Collection | null>(({ snapshot: r, slug }) => {
      const es = localizedTranslation(r.translations, "es").text;
      const en = localizedTranslation(r.translations, "en").text;
      if (!es?.name || !r.cover_image_path) return null;
      return {
        slug,
        label: pair(es.name, en?.name),
        title: pair(es.name, en?.name),
        description: pair(es.description ?? "", en?.description ?? ""),
        image: r.cover_image_path,
        alt: pair(es.name, en?.name),
        note: pair(es.description ?? "", en?.description ?? ""),
        seoTitle: pair(es.seo_title ?? "", en?.seo_title ?? ""),
        seoDescription: pair(es.seo_description ?? "", en?.seo_description ?? ""),
      };
    })
    .filter((r): r is Collection => !!r);
});
export async function getCatalogCollection(slug: string) {
  return (await getCatalogCollections()).find((c) => c.slug === slug);
}
export async function getCatalogProjects(locale: Locale): Promise<Project[]> {
  return (await readPublished("project"))
    .map(({ snapshot: r, slug }) => {
      const { text } = localizedTranslation(r.translations, locale);
      const original = localizedTranslation(r.translations, "es").text;
      const english = localizedTranslation(r.translations, "en").text;
      if (!text?.title || !r.cover_image_path) return null;
      const cover =
        r.images.find((i) => i.storage_path === r.cover_image_path) ??
        r.images.find((i) => i.is_cover);
      const alt =
        locale === "en"
          ? cover?.alt_en || cover?.alt_es || text.title
          : cover?.alt_es || text.title;
      return {
        slug,
        title: pair(text.title),
        location: pair(r.location),
        description: pair(
          original?.description ?? "",
          english?.description ?? "",
        ),
        image: r.cover_image_path,
        alt: pair(alt),
      };
    })
    .filter((r): r is Project => !!r);
}
export async function getCatalogPage(locale: Locale, page: number) {
  const client = await publicContentClient();
  const { data, error, count } = await client
    .from("published_content")
    .select("snapshot", { count: "exact" })
    .eq("entity_kind", "product")
    .eq("status", "published")
    .order("sort_order")
    .order("entity_id")
    .range((page - 1) * 12, page * 12 - 1);
  if (error || !data)
    throw new ContentError("connection", "No pudimos cargar el catálogo.");
  const collections = await readPublished("collection");
  return {
    products: data
      .map((r) =>
        mapProduct(r.snapshot as ContentSnapshot, locale, collections),
      )
      .filter((r): r is Product => !!r),
    total: count ?? 0,
  };
}

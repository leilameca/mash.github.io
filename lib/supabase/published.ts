import { cache } from "react";
import { createSupabaseServerClient } from "./server";
import { ContentError } from "./errors";

export type ContentKind = "product" | "collection" | "project" | "site";
export type TranslationRow = {
  locale: "es" | "en";
  name?: string;
  title?: string;
  description?: string | null;
  materials?: string | null;
  care?: string | null;
  translation_status?: string;
  value?: Record<string, any>;
};
export type ImageRow = {
  storage_path: string;
  alt_es?: string | null;
  alt_en?: string | null;
  sort_order: number;
  is_primary?: boolean;
  is_cover?: boolean;
};
export type ContentSnapshot = {
  id: string;
  slug?: string;
  key?: string;
  status?: string;
  value?: Record<string, any>;
  collection_id?: string | null;
  featured?: boolean;
  dimensions?: string;
  finishes?: string[];
  location?: string;
  cover_image_path?: string;
  translations: TranslationRow[];
  images: ImageRow[];
};
export type Publication = {
  entity_id: string;
  slug: string;
  snapshot: ContentSnapshot;
  published_at: string;
  version: number;
  sort_order: number;
};

// Return the client, not a thenable query, to avoid executing it before filters are added.
export async function publicContentClient() {
  const client = await createSupabaseServerClient();
  if (!client)
    throw new ContentError(
      "configuration",
      "Falta la configuración de Supabase.",
    );
  return client;
}
export const readPublished = cache(
  async (kind: ContentKind): Promise<Publication[]> => {
    const client = await publicContentClient();
    const { data, error } = await client
      .from("content_publications")
      .select("entity_id,slug,snapshot,published_at,version,sort_order")
      .eq("entity_kind", kind)
      .eq("status", "published")
      .order("sort_order")
      .order("entity_id");
    if (error || !data)
      throw new ContentError(
        "connection",
        "No pudimos consultar el contenido publicado.",
      );
    return data as Publication[];
  },
);
export async function readPublishedSite(key: string): Promise<ContentSnapshot> {
  const rows = await readPublished("site");
  const row = rows.find((row) => row.slug === key);
  if (!row) throw new ContentError("missing", "Este bloque no está publicado.");
  return row.snapshot;
}
export function localizedTranslation(
  rows: TranslationRow[],
  locale: "es" | "en",
) {
  const original = rows.find((row) => row.locale === "es");
  const translated = rows.find((row) => row.locale === locale);
  const pending =
    locale === "en" &&
    (!translated || translated.translation_status !== "complete");
  return { text: (pending ? original : translated) ?? original, pending };
}

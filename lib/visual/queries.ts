import { getNews, getAnnouncements } from "@/lib/editorial/queries";
import "server-only";
import { cache } from "react";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import {
  localizedTranslation,
  readPublished,
  type ContentSnapshot,
} from "@/lib/supabase/published";
import { getSiteChromeContent } from "@/lib/supabase/site-content";
import type { Locale } from "@/lib/i18n";
import { adaptLegacy, fromSnapshot, type LegacyRows } from "./document";
import {
  visualKey,
  type VisualChrome,
  type VisualItem,
  type VisualPage,
} from "./schema";

export const visualItems = cache(async (): Promise<VisualItem[]> => {
  const groups = await Promise.all(
    (["collection", "product", "project"] as const).map(async (kind) =>
      (await readPublished(kind)).map(({ entity_id, slug, snapshot: r }) => {
        const es = localizedTranslation(r.translations, "es").text;
        const en = localizedTranslation(r.translations, "en").text;
        const main =
          r.images.find((i) => i.is_primary || i.is_cover) ?? r.images[0];
        return {
          id: entity_id,
          kind,
          slug,
          title: es?.name ?? es?.title ?? slug,
          titleEn: en?.name ?? en?.title,
          description: es?.description ?? undefined,
          descriptionEn: en?.description ?? undefined,
          image:
            main?.variants?.catalog ?? r.cover_image_path ?? main?.storage_path,
          featured: r.featured,
        };
      }),
    ),
  );
  const now = Date.now();
  const [newsEs, newsEn, es, en] = await Promise.all([
    getNews("es"),
    getNews("en"),
    getAnnouncements("es", now),
    getAnnouncements("en", now),
  ]);
  const news: VisualItem[] = newsEs.map((item) => {
    const translated = newsEn.find((row) => row.id === item.id);
    return {
      id: item.id,
      slug: item.slug,
      kind: "news",
      title: item.text.title,
      titleEn: translated?.text.title,
      image: item.data.cover,
      description: item.text.excerpt,
      descriptionEn: translated?.text.excerpt,
      featured: item.data.featured,
    };
  });
  const banners: VisualItem[] = [
    ...new Set([...es, ...en].map((entry) => entry.id)),
  ].map((id) => ({
    id,
    kind: "announcement",
    slug: "",
    title:
      es.find((row) => row.id === id)?.message ??
      en.find((row) => row.id === id)?.message ??
      "",
    announcements: {
      es: es.find((row) => row.id === id),
      en: en.find((row) => row.id === id),
    },
  }));
  return [...groups.flat(), ...news, ...banners];
});
export async function visualChrome(locale: Locale): Promise<VisualChrome> {
  return getSiteChromeContent(locale);
}
export async function readVisualDraft(page: VisualPage) {
  const client = await authenticatedContentClient();
  const keys = [
    visualKey(page),
    "home.hero",
    "home.sections",
    "page.about",
    "page.contact",
    "page.projects",
  ];
  const { data, error } = await client
    .from("site_content")
    .select(
      "id,key,value,revision,site_content_translations(locale,value,translation_status)",
    )
    .in("key", keys);
  if (error || !data) throw new Error("No pudimos cargar el borrador.");
  const rows: LegacyRows = {};
  for (const row of data)
    rows[row.key] = {
      ...row,
      translations: row.site_content_translations,
      images: [],
    };
  const saved = data.find((row) => row.key === visualKey(page));
  if (saved) {
    const doc = fromSnapshot(rows[saved.key], saved.revision, saved.id);
    if (!doc) throw new Error("La composición guardada no es válida.");
    const { data: entry, error: statusError } = await client
      .from("studio_entries")
      .select("live_status,published_version")
      .eq("kind", "site")
      .eq("id", saved.id)
      .single();
    if (statusError || !entry)
      throw new Error("No pudimos consultar el estado de la composición.");
    return {
      doc,
      publishedRevision:
        entry.live_status === "published"
          ? Number(entry.published_version)
          : null,
    };
  }
  return { doc: adaptLegacy(page, rows), publishedRevision: null };
}
export async function readVisualPublication(page: VisualPage) {
  const publication = (await readPublished("site")).find(
    (row) => row.slug === visualKey(page),
  );
  return publication
    ? fromSnapshot(publication.snapshot as ContentSnapshot, 0)
    : null;
}

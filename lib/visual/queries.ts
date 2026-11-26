import { getNews, getAnnouncements } from "@/lib/editorial/queries";
import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import {
  localizedTranslation,
  readPublished,
  type Publication,
} from "@/lib/supabase/published";
import { getSiteChromeContent } from "@/lib/supabase/site-content";
import type { Locale } from "@/lib/i18n";
import {
  adaptLegacy,
  fromSnapshot,
  recoverPublishedHomeEnglish,
  type LegacyRows,
} from "./document";
import {
  visualKey,
  type VisualChrome,
  type VisualItem,
  type VisualPage,
} from "./schema";

// The migration set a review status on both languages of the legacy public
// Home. These digests identify the exact bilingual version-0 text served before
// cutover. Any later edit must follow the regular review flow.
const historicHomeText: Record<string, string> = {
  "home.hero": "2d5767fa7cc498cdb16279123bc4b3e91b1216d920f3daa7bc9091048c8789d2",
  "home.sections": "540b91efef3a338769c7caa7dce73664317e9a22fb75776cdeff9a24a958368a",
};

function publicHomeSources(rows: Publication[]): LegacyRows {
  return Object.fromEntries(
    rows
      .filter(({ slug }) => slug === "home.hero" || slug === "home.sections")
      .map(({ slug, snapshot }) => {
        const contents = ["es", "en"].map((locale) =>
          Object.entries(
            snapshot.translations.find((row) => row.locale === locale)?.value ?? {},
          ).sort(([left], [right]) => left.localeCompare(right, "en")),
        );
        const digest = createHash("sha256").update(JSON.stringify(contents)).digest("hex");
        if (digest !== historicHomeText[slug]) return [slug, snapshot];
        return [
          slug,
          {
            ...snapshot,
            translations: snapshot.translations.map((row) =>
              row.locale === "en" ? { ...row, translation_status: "complete" } : row,
            ),
          },
        ];
      }),
  );
}

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
  if (page === "home") {
    return {
      doc: adaptLegacy(page, publicHomeSources(await readPublished("site"))),
      publishedRevision: null,
    };
  }
  return { doc: adaptLegacy(page, rows), publishedRevision: null };
}
export async function readVisualPublication(page: VisualPage) {
  const rows = await readPublished("site");
  const publication = rows.find(
    (row) => row.slug === visualKey(page),
  );
  const doc = publication && fromSnapshot(publication.snapshot, 0);
  if (!doc || doc.englishReady) return doc ?? null;
  const publicDocument = { ...doc, en: {} };
  if (page !== "home") return publicDocument;
  return recoverPublishedHomeEnglish(publicDocument, publicHomeSources(rows));
}

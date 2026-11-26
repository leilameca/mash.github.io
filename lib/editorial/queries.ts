import "server-only";
import { cache } from "react";
import {
  readPublished,
  localizedTranslation,
  type Publication,
} from "@/lib/supabase/published";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import type { Locale } from "@/lib/i18n";
import {
  announcementData,
  newsData,
  projectDetails,
  withinAnnouncementWindow,
  type Announcement,
  type EditorialCopy,
  type EditorialKind,
  type EditorialStatus,
} from "./schema";

export const editorialPath = (kind: EditorialKind) =>
  kind === "news" ? "/studio-mash/noticias" : "/studio-mash/anuncios";
export type EntryCopy = {
  id: string;
  key: string;
  revision: number;
  es: EditorialCopy;
  en: EditorialCopy;
  status: EditorialStatus;
  updated_at: string;
};
export const getNews = cache(async (locale: Locale) => {
  const rows = (await readPublished("site")).filter((row) =>
    row.slug.startsWith("news."),
  );
  return rows
    .flatMap((row) => {
      const parsed = newsData.safeParse(row.snapshot.value);
      const original = localizedTranslation(row.snapshot.translations, "es")
        .text?.value as EditorialCopy | undefined;
      const translated = localizedTranslation(
        row.snapshot.translations,
        locale,
      );
      const text = translated.text?.value as EditorialCopy | undefined;
      if (!parsed.success || parsed.data.archived || !original?.title || !text)
        return [];
      return [
        {
          id: row.entity_id,
          slug: row.slug.slice(5),
          publishedAt: row.published_at,
          data: parsed.data,
          text,
          original,
          pending: translated.pending,
        },
      ];
    })
    .sort(
      (a, b) =>
        (b.data.date || b.publishedAt).localeCompare(
          a.data.date || a.publishedAt,
        ) || a.slug.localeCompare(b.slug),
    );
});
export async function getNewsEntry(locale: Locale, slug: string) {
  return (await getNews(locale)).find((row) => row.slug === slug);
}
export type PublicAnnouncement = {
  id: string;
  message: string;
  cta: string;
  data: Announcement;
  publishedAt: string;
};
export const getAnnouncements = cache(
  async (locale: Locale, now: number): Promise<PublicAnnouncement[]> => {
    return (await readPublished("site"))
      .flatMap((row) => {
        if (!row.slug.startsWith("announcement.")) return [];
        const parsed = announcementData.safeParse(row.snapshot.value);
        if (!parsed.success) return [];
        const { data } = parsed;
        if (
          !data.pages.some((target) =>
            withinAnnouncementWindow(data, locale, target, now),
          )
        )
          return [];
        const translation = row.snapshot.translations.find(
          (item) => item.locale === locale,
        );
        const text = translation?.value as EditorialCopy | undefined;
        if (
          !text?.message ||
          (locale === "en" &&
            data.language === "both" &&
            translation?.translation_status !== "complete")
        )
          return [];
        return [
          {
            id: row.entity_id,
            message: text.message,
            cta: text.cta || "",
            data,
            publishedAt: row.published_at,
          },
        ];
      })
      .sort(
        (a, b) =>
          b.data.priority - a.data.priority ||
          b.publishedAt.localeCompare(a.publishedAt) ||
          a.id.localeCompare(b.id),
      );
  },
);
export function mapProject(row: Publication, locale: Locale) {
  const text = localizedTranslation(row.snapshot.translations, locale);
  const details = projectDetails.safeParse(text.text?.details ?? {});
  return {
    id: row.entity_id,
    slug: row.slug,
    title: text.text?.title || "",
    description: text.text?.description || "",
    seoTitle: text.text?.seo_title,
    seoDescription: text.text?.seo_description,
    pending: text.pending,
    cover: row.snapshot.cover_image_path,
    location: row.snapshot.location,
    category: row.snapshot.editorial?.category as string | undefined,
    date: row.snapshot.project_date,
    images: [...row.snapshot.images].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
    comparison: row.snapshot.editorial?.comparison,
    products: (row.snapshot.editorial?.products ?? []) as string[],
    collections: (row.snapshot.editorial?.collections ?? []) as string[],
    details: details.success ? details.data : {},
  };
}
export const getProjects = cache(async (locale: Locale) =>
  (await readPublished("project")).map((row) => mapProject(row, locale)),
);
export const getEditorialLinks = cache(async () => {
  const [products, collections, projects] = await Promise.all([
    readPublished("product"),
    readPublished("collection"),
    readPublished("project"),
  ]);
  return { products, collections, projects };
});

export async function editorialDrafts(kind: EditorialKind, id?: string) {
  const client = await authenticatedContentClient();
  let request = client
    .from("site_content")
    .select(
      "id,key,revision,value,updated_at,site_content_translations(locale,value,translation_status)",
    )
    .ilike("key", kind + ".%");
  if (id) request = request.eq("id", id);
  const { data, error } = await request
    .order("updated_at", { ascending: false })
    .order("id")
    .limit(id ? 1 : 1000);
  if (error || !data)
    throw new Error("No pudimos consultar el contenido editorial.");
  if (!data.length) return [];
  const { data: entries, error: statusError } = await client
    .from("studio_entries")
    .select("id,kind,live_status,published_version")
    .eq("kind", "site")
    .ilike("slug", kind + ".%");
  if (statusError || !entries)
    throw new Error("No pudimos consultar el estado editorial.");
  const status = new Map(entries.map((item) => [item.id, item]));
  return data.map((row) => {
    const current = status.get(row.id);
    const value = row.value as Record<string, unknown>;
    const get = (locale: Locale) =>
      (row.site_content_translations.find((entry) => entry.locale === locale)
        ?.value ?? {}) as EditorialCopy;
    const state: EditorialStatus = value.archived
      ? "archived"
      : current?.live_status === "published"
        ? Number(current.published_version) === Number(row.revision)
          ? "published"
          : "pending"
        : "draft";
    return {
      id: row.id,
      key: row.key,
      revision: Number(row.revision),
      updated_at: row.updated_at,
      es: get("es"),
      en: get("en"),
      status: state,
      value,
    };
  });
}

export async function relatedOptions() {
  const client = await authenticatedContentClient();
  const { data, error } = await client
    .from("studio_entries")
    .select("id,name,kind")
    .in("kind", ["product", "collection", "project"])
    .neq("work_status", "archived")
    .order("name")
    .limit(500);
  if (error || !data) throw new Error("No pudimos consultar el catálogo.");
  return data as {
    id: string;
    name: string;
    kind: "product" | "collection" | "project";
  }[];
}

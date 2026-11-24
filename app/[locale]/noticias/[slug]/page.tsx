/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, localizedPath } from "@/lib/i18n";
import { routeAlternates } from "@/lib/seo";
import { getEditorialLinks, getNewsEntry } from "@/lib/editorial/queries";
import { categories, categoriesEn } from "@/lib/editorial/schema";
import { EditorialGallery } from "@/components/editorial/EditorialGallery";
import { RelatedLinks } from "@/components/editorial/RelatedLinks";
import "@/components/editorial/editorial.css";

type Props = { params: Promise<{ locale: string; slug: string }> };
async function read(params: Props["params"]) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const entry = await getNewsEntry(locale, slug);
  if (!entry) notFound();
  const field = (key: string) => entry.text[key] || entry.original[key] || "";
  return { entry, locale, field };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entry, locale, field } = await read(params);
  const title = field("seo_title") || field("title"),
    description = field("seo_description") || field("excerpt");
  return {
    title,
    description,
    alternates: routeAlternates(locale, "/noticias/" + entry.slug),
    openGraph: {
      title,
      description,
      images: entry.data.cover ? [{ url: entry.data.cover }] : [],
    },
  };
}
export default async function Page({ params }: Props) {
  const { entry, locale, field } = await read(params);
  const es = locale === "es",
    related = await getEditorialLinks();
  return (
    <article className="section-shell editorial-published">
      <Link href={localizedPath(locale, "/noticias")}>
        ← {es ? "Noticias" : "News"}
      </Link>
      <p className="eyebrow">
        {[
          (es ? categories : categoriesEn)[entry.data.category],
          entry.data.date,
          entry.data.author,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <h1>{field("title")}</h1>
      {entry.pending && (
        <p role="status">
          English translation pending review. Showing the Spanish original.
        </p>
      )}
      <p>{field("excerpt")}</p>
      {entry.data.cover && (
        <img
          className="editorial-cover"
          src={entry.data.cover}
          alt={field("cover_alt")}
        />
      )}
      <div className="editorial-body">
        {entry.data.blocks.map((block) => {
          const Tag =
            block.type === "heading"
              ? "h2"
              : block.type === "quote"
                ? "blockquote"
                : "p";
          return <Tag key={block.id}>{field("body-" + block.id)}</Tag>;
        })}
      </div>
      <EditorialGallery
        locale={locale}
        photos={entry.data.gallery.map((photo) => ({
          id: photo.id,
          src: photo.path,
          alt: field("alt-" + photo.id),
          caption: field("caption-" + photo.id),
        }))}
      />
      <RelatedLinks
        locale={locale}
        groups={[
          {
            label: es ? "Productos" : "Products",
            prefix: "/productos/",
            rows: related.products,
            ids: entry.data.products,
          },
          {
            label: es ? "Proyectos" : "Projects",
            prefix: "/proyectos/",
            rows: related.projects,
            ids: entry.data.projects,
          },
        ]}
      />
    </article>
  );
}

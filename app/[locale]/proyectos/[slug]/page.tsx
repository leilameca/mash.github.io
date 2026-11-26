/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, localizedPath } from "@/lib/i18n";
import { getEditorialLinks, getProjects } from "@/lib/editorial/queries";
import { comparison } from "@/lib/editorial/schema";
import { routeAlternates } from "@/lib/seo";
import { ComparePhotos } from "@/components/editorial/ComparePhotos";
import { EditorialGallery } from "@/components/editorial/EditorialGallery";
import { RelatedLinks } from "@/components/editorial/RelatedLinks";

type Props = { params: Promise<{ locale: string; slug: string }> };
async function read(params: Props["params"]) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const item = (await getProjects(locale)).find((row) => row.slug === slug);
  if (!item) notFound();
  return { item, locale };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { item, locale } = await read(params);
  const title = item.seoTitle || item.title,
    description =
      item.seoDescription || item.details.excerpt || item.description;
  return {
    title,
    description,
    alternates: routeAlternates(locale, "/proyectos/" + item.slug),
    openGraph: {
      title,
      description,
      images: item.cover ? [{ url: item.cover }] : [],
    },
  };
}
export default async function Page({ params }: Props) {
  const { item, locale } = await read(params);
  const es = locale === "es";
  const related = await getEditorialLinks(),
    beforeAfter = comparison.safeParse(item.comparison);
  const cover = item.images.find((image) => image.storage_path === item.cover);
  return (
    <article className="section-shell editorial-published">
      <Link href={localizedPath(locale, "/proyectos")}>
        ← {es ? "Proyectos" : "Projects"}
      </Link>
      <p className="eyebrow">
        {[item.category, item.location, item.date].filter(Boolean).join(" · ")}
      </p>
      <h1>{item.title}</h1>
      {item.pending && (
        <p role="status">
          English translation pending review. Showing the Spanish original.
        </p>
      )}
      {item.details.excerpt && <p>{item.details.excerpt}</p>}
      {item.cover && (
        <img
          className="editorial-cover"
          src={cover?.variants?.large ?? item.cover}
          alt={
            (locale === "en" && cover?.alt_en) || cover?.alt_es || item.title
          }
        />
      )}
      <div className="editorial-body">{item.description}</div>
      {beforeAfter.success && (
        <ComparePhotos
          comparison={beforeAfter.data}
          locale={locale}
          beforeLabel={item.details.before_label}
          afterLabel={item.details.after_label}
          beforeAlt={item.details.before_alt}
          afterAlt={item.details.after_alt}
        />
      )}
      <EditorialGallery
        locale={locale}
        photos={item.images
          .filter(
            (image) =>
              image.storage_path !== item.cover ||
              image.caption_es ||
              image.caption_en,
          )
          .map((image) => ({
            id: image.storage_path,
            src: image.variants?.gallery ?? image.storage_path,
            alt: (locale === "en" && image.alt_en) || image.alt_es || "",
            caption: (locale === "en" && image.caption_en) || image.caption_es,
          }))}
      />
      <RelatedLinks
        locale={locale}
        groups={[
          {
            label: es ? "Productos" : "Products",
            prefix: "/productos/",
            rows: related.products,
            ids: item.products,
          },
          {
            label: es ? "Colecciones" : "Collections",
            prefix: "/colecciones/",
            rows: related.collections,
            ids: item.collections,
          },
        ]}
      />
    </article>
  );
}

import type { MetadataRoute } from "next";
import { readPublished } from "@/lib/supabase/published";
import { siteOrigin } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, projects, site] = await Promise.all([
    readPublished("product"),
    readPublished("collection"),
    readPublished("project"),
    readPublished("site"),
  ]);
  const paths = [
    "",
    "/productos",
    "/colecciones",
    "/noticias",
    "/privacidad",
    "/cookies",
    "/terminos",
    ...[
      ["about", "nosotros"],
      ["contact", "contacto"],
      ["projects", "proyectos"],
    ]
      .filter(([key]) => site.some((r) => r.slug === `page.${key}`))
      .map(([, path]) => `/${path}`),
  ];
  const entries = [
    ...paths.map((path) => ({ path, date: undefined as string | undefined })),
    ...products.map((r) => ({
      path: `/productos/${r.slug}`,
      date: r.published_at,
    })),
    ...projects.map((r) => ({
      path: `/proyectos/${r.slug}`,
      date: r.published_at,
    })),
    ...site
      .filter((r) => r.slug.startsWith("news.") && !r.snapshot.value?.archived)
      .map((r) => ({
        path: `/noticias/${r.slug.slice(5)}`,
        date: r.published_at,
      })),
    ...collections.map((r) => ({
      path: `/colecciones/${r.slug}`,
      date: r.published_at,
    })),
  ];
  return entries.flatMap(({ path, date }) =>
    ["es", "en"].map((locale) => ({
      url: `${siteOrigin()}/${locale}${path}`,
      ...(date ? { lastModified: date } : {}),
      alternates: {
        languages: {
          es: `${siteOrigin()}/es${path}`,
          en: `${siteOrigin()}/en${path}`,
        },
      },
    })),
  );
}

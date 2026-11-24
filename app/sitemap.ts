import type { MetadataRoute } from "next";
import { readPublished } from "@/lib/supabase/published";
import { siteOrigin } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, site] = await Promise.all([
    readPublished("product"),
    readPublished("collection"),
    readPublished("site"),
  ]);
  const paths = [
    "",
    "/productos",
    "/colecciones",
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

import type { MetadataRoute } from "next";
import { isPrivatePreview, siteOrigin } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  if (isPrivatePreview()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/studio-mash", "/api/"] },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}

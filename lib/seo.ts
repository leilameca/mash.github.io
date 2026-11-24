import type { Metadata } from "next";
export function isPrivatePreview() {
  return process.env.MASH_STAGING === "1" || process.env.VERCEL_ENV === "preview";
}

export function siteOrigin() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.mashoficial.com";
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Invalid site origin");
  return url.origin;
}
export function routeAlternates(
  locale: string,
  path = "",
): Metadata["alternates"] {
  return {
    canonical: `${siteOrigin()}/${locale}${path}`,
    languages: {
      es: `${siteOrigin()}/es${path}`,
      en: `${siteOrigin()}/en${path}`,
    },
  };
}

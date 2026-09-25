import type { Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "./server";

export type HomeHeroContent = {
  title: string;
  description: string;
  image: string;
};

const fallback: Record<Locale, HomeHeroContent> = {
  es: {
    title: "Diseñamos espacios para disfrutarlos afuera.",
    description:
      "En MASH encuentras muebles resistentes para terrazas, patios, balcones y piscinas, con asesoría para elegir piezas que funcionen en tu espacio y respondan al exterior.",
    image: "/assets/images/oasis-hero-v2.jpg"
  },
  en: {
    title: "We design spaces made to be enjoyed outside.",
    description:
      "At MASH, you will find outdoor-ready furniture for terraces, patios, balconies and pools, with guidance to choose pieces that work for your space.",
    image: "/assets/images/oasis-hero-v2.jpg"
  }
};

export async function getHomeHeroContent(locale: Locale): Promise<HomeHeroContent> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fallback[locale];

  const { data, error } = await supabase
    .from("site_content")
    .select("value,site_content_translations(locale,value)")
    .eq("key", "home.hero")
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) return fallback[locale];
  const row = data as any;
  const translation = row.site_content_translations?.find((item: any) => item.locale === locale);
  const localized = translation?.value ?? {};
  const shared = row.value ?? {};

  return {
    title: typeof localized.title === "string" && localized.title ? localized.title : fallback[locale].title,
    description:
      typeof localized.description === "string" && localized.description ? localized.description : fallback[locale].description,
    image: typeof shared.image_path === "string" && shared.image_path ? shared.image_path : fallback[locale].image
  };
}

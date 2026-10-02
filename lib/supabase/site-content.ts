import type { Locale } from "@/lib/i18n";
import { dictionary, site } from "@/lib/content";
import { createSupabaseServerClient } from "./server";

export type SiteNavigationItem = {
  id: string;
  href: string;
  label: string;
};

export type SiteChromeContent = {
  fullName: string;
  phone: string;
  phoneHref: string;
  whatsapp: string;
  instagram: string;
  instagramHandle: string;
  email: string;
  emailHref: string;
  location: string;
  navigation: SiteNavigationItem[];
  quoteLabel: string;
  requestQuoteLabel: string;
  menuLabel: string;
  closeLabel: string;
  footerCta: string;
  footerDescription: string;
  footerNavigationTitle: string;
  footerLegalTitle: string;
  copyright: string;
};

const fallbackNavigation = {
  es: [
    { id: "home", href: "", label: "Inicio" },
    { id: "collections", href: "/colecciones", label: "Colecciones" },
    { id: "products", href: "/productos", label: "Productos" },
    { id: "projects", href: "/proyectos", label: "Proyectos" },
    { id: "about", href: "/nosotros", label: "Nosotros" },
    { id: "contact", href: "/contacto", label: "Contacto" }
  ],
  en: [
    { id: "home", href: "", label: "Home" },
    { id: "collections", href: "/colecciones", label: "Collections" },
    { id: "products", href: "/productos", label: "Products" },
    { id: "projects", href: "/proyectos", label: "Projects" },
    { id: "about", href: "/nosotros", label: "About" },
    { id: "contact", href: "/contacto", label: "Contact" }
  ]
} satisfies Record<Locale, SiteNavigationItem[]>;

export function getFallbackSiteChrome(locale: Locale): SiteChromeContent {
  return {
    fullName: site.fullName,
    phone: site.phone,
    phoneHref: site.phoneHref,
    whatsapp: site.whatsapp,
    instagram: site.instagram,
    instagramHandle: site.instagramHandle,
    email: site.email,
    emailHref: site.emailHref,
    location: site.location[locale],
    navigation: fallbackNavigation[locale],
    quoteLabel: dictionary[locale].nav.quote,
    requestQuoteLabel: dictionary[locale].common.requestQuote,
    menuLabel: dictionary[locale].nav.menu,
    closeLabel: dictionary[locale].nav.close,
    footerCta: locale === "es" ? "¿Tienes un proyecto en mente?" : "Have a project in mind?",
    footerDescription:
      locale === "es"
        ? "Muebles de exterior para terrazas, patios, balcones, piscinas, hoteles, restaurantes, villas y proyectos comerciales."
        : "Outdoor furniture for terraces, patios, balconies, pools, hotels, restaurants, villas and commercial projects.",
    footerNavigationTitle: locale === "es" ? "Navegación" : "Navigation",
    footerLegalTitle: "Legal",
    copyright:
      locale === "es"
        ? `© 2026 ${site.fullName}. Todos los derechos reservados.`
        : `© 2026 ${site.fullName}. All rights reserved.`
  };
}

export async function getSiteChromeContent(locale: Locale): Promise<SiteChromeContent> {
  const defaults = getFallbackSiteChrome(locale);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return defaults;

  const { data, error } = await supabase
    .from("site_content")
    .select("key,value,site_content_translations(locale,value)")
    .in("key", ["site.settings", "site.navigation", "site.footer"])
    .eq("is_public", true);
  if (error || !data) return defaults;

  const getRow = (key: string) => (data as any[]).find((item) => item.key === key);
  const getTranslation = (row: any) => row?.site_content_translations?.find((item: any) => item.locale === locale)?.value ?? {};
  const settingsRow = getRow("site.settings");
  const navigationRow = getRow("site.navigation");
  const footerRow = getRow("site.footer");
  const settings = settingsRow?.value ?? {};
  const settingsText = getTranslation(settingsRow);
  const navigationText = getTranslation(navigationRow);
  const footerText = getTranslation(footerRow);
  const items = Array.isArray(navigationRow?.value?.items) ? navigationRow.value.items : [];
  const labels = navigationText.labels ?? {};
  const navigation = items
    .filter((item: any) => item && item.visible !== false && typeof item.href === "string")
    .map((item: any) => ({
      id: String(item.id),
      href: item.href,
      label: typeof labels[item.id] === "string" ? labels[item.id] : item.id
    }));
  const phone = typeof settings.phone === "string" && settings.phone ? settings.phone : defaults.phone;
  const email = typeof settings.email === "string" && settings.email ? settings.email : defaults.email;

  return {
    ...defaults,
    fullName: typeof settings.full_name === "string" && settings.full_name ? settings.full_name : defaults.fullName,
    phone,
    phoneHref: `tel:${phone.replace(/[^+\d]/g, "")}`,
    whatsapp: typeof settings.whatsapp === "string" && settings.whatsapp ? settings.whatsapp : defaults.whatsapp,
    instagram: typeof settings.instagram === "string" && settings.instagram ? settings.instagram : defaults.instagram,
    instagramHandle:
      typeof settings.instagram_handle === "string" && settings.instagram_handle
        ? settings.instagram_handle
        : defaults.instagramHandle,
    email,
    emailHref: `mailto:${email}`,
    location: typeof settingsText.location === "string" && settingsText.location ? settingsText.location : defaults.location,
    navigation: navigation.length ? navigation : defaults.navigation,
    quoteLabel: typeof navigationText.quote_label === "string" ? navigationText.quote_label : defaults.quoteLabel,
    requestQuoteLabel:
      typeof navigationText.request_quote_label === "string"
        ? navigationText.request_quote_label
        : defaults.requestQuoteLabel,
    menuLabel: typeof navigationText.menu_label === "string" ? navigationText.menu_label : defaults.menuLabel,
    closeLabel: typeof navigationText.close_label === "string" ? navigationText.close_label : defaults.closeLabel,
    footerCta: typeof footerText.cta === "string" ? footerText.cta : defaults.footerCta,
    footerDescription:
      typeof footerText.description === "string" ? footerText.description : defaults.footerDescription,
    footerNavigationTitle:
      typeof footerText.navigation_title === "string" ? footerText.navigation_title : defaults.footerNavigationTitle,
    footerLegalTitle: typeof footerText.legal_title === "string" ? footerText.legal_title : defaults.footerLegalTitle,
    copyright: typeof footerText.copyright === "string" ? footerText.copyright : defaults.copyright
  };
}

export type HomeHeroContent = {
  title: string;
  description: string;
  image: string;
  showroomMainImage: string;
  showroomSmallImage: string;
};

export const HOME_HERO_IMAGES = {
  image_path: "/assets/images/oasis-hero-v2.jpg",
  showroom_main_image_path: "/assets/images/candor-mix-collection.jpeg",
  showroom_small_image_path: "/assets/images/oculus-mare-dining.jpg"
};

export type HomeSectionId = "intro" | "collections" | "featured" | "lifestyle" | "philosophy" | "projects" | "materials" | "benefits" | "faq";

export type HomeSectionsContent = {
  visible: Record<HomeSectionId, boolean>;
  introEyebrow: string;
  introTitle: string;
  introImage: string;
  collectionsEyebrow: string;
  collectionsTitle: string;
  collectionsDescription: string;
  featuredEyebrow: string;
  featuredTitle: string;
  featuredDescription: string;
  lifestyleLabels: [string, string, string];
  philosophyEyebrow: string;
  philosophyTitle: string;
  philosophyDescription: string;
  philosophyImage: string;
  projectsEyebrow: string;
  projectsTitle: string;
  projectsDescription: string;
  projectsImage: string;
  materialsEyebrow: string;
  materialsTitle: string;
  materialsLead: string;
  materialOneTitle: string;
  materialOneDescription: string;
  materialTwoTitle: string;
  materialTwoDescription: string;
  materialsPrimaryImage: string;
  materialsSecondaryImage: string;
  benefitsEyebrow: string;
  benefitsTitle: string;
  benefitsDescription: string;
  benefits: Array<{ title: string; description: string }>;
  faqEyebrow: string;
  faqTitle: string;
  faqDescription: string;
  faqs: Array<{ question: string; answer: string }>;
};

const sectionIds: HomeSectionId[] = ["intro", "collections", "featured", "lifestyle", "philosophy", "projects", "materials", "benefits", "faq"];

export function getFallbackHomeSections(locale: Locale): HomeSectionsContent {
  const es = locale === "es";
  return {
    visible: Object.fromEntries(sectionIds.map((id) => [id, true])) as Record<HomeSectionId, boolean>,
    introEyebrow: es ? "Showroom exterior" : "Outdoor showroom",
    introTitle: es ? "Más que muebles, creamos espacios que se viven." : "More than furniture, we shape outdoor spaces to be lived in.",
    introImage: "/assets/images/area-set-patio-terraza-santiago.jpeg",
    collectionsEyebrow: es ? "Colecciones" : "Collections",
    collectionsTitle: es ? "Ambientes completos, no piezas aisladas." : "Complete settings, not isolated pieces.",
    collectionsDescription: es
      ? "Cada colección funciona como una entrada clara al catálogo: socializar, comer afuera o descansar junto a la piscina."
      : "Each collection acts as a clear entry into the catalog: gathering, dining outside or resting by the pool.",
    featuredEyebrow: es ? "Productos destacados" : "Featured products",
    featuredTitle: es ? "Piezas para mirar de cerca y cotizar con criterio." : "Pieces to inspect closely and quote with intention.",
    featuredDescription: es
      ? "Sin carrito ni checkout. El recorrido lleva a entender la pieza y pedir una cotización por WhatsApp."
      : "No cart or checkout. The path helps visitors understand the piece and request a WhatsApp quote.",
    lifestyleLabels: es ? ["Terrazas", "Balcones", "Piscinas"] : ["Terraces", "Balconies", "Pools"],
    philosophyEyebrow: es ? "Filosofía MASH" : "MASH philosophy",
    philosophyTitle: es ? "Más que muebles, creamos espacios que se viven." : "More than furniture, we shape outdoor spaces to be lived in.",
    philosophyDescription: es
      ? "La idea es que compres algo que se vea bien, resista el exterior y tenga sentido para tu terraza, patio, balcón, piscina o proyecto de hospitalidad."
      : "The idea is to choose pieces that look good, perform outdoors and make sense for your terrace, patio, balcony, pool or hospitality project.",
    philosophyImage: "/assets/images/yascari.jpeg",
    projectsEyebrow: es ? "Proyectos" : "Projects",
    projectsTitle: es ? "Imagina las piezas dentro del espacio." : "Imagine the pieces within the space.",
    projectsDescription: es
      ? "Presentación visual de instalaciones y ambientes completados por MASH."
      : "A visual presentation of installations and settings completed by MASH.",
    projectsImage: "/assets/images/WhatsApp Image 2026-03-03 at 12.33.08 PM.jpeg",
    materialsEyebrow: es ? "Materiales" : "Materials",
    materialsTitle: es ? "Hechos para verse bien y responder afuera." : "Made to look good and perform outside.",
    materialsLead: es
      ? "El valor está en la combinación: acabado cálido, estructura firme y mantenimiento simple para uso real en exterior."
      : "The value is in the combination: warm finish, firm structure and simple maintenance for real outdoor use.",
    materialOneTitle: es ? "Fibra sintética" : "Synthetic fiber",
    materialOneDescription: es
      ? "Un acabado cálido y elegante, pensado para responder mejor al clima exterior de República Dominicana."
      : "A warm and elegant finish chosen to respond better to the Dominican outdoor climate.",
    materialTwoTitle: es ? "Perfiles galvanizados" : "Galvanized profiles",
    materialTwoDescription: es
      ? "Una base firme y confiable para que el mueble se mantenga estable y listo para exterior."
      : "A firm, reliable base so each piece stays stable and ready for outdoor use.",
    materialsPrimaryImage: "/assets/images/textura-fibra-sintetica-v2.webp",
    materialsSecondaryImage: "/assets/images/estructura-acero.jpg",
    benefitsEyebrow: es ? "Beneficios" : "Benefits",
    benefitsTitle: es ? "Muebles de exterior modernos, funcionales y listos para intemperie." : "Modern, functional outdoor furniture, ready for the elements.",
    benefitsDescription: es ? "Cada colección está pensada para responder a una necesidad real de compra: durabilidad, fácil mantenimiento, buena presencia y buen desempeño en espacios abiertos de República Dominicana." : "Each collection is designed around a real buying need: durability, easy maintenance, strong presence and outdoor performance.",
    benefits: es ? [
      { title: "Resistencia real al agua y al sol", description: "Ideal para patios, terrazas y áreas de piscina donde el mobiliario está expuesto a lluvia, calor y uso continuo." },
      { title: "Fibra sintética con acabado elegante", description: "Acabados con una presencia cálida y cuidada para quienes quieren un exterior contemporáneo." },
      { title: "Perfiles galvanizados duraderos", description: "Estructuras pensadas para aportar estabilidad, confianza y mejor rendimiento en exterior." },
      { title: "Uso residencial y comercial", description: "Soluciones para residencias, hoteles, restaurantes, villas y proyectos comerciales." }
    ] : [
      { title: "Real resistance to sun and rain", description: "Ideal for patios, terraces and pool areas exposed to weather and continuous use." },
      { title: "Synthetic fiber, elegant finish", description: "Warm, considered finishes for a contemporary outdoor setting." },
      { title: "Durable galvanized profiles", description: "Structures designed for stability, confidence and outdoor performance." },
      { title: "Residential and commercial use", description: "Solutions for homes, hotels, restaurants, villas and commercial projects." }
    ],
    faqEyebrow: es ? "Preguntas frecuentes" : "Frequently asked questions",
    faqTitle: es ? "Respuestas claras antes de comprar muebles de exterior." : "Clear answers before choosing outdoor furniture.",
    faqDescription: es ? "Información práctica para comparar opciones, evaluar materiales y preparar una cotización." : "Practical information to compare options, evaluate materials and prepare a quote.",
    faqs: es ? [
      { question: "¿Qué muebles de exterior resisten mejor el sol y la lluvia?", answer: "Los muebles fabricados en fibra sintética y con perfiles galvanizados responden mejor al sol, la humedad y el uso constante en terrazas, patios, balcones y piscinas." },
      { question: "¿Venden muebles para balcones y patios en Santiago?", answer: "Sí. Trabajamos opciones para balcones, patios, terrazas y áreas sociales en Santiago, con asesoría para elegir el set según el tamaño, estilo y uso del espacio." },
      { question: "¿Los muebles de fibra sintética duran en exteriores?", answer: "Sí. La fibra sintética está pensada para exterior y combina durabilidad, fácil limpieza y una apariencia elegante con cuidados básicos." },
      { question: "¿Tienen muebles para hoteles y restaurantes?", answer: "Sí. Atendemos proyectos para hoteles, restaurantes, villas y espacios comerciales que necesitan mobiliario exterior para uso frecuente." },
      { question: "¿Los perfiles galvanizados resisten la intemperie?", answer: "Ayudan a que la estructura sea más estable y apta para condiciones de exterior, incluso cuando el espacio está expuesto a humedad, sol y uso continuo." },
      { question: "¿Hacen cotizaciones para proyectos?", answer: "Sí. Puedes escribirnos por WhatsApp para cotizar muebles de exterior para una residencia, villa, hotel, restaurante o proyecto comercial." }
    ] : []
  };
}

export async function getHomeSectionsContent(locale: Locale): Promise<HomeSectionsContent> {
  const defaults = getFallbackHomeSections(locale);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return defaults;
  const { data, error } = await supabase
    .from("site_content")
    .select("value,site_content_translations(locale,value)")
    .eq("key", "home.sections")
    .eq("is_public", true)
    .maybeSingle();
  if (error || !data) return defaults;
  const row = data as any;
  const shared = row.value ?? {};
  const text = row.site_content_translations?.find((item: any) => item.locale === locale)?.value ?? {};
  const stringValue = (key: keyof HomeSectionsContent, fallbackValue: string) =>
    typeof text[key] === "string" && text[key] ? text[key] : fallbackValue;
  const imageValue = (key: string, fallbackValue: string) =>
    typeof shared[key] === "string" && shared[key] ? shared[key] : fallbackValue;
  return {
    ...defaults,
    visible: { ...defaults.visible, ...(shared.visible ?? {}) },
    introEyebrow: stringValue("introEyebrow", defaults.introEyebrow),
    introTitle: stringValue("introTitle", defaults.introTitle),
    introImage: imageValue("introImage", defaults.introImage),
    collectionsEyebrow: stringValue("collectionsEyebrow", defaults.collectionsEyebrow),
    collectionsTitle: stringValue("collectionsTitle", defaults.collectionsTitle),
    collectionsDescription: stringValue("collectionsDescription", defaults.collectionsDescription),
    featuredEyebrow: stringValue("featuredEyebrow", defaults.featuredEyebrow),
    featuredTitle: stringValue("featuredTitle", defaults.featuredTitle),
    featuredDescription: stringValue("featuredDescription", defaults.featuredDescription),
    lifestyleLabels: [
      stringValue("lifestyleLabels", defaults.lifestyleLabels[0]),
      typeof text.lifestyleLabelTwo === "string" ? text.lifestyleLabelTwo : defaults.lifestyleLabels[1],
      typeof text.lifestyleLabelThree === "string" ? text.lifestyleLabelThree : defaults.lifestyleLabels[2]
    ],
    philosophyEyebrow: stringValue("philosophyEyebrow", defaults.philosophyEyebrow),
    philosophyTitle: stringValue("philosophyTitle", defaults.philosophyTitle),
    philosophyDescription: stringValue("philosophyDescription", defaults.philosophyDescription),
    philosophyImage: imageValue("philosophyImage", defaults.philosophyImage),
    projectsEyebrow: stringValue("projectsEyebrow", defaults.projectsEyebrow),
    projectsTitle: stringValue("projectsTitle", defaults.projectsTitle),
    projectsDescription: stringValue("projectsDescription", defaults.projectsDescription),
    projectsImage: imageValue("projectsImage", defaults.projectsImage),
    materialsEyebrow: stringValue("materialsEyebrow", defaults.materialsEyebrow),
    materialsTitle: stringValue("materialsTitle", defaults.materialsTitle),
    materialsLead: stringValue("materialsLead", defaults.materialsLead),
    materialOneTitle: stringValue("materialOneTitle", defaults.materialOneTitle),
    materialOneDescription: stringValue("materialOneDescription", defaults.materialOneDescription),
    materialTwoTitle: stringValue("materialTwoTitle", defaults.materialTwoTitle),
    materialTwoDescription: stringValue("materialTwoDescription", defaults.materialTwoDescription),
    materialsPrimaryImage: imageValue("materialsPrimaryImage", defaults.materialsPrimaryImage),
    materialsSecondaryImage: imageValue("materialsSecondaryImage", defaults.materialsSecondaryImage)
    ,benefitsEyebrow: stringValue("benefitsEyebrow", defaults.benefitsEyebrow)
    ,benefitsTitle: stringValue("benefitsTitle", defaults.benefitsTitle)
    ,benefitsDescription: stringValue("benefitsDescription", defaults.benefitsDescription)
    ,benefits: [1, 2, 3, 4].map((n) => ({ title: typeof text[`benefit${n}Title`] === "string" ? text[`benefit${n}Title`] : defaults.benefits[n - 1]?.title ?? "", description: typeof text[`benefit${n}Description`] === "string" ? text[`benefit${n}Description`] : defaults.benefits[n - 1]?.description ?? "" }))
    ,faqEyebrow: stringValue("faqEyebrow", defaults.faqEyebrow)
    ,faqTitle: stringValue("faqTitle", defaults.faqTitle)
    ,faqDescription: stringValue("faqDescription", defaults.faqDescription)
    ,faqs: [1, 2, 3, 4, 5, 6].map((n) => ({ question: typeof text[`faq${n}Question`] === "string" ? text[`faq${n}Question`] : defaults.faqs[n - 1]?.question ?? "", answer: typeof text[`faq${n}Answer`] === "string" ? text[`faq${n}Answer`] : defaults.faqs[n - 1]?.answer ?? "" }))
  };
}

export type MarketingPageKey = "about" | "contact" | "projects";

export type MarketingPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
};

const marketingFallback: Record<MarketingPageKey, Record<Locale, MarketingPageContent>> = {
  about: {
    es: {
      eyebrow: "MASH | Martinez Star Home",
      title: "Más que muebles, creamos espacios que se viven.",
      description:
        "MASH es una mueblería en Santiago, República Dominicana, especializada en muebles de exterior para balcones, patios, terrazas, piscinas, hoteles, restaurantes, villas y proyectos comerciales.",
      image: "/assets/images/yascari.jpeg"
    },
    en: {
      eyebrow: "MASH | Martinez Star Home",
      title: "More than furniture, we shape outdoor spaces to be lived in.",
      description:
        "MASH is a furniture brand in Santiago, Dominican Republic, specializing in outdoor furniture for balconies, patios, terraces, pools, hotels, restaurants, villas and commercial projects.",
      image: "/assets/images/yascari.jpeg"
    }
  },
  contact: {
    es: {
      eyebrow: "Contacto",
      title: "Cuéntanos qué espacio quieres transformar.",
      description:
        "El canal principal de cotización se mantiene por WhatsApp para responder con asesoría, disponibilidad y siguientes pasos."
    },
    en: {
      eyebrow: "Contact",
      title: "Tell us what space you want to transform.",
      description:
        "The main quotation channel remains WhatsApp so we can reply with guidance, availability and next steps."
    }
  },
  projects: {
    es: {
      eyebrow: "Proyectos",
      title: "Instalaciones reales, preparadas para crecer.",
      description: "Explora instalaciones y ambientes realizados por MASH."
    },
    en: {
      eyebrow: "Projects",
      title: "Real installations, ready to grow.",
      description: "Explore installations and settings completed by MASH."
    }
  }
};

export function getFallbackMarketingPage(key: MarketingPageKey, locale: Locale) {
  return marketingFallback[key][locale];
}

export async function getMarketingPageContent(key: MarketingPageKey, locale: Locale): Promise<MarketingPageContent> {
  const defaults = getFallbackMarketingPage(key, locale);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return defaults;
  const { data, error } = await supabase
    .from("site_content")
    .select("value,site_content_translations(locale,value)")
    .eq("key", `page.${key}`)
    .eq("is_public", true)
    .maybeSingle();
  if (error || !data) return defaults;
  const row = data as any;
  const text = row.site_content_translations?.find((item: any) => item.locale === locale)?.value ?? {};
  return {
    eyebrow: typeof text.eyebrow === "string" ? text.eyebrow : defaults.eyebrow,
    title: typeof text.title === "string" ? text.title : defaults.title,
    description: typeof text.description === "string" ? text.description : defaults.description,
    image: typeof row.value?.image_path === "string" ? row.value.image_path : defaults.image
  };
}

const fallback: Record<Locale, HomeHeroContent> = {
  es: {
    title: "Diseñamos espacios para disfrutarlos afuera.",
    description:
      "En MASH encuentras muebles resistentes para terrazas, patios, balcones y piscinas, con asesoría para elegir piezas que funcionen en tu espacio y respondan al exterior.",
    image: HOME_HERO_IMAGES.image_path,
    showroomMainImage: HOME_HERO_IMAGES.showroom_main_image_path,
    showroomSmallImage: HOME_HERO_IMAGES.showroom_small_image_path
  },
  en: {
    title: "We design spaces made to be enjoyed outside.",
    description:
      "At MASH, you will find outdoor-ready furniture for terraces, patios, balconies and pools, with guidance to choose pieces that work for your space.",
    image: HOME_HERO_IMAGES.image_path,
    showroomMainImage: HOME_HERO_IMAGES.showroom_main_image_path,
    showroomSmallImage: HOME_HERO_IMAGES.showroom_small_image_path
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
    image: typeof shared.image_path === "string" && shared.image_path ? shared.image_path : fallback[locale].image,
    showroomMainImage: typeof shared.showroom_main_image_path === "string" && shared.showroom_main_image_path ? shared.showroom_main_image_path : fallback[locale].showroomMainImage,
    showroomSmallImage: typeof shared.showroom_small_image_path === "string" && shared.showroom_small_image_path ? shared.showroom_small_image_path : fallback[locale].showroomSmallImage
  };
}

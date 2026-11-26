import type { Locale } from "@/lib/i18n";
import { workshopContent } from "@/lib/workshop";
import { ContentError } from "./errors";
import { authenticatedContentClient } from "./persistence";
import type { ContentSnapshot } from "./published";
import {
  readPublished,
  readPublishedSite,
  localizedTranslation,
} from "./published";
import { isHttpsUrl, isInternalPath } from "@/lib/security";

export type SiteNavigationItem = {
  id: string;
  href: string;
  label: string;
};

import { legacyLifestylePhotos } from "@/lib/lifestyle-images";

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
  workshop?: ReturnType<typeof workshopContent>;
  navigation: SiteNavigationItem[];
  quoteLabel: string;
  requestQuoteLabel: string;
  quoteMessage?: string;
  menuLabel: string;
  closeLabel: string;
  footerCta: string;
  footerDescription: string;
  footerNavigationTitle: string;
  footerLegalTitle: string;
  copyright: string;
  translationPending?: boolean;
};

export type HomeHeroContent = {
  title: string;
  description: string;
  image: string;
  showroomMainImage: string;
  showroomSmallImage: string;
};

export type HomeSectionId =
  | "intro"
  | "collections"
  | "featured"
  | "lifestyle"
  | "philosophy"
  | "projects"
  | "materials"
  | "benefits"
  | "faq";

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
  lifestyleImageOne: string;
  lifestyleImageTwo: string;
  lifestyleImageThree: string;
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

const sectionIds: HomeSectionId[] = [
  "intro",
  "collections",
  "featured",
  "lifestyle",
  "philosophy",
  "projects",
  "materials",
  "benefits",
  "faq",
];

export type MarketingPageKey = "about" | "contact" | "projects";

export type MarketingPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
};

export function emptySiteChrome(_locale?: Locale): SiteChromeContent {
  return {
    fullName: "",
    phone: "",
    phoneHref: "",
    whatsapp: "",
    instagram: "",
    instagramHandle: "",
    email: "",
    emailHref: "",
    location: "",
    navigation: [],
    quoteLabel: "",
    requestQuoteLabel: "",
    menuLabel: "",
    closeLabel: "",
    footerCta: "",
    footerDescription: "",
    footerNavigationTitle: "",
    footerLegalTitle: "",
    copyright: "",
  };
}
function emptyHomeSections(): HomeSectionsContent {
  const textKeys = [
    "introEyebrow",
    "introTitle",
    "introImage",
    "collectionsEyebrow",
    "collectionsTitle",
    "collectionsDescription",
    "featuredEyebrow",
    "featuredTitle",
    "featuredDescription",
    "lifestyleImageOne",
    "lifestyleImageTwo",
    "lifestyleImageThree",
    "philosophyEyebrow",
    "philosophyTitle",
    "philosophyDescription",
    "philosophyImage",
    "projectsEyebrow",
    "projectsTitle",
    "projectsDescription",
    "projectsImage",
    "materialsEyebrow",
    "materialsTitle",
    "materialsLead",
    "materialOneTitle",
    "materialOneDescription",
    "materialTwoTitle",
    "materialTwoDescription",
    "materialsPrimaryImage",
    "materialsSecondaryImage",
    "benefitsEyebrow",
    "benefitsTitle",
    "benefitsDescription",
    "faqEyebrow",
    "faqTitle",
    "faqDescription",
  ];
  return {
    ...Object.fromEntries(textKeys.map((k) => [k, ""])),
    visible: Object.fromEntries(sectionIds.map((id) => [id, false])),
    lifestyleLabels: ["", "", ""],
    benefits: [],
    faqs: [],
  } as unknown as HomeSectionsContent;
}
export async function getSiteChromeContent(
  locale: Locale,
): Promise<SiteChromeContent> {
  const defaults = emptySiteChrome();
  const data = (await readPublished("site")).map((r) => ({
    ...r.snapshot,
    site_content_translations: r.snapshot.translations,
  }));

  const getRow = (key: string) =>
    (data as any[]).find((item) => item.key === key);
  const getTranslation = (row: any) =>
    localizedTranslation(row?.site_content_translations ?? [], locale).text
      ?.value ?? {};
  const settingsRow = getRow("site.settings");
  const navigationRow = getRow("site.navigation");
  const footerRow = getRow("site.footer");
  if (!settingsRow || !navigationRow || !footerRow)
    throw new ContentError("missing", "Falta contenido general publicado.");
  const settings = settingsRow?.value ?? {};
  const settingsText = getTranslation(settingsRow);
  const navigationTranslation = localizedTranslation(
    navigationRow.site_content_translations ?? [],
    locale,
  );
  const navigationText = navigationTranslation.text?.value ?? {};
  const footerText = getTranslation(footerRow);
  const items = Array.isArray(navigationRow?.value?.items)
    ? navigationRow.value.items
    : [];
  const labels = navigationText.labels ?? {};
  const navigation = items
    .filter(
      (item: any) =>
        item &&
        item.visible !== false &&
        typeof item.href === "string" &&
        isInternalPath(item.href),
    )
    .map((item: any) => ({
      id: String(item.id),
      href: item.href,
      label: typeof labels[item.id] === "string" ? labels[item.id] : item.id,
    }));
  const phone =
    typeof settings.phone === "string" && settings.phone
      ? settings.phone
      : defaults.phone;
  const email =
    typeof settings.email === "string" && settings.email
      ? settings.email
      : defaults.email;

  return {
    ...defaults,
    fullName:
      typeof settings.full_name === "string" && settings.full_name
        ? settings.full_name
        : defaults.fullName,
    phone,
    phoneHref: `tel:${phone.replace(/[^+\d]/g, "")}`,
    whatsapp:
      typeof settings.whatsapp === "string" && isHttpsUrl(settings.whatsapp)
        ? settings.whatsapp
        : defaults.whatsapp,
    instagram:
      typeof settings.instagram === "string" && isHttpsUrl(settings.instagram)
        ? settings.instagram
        : defaults.instagram,
    instagramHandle:
      typeof settings.instagram_handle === "string" && settings.instagram_handle
        ? settings.instagram_handle
        : defaults.instagramHandle,
    email,
    emailHref: `mailto:${email}`,
    location:
      typeof settingsText.location === "string" && settingsText.location
        ? settingsText.location
        : defaults.location,
    workshop: workshopContent(locale, settings.workshop, {
      name: settingsText.workshop_name,
      address: settingsText.workshop_address,
      button: settingsText.workshop_button,
    }),
    translationPending:
      locale === "en" &&
      [settingsRow, navigationRow, footerRow].some(
        (row) =>
          localizedTranslation(row.site_content_translations, locale).pending,
      ),
    navigation,
    quoteLabel:
      typeof navigationText.quote_label === "string"
        ? navigationText.quote_label
        : defaults.quoteLabel,
    requestQuoteLabel:
      typeof navigationText.request_quote_label === "string"
        ? navigationText.request_quote_label
        : defaults.requestQuoteLabel,
    quoteMessage:
      !navigationTranslation.pending && typeof navigationText.quote_message === "string"
        ? navigationText.quote_message
        : undefined,
    menuLabel:
      typeof navigationText.menu_label === "string"
        ? navigationText.menu_label
        : defaults.menuLabel,
    closeLabel:
      typeof navigationText.close_label === "string"
        ? navigationText.close_label
        : defaults.closeLabel,
    footerCta:
      typeof footerText.cta === "string" ? footerText.cta : defaults.footerCta,
    footerDescription:
      typeof footerText.description === "string"
        ? footerText.description
        : defaults.footerDescription,
    footerNavigationTitle:
      typeof footerText.navigation_title === "string"
        ? footerText.navigation_title
        : defaults.footerNavigationTitle,
    footerLegalTitle:
      typeof footerText.legal_title === "string"
        ? footerText.legal_title
        : defaults.footerLegalTitle,
    copyright:
      typeof footerText.copyright === "string"
        ? footerText.copyright
        : defaults.copyright,
  };
}

export async function getHomeSectionsContent(
  locale: Locale,
  workingCopy?: ContentSnapshot,
): Promise<HomeSectionsContent> {
  const defaults = emptyHomeSections();
  defaults.lifestyleLabels = ["", "", ""];
  const row =
    workingCopy ??
    (await readPublished("site")).find(({ slug }) => slug === "home.sections")
      ?.snapshot;
  if (!row) return defaults;
  const shared = row.value ?? {};
  const text =
    (workingCopy
      ? row.translations.find((t) => t.locale === locale)
      : localizedTranslation(row.translations, locale).text
    )?.value ?? {};
  const stringValue = (
    key: keyof HomeSectionsContent,
    fallbackValue: string,
  ) => (typeof text[key] === "string" && text[key] ? text[key] : fallbackValue);
  const imageValue = (key: string, fallbackValue: string) =>
    typeof shared[key] === "string" && shared[key]
      ? shared[key]
      : fallbackValue;
  // Some published legacy bands predate the three photo fields.
  const lifestyleImage = (key: string, legacyImage: string) =>
    imageValue(key, shared.visible?.lifestyle === true && !Object.hasOwn(shared, key)
      ? legacyImage
      : "");
  return {
    ...defaults,
    visible: { ...defaults.visible, ...(shared.visible ?? {}) },
    introEyebrow: stringValue("introEyebrow", defaults.introEyebrow),
    introTitle: stringValue("introTitle", defaults.introTitle),
    introImage: imageValue("introImage", defaults.introImage),
    collectionsEyebrow: stringValue(
      "collectionsEyebrow",
      defaults.collectionsEyebrow,
    ),
    collectionsTitle: stringValue(
      "collectionsTitle",
      defaults.collectionsTitle,
    ),
    collectionsDescription: stringValue(
      "collectionsDescription",
      defaults.collectionsDescription,
    ),
    featuredEyebrow: stringValue("featuredEyebrow", defaults.featuredEyebrow),
    featuredTitle: stringValue("featuredTitle", defaults.featuredTitle),
    featuredDescription: stringValue(
      "featuredDescription",
      defaults.featuredDescription,
    ),
    lifestyleLabels: [
      typeof text.lifestyleLabelOne === "string"
        ? text.lifestyleLabelOne
        : defaults.lifestyleLabels[0],
      typeof text.lifestyleLabelTwo === "string"
        ? text.lifestyleLabelTwo
        : defaults.lifestyleLabels[1],
      typeof text.lifestyleLabelThree === "string"
        ? text.lifestyleLabelThree
        : defaults.lifestyleLabels[2],
    ],
    lifestyleImageOne: lifestyleImage(
      "lifestyleImageOne",
      legacyLifestylePhotos.one,
    ),
    lifestyleImageTwo: lifestyleImage(
      "lifestyleImageTwo",
      legacyLifestylePhotos.two,
    ),
    lifestyleImageThree: lifestyleImage(
      "lifestyleImageThree",
      legacyLifestylePhotos.three,
    ),
    philosophyEyebrow: stringValue(
      "philosophyEyebrow",
      defaults.philosophyEyebrow,
    ),
    philosophyTitle: stringValue("philosophyTitle", defaults.philosophyTitle),
    philosophyDescription: stringValue(
      "philosophyDescription",
      defaults.philosophyDescription,
    ),
    philosophyImage: imageValue("philosophyImage", defaults.philosophyImage),
    projectsEyebrow: stringValue("projectsEyebrow", defaults.projectsEyebrow),
    projectsTitle: stringValue("projectsTitle", defaults.projectsTitle),
    projectsDescription: stringValue(
      "projectsDescription",
      defaults.projectsDescription,
    ),
    projectsImage: imageValue("projectsImage", defaults.projectsImage),
    materialsEyebrow: stringValue(
      "materialsEyebrow",
      defaults.materialsEyebrow,
    ),
    materialsTitle: stringValue("materialsTitle", defaults.materialsTitle),
    materialsLead: stringValue("materialsLead", defaults.materialsLead),
    materialOneTitle: stringValue(
      "materialOneTitle",
      defaults.materialOneTitle,
    ),
    materialOneDescription: stringValue(
      "materialOneDescription",
      defaults.materialOneDescription,
    ),
    materialTwoTitle: stringValue(
      "materialTwoTitle",
      defaults.materialTwoTitle,
    ),
    materialTwoDescription: stringValue(
      "materialTwoDescription",
      defaults.materialTwoDescription,
    ),
    materialsPrimaryImage: imageValue(
      "materialsPrimaryImage",
      defaults.materialsPrimaryImage,
    ),
    materialsSecondaryImage: imageValue(
      "materialsSecondaryImage",
      defaults.materialsSecondaryImage,
    ),
    benefitsEyebrow: stringValue("benefitsEyebrow", defaults.benefitsEyebrow),
    benefitsTitle: stringValue("benefitsTitle", defaults.benefitsTitle),
    benefitsDescription: stringValue(
      "benefitsDescription",
      defaults.benefitsDescription,
    ),
    benefits: [1, 2, 3, 4].map((n) => ({
      title:
        typeof text[`benefit${n}Title`] === "string"
          ? text[`benefit${n}Title`]
          : (defaults.benefits[n - 1]?.title ?? ""),
      description:
        typeof text[`benefit${n}Description`] === "string"
          ? text[`benefit${n}Description`]
          : (defaults.benefits[n - 1]?.description ?? ""),
    })),
    faqEyebrow: stringValue("faqEyebrow", defaults.faqEyebrow),
    faqTitle: stringValue("faqTitle", defaults.faqTitle),
    faqDescription: stringValue("faqDescription", defaults.faqDescription),
    faqs: [1, 2, 3, 4, 5, 6].map((n) => ({
      question:
        typeof text[`faq${n}Question`] === "string"
          ? text[`faq${n}Question`]
          : (defaults.faqs[n - 1]?.question ?? ""),
      answer:
        typeof text[`faq${n}Answer`] === "string"
          ? text[`faq${n}Answer`]
          : (defaults.faqs[n - 1]?.answer ?? ""),
    })),
  };
}

export async function getMarketingPageContent(
  key: MarketingPageKey,
  locale: Locale,
): Promise<MarketingPageContent> {
  const defaults: MarketingPageContent = {
    eyebrow: "",
    title: "",
    description: "",
    image: "",
  };
  const row = await readPublishedSite(`page.${key}`);
  const text = localizedTranslation(row.translations, locale).text?.value ?? {};
  return {
    eyebrow: typeof text.eyebrow === "string" ? text.eyebrow : defaults.eyebrow,
    title: typeof text.title === "string" ? text.title : defaults.title,
    description:
      typeof text.description === "string"
        ? text.description
        : defaults.description,
    image:
      typeof row.value?.image_path === "string"
        ? row.value.image_path
        : defaults.image,
  };
}

export async function getHomeHeroContent(
  locale: Locale,
): Promise<HomeHeroContent> {
  const row = await readPublishedSite("home.hero");
  const text = localizedTranslation(row.translations, locale).text?.value ?? {};
  const shared = row.value ?? {};
  return {
    title: typeof text.title === "string" ? text.title : "",
    description: typeof text.description === "string" ? text.description : "",
    image: shared.image_path ?? "",
    showroomMainImage: shared.showroom_main_image_path ?? "",
    showroomSmallImage: shared.showroom_small_image_path ?? "",
  };
}

export async function getAdministrativeHomeSections(locale: Locale) {
  const client = await authenticatedContentClient();
  const { data, error } = await client
    .from("site_content")
    .select(
      "id,key,value,site_content_translations(locale,value,translation_status)",
    )
    .eq("key", "home.sections")
    .maybeSingle();
  if (error || !data)
    throw new Error("No pudimos leer el borrador de secciones.");
  return getHomeSectionsContent(locale, {
    ...data,
    translations: data.site_content_translations,
    images: [],
  });
}

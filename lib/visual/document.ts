import { dictionary } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import type { ContentSnapshot } from "@/lib/supabase/published";
import {
  blockRegistry,
  fieldId,
  layoutSchema,
  newSection,
  visualTextSchema,
  type BlockType,
  type TextField,
  type VisualDocumentData,
  type VisualPage,
  type VisualText,
} from "./schema";

export function fromSnapshot(
  snapshot: ContentSnapshot,
  revision: number,
  id?: string,
): VisualDocumentData | null {
  const layout = layoutSchema.safeParse(snapshot.value?.composition);
  if (!layout.success) return null;
  const read = (locale: Locale) => {
    const row = snapshot.translations.find((t) => t.locale === locale);
    const value = visualTextSchema.safeParse(row?.value ?? {});
    if (!value.success) return {};
    const valid = new Set(
      layout.data.sections.flatMap((section) =>
        blockRegistry[section.type].fields.map((field) =>
          fieldId(section.id, field),
        ),
      ),
    );
    return Object.fromEntries(
      Object.entries(value.data).filter(([key]) => valid.has(key)),
    );
  };
  return {
    layout: layout.data,
    es: read("es"),
    en: read("en"),
    revision,
    id,
    englishReady: snapshot.translations.some(
      (t) => t.locale === "en" && t.translation_status === "complete",
    ),
  };
}

export type LegacyRows = Record<string, ContentSnapshot>;
export function adaptLegacy(
  page: VisualPage,
  rows: LegacyRows,
): VisualDocumentData {
  const sections = [newSection("navigation", "header")];
  const es: VisualText = {},
    en: VisualText = {};
  const get = (key: string, locale: Locale) =>
    rows[key]?.translations.find((t) => t.locale === locale)?.value ?? {};
  const shared = (key: string) => rows[key]?.value ?? {};
  function add(
    type: BlockType,
    id: string,
    key: string,
    fields: Partial<Record<TextField, string>>,
    media: unknown[] = [],
    options: { visible?: boolean; href?: string } = {},
  ) {
    const block = newSection(type, id);
    block.visible = options.visible !== false;
    block.href = options.href ?? "";
    block.media = media
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      )
      .slice(0, blockRegistry[type].photos);
    sections.push(block);
    for (const [field, source] of Object.entries(fields)) {
      for (const [locale, to] of [
        ["es", es],
        ["en", en],
      ] as const) {
        const text = get(key, locale)[source];
        if (typeof text === "string" && text)
          to[fieldId(id, field as TextField)] = text;
      }
    }
  }
  if (page === "home") {
    const hero = shared("home.hero");
    add(
      "hero",
      "legacy-hero",
      "home.hero",
      { title: "title", body: "description" },
      [hero.image_path],
    );
    sections[1].href = "/colecciones";
    for (const [locale, to] of [
      ["es", es],
      ["en", en],
    ] as const)
      to[fieldId("legacy-hero", "button")] =
        dictionary[locale].common.viewCollections;
    if (hero.showroom_main_image_path || hero.showroom_small_image_path)
      add("gallery", "legacy-showroom", "home.hero", {}, [
        hero.showroom_main_image_path,
        hero.showroom_small_image_path,
      ]);
    const key = "home.sections";
    const home = shared(key);
    const group = (prefix: string) => ({
      eyebrow: prefix + "Eyebrow",
      title: prefix + "Title",
      body: prefix + "Description",
    });
    const opts = (group: string, href?: string) => ({
      visible: home.visible?.[group] !== false,
      href,
    });
    add(
      "image-text",
      "legacy-intro",
      key,
      group("intro"),
      [home.introImage],
      opts("intro"),
    );
    add(
      "collections",
      "legacy-collections",
      key,
      group("collections"),
      [],
      opts("collections"),
    );
    add(
      "products",
      "legacy-products",
      key,
      group("featured"),
      [],
      opts("featured"),
    );
    ["One", "Two", "Three"].forEach((word) => {
      if (
        home["lifestyleImage" + word] ||
        get(key, "es")["lifestyleLabel" + word]
      )
        add(
          "gallery",
          "legacy-lifestyle-" + word.toLowerCase(),
          key,
          { title: "lifestyleLabel" + word },
          [home["lifestyleImage" + word]],
          opts("lifestyle"),
        );
    });
    add(
      "about",
      "legacy-philosophy",
      key,
      group("philosophy"),
      [home.philosophyImage],
      opts("philosophy"),
    );
    add(
      "gallery",
      "legacy-projects-photo",
      key,
      {},
      [home.projectsImage],
      opts("projects"),
    );
    add(
      "projects",
      "legacy-projects",
      key,
      group("projects"),
      [],
      opts("projects"),
    );
    add(
      "editorial",
      "legacy-materials",
      key,
      { ...group("materials"), body: "materialsLead" },
      [],
      opts("materials"),
    );
    add(
      "image-text",
      "legacy-material-one",
      key,
      { title: "materialOneTitle", body: "materialOneDescription" },
      [home.materialsPrimaryImage],
      opts("materials"),
    );
    add(
      "image-text",
      "legacy-material-two",
      key,
      { title: "materialTwoTitle", body: "materialTwoDescription" },
      [home.materialsSecondaryImage],
      opts("materials"),
    );
    add(
      "editorial",
      "legacy-benefits",
      key,
      group("benefits"),
      [],
      opts("benefits"),
    );
    for (let i = 1; i <= 4; i++)
      if (
        get(key, "es")["benefit" + i + "Title"] ||
        get(key, "es")["benefit" + i + "Description"]
      )
        add(
          "editorial",
          "legacy-benefit-" + i,
          key,
          {
            title: "benefit" + i + "Title",
            body: "benefit" + i + "Description",
          },
          [],
          opts("benefits"),
        );
    add("editorial", "legacy-faq", key, group("faq"), [], opts("faq"));
    for (let i = 1; i <= 6; i++)
      if (
        get(key, "es")["faq" + i + "Question"] ||
        get(key, "es")["faq" + i + "Answer"]
      )
        add(
          "faq",
          "legacy-faq-" + i,
          key,
          { title: "faq" + i + "Question", body: "faq" + i + "Answer" },
          [],
          opts("faq"),
        );
  } else {
    const key = "page." + page;
    add(
      page === "about" ? "about" : page === "projects" ? "projects" : "contact",
      "legacy-" + page,
      key,
      { eyebrow: "eyebrow", title: "title", body: "description" },
      [shared(key).image_path],
    );
  }
  sections.push(newSection("footer", "footer"));
  return { layout: { schema: 1, sections }, es, en, revision: 0 };
}

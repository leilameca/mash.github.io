import type { Collection, Product, Project } from "@/lib/content";
import type { getNews } from "@/lib/editorial/queries";
import type { MarketingPageContent } from "@/lib/supabase/site-content";
import type { VisualSection } from "./schema";

export type HomeView = {
  collections: Collection[];
  products: Product[];
  projects: Project[];
  news: Awaited<ReturnType<typeof getNews>>;
  contact: MarketingPageContent | null;
};

const originalTypes: Record<string, VisualSection["type"]> = {
  "legacy-intro": "image-text",
  "legacy-collections": "collections",
  "legacy-products": "products",
  "legacy-projects-photo": "gallery",
  "legacy-philosophy": "about",
  "legacy-projects": "projects",
  "legacy-benefits": "editorial",
  "legacy-faq": "editorial",
  "legacy-materials": "editorial",
  "legacy-material-one": "image-text",
  "legacy-material-two": "image-text",
  "legacy-news": "news-list",
};

export function isOriginalHomeSection(section: VisualSection) {
  if (/^legacy-benefit-[1-4]$/.test(section.id)) return section.type === "editorial";
  if (/^legacy-faq-[1-6]$/.test(section.id)) return section.type === "faq";
  return originalTypes[section.id] === section.type;
}

export function homeParent(id: string) {
  if (id === "legacy-projects-photo") return "legacy-collections";
  if (id === "legacy-material-one" || id === "legacy-material-two") return "legacy-materials";
  if (/^legacy-benefit-[1-4]$/.test(id)) return "legacy-benefits";
  if (/^legacy-faq-[1-6]$/.test(id)) return "legacy-faq";
}

export function restoreOriginalHomeOrder(sections: VisualSection[]) {
  const materials = sections.findIndex(({ id }) => id === "legacy-materials");
  if (materials < 0) return sections;
  const end = sections.findIndex(({ id }) => id === "legacy-news");
  if (end <= materials) return sections;
  const segment = sections.slice(materials, end);
  // Recognize the old adapter's exact ordering and leave custom arrangements alone.
  if (!/^legacy-materials,legacy-material-one,legacy-material-two,legacy-benefits(?:,legacy-benefit-[1-4])*,legacy-faq(?:,legacy-faq-[1-6])*$/.test(segment.map(({ id }) => id).join(","))) {
    return sections;
  }
  return [...sections.slice(0, materials), ...segment.slice(3), ...segment.slice(0, 3), ...sections.slice(end)];
}

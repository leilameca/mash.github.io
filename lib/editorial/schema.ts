import { z } from "zod";
import { isHttpsUrl, isInternalPath } from "@/lib/security";

export const editorialKinds = z.enum(["news", "announcement"]);
export type EditorialKind = z.infer<typeof editorialKinds>;
export const localizedHeadline = z.string().trim().min(2).max(200);
export const headline = z.string().trim().max(200);
export const imagePath = z
  .string()
  .max(1000)
  .regex(
    /^\/assets\/images\/[a-zA-Z0-9 _.\/()%-]+$|^(?:https:\/\/[a-zA-Z0-9.-]+|http:\/\/127\.0\.0\.1:\d+)\/storage\/v1\/object\/public\/mash-media\/(?:products|collections|projects|site)\/[a-zA-Z0-9._%-]+$/,
  )
  .refine((path) => !path.includes("..") && !/%(?:2e|2f|5c)/i.test(path));
export const optionalImage = z.union([imagePath, z.literal("")]);
export const urlSlug = z
  .string()
  .min(2)
  .max(90)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const entityIds = z
  .array(z.uuid())
  .max(18)
  .refine((values) => new Set(values).size === values.length);
export const categories = {
  news: "Noticias",
  launches: "Lanzamientos",
  events: "Eventos",
  collaborations: "Colaboraciones",
  business: "Novedades empresariales",
  editorial: "Editorial",
} as const;
export const categoriesEn: Record<keyof typeof categories, string> = {
  news: "News",
  launches: "Launches",
  events: "Events",
  collaborations: "Collaborations",
  business: "Company updates",
  editorial: "Editorial",
};
export const pageTargets = [
  "all",
  "home",
  "projects",
  "news",
  "catalog",
  "about",
  "contact",
] as const;
export const targetLabels: Record<(typeof pageTargets)[number], string> = {
  all: "Todo el sitio",
  home: "Inicio",
  projects: "Proyectos",
  news: "Noticias",
  catalog: "Catálogo",
  about: "Nosotros",
  contact: "Contacto",
};
export const safeLink = z
  .string()
  .max(300)
  .refine(
    (value) =>
      isInternalPath(value) || (isHttpsUrl(value) && !/[\s\\]/.test(value)),
  );
export const textValue = z.string().max(10000);
const photo = z.strictObject({ id: z.uuid(), path: imagePath });
const idList = <T extends z.ZodType<{ id: string }>>(entry: T, max: number) =>
  z
    .array(entry)
    .max(max)
    .refine((items) => new Set(items.map((x) => x.id)).size === items.length);

export const newsData = z.strictObject({
  category: z.enum([
    "news",
    "launches",
    "events",
    "collaborations",
    "business",
    "editorial",
  ]),
  date: z.union([z.iso.date(), z.literal("")]),
  author: z.string().trim().max(100),
  featured: z.boolean(),
  cover: optionalImage,
  gallery: idList(photo, 12),
  blocks: idList(
    z.strictObject({
      id: z.uuid(),
      type: z.enum(["heading", "paragraph", "quote"]),
    }),
    30,
  ),
  products: entityIds,
  projects: entityIds,
  archived: z.boolean(),
});
export const copy = z.record(
  z.string().regex(/^[a-z][a-z0-9_-]{1,65}$/),
  textValue,
);

export const announcementData = z
  .strictObject({
    active: z.boolean(),
    start: z.union([z.iso.datetime(), z.literal("")]),
    end: z.union([z.iso.datetime(), z.literal("")]),
    href: safeLink,
    priority: z.number().int().min(0).max(100),
    pages: z
      .array(z.enum(pageTargets))
      .min(1)
      .max(7)
      .refine(
        (values) =>
          new Set(values).size === values.length &&
          (!values.includes("all") || values.length === 1),
      ),
    language: z.enum(["es", "en", "both"]),
    presentation: z.enum(["bar", "banner"]),
    dismissible: z.boolean(),
    archived: z.boolean(),
  })
  .refine(
    (item) =>
      !item.start || !item.end || Date.parse(item.start) < Date.parse(item.end),
    "La fecha final debe ser posterior al inicio.",
  );
export type NewsData = z.infer<typeof newsData>;
export type Announcement = z.infer<typeof announcementData>;
export type EditorialCopy = z.infer<typeof copy>;
export type EditorialStatus = "draft" | "published" | "pending" | "archived";

export const comparison = z.strictObject({
  before: optionalImage,
  after: optionalImage,
  x: z.number().int().min(0).max(100),
  y: z.number().int().min(0).max(100),
  fit: z.enum(["cover", "contain"]),
});
export type Comparison = z.infer<typeof comparison>;
export const projectEditorial = z.strictObject({
  category: z.string().trim().max(80),
  products: entityIds,
  collections: entityIds,
  comparison,
});
export const projectDetails = z.strictObject({
  excerpt: z.string().trim().max(500).optional(),
  before_label: headline.optional(),
  after_label: headline.optional(),
  before_alt: headline.optional(),
  after_alt: headline.optional(),
});
export type ProjectEditorial = z.infer<typeof projectEditorial>;
export type ProjectDetails = z.infer<typeof projectDetails>;
export const defaultProjectEditorial: ProjectEditorial = {
  category: "",
  products: [],
  collections: [],
  comparison: { before: "", after: "", x: 50, y: 50, fit: "cover" },
};
export const galleryInput = z
  .array(
    z.strictObject({
      path: imagePath,
      alt_es: z.string().max(600),
      caption_es: z.string().max(1700),
    }),
  )
  .max(20)
  .refine(
    (values) => new Set(values.map((item) => item.path)).size === values.length,
  );
export type GalleryPhoto = z.infer<typeof galleryInput>[number];

const zone = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Santo_Domingo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
export function inSantoDomingo(utc: string) {
  if (!utc) return "";
  return zone.format(new Date(utc)).replace(" ", "T");
}
export function fromSantoDomingo(input: string) {
  if (!input) return "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    throw new Error("Fecha no válida.");
  const value = new Date(input + "-04:00");
  if (
    !Number.isFinite(value.getTime()) ||
    inSantoDomingo(value.toISOString()) !== input
  )
    throw new Error("Fecha no válida en Santo Domingo.");
  return value.toISOString();
}
export function withinAnnouncementWindow(
  data: Announcement,
  locale: "es" | "en",
  target: (typeof pageTargets)[number],
  now = Date.now(),
) {
  return (
    data.active &&
    !data.archived &&
    (data.language === "both" || data.language === locale) &&
    (data.pages.includes("all") || data.pages.includes(target)) &&
    (!data.start || Date.parse(data.start) <= now) &&
    (!data.end || now < Date.parse(data.end))
  );
}
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90)
    .replace(/-$/, "");
}

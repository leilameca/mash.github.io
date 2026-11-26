import type { SiteChromeContent } from "@/lib/supabase/site-content";
import type { PublicAnnouncement } from "@/lib/editorial/queries";
import { z } from "zod";

export const pagePaths = {
  home: "",
  about: "/nosotros",
  contact: "/contacto",
  projects: "/proyectos",
} as const;
export const pageLabels = {
  home: "Inicio",
  about: "Nosotros",
  contact: "Contacto",
  projects: "Proyectos",
} as const;
export const pageSchema = z.enum(["home", "about", "contact", "projects"]);
export type VisualPage = z.infer<typeof pageSchema>;
export const visualKey = (page: VisualPage) => "visual." + page;
export const widths = { desktop: 1280, tablet: 768, mobile: 390 } as const;
export type Device = keyof typeof widths;

export const palette = {
  paper: "#f8f6f0",
  white: "#fff",
  ink: "#202a25",
  forest: "#235d43",
  sand: "#ddd2bf",
  stone: "#6e725d",
} as const;
const color = z.enum(["paper", "white", "ink", "forest", "sand", "stone"]);
const design = z.strictObject({
  align: z.enum(["left", "center", "right"]).optional(),
  vertical: z.enum(["start", "center", "end"]).optional(),
  titleSize: z.number().int().min(20).max(88).optional(),
  weight: z
    .union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)])
    .optional(),
  textWidth: z.number().int().min(240).max(1000).optional(),
  textColor: color.optional(),
  background: color.optional(),
  padding: z.number().int().min(0).max(120).optional(),
  margin: z.number().int().min(0).max(100).optional(),
  height: z.number().int().min(0).max(850).optional(),
  ratio: z.enum(["1:1", "4:3", "3:2", "16:9", "3:4"]).optional(),
  fit: z.enum(["cover", "contain"]).optional(),
  x: z.number().int().min(0).max(100).optional(),
  y: z.number().int().min(0).max(100).optional(),
  overlay: color.optional(),
  opacity: z.number().int().min(0).max(85).optional(),
  buttonAlign: z.enum(["left", "center", "right"]).optional(),
  columns: z.number().int().min(1).max(4).optional(),
  gap: z.number().int().min(4).max(64).optional(),
  buttonStyle: z.enum(["solid", "outline", "light"]).optional(),
  hideMedia: z.boolean().optional(),
});
export type Design = z.infer<typeof design>;
export const defaultDesign = {
  align: "left",
  vertical: "center",
  titleSize: 42,
  weight: 500,
  textWidth: 660,
  textColor: "ink",
  background: "paper",
  padding: 50,
  margin: 0,
  height: 0,
  ratio: "3:2",
  fit: "cover",
  x: 50,
  y: 50,
  overlay: "ink",
  opacity: 30,
  buttonAlign: "left",
  columns: 3,
  gap: 20,
  buttonStyle: "solid",
  hideMedia: false,
} as const satisfies Design;
export const responsiveDesign = design.pick({
  align: true,
  titleSize: true,
  padding: true,
  height: true,
  x: true,
  y: true,
  columns: true,
  hideMedia: true,
});
export type ResponsiveDesign = z.infer<typeof responsiveDesign>;

export const blockTypes = [
  "navigation",
  "hero",
  "carousel",
  "banner",
  "editorial",
  "image-text",
  "gallery",
  "photo-grid",
  "collections",
  "products",
  "projects",
  "projects-grid",
  "news-featured",
  "news-list",
  "comparison",
  "announcements",
  "about",
  "cta",
  "contact",
  "spacer",
  "footer",
  "faq",
] as const;
export type BlockType = (typeof blockTypes)[number];
export const textFields = [
  "eyebrow",
  "title",
  "body",
  "button",
  "alt",
  "before",
  "after",
] as const;
export type TextField = (typeof textFields)[number];
export const blockId = z.string().regex(/^[a-z0-9][a-z0-9-]{1,54}$/);
const pathSchema = z
  .string()
  .max(1000)
  .regex(
    /^\/assets\/images\/[a-zA-Z0-9 _.\/()%-]+$|^(?:https:\/\/[a-zA-Z0-9.-]+|http:\/\/127\.0\.0\.1:\d+)\/storage\/v1\/object\/public\/mash-media\/(?:products|collections|projects|site)\/[a-zA-Z0-9._%-]+$/,
  )
  .refine((path) => !path.includes("..") && !/%(?:2e|2f|5c)/i.test(path));
const href = z
  .string()
  .max(150)
  .regex(/^(?:|\/(?!\/)[a-z0-9/_-]*)$/);
const layoutSection = z.strictObject({
  id: blockId,
  type: z.enum(blockTypes),
  visible: z.boolean(),
  media: z.array(pathSchema).max(8),
  entities: z.array(z.uuid()).max(12),
  href,
  design,
  tablet: responsiveDesign,
  mobile: responsiveDesign,
});
export type VisualSection = z.infer<typeof layoutSection>;
export const layoutSchema = z
  .strictObject({
    schema: z.literal(1),
    sections: z.array(layoutSection).min(2).max(60),
  })
  .superRefine((layout, ctx) => {
    const list = layout.sections;
    if (new Set(list.map((block) => block.id)).size !== list.length)
      ctx.addIssue({
        code: "custom",
        message: "Hay identificadores repetidos.",
      });
    if (
      list[0]?.type !== "navigation" ||
      list.at(-1)?.type !== "footer" ||
      list.filter(
        (section) => section.type === "navigation" || section.type === "footer",
      ).length !== 2 ||
      !list[0]?.visible ||
      !list.at(-1)?.visible
    )
      ctx.addIssue({
        code: "custom",
        message:
          "El encabezado y el pie deben permanecer visibles en los extremos.",
      });
    for (const [index, section] of list.entries()) {
      const meta = blockRegistry[section.type];
      if (
        new Set(section.entities).size !== section.entities.length ||
        new Set(section.media).size !== section.media.length ||
        section.media.length > meta.photos ||
        (section.entities.length && !meta.entity) ||
        (section.href && !meta.fields.includes("button")) ||
        Object.keys(section.design).some(
          (key) => !meta.controls.includes(key as keyof Design),
        ) ||
        [...Object.keys(section.tablet), ...Object.keys(section.mobile)].some(
          (key) => !meta.controls.includes(key as keyof Design),
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["sections", index],
          message: "La sección contiene propiedades que no admite.",
        });
    }
  });
export type VisualLayout = z.infer<typeof layoutSchema>;
export const fieldId = (id: string, field: TextField) => id + "__" + field;
export const visualTextSchema = z.record(
  z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]{1,54}__(eyebrow|title|body|button|alt|before|after)$/,
    ),
  z.string().max(10000),
);
export type VisualText = z.infer<typeof visualTextSchema>;
export type VisualDocumentData = {
  layout: VisualLayout;
  page?: VisualPage;
  es: VisualText;
  en: VisualText;
  revision: number;
  id?: string;
  englishReady?: boolean;
  inheritedEnglish?: VisualText;
};
type Meta = {
  label: string;
  representation: string;
  fields: TextField[];
  photos: number;
  controls: (keyof Design)[];
  entity?: "collection" | "product" | "project" | "news" | "announcement";
  protected?: boolean;
  preset?: Design;
};
const typeControls: (keyof Design)[] = [
  "align",
  "vertical",
  "titleSize",
  "weight",
  "textWidth",
  "textColor",
  "background",
  "padding",
  "margin",
  "height",
  "buttonAlign",
  "buttonStyle",
];
const photoControls: (keyof Design)[] = ["ratio", "fit", "x", "y", "hideMedia"];
const gridControls: (keyof Design)[] = ["columns", "gap"];
const heroControls: (keyof Design)[] = [
  ...typeControls,
  ...photoControls,
  "overlay",
  "opacity",
];
const text: TextField[] = ["eyebrow", "title", "body"];
const action: TextField[] = [...text, "button"];
export const blockRegistry: Record<BlockType, Meta> = {
  navigation: {
    label: "Encabezado",
    representation: "nav",
    fields: [],
    photos: 0,
    controls: [],
    protected: true,
  },
  hero: {
    label: "Portada",
    representation: "cover",
    fields: [...action, "alt"],
    photos: 1,
    controls: heroControls,
    preset: {
      height: 520,
      titleSize: 64,
      textColor: "white",
      background: "forest",
      buttonStyle: "light",
    },
  },
  carousel: {
    label: "Portada con carrusel",
    representation: "cover",
    fields: [...action, "alt"],
    photos: 8,
    controls: heroControls,
    preset: {
      height: 520,
      titleSize: 62,
      textColor: "white",
      background: "forest",
      buttonStyle: "light",
    },
  },
  banner: {
    label: "Banner",
    representation: "cover",
    fields: [...action, "alt"],
    photos: 1,
    controls: heroControls,
    preset: {
      height: 250,
      textColor: "white",
      background: "forest",
      buttonStyle: "light",
    },
  },
  editorial: {
    label: "Texto editorial",
    representation: "text",
    fields: text,
    photos: 0,
    controls: typeControls,
  },
  "image-text": {
    label: "Imagen con texto",
    representation: "split",
    fields: [...action, "alt"],
    photos: 1,
    controls: [...typeControls, ...photoControls, ...gridControls],
  },
  gallery: {
    label: "Galería",
    representation: "grid",
    fields: [...text, "alt"],
    photos: 8,
    controls: [...typeControls, ...photoControls, ...gridControls],
  },
  "photo-grid": {
    label: "Cuadrícula de fotos",
    representation: "grid",
    fields: [...text, "alt"],
    photos: 8,
    controls: [...typeControls, ...photoControls, ...gridControls],
    preset: { columns: 4 },
  },
  collections: {
    label: "Colecciones destacadas",
    representation: "grid",
    fields: action,
    photos: 0,
    controls: [...typeControls, ...photoControls, ...gridControls],
    entity: "collection",
  },
  products: {
    label: "Productos destacados",
    representation: "grid",
    fields: action,
    photos: 0,
    controls: [...typeControls, ...photoControls, ...gridControls],
    entity: "product",
  },
  projects: {
    label: "Proyectos destacados",
    representation: "grid",
    fields: action,
    photos: 0,
    controls: [...typeControls, ...photoControls, ...gridControls],
    entity: "project",
  },
  "projects-grid": {
    label: "Cuadrícula de proyectos",
    representation: "grid",
    fields: action,
    photos: 0,
    controls: [...typeControls, ...photoControls, ...gridControls],
    entity: "project",
  },
  "news-featured": {
    label: "Noticias destacadas",
    representation: "grid",
    fields: action,
    photos: 0,
    controls: [...typeControls, ...photoControls, ...gridControls],
    entity: "news",
  },
  "news-list": {
    label: "Listado de noticias",
    representation: "grid",
    fields: action,
    photos: 0,
    controls: [...typeControls, ...photoControls, ...gridControls],
    entity: "news",
  },
  comparison: {
    label: "Antes y después",
    representation: "split",
    fields: [...text, "before", "after", "alt"],
    photos: 2,
    controls: [...typeControls, ...photoControls],
  },
  announcements: {
    label: "Anuncios publicados",
    representation: "space",
    fields: [],
    photos: 0,
    controls: ["background", "margin"],
    entity: "announcement",
  },
  about: {
    label: "Sobre la empresa",
    representation: "split",
    fields: [...action, "alt"],
    photos: 1,
    controls: [...typeControls, ...photoControls, ...gridControls],
  },
  cta: {
    label: "Llamada a la acción",
    representation: "text",
    fields: action,
    photos: 0,
    controls: typeControls,
    preset: {
      align: "center",
      buttonAlign: "center",
      background: "forest",
      textColor: "white",
      buttonStyle: "light",
    },
  },
  contact: {
    label: "Contacto",
    representation: "text",
    fields: action,
    photos: 0,
    controls: typeControls,
  },
  spacer: {
    label: "Separador y espacio",
    representation: "space",
    fields: [],
    photos: 0,
    controls: ["height", "background", "margin"],
  },
  footer: {
    label: "Pie de página",
    representation: "footer",
    fields: [],
    photos: 0,
    controls: [],
    protected: true,
  },
  faq: {
    label: "Preguntas frecuentes",
    representation: "text",
    fields: text,
    photos: 0,
    controls: typeControls,
  },
};

export function newSection(type: BlockType, id: string): VisualSection {
  return {
    id,
    type,
    visible: true,
    media: [],
    entities: [],
    href: "",
    design: { ...blockRegistry[type].preset },
    tablet: {},
    mobile: {},
  };
}
export function effectiveDesign(section: VisualSection, device: Device) {
  return {
    ...defaultDesign,
    ...section.design,
    ...(device === "desktop" ? {} : section[device]),
  };
}
export type VisualItem = {
  id: string;
  kind: "collection" | "product" | "project" | "news" | "announcement";
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  image?: string;
  slug: string;
  featured?: boolean;
  location?: string;
  category?: string;
  announcements?: Partial<Record<"es" | "en", PublicAnnouncement>>;
};
export type VisualChrome = SiteChromeContent;

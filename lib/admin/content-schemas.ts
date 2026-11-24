import { z } from "zod";
import { isHttpsUrl, isInternalPath } from "@/lib/security";

export const emailSchema = z.object({
  email: z.string().trim().email("Escribe un correo valido."),
});

export const codeSchema = emailSchema.extend({
  token: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "El codigo debe tener 8 digitos."),
});

export const productSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .min(2, "El slug es requerido.")
    .regex(/^[a-z0-9-]+$/, "Usa minusculas, numeros y guiones."),
  seo_title_es: z
    .string()
    .trim()
    .max(70, "Usa hasta 70 caracteres.")
    .optional(),
  seo_description_es: z
    .string()
    .trim()
    .max(180, "Usa hasta 180 caracteres.")
    .optional(),
  collection_id: z.string().trim().min(1, "Selecciona una coleccion."),
  name_es: z.string().trim().min(2, "El nombre en espanol es requerido."),
  name_en: z.string().trim().optional(),
  description_es: z
    .string()
    .trim()
    .min(10, "Agrega una descripcion en espanol."),
  description_en: z.string().trim().optional(),
  existing_image_path: z.string().trim().optional(),
  existing_image_paths: z.string().optional(),
  primary_image_path: z.string().trim().optional(),
  materials_es: z.string().trim().optional(),
  dimensions_es: z.string().trim().optional(),
  finishes_es: z.string().trim().optional(),
  care_es: z.string().trim().optional(),
  status: z.enum(["draft", "published", "hidden", "archived"]),
  featured: z.boolean().optional(),
});

export const collectionSchema = z.object({
  seo_title_es: z.string().trim().max(70).optional(),
  seo_description_es: z.string().trim().max(180).optional(),
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .min(2, "El slug es requerido.")
    .regex(/^[a-z0-9-]+$/, "Usa minusculas, numeros y guiones."),
  name_es: z.string().trim().min(2, "El nombre en espanol es requerido."),
  name_en: z.string().trim().optional(),
  description_es: z
    .string()
    .trim()
    .min(10, "Agrega una descripcion en espanol."),
  description_en: z.string().trim().optional(),
  existing_image_path: z.string().trim().optional(),
  status: z.enum(["draft", "published", "hidden", "archived"]),
  featured: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999),
});

export const projectSchema = z.object({
  seo_title_es: z.string().trim().max(70).optional(),
  seo_description_es: z.string().trim().max(180).optional(),
  cover_alt_es: z.string().trim().max(600).optional(),
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .min(2, "El slug es requerido.")
    .regex(/^[a-z0-9-]+$/, "Usa minusculas, numeros y guiones."),
  title_es: z.string().trim().min(2, "El titulo en espanol es requerido."),
  title_en: z.string().trim().optional(),
  description_es: z
    .string()
    .trim()
    .min(10, "Agrega una descripcion en espanol."),
  description_en: z.string().trim().optional(),
  location: z.string().trim().min(2, "Agrega una ubicacion."),
  existing_image_path: z.string().trim().optional(),
  status: z.enum(["draft", "published", "hidden", "archived"]),
  featured: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999),
});

export const homeContentSchema = z.object({
  title_es: z.string().trim().min(10, "Agrega el titulo principal en espanol."),
  description_es: z
    .string()
    .trim()
    .min(20, "Agrega la descripcion principal en espanol."),
  title_en: z
    .string()
    .trim()
    .min(10, "Agrega el titulo principal en ingles.")
    .optional()
    .or(z.literal("")),
  description_en: z
    .string()
    .trim()
    .min(20, "Agrega la descripcion principal en ingles.")
    .optional()
    .or(z.literal("")),
  existing_image_path: z.string().trim().optional(),
  existing_showroom_main_image_path: z.string().trim().optional(),
  existing_showroom_small_image_path: z.string().trim().optional(),
});

export const siteSettingsSchema = z.object({
  full_name: z.string().trim().min(2, "Agrega el nombre completo."),
  phone: z.string().trim().min(7, "Agrega un telefono valido."),
  whatsapp: z.string().refine(isHttpsUrl, "Usa una URL HTTPS válida."),
  instagram: z.string().refine(isHttpsUrl, "Usa una URL HTTPS válida."),
  instagram_handle: z.string().trim().min(2, "Agrega el usuario de Instagram."),
  email: z.string().trim().email("Agrega un correo valido."),
  location_es: z.string().trim().min(2, "Agrega la ubicacion en espanol."),
  location_en: z
    .string()
    .trim()
    .min(2, "Agrega la ubicacion en ingles.")
    .optional()
    .or(z.literal("")),
  footer_cta_es: z.string().trim().min(5),
  footer_cta_en: z.string().trim().min(5).optional().or(z.literal("")),
  footer_description_es: z.string().trim().min(10),
  footer_description_en: z.string().trim().min(10).optional().or(z.literal("")),
  footer_navigation_title_es: z.string().trim().min(2),
  footer_navigation_title_en: z
    .string()
    .trim()
    .min(2)
    .optional()
    .or(z.literal("")),
  footer_legal_title_es: z.string().trim().min(2),
  footer_legal_title_en: z.string().trim().min(2).optional().or(z.literal("")),
  copyright_es: z.string().trim().min(5),
  copyright_en: z.string().trim().min(5).optional().or(z.literal("")),
});

const navigationItemSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  href: z
    .string()
    .trim()
    .refine(isInternalPath, "Usa una ruta interna valida."),
  label_es: z.string().trim().min(1, "Agrega la etiqueta en espanol."),
  label_en: z
    .string()
    .trim()
    .min(1, "Agrega la etiqueta en ingles.")
    .optional()
    .or(z.literal("")),
  visible: z.boolean(),
});

export const navigationSchema = z.object({
  items: z
    .array(navigationItemSchema)
    .min(1, "Agrega al menos un enlace.")
    .max(12),
  quote_label_es: z.string().trim().min(1),
  quote_label_en: z.string().trim().min(1).optional().or(z.literal("")),
  request_quote_label_es: z.string().trim().min(1),
  request_quote_label_en: z.string().trim().min(1).optional().or(z.literal("")),
  menu_label_es: z.string().trim().min(1),
  menu_label_en: z.string().trim().min(1).optional().or(z.literal("")),
  close_label_es: z.string().trim().min(1),
  close_label_en: z.string().trim().min(1).optional().or(z.literal("")),
});

export const marketingPagesSchema = z.object({
  about_eyebrow_es: z.string().trim().min(2),
  about_eyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  about_title_es: z.string().trim().min(5),
  about_title_en: z.string().trim().min(5).optional().or(z.literal("")),
  about_description_es: z.string().trim().min(20),
  about_description_en: z.string().trim().min(20).optional().or(z.literal("")),
  about_existing_image: z.string().trim().optional(),
  contact_eyebrow_es: z.string().trim().min(2),
  contact_eyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  contact_title_es: z.string().trim().min(5),
  contact_title_en: z.string().trim().min(5).optional().or(z.literal("")),
  contact_description_es: z.string().trim().min(20),
  contact_description_en: z
    .string()
    .trim()
    .min(20)
    .optional()
    .or(z.literal("")),
  projects_eyebrow_es: z.string().trim().min(2),
  projects_eyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  projects_title_es: z.string().trim().min(5),
  projects_title_en: z.string().trim().min(5).optional().or(z.literal("")),
  projects_description_es: z.string().trim().min(10),
  projects_description_en: z
    .string()
    .trim()
    .min(10)
    .optional()
    .or(z.literal("")),
});

export const homeSectionsSchema = z.object({
  introEyebrow_es: z.string().trim().min(2),
  introEyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  introTitle_es: z.string().trim().min(5),
  introTitle_en: z.string().trim().min(5).optional().or(z.literal("")),
  collectionsEyebrow_es: z.string().trim().min(2),
  collectionsEyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  collectionsTitle_es: z.string().trim().min(5),
  collectionsTitle_en: z.string().trim().min(5).optional().or(z.literal("")),
  collectionsDescription_es: z.string().trim().min(10),
  collectionsDescription_en: z
    .string()
    .trim()
    .min(10)
    .optional()
    .or(z.literal("")),
  featuredEyebrow_es: z.string().trim().min(2),
  featuredEyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  featuredTitle_es: z.string().trim().min(5),
  featuredTitle_en: z.string().trim().min(5).optional().or(z.literal("")),
  featuredDescription_es: z.string().trim().min(10),
  featuredDescription_en: z
    .string()
    .trim()
    .min(10)
    .optional()
    .or(z.literal("")),
  lifestyleLabelOne_es: z.string().trim().min(2),
  lifestyleLabelOne_en: z.string().trim().min(2).optional().or(z.literal("")),
  lifestyleLabelTwo_es: z.string().trim().min(2),
  lifestyleLabelTwo_en: z.string().trim().min(2).optional().or(z.literal("")),
  lifestyleLabelThree_es: z.string().trim().min(2),
  lifestyleLabelThree_en: z.string().trim().min(2).optional().or(z.literal("")),
  philosophyEyebrow_es: z.string().trim().min(2),
  philosophyEyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  philosophyTitle_es: z.string().trim().min(5),
  philosophyTitle_en: z.string().trim().min(5).optional().or(z.literal("")),
  philosophyDescription_es: z.string().trim().min(10),
  philosophyDescription_en: z
    .string()
    .trim()
    .min(10)
    .optional()
    .or(z.literal("")),
  projectsEyebrow_es: z.string().trim().min(2),
  projectsEyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  projectsTitle_es: z.string().trim().min(5),
  projectsTitle_en: z.string().trim().min(5).optional().or(z.literal("")),
  projectsDescription_es: z.string().trim().min(10),
  projectsDescription_en: z
    .string()
    .trim()
    .min(10)
    .optional()
    .or(z.literal("")),
  materialsEyebrow_es: z.string().trim().min(2),
  materialsEyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  materialsTitle_es: z.string().trim().min(5),
  materialsTitle_en: z.string().trim().min(5).optional().or(z.literal("")),
  materialsLead_es: z.string().trim().min(10),
  materialsLead_en: z.string().trim().min(10).optional().or(z.literal("")),
  materialOneTitle_es: z.string().trim().min(2),
  materialOneTitle_en: z.string().trim().min(2).optional().or(z.literal("")),
  materialOneDescription_es: z.string().trim().min(10),
  materialOneDescription_en: z
    .string()
    .trim()
    .min(10)
    .optional()
    .or(z.literal("")),
  materialTwoTitle_es: z.string().trim().min(2),
  materialTwoTitle_en: z.string().trim().min(2).optional().or(z.literal("")),
  materialTwoDescription_es: z.string().trim().min(10),
  materialTwoDescription_en: z
    .string()
    .trim()
    .min(10)
    .optional()
    .or(z.literal("")),
  benefitsEyebrow_es: z.string().trim().min(2),
  benefitsEyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  benefitsTitle_es: z.string().trim().min(5),
  benefitsTitle_en: z.string().trim().min(5).optional().or(z.literal("")),
  benefitsDescription_es: z.string().trim().min(10),
  benefitsDescription_en: z
    .string()
    .trim()
    .min(10)
    .optional()
    .or(z.literal("")),
  faqEyebrow_es: z.string().trim().min(2),
  faqEyebrow_en: z.string().trim().min(2).optional().or(z.literal("")),
  faqTitle_es: z.string().trim().min(5),
  faqTitle_en: z.string().trim().min(5).optional().or(z.literal("")),
  faqDescription_es: z.string().trim().min(10),
  faqDescription_en: z.string().trim().min(10).optional().or(z.literal("")),
  ...Object.fromEntries(
    [
      ...Array.from({ length: 4 }, (_, index) => [
        `benefit${index + 1}Title`,
        `benefit${index + 1}Description`,
      ]).flat(),
      ...Array.from({ length: 6 }, (_, index) => [
        `faq${index + 1}Question`,
        `faq${index + 1}Answer`,
      ]).flat(),
    ].flatMap((key) =>
      ["es", "en"].map((locale) => [
        `${key}_${locale}`,
        locale === "en"
          ? z.string().trim().min(2).optional().or(z.literal(""))
          : z.string().trim().min(2, "Completa este texto."),
      ]),
    ),
  ),
});

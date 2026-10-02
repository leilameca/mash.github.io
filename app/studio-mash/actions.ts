"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminRoute, getSupabaseSetupIssues } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { getImageFile, removeUploadedImage, uploadImage, validateImage, type MediaFolder } from "@/lib/supabase/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HOME_HERO_IMAGES } from "@/lib/supabase/site-content";

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

const emailSchema = z.object({
  email: z.string().trim().email("Escribe un correo valido.")
});

const codeSchema = emailSchema.extend({
  token: z.string().trim().regex(/^\d{8}$/, "El codigo debe tener 8 digitos.")
});

const productSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(2, "El slug es requerido.").regex(/^[a-z0-9-]+$/, "Usa minusculas, numeros y guiones."),
  collection_id: z.string().trim().min(1, "Selecciona una coleccion."),
  name_es: z.string().trim().min(2, "El nombre en espanol es requerido."),
  name_en: z.string().trim().optional(),
  description_es: z.string().trim().min(10, "Agrega una descripcion en espanol."),
  description_en: z.string().trim().optional(),
  existing_image_path: z.string().trim().optional(),
  existing_image_paths: z.string().optional(),
  primary_image_path: z.string().trim().optional(),
  materials_es: z.string().trim().optional(),
  dimensions_es: z.string().trim().optional(),
  finishes_es: z.string().trim().optional(),
  care_es: z.string().trim().optional(),
  status: z.enum(["draft", "published", "hidden", "archived"]),
  featured: z.boolean().optional()
});

const collectionSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(2, "El slug es requerido.").regex(/^[a-z0-9-]+$/, "Usa minusculas, numeros y guiones."),
  name_es: z.string().trim().min(2, "El nombre en espanol es requerido."),
  name_en: z.string().trim().optional(),
  description_es: z.string().trim().min(10, "Agrega una descripcion en espanol."),
  description_en: z.string().trim().optional(),
  existing_image_path: z.string().trim().optional(),
  status: z.enum(["draft", "published", "hidden", "archived"]),
  featured: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999)
});

const projectSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(2, "El slug es requerido.").regex(/^[a-z0-9-]+$/, "Usa minusculas, numeros y guiones."),
  title_es: z.string().trim().min(2, "El titulo en espanol es requerido."),
  title_en: z.string().trim().optional(),
  description_es: z.string().trim().min(10, "Agrega una descripcion en espanol."),
  description_en: z.string().trim().optional(),
  location: z.string().trim().min(2, "Agrega una ubicacion."),
  existing_image_path: z.string().trim().optional(),
  status: z.enum(["draft", "published", "hidden", "archived"]),
  featured: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999)
});

const homeContentSchema = z.object({
  title_es: z.string().trim().min(10, "Agrega el titulo principal en espanol."),
  description_es: z.string().trim().min(20, "Agrega la descripcion principal en espanol."),
  title_en: z.string().trim().min(10, "Agrega el titulo principal en ingles."),
  description_en: z.string().trim().min(20, "Agrega la descripcion principal en ingles."),
  existing_image_path: z.string().trim().optional(),
  existing_showroom_main_image_path: z.string().trim().optional(),
  existing_showroom_small_image_path: z.string().trim().optional()
});

const siteSettingsSchema = z.object({
  full_name: z.string().trim().min(2, "Agrega el nombre completo."),
  phone: z.string().trim().min(7, "Agrega un telefono valido."),
  whatsapp: z.string().url("Agrega una URL valida de WhatsApp."),
  instagram: z.string().url("Agrega una URL valida de Instagram."),
  instagram_handle: z.string().trim().min(2, "Agrega el usuario de Instagram."),
  email: z.string().trim().email("Agrega un correo valido."),
  location_es: z.string().trim().min(2, "Agrega la ubicacion en espanol."),
  location_en: z.string().trim().min(2, "Agrega la ubicacion en ingles."),
  footer_cta_es: z.string().trim().min(5),
  footer_cta_en: z.string().trim().min(5),
  footer_description_es: z.string().trim().min(10),
  footer_description_en: z.string().trim().min(10),
  footer_navigation_title_es: z.string().trim().min(2),
  footer_navigation_title_en: z.string().trim().min(2),
  footer_legal_title_es: z.string().trim().min(2),
  footer_legal_title_en: z.string().trim().min(2),
  copyright_es: z.string().trim().min(5),
  copyright_en: z.string().trim().min(5)
});

const navigationItemSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/),
  href: z.string().trim().refine((value) => value === "" || /^\/[a-z0-9/_-]*$/.test(value), "Usa una ruta interna valida."),
  label_es: z.string().trim().min(1, "Agrega la etiqueta en espanol."),
  label_en: z.string().trim().min(1, "Agrega la etiqueta en ingles."),
  visible: z.boolean()
});

const navigationSchema = z.object({
  items: z.array(navigationItemSchema).min(1, "Agrega al menos un enlace.").max(12),
  quote_label_es: z.string().trim().min(1),
  quote_label_en: z.string().trim().min(1),
  request_quote_label_es: z.string().trim().min(1),
  request_quote_label_en: z.string().trim().min(1),
  menu_label_es: z.string().trim().min(1),
  menu_label_en: z.string().trim().min(1),
  close_label_es: z.string().trim().min(1),
  close_label_en: z.string().trim().min(1)
});

const marketingPagesSchema = z.object({
  about_eyebrow_es: z.string().trim().min(2),
  about_eyebrow_en: z.string().trim().min(2),
  about_title_es: z.string().trim().min(5),
  about_title_en: z.string().trim().min(5),
  about_description_es: z.string().trim().min(20),
  about_description_en: z.string().trim().min(20),
  about_existing_image: z.string().trim().optional(),
  contact_eyebrow_es: z.string().trim().min(2),
  contact_eyebrow_en: z.string().trim().min(2),
  contact_title_es: z.string().trim().min(5),
  contact_title_en: z.string().trim().min(5),
  contact_description_es: z.string().trim().min(20),
  contact_description_en: z.string().trim().min(20),
  projects_eyebrow_es: z.string().trim().min(2),
  projects_eyebrow_en: z.string().trim().min(2),
  projects_title_es: z.string().trim().min(5),
  projects_title_en: z.string().trim().min(5),
  projects_description_es: z.string().trim().min(10),
  projects_description_en: z.string().trim().min(10)
});

const homeSectionsSchema = z.object({
  introEyebrow_es: z.string().trim().min(2), introEyebrow_en: z.string().trim().min(2),
  introTitle_es: z.string().trim().min(5), introTitle_en: z.string().trim().min(5),
  collectionsEyebrow_es: z.string().trim().min(2), collectionsEyebrow_en: z.string().trim().min(2),
  collectionsTitle_es: z.string().trim().min(5), collectionsTitle_en: z.string().trim().min(5),
  collectionsDescription_es: z.string().trim().min(10), collectionsDescription_en: z.string().trim().min(10),
  featuredEyebrow_es: z.string().trim().min(2), featuredEyebrow_en: z.string().trim().min(2),
  featuredTitle_es: z.string().trim().min(5), featuredTitle_en: z.string().trim().min(5),
  featuredDescription_es: z.string().trim().min(10), featuredDescription_en: z.string().trim().min(10),
  lifestyleLabelOne_es: z.string().trim().min(2), lifestyleLabelOne_en: z.string().trim().min(2),
  lifestyleLabelTwo_es: z.string().trim().min(2), lifestyleLabelTwo_en: z.string().trim().min(2),
  lifestyleLabelThree_es: z.string().trim().min(2), lifestyleLabelThree_en: z.string().trim().min(2),
  philosophyEyebrow_es: z.string().trim().min(2), philosophyEyebrow_en: z.string().trim().min(2),
  philosophyTitle_es: z.string().trim().min(5), philosophyTitle_en: z.string().trim().min(5),
  philosophyDescription_es: z.string().trim().min(10), philosophyDescription_en: z.string().trim().min(10),
  projectsEyebrow_es: z.string().trim().min(2), projectsEyebrow_en: z.string().trim().min(2),
  projectsTitle_es: z.string().trim().min(5), projectsTitle_en: z.string().trim().min(5),
  projectsDescription_es: z.string().trim().min(10), projectsDescription_en: z.string().trim().min(10),
  materialsEyebrow_es: z.string().trim().min(2), materialsEyebrow_en: z.string().trim().min(2),
  materialsTitle_es: z.string().trim().min(5), materialsTitle_en: z.string().trim().min(5),
  materialsLead_es: z.string().trim().min(10), materialsLead_en: z.string().trim().min(10),
  materialOneTitle_es: z.string().trim().min(2), materialOneTitle_en: z.string().trim().min(2),
  materialOneDescription_es: z.string().trim().min(10), materialOneDescription_en: z.string().trim().min(10),
  materialTwoTitle_es: z.string().trim().min(2), materialTwoTitle_en: z.string().trim().min(2),
  materialTwoDescription_es: z.string().trim().min(10), materialTwoDescription_en: z.string().trim().min(10)
  ,benefitsEyebrow_es: z.string().trim().min(2), benefitsEyebrow_en: z.string().trim().min(2)
  ,benefitsTitle_es: z.string().trim().min(5), benefitsTitle_en: z.string().trim().min(5)
  ,benefitsDescription_es: z.string().trim().min(10), benefitsDescription_en: z.string().trim().min(10)
  ,faqEyebrow_es: z.string().trim().min(2), faqEyebrow_en: z.string().trim().min(2)
  ,faqTitle_es: z.string().trim().min(5), faqTitle_en: z.string().trim().min(5)
  ,faqDescription_es: z.string().trim().min(10), faqDescription_en: z.string().trim().min(10)
});

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function flattenErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export async function requestAdminCode(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const setupIssues = getSupabaseSetupIssues();
  if (setupIssues.length > 0) {
    return { ok: false, message: `Faltan variables de entorno: ${setupIssues.join(", ")}.` };
  }

  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const generic = {
    ok: true,
    message: "Si ese correo esta autorizado, enviaremos un codigo de acceso."
  };

  const admin = createSupabaseAdminClient();
  const { data: allowed, error: allowError } = await admin
    .from("admin_users")
    .select("id,email,is_active")
    .eq("email", parsed.data.email)
    .eq("is_active", true)
    .maybeSingle();

  if (allowError) {
    console.error("Admin allowlist lookup failed", allowError);
    return generic;
  }

  if (!allowed) return generic;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase no esta configurado." };

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true
    }
  });

  if (error) {
    console.error("Admin OTP request failed", error);
  }

  return generic;
}

export async function verifyAdminCode(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const setupIssues = getSupabaseSetupIssues();
  if (setupIssues.length > 0) {
    return { ok: false, message: `Faltan variables de entorno: ${setupIssues.join(", ")}.` };
  }

  const parsed = codeSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token")
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase no esta configurado." };

  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email"
  });

  if (error || !data.user?.email) {
    return { ok: false, message: "No pudimos verificar el codigo. Revisa el correo y vuelve a intentarlo." };
  }

  const admin = createSupabaseAdminClient();
  const { data: allowed, error: allowError } = await admin
    .from("admin_users")
    .select("id,email,user_id,is_active")
    .eq("email", data.user.email)
    .eq("is_active", true)
    .maybeSingle();

  if (allowError || !allowed || (allowed.user_id && allowed.user_id !== data.user.id)) {
    await supabase.auth.signOut();
    return { ok: false, message: "Ese correo no tiene acceso administrativo." };
  }

  if (!allowed.user_id) {
    const { data: linked, error: linkError } = await admin
      .from("admin_users")
      .update({ user_id: data.user.id })
      .eq("id", allowed.id)
      .is("user_id", null)
      .select("user_id")
      .maybeSingle();

    if (linkError || !linked || linked.user_id !== data.user.id) {
      await supabase.auth.signOut();
      return { ok: false, message: "No pudimos completar el acceso administrativo." };
    }
  }

  redirect(adminRoute);
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect(`${adminRoute}/login`);
}

export async function upsertProduct(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = productSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    slug: formData.get("slug"),
    collection_id: formData.get("collection_id"),
    name_es: formData.get("name_es"),
    name_en: formData.get("name_en")?.toString() || undefined,
    description_es: formData.get("description_es"),
    description_en: formData.get("description_en")?.toString() || undefined,
    existing_image_path: formData.get("existing_image_path")?.toString() || undefined,
    existing_image_paths: formData.get("existing_image_paths")?.toString() || undefined,
    primary_image_path: formData.get("primary_image_path")?.toString() || undefined,
    materials_es: formData.get("materials_es")?.toString() || undefined,
    dimensions_es: formData.get("dimensions_es")?.toString() || undefined,
    finishes_es: formData.get("finishes_es")?.toString() || undefined,
    care_es: formData.get("care_es")?.toString() || undefined,
    status: formData.get("status"),
    featured: parseBoolean(formData.get("featured"))
  });

  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const admin = createSupabaseAdminClient();
  const imageFiles = formData.getAll("product_images").filter((value): value is File => value instanceof File && value.size > 0);
  const imageErrors = imageFiles.map(validateImage).find(Boolean);
  if (imageErrors) return { ok: false, errors: { hero_image: imageErrors } };
  let existingPaths: string[] = [];
  try {
    const paths: unknown = JSON.parse(parsed.data.existing_image_paths ?? JSON.stringify(parsed.data.existing_image_path ? [parsed.data.existing_image_path] : []));
    if (!Array.isArray(paths) || paths.some((path) => typeof path !== "string" || !path.trim())) throw new Error("Invalid gallery");
    existingPaths = [...new Set(paths as string[])];
  } catch {
    return { ok: false, errors: { hero_image: "La galería no es válida. Recarga la página e intenta de nuevo." } };
  }
  const { data: savedImages, error: savedImagesError } = parsed.data.id
    ? await admin.from("product_images").select("id,storage_path").eq("product_id", parsed.data.id)
    : { data: [], error: null };
  if (savedImagesError) return { ok: false, message: "No pudimos consultar las imágenes del producto. Intenta de nuevo." };
  if (existingPaths.some((path) => !savedImages?.some((image) => image.storage_path === path))) {
    return { ok: false, errors: { hero_image: "Las imágenes del producto cambiaron. Recarga la página e intenta de nuevo." } };
  }
  if (existingPaths.length === 0 && imageFiles.length === 0) {
    return { ok: false, errors: { hero_image: "Selecciona una imagen principal." } };
  }
  const newPrimaryValue = formData.get("primary_new_image_index");
  const newPrimaryIndex = newPrimaryValue === null ? -1 : Number(newPrimaryValue);
  if (newPrimaryValue !== null && (!Number.isInteger(newPrimaryIndex) || newPrimaryIndex < 0 || newPrimaryIndex >= imageFiles.length)) {
    return { ok: false, errors: { hero_image: "Selecciona una imagen principal válida." } };
  }

  const uploaded: Array<Awaited<ReturnType<typeof uploadImage>>> = [];
  try {
    for (const imageFile of imageFiles) uploaded.push(await uploadImage(admin, imageFile, "products"));
  } catch (error) {
    await Promise.all(uploaded.map((item) => removeUploadedImage(admin, item.storagePath)));
    return { ok: false, errors: { hero_image: error instanceof Error ? error.message : "No pudimos subir la imagen." } };
  }

  const payload = {
    slug: parsed.data.slug,
    collection_id: parsed.data.collection_id,
    status: parsed.data.status,
    featured: parsed.data.featured ?? false,
    dimensions: parsed.data.dimensions_es || null,
    finishes: parsed.data.finishes_es ? [parsed.data.finishes_es] : null,
    updated_by: currentAdmin.user_id
  };

  const { data: product, error: productError } = parsed.data.id
    ? await admin.from("products").update(payload).eq("id", parsed.data.id).select("id").single()
    : await admin
        .from("products")
        .insert({ ...payload, created_by: currentAdmin.user_id })
        .select("id")
        .single();

  if (productError || !product) {
    await Promise.all(uploaded.map((item) => removeUploadedImage(admin, item.storagePath)));
    return { ok: false, message: productError?.message ?? "No pudimos guardar el producto." };
  }

  const translations: Array<{
    product_id: string;
    locale: "es" | "en";
    name: string;
    description: string | null;
    materials: string | null;
    care: string | null;
    translation_status: "complete" | "missing" | "needs_review";
  }> = [
    {
      product_id: product.id,
      locale: "es",
      name: parsed.data.name_es,
      description: parsed.data.description_es,
      materials: parsed.data.materials_es ?? null,
      care: parsed.data.care_es ?? null,
      translation_status: "complete"
    }
  ];

  if (parsed.data.name_en || parsed.data.description_en) {
    translations.push({
      product_id: product.id,
      locale: "en",
      name: parsed.data.name_en || parsed.data.name_es,
      description: parsed.data.description_en || null,
      materials: null,
      care: null,
      translation_status: "needs_review"
    });
  }

  const { error: translationError } = await admin.from("product_translations").upsert(translations, {
    onConflict: "product_id,locale"
  });

  if (translationError) {
    await Promise.all(uploaded.map((item) => removeUploadedImage(admin, item.storagePath)));
    return { ok: false, message: translationError.message };
  }

  const uploadedPaths = uploaded.map((item) => item.publicUrl);
  const allPaths = [...new Set([...existingPaths, ...uploadedPaths])];
  const primaryPath = newPrimaryIndex >= 0
    ? uploadedPaths[newPrimaryIndex]
    : parsed.data.primary_image_path && allPaths.includes(parsed.data.primary_image_path)
      ? parsed.data.primary_image_path
      : allPaths[0];
  const { error: imageSaveError } = await admin.from("product_images").upsert(
    allPaths.map((storagePath, index) => ({ product_id: product.id, storage_path: storagePath, alt_es: parsed.data.name_es, sort_order: index, is_primary: storagePath === primaryPath })),
    { onConflict: "product_id,storage_path" }
  );

  if (imageSaveError) {
    await Promise.all(uploaded.map((item) => removeUploadedImage(admin, item.storagePath)));
    return { ok: false, message: imageSaveError.message };
  }

  const removedImageIds = (savedImages ?? []).filter((image) => !allPaths.includes(image.storage_path)).map((image) => image.id);
  if (removedImageIds.length) {
    const { error: imageDeleteError } = await admin.from("product_images").delete().eq("product_id", product.id).in("id", removedImageIds);
    if (imageDeleteError) {
      return { ok: false, message: "El producto se guardó, pero no pudimos eliminar algunas imágenes. Recarga la página e intenta de nuevo." };
    }
  }

  revalidatePath("/");
  revalidatePath("/es");
  revalidatePath("/en");
  revalidatePath(adminRoute);
  revalidatePath(`${adminRoute}/productos`);
  redirect(`${adminRoute}/productos`);
}

export async function updateProductStatus(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const status = formData.get("status")?.toString();
  if (!id || !["draft", "published", "hidden", "archived"].includes(status ?? "")) return;

  const admin = createSupabaseAdminClient();
  await admin.from("products").update({ status }).eq("id", id);
  revalidatePath(`${adminRoute}/productos`);
}

async function saveSiteContentBlock(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string | null,
  key: string,
  value: Record<string, unknown>,
  translations: Array<{ locale: "es" | "en"; value: Record<string, unknown> }>
) {
  const { data: existing } = await admin.from("site_content").select("id").eq("key", key).maybeSingle();
  const { data: content, error } = existing
    ? await admin.from("site_content").update({ value, is_public: true, updated_by: userId }).eq("id", existing.id).select("id").single()
    : await admin
        .from("site_content")
        .insert({ key, value, is_public: true, created_by: userId, updated_by: userId })
        .select("id")
        .single();
  if (error || !content) throw new Error(error?.message ?? `No pudimos guardar ${key}.`);

  const { error: translationError } = await admin.from("site_content_translations").upsert(
    translations.map((translation) => ({ ...translation, site_content_id: content.id })),
    { onConflict: "site_content_id,locale" }
  );
  if (translationError) throw new Error(translationError.message);
  return content.id;
}

export async function upsertCollection(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = collectionSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    slug: formData.get("slug"),
    name_es: formData.get("name_es"),
    name_en: formData.get("name_en")?.toString() || undefined,
    description_es: formData.get("description_es"),
    description_en: formData.get("description_en")?.toString() || undefined,
    existing_image_path: formData.get("existing_image_path")?.toString() || undefined,
    status: formData.get("status"),
    featured: parseBoolean(formData.get("featured")),
    sort_order: formData.get("sort_order") ?? "0"
  });

  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const admin = createSupabaseAdminClient();
  const imageFile = getImageFile(formData, "cover_image");
  const imageError = imageFile ? validateImage(imageFile) : null;
  if (imageError) return { ok: false, errors: { cover_image: imageError } };
  if (!imageFile && !parsed.data.existing_image_path) {
    return { ok: false, errors: { cover_image: "Selecciona una imagen de portada." } };
  }

  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (imageFile) uploaded = await uploadImage(admin, imageFile, "collections");
  } catch (error) {
    return { ok: false, errors: { cover_image: error instanceof Error ? error.message : "No pudimos subir la imagen." } };
  }

  const payload = {
    slug: parsed.data.slug,
    cover_image_path: uploaded?.publicUrl ?? parsed.data.existing_image_path,
    status: parsed.data.status,
    featured: parsed.data.featured ?? false,
    sort_order: parsed.data.sort_order,
    updated_by: currentAdmin.user_id
  };
  const { data: collection, error: collectionError } = parsed.data.id
    ? await admin.from("collections").update(payload).eq("id", parsed.data.id).select("id").single()
    : await admin.from("collections").insert({ ...payload, created_by: currentAdmin.user_id }).select("id").single();

  if (collectionError || !collection) {
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: collectionError?.message ?? "No pudimos guardar la coleccion." };
  }

  const translations = [
    {
      collection_id: collection.id,
      locale: "es",
      name: parsed.data.name_es,
      description: parsed.data.description_es
    },
    {
      collection_id: collection.id,
      locale: "en",
      name: parsed.data.name_en || parsed.data.name_es,
      description: parsed.data.description_en || parsed.data.description_es
    }
  ];
  const { error: translationError } = await admin.from("collection_translations").upsert(translations, {
    onConflict: "collection_id,locale"
  });

  if (translationError) {
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: translationError.message };
  }

  revalidatePath("/es");
  revalidatePath("/en");
  revalidatePath(`${adminRoute}/colecciones`);
  redirect(`${adminRoute}/colecciones`);
}

export async function upsertProject(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = projectSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    slug: formData.get("slug"),
    title_es: formData.get("title_es"),
    title_en: formData.get("title_en")?.toString() || undefined,
    description_es: formData.get("description_es"),
    description_en: formData.get("description_en")?.toString() || undefined,
    location: formData.get("location"),
    existing_image_path: formData.get("existing_image_path")?.toString() || undefined,
    status: formData.get("status"),
    featured: parseBoolean(formData.get("featured")),
    sort_order: formData.get("sort_order") ?? "0"
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const admin = createSupabaseAdminClient();
  const imageFile = getImageFile(formData, "cover_image");
  const imageError = imageFile ? validateImage(imageFile) : null;
  if (imageError) return { ok: false, errors: { cover_image: imageError } };
  if (!imageFile && !parsed.data.existing_image_path) {
    return { ok: false, errors: { cover_image: "Selecciona una imagen de portada." } };
  }

  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (imageFile) uploaded = await uploadImage(admin, imageFile, "projects");
  } catch (error) {
    return { ok: false, errors: { cover_image: error instanceof Error ? error.message : "No pudimos subir la imagen." } };
  }

  const imagePath = uploaded?.publicUrl ?? parsed.data.existing_image_path!;
  const payload = {
    slug: parsed.data.slug,
    cover_image_path: imagePath,
    location: parsed.data.location,
    status: parsed.data.status,
    featured: parsed.data.featured ?? false,
    sort_order: parsed.data.sort_order,
    updated_by: currentAdmin.user_id
  };
  const { data: project, error: projectError } = parsed.data.id
    ? await admin.from("projects").update(payload).eq("id", parsed.data.id).select("id").single()
    : await admin.from("projects").insert({ ...payload, created_by: currentAdmin.user_id }).select("id").single();
  if (projectError || !project) {
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: projectError?.message ?? "No pudimos guardar el proyecto." };
  }

  const { error: translationError } = await admin.from("project_translations").upsert(
    [
      {
        project_id: project.id,
        locale: "es",
        title: parsed.data.title_es,
        description: parsed.data.description_es,
        translation_status: "complete"
      },
      {
        project_id: project.id,
        locale: "en",
        title: parsed.data.title_en || parsed.data.title_es,
        description: parsed.data.description_en || parsed.data.description_es,
        translation_status: parsed.data.title_en && parsed.data.description_en ? "complete" : "needs_review"
      }
    ],
    { onConflict: "project_id,locale" }
  );
  if (translationError) {
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: translationError.message };
  }

  await admin.from("project_images").update({ is_cover: false }).eq("project_id", project.id);
  const { error: imageSaveError } = await admin.from("project_images").upsert(
    {
      project_id: project.id,
      storage_path: imagePath,
      alt_es: parsed.data.title_es,
      alt_en: parsed.data.title_en || parsed.data.title_es,
      sort_order: 0,
      is_cover: true
    },
    { onConflict: "project_id,storage_path" }
  );
  if (imageSaveError) {
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: imageSaveError.message };
  }

  revalidatePath("/es");
  revalidatePath("/en");
  revalidatePath(`${adminRoute}/proyectos`);
  redirect(`${adminRoute}/proyectos`);
}

export async function updateProjectStatus(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const status = formData.get("status")?.toString();
  if (!id || !["draft", "published", "hidden", "archived"].includes(status ?? "")) return;
  const admin = createSupabaseAdminClient();
  await admin.from("projects").update({ status }).eq("id", id);
  revalidatePath("/es");
  revalidatePath("/en");
  revalidatePath(`${adminRoute}/proyectos`);
}

export async function uploadMedia(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const folder = formData.get("folder")?.toString() as MediaFolder | undefined;
  if (!folder || !["products", "collections", "projects", "site"].includes(folder)) {
    return { ok: false, errors: { folder: "Selecciona una carpeta valida." } };
  }

  const image = getImageFile(formData, "image");
  if (!image) return { ok: false, errors: { image: "Selecciona una imagen." } };
  const imageError = validateImage(image);
  if (imageError) return { ok: false, errors: { image: imageError } };

  try {
    const admin = createSupabaseAdminClient();
    await uploadImage(admin, image, folder);
    revalidatePath(`${adminRoute}/multimedia`);
    return { ok: true, message: "Imagen cargada correctamente." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos subir la imagen." };
  }
}

export async function upsertHomeContent(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = homeContentSchema.safeParse({
    title_es: formData.get("title_es"),
    description_es: formData.get("description_es"),
    title_en: formData.get("title_en"),
    description_en: formData.get("description_en"),
    existing_image_path: formData.get("existing_image_path")?.toString() || undefined,
    existing_showroom_main_image_path: formData.get("existing_showroom_main_image_path")?.toString() || undefined,
    existing_showroom_small_image_path: formData.get("existing_showroom_small_image_path")?.toString() || undefined
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin.from("site_content").select("id,value").eq("key", "home.hero").maybeSingle();
  if (existingError) return { ok: false, message: "No pudimos consultar la portada actual. Intenta de nuevo." };
  const imageFields = [
    ["image_path", "hero_image", "existing_image_path"],
    ["showroom_main_image_path", "hero_showroom_main_image", "existing_showroom_main_image_path"],
    ["showroom_small_image_path", "hero_showroom_small_image", "existing_showroom_small_image_path"]
  ] as const;
  const imageErrors: Record<string, string> = {};
  for (const [, field] of imageFields) {
    const file = getImageFile(formData, field);
    const error = file ? validateImage(file) : null;
    if (error) imageErrors[field] = error;
  }
  if (Object.keys(imageErrors).length) return { ok: false, errors: imageErrors };

  const sharedValue = { ...(existing?.value ?? {}) };
  const uploaded: Array<Awaited<ReturnType<typeof uploadImage>>> = [];
  for (const [key, field, existingField] of imageFields) {
    try {
      const file = getImageFile(formData, field);
      const image = file ? await uploadImage(admin, file, "site") : undefined;
      if (image) uploaded.push(image);
      sharedValue[key] = image?.publicUrl ?? sharedValue[key] ?? parsed.data[existingField] ?? HOME_HERO_IMAGES[key];
    } catch (error) {
      await Promise.all(uploaded.map((image) => removeUploadedImage(admin, image.storagePath)));
      return { ok: false, errors: { [field]: error instanceof Error ? error.message : "No pudimos subir la imagen." } };
    }
  }
  const { data: content, error: contentError } = existing
    ? await admin
        .from("site_content")
        .update({ value: sharedValue, is_public: true, updated_by: currentAdmin.user_id })
        .eq("id", existing.id)
        .select("id")
        .single()
    : await admin
        .from("site_content")
        .insert({
          key: "home.hero",
          value: sharedValue,
          is_public: true,
          created_by: currentAdmin.user_id,
          updated_by: currentAdmin.user_id
        })
        .select("id")
        .single();

  if (contentError || !content) {
    await Promise.all(uploaded.map((image) => removeUploadedImage(admin, image.storagePath)));
    return { ok: false, message: contentError?.message ?? "No pudimos guardar el contenido." };
  }

  const { error: translationError } = await admin.from("site_content_translations").upsert(
    [
      { site_content_id: content.id, locale: "es", value: { title: parsed.data.title_es, description: parsed.data.description_es } },
      { site_content_id: content.id, locale: "en", value: { title: parsed.data.title_en, description: parsed.data.description_en } }
    ],
    { onConflict: "site_content_id,locale" }
  );

  if (translationError) {
    return { ok: false, message: translationError.message };
  }

  revalidatePath("/es");
  revalidatePath("/en");
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Contenido del inicio actualizado." };
}

export async function upsertSiteSettings(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = siteSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error), message: "Revisa los campos marcados." };

  const admin = createSupabaseAdminClient();
  try {
    await saveSiteContentBlock(
      admin,
      currentAdmin.user_id,
      "site.settings",
      {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
        instagram: parsed.data.instagram,
        instagram_handle: parsed.data.instagram_handle,
        email: parsed.data.email
      },
      [
        { locale: "es", value: { location: parsed.data.location_es } },
        { locale: "en", value: { location: parsed.data.location_en } }
      ]
    );
    await saveSiteContentBlock(
      admin,
      currentAdmin.user_id,
      "site.footer",
      {},
      [
        {
          locale: "es",
          value: {
            cta: parsed.data.footer_cta_es,
            description: parsed.data.footer_description_es,
            navigation_title: parsed.data.footer_navigation_title_es,
            legal_title: parsed.data.footer_legal_title_es,
            copyright: parsed.data.copyright_es
          }
        },
        {
          locale: "en",
          value: {
            cta: parsed.data.footer_cta_en,
            description: parsed.data.footer_description_en,
            navigation_title: parsed.data.footer_navigation_title_en,
            legal_title: parsed.data.footer_legal_title_en,
            copyright: parsed.data.copyright_en
          }
        }
      ]
    );
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos guardar la configuracion." };
  }

  revalidatePath("/es", "layout");
  revalidatePath("/en", "layout");
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Datos generales y footer actualizados." };
}

export async function upsertNavigation(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  let items: unknown = [];
  try {
    items = JSON.parse(formData.get("items_json")?.toString() ?? "[]");
  } catch {
    return { ok: false, message: "No pudimos leer los enlaces de navegacion." };
  }

  const parsed = navigationSchema.safeParse({
    items,
    quote_label_es: formData.get("quote_label_es"),
    quote_label_en: formData.get("quote_label_en"),
    request_quote_label_es: formData.get("request_quote_label_es"),
    request_quote_label_en: formData.get("request_quote_label_en"),
    menu_label_es: formData.get("menu_label_es"),
    menu_label_en: formData.get("menu_label_en"),
    close_label_es: formData.get("close_label_es"),
    close_label_en: formData.get("close_label_en")
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error), message: "Revisa los enlaces y etiquetas." };

  const admin = createSupabaseAdminClient();
  try {
    await saveSiteContentBlock(
      admin,
      currentAdmin.user_id,
      "site.navigation",
      { items: parsed.data.items.map(({ id, href, visible }) => ({ id, href, visible })) },
      [
        {
          locale: "es",
          value: {
            labels: Object.fromEntries(parsed.data.items.map((item) => [item.id, item.label_es])),
            quote_label: parsed.data.quote_label_es,
            request_quote_label: parsed.data.request_quote_label_es,
            menu_label: parsed.data.menu_label_es,
            close_label: parsed.data.close_label_es
          }
        },
        {
          locale: "en",
          value: {
            labels: Object.fromEntries(parsed.data.items.map((item) => [item.id, item.label_en])),
            quote_label: parsed.data.quote_label_en,
            request_quote_label: parsed.data.request_quote_label_en,
            menu_label: parsed.data.menu_label_en,
            close_label: parsed.data.close_label_en
          }
        }
      ]
    );
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos guardar la navegacion." };
  }

  revalidatePath("/es", "layout");
  revalidatePath("/en", "layout");
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Navegacion actualizada." };
}

export async function upsertMarketingPages(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = marketingPagesSchema.safeParse({
    ...Object.fromEntries(formData),
    about_existing_image: formData.get("about_existing_image")?.toString() || undefined
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error), message: "Revisa los textos de las paginas." };

  const admin = createSupabaseAdminClient();
  const imageFile = getImageFile(formData, "about_image");
  const imageError = imageFile ? validateImage(imageFile) : null;
  if (imageError) return { ok: false, errors: { about_image: imageError } };
  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (imageFile) uploaded = await uploadImage(admin, imageFile, "site");
    await saveSiteContentBlock(
      admin,
      currentAdmin.user_id,
      "page.about",
      { image_path: uploaded?.publicUrl ?? parsed.data.about_existing_image ?? "/assets/images/yascari.jpeg" },
      [
        {
          locale: "es",
          value: {
            eyebrow: parsed.data.about_eyebrow_es,
            title: parsed.data.about_title_es,
            description: parsed.data.about_description_es
          }
        },
        {
          locale: "en",
          value: {
            eyebrow: parsed.data.about_eyebrow_en,
            title: parsed.data.about_title_en,
            description: parsed.data.about_description_en
          }
        }
      ]
    );
    await saveSiteContentBlock(admin, currentAdmin.user_id, "page.contact", {}, [
      {
        locale: "es",
        value: {
          eyebrow: parsed.data.contact_eyebrow_es,
          title: parsed.data.contact_title_es,
          description: parsed.data.contact_description_es
        }
      },
      {
        locale: "en",
        value: {
          eyebrow: parsed.data.contact_eyebrow_en,
          title: parsed.data.contact_title_en,
          description: parsed.data.contact_description_en
        }
      }
    ]);
    await saveSiteContentBlock(admin, currentAdmin.user_id, "page.projects", {}, [
      {
        locale: "es",
        value: {
          eyebrow: parsed.data.projects_eyebrow_es,
          title: parsed.data.projects_title_es,
          description: parsed.data.projects_description_es
        }
      },
      {
        locale: "en",
        value: {
          eyebrow: parsed.data.projects_eyebrow_en,
          title: parsed.data.projects_title_en,
          description: parsed.data.projects_description_en
        }
      }
    ]);
  } catch (error) {
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos guardar las paginas." };
  }

  revalidatePath("/es", "layout");
  revalidatePath("/en", "layout");
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Paginas institucionales actualizadas." };
}

export async function upsertHomeSections(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = homeSectionsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error), message: "Revisa los textos del inicio." };

  const imageFields = [
    ["introImage", "intro_image"],
    ["philosophyImage", "philosophy_image"],
    ["projectsImage", "projects_image"],
    ["materialsPrimaryImage", "materials_primary_image"],
    ["materialsSecondaryImage", "materials_secondary_image"]
  ] as const;
  const selectedImages = imageFields
    .map(([key, field]) => ({ key, field, file: getImageFile(formData, field) }))
    .filter((item): item is typeof item & { file: File } => Boolean(item.file));
  if (selectedImages.length > 1) {
    return { ok: false, message: "Para mantener una subida estable, cambia una imagen por guardado." };
  }
  if (selectedImages[0]) {
    const error = validateImage(selectedImages[0].file);
    if (error) return { ok: false, message: error };
  }

  const images: Record<string, string> = Object.fromEntries(
    imageFields.map(([key]) => [key, formData.get(`existing_${key}`)?.toString() ?? ""])
  );
  const admin = createSupabaseAdminClient();
  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (selectedImages[0]) {
      uploaded = await uploadImage(admin, selectedImages[0].file, "site");
      images[selectedImages[0].key] = uploaded.publicUrl;
    }
    const visible = Object.fromEntries(
      ["intro", "collections", "featured", "lifestyle", "philosophy", "projects", "materials"].map((id) => [
        id,
        parseBoolean(formData.get(`visible_${id}`))
      ])
    );
  const textKeys = [
      "introEyebrow", "introTitle", "collectionsEyebrow", "collectionsTitle", "collectionsDescription",
      "featuredEyebrow", "featuredTitle", "featuredDescription", "lifestyleLabelOne", "lifestyleLabelTwo",
      "lifestyleLabelThree", "philosophyEyebrow", "philosophyTitle", "philosophyDescription", "projectsEyebrow",
      "projectsTitle", "projectsDescription", "materialsEyebrow", "materialsTitle", "materialsLead", "materialOneTitle",
      "materialOneDescription", "materialTwoTitle", "materialTwoDescription", "benefitsEyebrow", "benefitsTitle", "benefitsDescription", "faqEyebrow", "faqTitle", "faqDescription",
      "benefit1Title", "benefit1Description", "benefit2Title", "benefit2Description", "benefit3Title", "benefit3Description", "benefit4Title", "benefit4Description",
      "faq1Question", "faq1Answer", "faq2Question", "faq2Answer", "faq3Question", "faq3Answer", "faq4Question", "faq4Answer", "faq5Question", "faq5Answer", "faq6Question", "faq6Answer"
    ];
    const parsedValues = parsed.data as Record<string, string>;
    const translated = (locale: "es" | "en") =>
      Object.fromEntries(textKeys.map((key) => [key, parsedValues[`${key}_${locale}`]]));
    await saveSiteContentBlock(admin, currentAdmin.user_id, "home.sections", { ...images, visible }, [
      { locale: "es", value: translated("es") },
      { locale: "en", value: translated("en") }
    ]);
  } catch (error) {
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos guardar las secciones del inicio." };
  }

  revalidatePath("/es");
  revalidatePath("/en");
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Secciones del inicio actualizadas." };
}

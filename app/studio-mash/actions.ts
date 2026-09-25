"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminRoute, getSupabaseSetupIssues } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { getImageFile, removeUploadedImage, uploadImage, validateImage, type MediaFolder } from "@/lib/supabase/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

const homeContentSchema = z.object({
  title_es: z.string().trim().min(10, "Agrega el titulo principal en espanol."),
  description_es: z.string().trim().min(20, "Agrega la descripcion principal en espanol."),
  title_en: z.string().trim().min(10, "Agrega el titulo principal en ingles."),
  description_en: z.string().trim().min(20, "Agrega la descripcion principal en ingles."),
  existing_image_path: z.string().trim().optional()
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
    materials_es: formData.get("materials_es")?.toString() || undefined,
    dimensions_es: formData.get("dimensions_es")?.toString() || undefined,
    finishes_es: formData.get("finishes_es")?.toString() || undefined,
    care_es: formData.get("care_es")?.toString() || undefined,
    status: formData.get("status"),
    featured: parseBoolean(formData.get("featured"))
  });

  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const admin = createSupabaseAdminClient();
  const imageFile = getImageFile(formData, "hero_image");
  const imageError = imageFile ? validateImage(imageFile) : null;
  if (imageError) return { ok: false, errors: { hero_image: imageError } };
  if (!imageFile && !parsed.data.existing_image_path) {
    return { ok: false, errors: { hero_image: "Selecciona una imagen principal." } };
  }

  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (imageFile) uploaded = await uploadImage(admin, imageFile, "products");
  } catch (error) {
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
    await removeUploadedImage(admin, uploaded?.storagePath);
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
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: translationError.message };
  }

  const imagePath = uploaded?.publicUrl ?? parsed.data.existing_image_path!;
  await admin.from("product_images").update({ is_primary: false }).eq("product_id", product.id);
  const { error: imageSaveError } = await admin
    .from("product_images")
    .upsert(
      {
        product_id: product.id,
        storage_path: imagePath,
        alt_es: parsed.data.name_es,
        sort_order: 0,
        is_primary: true
      },
      { onConflict: "product_id,storage_path" }
    );

  if (imageSaveError) {
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: imageSaveError.message };
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
    existing_image_path: formData.get("existing_image_path")?.toString() || undefined
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const admin = createSupabaseAdminClient();
  const imageFile = getImageFile(formData, "hero_image");
  const imageError = imageFile ? validateImage(imageFile) : null;
  if (imageError) return { ok: false, errors: { hero_image: imageError } };

  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (imageFile) uploaded = await uploadImage(admin, imageFile, "site");
  } catch (error) {
    return { ok: false, errors: { hero_image: error instanceof Error ? error.message : "No pudimos subir la imagen." } };
  }

  const imagePath = uploaded?.publicUrl ?? parsed.data.existing_image_path ?? "/assets/images/oasis-hero-v2.jpg";
  const { data: existing } = await admin.from("site_content").select("id").eq("key", "home.hero").maybeSingle();
  const { data: content, error: contentError } = existing
    ? await admin
        .from("site_content")
        .update({ value: { image_path: imagePath }, is_public: true, updated_by: currentAdmin.user_id })
        .eq("id", existing.id)
        .select("id")
        .single()
    : await admin
        .from("site_content")
        .insert({
          key: "home.hero",
          value: { image_path: imagePath },
          is_public: true,
          created_by: currentAdmin.user_id,
          updated_by: currentAdmin.user_id
        })
        .select("id")
        .single();

  if (contentError || !content) {
    await removeUploadedImage(admin, uploaded?.storagePath);
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
    await removeUploadedImage(admin, uploaded?.storagePath);
    return { ok: false, message: translationError.message };
  }

  revalidatePath("/es");
  revalidatePath("/en");
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Contenido del inicio actualizado." };
}

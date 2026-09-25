"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminRoute, getSupabaseSetupIssues } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
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
  token: z.string().trim().regex(/^\d{6}$/, "El codigo debe tener 6 digitos.")
});

const productSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(2, "El slug es requerido.").regex(/^[a-z0-9-]+$/, "Usa minusculas, numeros y guiones."),
  collection_id: z.string().trim().min(1, "Selecciona una coleccion."),
  name_es: z.string().trim().min(2, "El nombre en espanol es requerido."),
  name_en: z.string().trim().optional(),
  description_es: z.string().trim().min(10, "Agrega una descripcion en espanol."),
  description_en: z.string().trim().optional(),
  hero_image_path: z.string().trim().min(1, "Agrega una imagen principal."),
  materials_es: z.string().trim().optional(),
  dimensions_es: z.string().trim().optional(),
  finishes_es: z.string().trim().optional(),
  care_es: z.string().trim().optional(),
  status: z.enum(["draft", "published", "hidden", "archived"]),
  featured: z.boolean().optional()
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
    hero_image_path: formData.get("hero_image_path"),
    materials_es: formData.get("materials_es")?.toString() || undefined,
    dimensions_es: formData.get("dimensions_es")?.toString() || undefined,
    finishes_es: formData.get("finishes_es")?.toString() || undefined,
    care_es: formData.get("care_es")?.toString() || undefined,
    status: formData.get("status"),
    featured: parseBoolean(formData.get("featured"))
  });

  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const admin = createSupabaseAdminClient();
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

  if (translationError) return { ok: false, message: translationError.message };

  await admin
    .from("product_images")
    .upsert(
      {
        product_id: product.id,
        storage_path: parsed.data.hero_image_path,
        alt_es: parsed.data.name_es,
        sort_order: 0,
        is_primary: true
      },
      { onConflict: "product_id,storage_path" }
    );

  revalidatePath("/");
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

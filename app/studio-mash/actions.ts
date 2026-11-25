"use server";

import { projectExtras } from "@/lib/editorial/project-commit";
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminRoute, getSupabaseSetupIssues } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  getImageFile,
  isLibraryImage,
  removeUploadedImage,
  uploadImage,
  validateImage,
  type MediaFolder,
} from "@/lib/supabase/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  authenticatedContentClient,
  commitContent,
  expectedVersion,
  saveIntent,
  contentTransaction,
  canCleanupFailedSave,
} from "@/lib/supabase/persistence";
import { persistenceMessage } from "@/lib/supabase/errors";
import {
  emailSchema,
  codeSchema,
  productSchema,
  collectionSchema,
  projectSchema,
  homeContentSchema,
  siteSettingsSchema,
  navigationSchema,
  marketingPagesSchema,
  homeSectionsSchema,
} from "@/lib/admin/content-schemas";

export type ActionState = {
  redirectTo?: string;
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

function revalidatePublicSite() {
  for (const locale of ["es", "en"]) {
    revalidatePath(`/${locale}`, "layout");
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/productos`);
    revalidatePath(`/${locale}/productos/[slug]`, "page");
    revalidatePath(`/${locale}/colecciones`);
    revalidatePath(`/${locale}/colecciones/[slug]`, "page");
    revalidatePath(`/${locale}/proyectos`);
    revalidatePath(`/${locale}/nosotros`);
    revalidatePath(`/${locale}/contacto`);
  }
}

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

export async function requestAdminCode(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const setupIssues = getSupabaseSetupIssues();
  if (setupIssues.length > 0) {
    return {
      ok: false,
      message: `Faltan variables de entorno: ${setupIssues.join(", ")}.`,
    };
  }

  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };

  const generic = {
    ok: true,
    message: "Si ese correo esta autorizado, enviaremos un codigo de acceso.",
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
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("Admin OTP request failed", error);
  }

  return generic;
}

export async function verifyAdminCode(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const setupIssues = getSupabaseSetupIssues();
  if (setupIssues.length > 0) {
    return {
      ok: false,
      message: `Faltan variables de entorno: ${setupIssues.join(", ")}.`,
    };
  }

  const parsed = codeSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase no esta configurado." };

  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error || !data.user?.email) {
    return {
      ok: false,
      message:
        "No pudimos verificar el codigo. Revisa el correo y vuelve a intentarlo.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: allowed, error: allowError } = await admin
    .from("admin_users")
    .select("id,email,user_id,is_active")
    .eq("email", data.user.email)
    .eq("is_active", true)
    .maybeSingle();

  if (
    allowError ||
    !allowed ||
    (allowed.user_id && allowed.user_id !== data.user.id)
  ) {
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
      return {
        ok: false,
        message: "No pudimos completar el acceso administrativo.",
      };
    }
  }

  redirect(adminRoute);
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect(`${adminRoute}/login`);
}

export async function upsertProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = productSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    slug: formData.get("slug"),
    collection_id: formData.get("collection_id"),
    seo_title_es: formData.get("seo_title_es")?.toString(),
    seo_description_es: formData.get("seo_description_es")?.toString(),
    name_es: formData.get("name_es"),
    name_en: formData.get("name_en")?.toString() || undefined,
    description_es: formData.get("description_es"),
    description_en: formData.get("description_en")?.toString() || undefined,
    existing_image_path:
      formData.get("existing_image_path")?.toString() || undefined,
    existing_image_paths:
      formData.get("existing_image_paths")?.toString() || undefined,
    primary_image_path:
      formData.get("primary_image_path")?.toString() || undefined,
    materials_es: formData.get("materials_es")?.toString() || undefined,
    dimensions_es: formData.get("dimensions_es")?.toString() || undefined,
    finishes_es: formData.get("finishes_es")?.toString() || undefined,
    care_es: formData.get("care_es")?.toString() || undefined,
    status: formData.get("status"),
    featured: parseBoolean(formData.get("featured")),
  });

  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };

  let collectionIds: string[] | undefined;
  const memberships = formData.get("collection_ids");
  if (memberships !== null) {
    try {
      const ids: unknown = JSON.parse(String(memberships));
      if (
        !Array.isArray(ids) ||
        ids.length < 1 ||
        ids.length > 20 ||
        ids.some(
          (id) =>
            typeof id !== "string" ||
            !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id),
        ) ||
        new Set(ids).size !== ids.length ||
        !ids.includes(parsed.data.collection_id)
      )
        throw new Error("Invalid memberships");
      collectionIds = ids;
    } catch {
      return {
        ok: false,
        errors: {
          collection_id:
            "Selecciona entre 1 y 20 colecciones y elige la principal.",
        },
      };
    }
  }

  const admin = await authenticatedContentClient();
  const imageFiles = formData
    .getAll("product_images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const imageErrors = imageFiles.map(validateImage).find(Boolean);
  if (imageErrors) return { ok: false, errors: { hero_image: imageErrors } };
  let existingPaths: string[] = [];
  try {
    const paths: unknown = JSON.parse(
      parsed.data.existing_image_paths ??
        JSON.stringify(
          parsed.data.existing_image_path
            ? [parsed.data.existing_image_path]
            : [],
        ),
    );
    if (
      !Array.isArray(paths) ||
      paths.some((path) => typeof path !== "string" || !path.trim())
    )
      throw new Error("Invalid gallery");
    existingPaths = [...new Set(paths as string[])];
  } catch {
    return {
      ok: false,
      errors: {
        hero_image:
          "La galería no es válida. Recarga la página e intenta de nuevo.",
      },
    };
  }
  const { data: savedImages, error: savedImagesError } = parsed.data.id
    ? await admin
        .from("product_images")
        .select("id,storage_path,alt_es,alt_en")
        .eq("product_id", parsed.data.id)
    : { data: [], error: null };
  if (savedImagesError)
    return {
      ok: false,
      message:
        "No pudimos consultar las imágenes del producto. Intenta de nuevo.",
    };
  let libraryPaths: string[] = [];
  try {
    const value = JSON.parse(
      String(formData.get("library_image_paths") || "[]"),
    );
    if (!Array.isArray(value) || value.some((path) => typeof path !== "string"))
      throw new Error();
    libraryPaths = value;
  } catch {
    return {
      ok: false,
      errors: { hero_image: "Selección de biblioteca no válida." },
    };
  }
  if (existingPaths.length + imageFiles.length > 20)
    return {
      ok: false,
      errors: { hero_image: "Usa un máximo de 20 imágenes por producto." },
    };
  const unfamiliar = existingPaths.filter(
    (path) => !savedImages?.some((image) => image.storage_path === path),
  );
  const verified = await Promise.all(
    unfamiliar.map(
      async (path) =>
        libraryPaths.includes(path) && (await isLibraryImage(admin, path)),
    ),
  );
  if (verified.some((valid) => !valid)) {
    return {
      ok: false,
      errors: {
        hero_image:
          "Las imágenes del producto cambiaron. Recarga la página e intenta de nuevo.",
      },
    };
  }
  if (existingPaths.length === 0 && imageFiles.length === 0) {
    return {
      ok: false,
      errors: { hero_image: "Selecciona una imagen principal." },
    };
  }
  const newPrimaryValue = formData.get("primary_new_image_index");
  const newPrimaryIndex =
    newPrimaryValue === null ? -1 : Number(newPrimaryValue);
  if (
    newPrimaryValue !== null &&
    (!Number.isInteger(newPrimaryIndex) ||
      newPrimaryIndex < 0 ||
      newPrimaryIndex >= imageFiles.length)
  ) {
    return {
      ok: false,
      errors: { hero_image: "Selecciona una imagen principal válida." },
    };
  }

  const uploaded: Array<Awaited<ReturnType<typeof uploadImage>>> = [];
  try {
    for (const imageFile of imageFiles)
      uploaded.push(await uploadImage(admin, imageFile, "products"));
  } catch (error) {
    await Promise.all(
      uploaded.map((item) => removeUploadedImage(admin, item.storagePath)),
    );
    return {
      ok: false,
      errors: {
        hero_image:
          error instanceof Error
            ? error.message
            : "No pudimos subir la imagen.",
      },
    };
  }

  const allPaths = [
    ...new Set([...existingPaths, ...uploaded.map((item) => item.publicUrl)]),
  ];
  const primaryPath =
    newPrimaryIndex >= 0
      ? uploaded[newPrimaryIndex].publicUrl
      : allPaths.includes(parsed.data.primary_image_path ?? "")
        ? parsed.data.primary_image_path
        : allPaths[0];
  const translations = [
    {
      locale: "es" as const,
      name: parsed.data.name_es,
      description: parsed.data.description_es,
      materials: parsed.data.materials_es,
      care: parsed.data.care_es,
      ...(parsed.data.seo_title_es !== undefined
        ? { seo_title: parsed.data.seo_title_es || null }
        : {}),
      ...(parsed.data.seo_description_es !== undefined
        ? { seo_description: parsed.data.seo_description_es || null }
        : {}),
    },
  ];
  const en = {
    locale: "en" as const,
    name: parsed.data.name_en,
    description: parsed.data.description_en,
  };
  let suppliedAlts: Record<string, { alt_es?: string; alt_en?: string }> = {};
  try {
    suppliedAlts = JSON.parse(String(formData.get("image_alts") || "{}"));
  } catch {
    return { ok: false, message: "Textos alternativos no válidos." };
  }
  try {
    await commitContent(admin, [
      {
        kind: "product",
        id: parsed.data.id,
        expected_version: expectedVersion(formData),
        intent: saveIntent(formData),
        data: {
          slug: parsed.data.slug,
          collection_id: parsed.data.collection_id,
          featured: parsed.data.featured ?? false,
          dimensions: parsed.data.dimensions_es || null,
          ...(parsed.data.finishes_es
            ? {
                finishes: parsed.data.finishes_es
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              }
            : {}),
        },
        ...(collectionIds ? { collection_ids: collectionIds } : {}),
        translations: [...translations, en],
        images: allPaths.map((path, index) => ({
          storage_path: path,
          sort_order: index,
          is_primary: path === primaryPath,
          ...(suppliedAlts[path] ?? {}),
        })),
      },
    ]);
  } catch (error) {
    if (canCleanupFailedSave(error))
      await Promise.all(
        uploaded.map((item) => removeUploadedImage(admin, item.storagePath)),
      );
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos guardar el producto.",
    };
  }
  revalidatePublicSite();
  revalidatePath(adminRoute);
  revalidatePath(`${adminRoute}/productos`);
  return {
    ok: true,
    message:
      saveIntent(formData) === "publish"
        ? "Versión publicada correctamente."
        : "Cambios guardados. La versión pública se conserva.",
    redirectTo: `${adminRoute}/productos?${saveIntent(formData) === "publish" ? "published=1" : "saved=1"}`,
  };
}

async function changeStatus(
  kind: "product" | "project" | "collection",
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !z.string().uuid().safeParse(id).success ||
    !["draft", "published", "hidden", "archived"].includes(status)
  )
    return { ok: false, message: "Selecciona un contenido y estado válidos." };
  try {
    await commitContent(await authenticatedContentClient(), [
      {
        kind,
        id,
        expected_version: expectedVersion(formData),
        data: {},
        intent:
          status === "published"
            ? "publish"
            : status === "hidden"
              ? "hide"
              : status === "archived"
                ? "archive"
                : "draft",
      },
    ]);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos guardar el estado.",
    };
  }
  revalidatePublicSite();
  revalidatePath(
    `${adminRoute}/${kind === "product" ? "productos" : kind === "collection" ? "colecciones" : "proyectos"}`,
  );
  return { ok: true, message: "Estado guardado." };
}
export async function updateProductStatus(
  _previous: ActionState,
  formData: FormData,
) {
  return changeStatus("product", formData);
}
export async function updateCollectionStatus(
  _previous: ActionState,
  formData: FormData,
) {
  return changeStatus("collection", formData);
}
export async function updateProjectStatus(
  _previous: ActionState,
  formData: FormData,
) {
  return changeStatus("project", formData);
}
export async function deleteProduct(
  _previous: ActionState,
  formData: FormData,
) {
  formData.set("status", "archived");
  return changeStatus("product", formData);
}
export async function duplicateProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, message: "Producto no válido." };
  const client = await authenticatedContentClient();
  const { data: source, error } = await client
    .from("products")
    .select(
      "slug,collection_id,dimensions,finishes,availability,product_translations(locale,name,description,materials,care),product_images(storage_path,alt_es,alt_en,sort_order,is_primary)",
    )
    .eq("id", id)
    .single();
  if (error || !source)
    return { ok: false, message: "No pudimos leer el producto." };
  let result;
  try {
    result = await commitContent(client, [
      {
        kind: "product",
        data: {
          slug: `${source.slug}-copia-${crypto.randomUUID().slice(0, 8)}`,
          collection_id: source.collection_id,
          dimensions: source.dimensions,
          finishes: source.finishes,
          availability: source.availability,
          featured: false,
        },
        translations: source.product_translations,
        images: source.product_images,
        intent: "save",
      },
    ]);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No pudimos crear la copia.",
    };
  }
  revalidatePath(`${adminRoute}/productos`);
  redirect(`${adminRoute}/productos/${result[0].id}`);
}

async function saveSiteContentBlock(
  tx: Awaited<ReturnType<typeof contentTransaction>>,
  _userId: string | null,
  key: string,
  value: Record<string, unknown>,
  translations: Array<{ locale: "es" | "en"; value: Record<string, unknown> }>,
) {
  tx.stageSite(key, value, translations);
}

async function saveCatalogEntry(
  kind: "collection" | "project",
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const values = Object.fromEntries(formData);
  const parsed = (
    kind === "collection" ? collectionSchema : projectSchema
  ).safeParse({
    ...values,
    sort_order: values.sort_order ?? 0,
    featured: parseBoolean(formData.get("featured")),
    id: values.id || undefined,
    name_en: values.name_en || undefined,
    title_en: values.title_en || undefined,
    description_en: values.description_en || undefined,
    existing_image_path: values.existing_image_path || undefined,
  });
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };
  const v = parsed.data as Record<string, any>;
  const client = await authenticatedContentClient();
  const file = getImageFile(formData, "cover_image");
  const invalid = file ? validateImage(file) : null;
  if (invalid) return { ok: false, errors: { cover_image: invalid } };
  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (file)
      uploaded = await uploadImage(
        client,
        file,
        kind === "collection" ? "collections" : "projects",
      );
    const image =
      uploaded?.publicUrl ?? (!v.id ? v.existing_image_path : undefined);
    const extra =
      kind === "project"
        ? await projectExtras(client, formData, v.id, uploaded?.publicUrl)
        : null;
    const data = {
      slug: v.slug,
      featured: v.featured ?? false,
      sort_order: v.sort_order,
      ...(image ? { cover_image_path: image } : {}),
      ...(kind === "project" ? { location: v.location } : {}),
      ...(extra
        ? {
            editorial: extra.editorial,
            project_date: extra.date,
            cover_image_path: extra.cover,
          }
        : {}),
    };
    const title = kind === "collection" ? "name" : "title";
    let projectImages:
      | import("@/lib/supabase/published").ImageRow[]
      | undefined = extra?.images;
    if (
      kind === "project" &&
      !extra &&
      (image || (v.id && v.cover_alt_es !== undefined))
    ) {
      const { data: existingImages, error: readError } = v.id
        ? await client
            .from("project_images")
            .select("storage_path,alt_es,alt_en,sort_order,is_cover")
            .eq("project_id", v.id)
        : { data: [], error: null };
      if (readError) throw new Error("No pudimos consultar la galería actual.");
      const existing = existingImages ?? [];
      if (image) {
        const matched = existing.find((item) => item.storage_path === image);
        projectImages = [
          ...existing
            .filter((item) => item.storage_path !== image)
            .map((item) => ({ ...item, is_cover: false })),
          {
            storage_path: image,
            sort_order: matched?.sort_order ?? existing.length,
            ...(v.cover_alt_es !== undefined
              ? { alt_es: v.cover_alt_es || null }
              : {}),
            ...(matched?.alt_en ? { alt_en: matched.alt_en } : {}),
            is_cover: true,
          },
        ];
      } else if (existing.some((item) => item.is_cover)) {
        projectImages = existing.map((item) =>
          item.is_cover ? { ...item, alt_es: v.cover_alt_es || null } : item,
        );
      }
    }
    await commitContent(client, [
      {
        kind,
        id: v.id,
        expected_version: expectedVersion(formData),
        data,
        translations: [
          {
            locale: "es",
            [title]: v[title + "_es"],
            description: v.description_es,
            ...(extra ? { details: extra.details } : {}),
            ...(v.seo_title_es !== undefined
              ? { seo_title: v.seo_title_es || null }
              : {}),
            ...(v.seo_description_es !== undefined
              ? { seo_description: v.seo_description_es || null }
              : {}),
          },
          {
            locale: "en",
            [title]: v[title + "_en"],
            description: v.description_en,
          },
        ],
        ...(projectImages ? { images: projectImages } : {}),
        intent: saveIntent(formData),
      },
    ]);
  } catch (error) {
    if (canCleanupFailedSave(error))
      await removeUploadedImage(client, uploaded?.storagePath);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No pudimos guardar.",
    };
  }
  revalidatePublicSite();
  revalidatePath(
    `${adminRoute}/${kind === "collection" ? "colecciones" : "proyectos"}`,
  );
  return {
    ok: true,
    message: "Contenido guardado correctamente.",
    redirectTo: `${adminRoute}/${kind === "collection" ? "colecciones" : "proyectos"}`,
  };
}
export async function duplicateProject(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { ok: false, message: "Proyecto no válido." };
  const client = await authenticatedContentClient();
  try {
    const { data, error } = await client
      .from("projects")
      .select(
        "slug,revision,location,project_date,editorial,sort_order,cover_image_path,project_translations(locale,title,description,seo_title,seo_description,details),project_images(storage_path,alt_es,alt_en,caption_es,caption_en,sort_order,is_cover)",
      )
      .eq("id", id)
      .single();
    if (error || !data) throw Error("No pudimos consultar el proyecto.");
    if (Number(data.revision) !== expectedVersion(formData))
      throw Error(
        "El proyecto cambió en otra pestaña. Recarga antes de duplicar.",
      );
    const {
      project_translations,
      project_images,
      slug,
      location,
      project_date,
      editorial,
      sort_order,
      cover_image_path,
    } = data;
    const [draft] = await commitContent(client, [
      {
        kind: "project",
        intent: "save",
        data: {
          location,
          project_date,
          editorial,
          sort_order,
          cover_image_path,
          slug:
            slug.slice(0, 65).replace(/-$/, "") +
            "-copia-" +
            randomUUID().slice(0, 8),
          featured: false,
        },
        translations: project_translations.map(
          ({
            locale,
            title,
            description,
            seo_title,
            seo_description,
            details,
          }) => ({
            locale: locale as "es" | "en",
            title,
            description,
            seo_title,
            seo_description,
            details,
          }),
        ),
        images: project_images.map(
          ({
            storage_path,
            alt_es,
            alt_en,
            caption_es,
            caption_en,
            sort_order,
            is_cover,
          }) => ({
            storage_path,
            alt_es,
            alt_en,
            caption_es,
            caption_en,
            sort_order,
            is_cover,
          }),
        ),
      },
    ]);
    return {
      ok: true,
      message: "Copia guardada como borrador.",
      redirectTo: `${adminRoute}/proyectos/${draft.id}`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos duplicar el proyecto.",
    };
  }
}

export async function upsertCollection(
  _previous: ActionState,
  formData: FormData,
) {
  return saveCatalogEntry("collection", formData);
}
export async function upsertProject(
  _previous: ActionState,
  formData: FormData,
) {
  return saveCatalogEntry("project", formData);
}

export async function uploadMedia(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const folder = formData.get("folder")?.toString() as MediaFolder | undefined;
  if (
    !folder ||
    !["products", "collections", "projects", "site"].includes(folder)
  ) {
    return { ok: false, errors: { folder: "Selecciona una carpeta valida." } };
  }

  const image = getImageFile(formData, "image");
  if (!image) return { ok: false, errors: { image: "Selecciona una imagen." } };
  const imageError = validateImage(image);
  if (imageError) return { ok: false, errors: { image: imageError } };

  try {
    const admin = await authenticatedContentClient();
    await uploadImage(admin, image, folder);
    revalidatePath(`${adminRoute}/multimedia`);
    return { ok: true, message: "Imagen cargada correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No pudimos subir la imagen.",
    };
  }
}

export async function upsertHomeContent(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = homeContentSchema.safeParse({
    ...Object.fromEntries(formData),
  });
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };
  const tx = await contentTransaction(formData);
  const uploaded: Array<Awaited<ReturnType<typeof uploadImage>>> = [];
  try {
    const value: Record<string, unknown> = {};
    for (const [key, field] of [
      ["image_path", "hero_image"],
      ["showroom_main_image_path", "hero_showroom_main_image"],
      ["showroom_small_image_path", "hero_showroom_small_image"],
    ]) {
      const file = getImageFile(formData, field);
      if (!file) continue;
      const invalid = validateImage(file);
      if (invalid) return { ok: false, errors: { [field]: invalid } };
      const image = await uploadImage(tx.client, file, "site");
      uploaded.push(image);
      value[key] = image.publicUrl;
    }
    tx.stageSite("home.hero", value, [
      {
        locale: "es",
        value: {
          title: parsed.data.title_es,
          description: parsed.data.description_es,
        },
      },
      {
        locale: "en",
        value: {
          title: parsed.data.title_en,
          description: parsed.data.description_en,
        },
      },
    ]);
    await tx.commit();
  } catch (error) {
    if (canCleanupFailedSave(error))
      await Promise.all(
        uploaded.map((i) => removeUploadedImage(tx.client, i.storagePath)),
      );
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No pudimos guardar.",
    };
  }
  revalidatePublicSite();
  revalidatePath(`${adminRoute}/contenido`);
  return {
    ok: true,
    message:
      saveIntent(formData) === "publish"
        ? "Contenido publicado."
        : "Borrador guardado. La web pública no cambió.",
  };
}

export async function upsertSiteSettings(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = siteSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      ok: false,
      errors: flattenErrors(parsed.error),
      message: "Revisa los campos marcados.",
    };

  const tx = await contentTransaction(formData);
  const admin = tx.client;
  const settings = parsed.data;
  try {
    await saveSiteContentBlock(
      tx,
      currentAdmin.user_id,
      "site.settings",
      {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
        instagram: parsed.data.instagram,
        instagram_handle: parsed.data.instagram_handle,
        email: parsed.data.email,
        ...(settings.workshop_enabled !== undefined && {
          workshop: {
            visible: settings.workshop_enabled === "on",
            latitude: settings.workshop_latitude,
            longitude: settings.workshop_longitude,
            directions: settings.workshop_directions,
          },
        }),
      },
      [
        { locale: "es", value: {
          location: settings.location_es,
          workshop_name: settings.workshop_name_es,
          workshop_address: settings.workshop_address_es,
          workshop_button: settings.workshop_button_es,
        } },
        { locale: "en", value: {
          location: settings.location_en,
          workshop_name: settings.workshop_name_en,
          workshop_address: settings.workshop_address_en,
          workshop_button: settings.workshop_button_en,
        } },
      ],
    );
    await saveSiteContentBlock(tx, currentAdmin.user_id, "site.footer", {}, [
      {
        locale: "es",
        value: {
          cta: parsed.data.footer_cta_es,
          description: parsed.data.footer_description_es,
          navigation_title: parsed.data.footer_navigation_title_es,
          legal_title: parsed.data.footer_legal_title_es,
          copyright: parsed.data.copyright_es,
        },
      },
      {
        locale: "en",
        value: {
          cta: parsed.data.footer_cta_en,
          description: parsed.data.footer_description_en,
          navigation_title: parsed.data.footer_navigation_title_en,
          legal_title: parsed.data.footer_legal_title_en,
          copyright: parsed.data.copyright_en,
        },
      },
    ]);
    await tx.commit();
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos guardar la configuracion.",
    };
  }

  revalidatePublicSite();
  revalidatePath(`${adminRoute}/contenido`);
  return {
    ok: true,
    message:
      saveIntent(formData) === "publish"
        ? "Datos publicados."
        : "Borrador guardado. La web pública no cambió.",
  };
}

export async function upsertNavigation(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
    close_label_en: formData.get("close_label_en"),
  });
  if (!parsed.success)
    return {
      ok: false,
      errors: flattenErrors(parsed.error),
      message: "Revisa los enlaces y etiquetas.",
    };

  const tx = await contentTransaction(formData);
  const admin = tx.client;
  try {
    await saveSiteContentBlock(
      tx,
      currentAdmin.user_id,
      "site.navigation",
      {
        items: parsed.data.items.map(({ id, href, visible }) => ({
          id,
          href,
          visible,
        })),
      },
      [
        {
          locale: "es",
          value: {
            labels: Object.fromEntries(
              parsed.data.items.map((item) => [item.id, item.label_es]),
            ),
            quote_label: parsed.data.quote_label_es,
            request_quote_label: parsed.data.request_quote_label_es,
            menu_label: parsed.data.menu_label_es,
            close_label: parsed.data.close_label_es,
          },
        },
        {
          locale: "en",
          value: {
            labels: Object.fromEntries(
              parsed.data.items.map((item) => [item.id, item.label_en]),
            ),
            quote_label: parsed.data.quote_label_en,
            request_quote_label: parsed.data.request_quote_label_en,
            menu_label: parsed.data.menu_label_en,
            close_label: parsed.data.close_label_en,
          },
        },
      ],
    );
    await tx.commit();
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos guardar la navegacion.",
    };
  }

  revalidatePublicSite();
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Navegacion actualizada." };
}

export async function upsertMarketingPages(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = marketingPagesSchema.safeParse({
    ...Object.fromEntries(formData),
    about_existing_image:
      formData.get("about_existing_image")?.toString() || undefined,
  });
  if (!parsed.success)
    return {
      ok: false,
      errors: flattenErrors(parsed.error),
      message: "Revisa los textos de las paginas.",
    };

  const tx = await contentTransaction(formData);
  const admin = tx.client;
  const imageFile = getImageFile(formData, "about_image");
  const imageError = imageFile ? validateImage(imageFile) : null;
  if (imageError) return { ok: false, errors: { about_image: imageError } };
  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (imageFile) uploaded = await uploadImage(admin, imageFile, "site");
    await saveSiteContentBlock(
      tx,
      currentAdmin.user_id,
      "page.about",
      uploaded ? { image_path: uploaded.publicUrl } : {},
      [
        {
          locale: "es",
          value: {
            eyebrow: parsed.data.about_eyebrow_es,
            title: parsed.data.about_title_es,
            description: parsed.data.about_description_es,
          },
        },
        {
          locale: "en",
          value: {
            eyebrow: parsed.data.about_eyebrow_en,
            title: parsed.data.about_title_en,
            description: parsed.data.about_description_en,
          },
        },
      ],
    );
    await saveSiteContentBlock(tx, currentAdmin.user_id, "page.contact", {}, [
      {
        locale: "es",
        value: {
          eyebrow: parsed.data.contact_eyebrow_es,
          title: parsed.data.contact_title_es,
          description: parsed.data.contact_description_es,
        },
      },
      {
        locale: "en",
        value: {
          eyebrow: parsed.data.contact_eyebrow_en,
          title: parsed.data.contact_title_en,
          description: parsed.data.contact_description_en,
        },
      },
    ]);
    await saveSiteContentBlock(tx, currentAdmin.user_id, "page.projects", {}, [
      {
        locale: "es",
        value: {
          eyebrow: parsed.data.projects_eyebrow_es,
          title: parsed.data.projects_title_es,
          description: parsed.data.projects_description_es,
        },
      },
      {
        locale: "en",
        value: {
          eyebrow: parsed.data.projects_eyebrow_en,
          title: parsed.data.projects_title_en,
          description: parsed.data.projects_description_en,
        },
      },
    ]);
    await tx.commit();
  } catch (error) {
    if (canCleanupFailedSave(error))
      await removeUploadedImage(admin, uploaded?.storagePath);
    revalidatePath("/es", "layout");
    revalidatePath("/en", "layout");
    revalidatePath(`${adminRoute}/contenido`);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos guardar las paginas.",
    };
  }

  revalidatePublicSite();
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Paginas institucionales actualizadas." };
}

export async function upsertHomeSections(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const parsed = homeSectionsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      ok: false,
      errors: flattenErrors(parsed.error),
      message: "Revisa los textos del inicio.",
    };

  const imageFields = [
    ["introImage", "intro_image"],
    ["lifestyleImageOne", "lifestyle_image_one"],
    ["lifestyleImageTwo", "lifestyle_image_two"],
    ["lifestyleImageThree", "lifestyle_image_three"],
    ["philosophyImage", "philosophy_image"],
    ["projectsImage", "projects_image"],
    ["materialsPrimaryImage", "materials_primary_image"],
    ["materialsSecondaryImage", "materials_secondary_image"],
  ] as const;
  const selectedImages = imageFields
    .map(([key, field]) => ({
      key,
      field,
      file: getImageFile(formData, field),
    }))
    .filter((item): item is typeof item & { file: File } => Boolean(item.file));
  if (selectedImages.length > 1) {
    return {
      ok: false,
      message:
        "Para mantener una subida estable, cambia una imagen por guardado.",
    };
  }
  if (selectedImages[0]) {
    const error = validateImage(selectedImages[0].file);
    if (error) return { ok: false, message: error };
  }

  // Only replace explicitly uploaded images. Hidden URLs may belong to an older
  // version of this form; saveSiteContentBlock preserves the latest stored values.
  const images: Record<string, string> = {};
  const tx = await contentTransaction(formData);
  const admin = tx.client;
  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  try {
    if (selectedImages[0]) {
      uploaded = await uploadImage(admin, selectedImages[0].file, "site");
      images[selectedImages[0].key] = uploaded.publicUrl;
    }
    const visible = Object.fromEntries(
      [
        "intro",
        "collections",
        "featured",
        "lifestyle",
        "philosophy",
        "projects",
        "materials",
        "benefits",
        "faq",
      ].map((id) => [id, parseBoolean(formData.get(`visible_${id}`))]),
    );
    const textKeys = [
      "introEyebrow",
      "introTitle",
      "collectionsEyebrow",
      "collectionsTitle",
      "collectionsDescription",
      "featuredEyebrow",
      "featuredTitle",
      "featuredDescription",
      "lifestyleLabelOne",
      "lifestyleLabelTwo",
      "lifestyleLabelThree",
      "philosophyEyebrow",
      "philosophyTitle",
      "philosophyDescription",
      "projectsEyebrow",
      "projectsTitle",
      "projectsDescription",
      "materialsEyebrow",
      "materialsTitle",
      "materialsLead",
      "materialOneTitle",
      "materialOneDescription",
      "materialTwoTitle",
      "materialTwoDescription",
      "benefitsEyebrow",
      "benefitsTitle",
      "benefitsDescription",
      "faqEyebrow",
      "faqTitle",
      "faqDescription",
      "benefit1Title",
      "benefit1Description",
      "benefit2Title",
      "benefit2Description",
      "benefit3Title",
      "benefit3Description",
      "benefit4Title",
      "benefit4Description",
      "faq1Question",
      "faq1Answer",
      "faq2Question",
      "faq2Answer",
      "faq3Question",
      "faq3Answer",
      "faq4Question",
      "faq4Answer",
      "faq5Question",
      "faq5Answer",
      "faq6Question",
      "faq6Answer",
    ];
    const parsedValues = parsed.data as Record<string, string>;
    const translated = (locale: "es" | "en") =>
      Object.fromEntries(
        textKeys.map((key) => [key, parsedValues[`${key}_${locale}`]]),
      );
    await saveSiteContentBlock(
      tx,
      currentAdmin.user_id,
      "home.sections",
      { ...images, visible },
      [
        { locale: "es", value: translated("es") },
        { locale: "en", value: translated("en") },
      ],
    );
    await tx.commit();
  } catch (error) {
    if (canCleanupFailedSave(error))
      await removeUploadedImage(admin, uploaded?.storagePath);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos guardar las secciones del inicio.",
    };
  }

  revalidatePublicSite();
  revalidatePath(`${adminRoute}/contenido`);
  return { ok: true, message: "Secciones del inicio actualizadas." };
}

export async function restoreRevision(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      kind: z.enum(["product", "collection", "project", "site"]),
      id: z.string().uuid(),
      version: z.coerce.number().int().min(0),
      revision: z.coerce.number().int().min(0),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisión no válida." };
  const client = await authenticatedContentClient();
  const v = parsed.data;
  const { error } = await client.rpc("restore_mash_revision", {
    p_kind: v.kind,
    p_id: v.id,
    p_version: v.version,
    p_expected_version: v.revision,
  });
  if (error) return { ok: false, message: persistenceMessage(error) };
  // Restoration changes only the private working copy. The client loads fresh
  // history after this committed acknowledgement; the live version is untouched.
  return {
    ok: true,
    redirectTo: `${adminRoute}/revisiones?kind=${v.kind}&id=${v.id}&restored=1`,
    message:
      "Revisión recuperada como borrador. Revisa el contenido antes de publicar.",
  };
}

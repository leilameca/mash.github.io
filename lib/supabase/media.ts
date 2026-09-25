import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "mash-media";
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export type MediaFolder = "products" | "collections" | "projects" | "site";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};

export function getImageFile(formData: FormData, field: string) {
  const value = formData.get(field);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

export function validateImage(file: File) {
  if (!imageExtensions[file.type]) {
    return "Usa una imagen JPG, PNG, WebP o AVIF.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen no puede superar 6 MB.";
  }

  return null;
}

function safeBaseName(name: string) {
  return name
    .replace(/\.[^/.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "imagen";
}

export async function uploadImage(admin: SupabaseClient, file: File, folder: MediaFolder) {
  const validationError = validateImage(file);
  if (validationError) throw new Error(validationError);

  const extension = imageExtensions[file.type];
  const storagePath = `${folder}/${Date.now()}-${safeBaseName(file.name)}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(MEDIA_BUCKET).upload(storagePath, bytes, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(`No pudimos subir la imagen: ${error.message}`);

  const { data } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

export async function removeUploadedImage(admin: SupabaseClient, storagePath?: string) {
  if (!storagePath) return;
  await admin.storage.from(MEDIA_BUCKET).remove([storagePath]);
}

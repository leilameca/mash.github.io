import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uploadManagedImage, MediaUploadError } from "@/lib/media/uploads";
export const MEDIA_BUCKET = "mash-media";
export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
export type MediaFolder = "products" | "collections" | "projects" | "site";
export function getImageFile(formData: FormData, field: string) {
  const value = formData.get(field);
  return value instanceof File && value.size ? value : null;
}
// MIME and file extensions are untrusted hints. Content validation is performed
// by Sharp + signature checks in the shared upload pipeline.
export function validateImage(file: File) {
  return file.size > MAX_IMAGE_BYTES
    ? "El original no puede superar 30 MB."
    : null;
}
export async function uploadImage(
  client: SupabaseClient,
  file: File,
  folder: MediaFolder,
) {
  const result = await uploadManagedImage(
    client,
    createSupabaseAdminClient(),
    file,
    folder,
  );
  if (result.state !== "ready") throw new MediaUploadError(result.message, 202);
  const publicUrl =
    (folder === "site"
      ? result.asset.variants.find((v) => v.role === "large")?.public_url
      : undefined) ?? result.asset.url;
  if (!publicUrl)
    throw new MediaUploadError("La carga todavía no está confirmada.", 202);
  return {
    publicUrl,
    storagePath: `asset:${result.asset.id}`,
    assetId: result.asset.id,
  };
}
/** Editorial rollback never deletes reusable assets. Completed uploads remain
 * registered and discoverable as unused library assets; physical files and all
 * historical references stay intact. Partial jobs are handled by upload leases. */
export async function removeUploadedImage(
  _client: SupabaseClient,
  _storagePath?: string,
) {
  return { retained: true };
}
async function localImageExists(value: string) {
  if (
    !value.startsWith("/assets/images/") ||
    value.includes("..") ||
    /%(2e|2f|5c)/i.test(value) ||
    !/(jpe?g|png|webp|avif)$/i.test(value)
  )
    return false;
  const root = await realpath(
    path.resolve(process.cwd(), "public/assets/images"),
  );
  const resolved = await realpath(
    path.resolve(process.cwd(), "public", decodeURIComponent(value.slice(1))),
  );
  if (!resolved.startsWith(root + path.sep)) return false;
  const info = await stat(resolved);
  return info.isFile() && info.size <= MAX_IMAGE_BYTES;
}
export async function isLibraryImage(client: SupabaseClient, value: string) {
  try {
    let { data: asset, error } = await client
      .from("media_assets")
      .select("id,state")
      .eq("canonical_path", value)
      .maybeSingle();
    if (error) return false;
    if (!asset) {
      const variant = await client
        .from("media_variants")
        .select("asset_id")
        .eq("public_url", value)
        .maybeSingle();
      if (variant.error || !variant.data) return false;
      const result = await client
        .from("media_assets")
        .select("id,state")
        .eq("id", variant.data.asset_id)
        .maybeSingle();
      asset = result.data;
      error = result.error;
    }
    if (error || !asset || !["ready", "legacy"].includes(asset.state))
      return false;
    if (value.startsWith("/")) return await localImageExists(value);
    const { data: origin, error: originError } =
      await client.rpc("mash_media_origin");
    const url = new URL(value);
    if (
      originError ||
      !origin ||
      url.origin !== origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return false;
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/public\/mash-media\/(products|collections|projects|site)\/([a-z0-9._%-]+)$/i,
    );
    if (!match || /%(2e|2f|5c)/i.test(value) || value.includes(".."))
      return false;
    if (asset.state === "ready") return true;
    // Legacy objects have no verified processing manifest. Confirm their actual
    // presence before a new reuse; metadata is not invented during migration.
    const { data, error: listError } = await client.storage
      .from(MEDIA_BUCKET)
      .list(match[1], { search: decodeURIComponent(match[2]), limit: 100 });
    return (
      !listError &&
      Boolean(
        data?.some(
          (file) => file.id && file.name === decodeURIComponent(match[2]),
        ),
      )
    );
  } catch {
    return false;
  }
}

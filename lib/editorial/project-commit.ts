import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isLibraryImage } from "@/lib/supabase/media";
import {
  galleryInput,
  imagePath,
  projectDetails,
  projectEditorial,
} from "./schema";

const inputs = z.strictObject({
  editorial: projectEditorial,
  details: projectDetails,
  date: z.union([z.iso.date(), z.literal("")]),
  gallery: galleryInput,
  cover: z.union([imagePath, z.literal("")]),
});
export async function projectExtras(
  client: SupabaseClient,
  form: FormData,
  id?: string,
  uploaded?: string,
) {
  const raw = form.get("project_extras");
  if (raw === null) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(String(raw));
  } catch {
    throw new Error("No pudimos leer los detalles del proyecto.");
  }
  const parsed = inputs.safeParse(payload);
  if (!parsed.success)
    throw new Error(
      "Revisa la categoría, la galería y la fecha del proyecto.",
    );
  const { editorial, details, date, gallery } = parsed.data;
  const [base, saved] = id
    ? await Promise.all([
        client
          .from("projects")
          .select("cover_image_path,editorial")
          .eq("id", id)
          .single(),
        client
          .from("project_images")
          .select("storage_path,alt_es,alt_en,caption_es,caption_en")
          .eq("project_id", id),
      ])
    : [
        { data: null, error: null },
        { data: [], error: null },
      ];
  if (base.error || saved.error)
    throw new Error("No pudimos verificar las fotos del proyecto.");
  const old = base.data?.editorial?.comparison;
  const known = new Set<string>(
    [
      base.data?.cover_image_path,
      old?.before,
      old?.after,
      ...(saved.data ?? []).map((row) => row.storage_path),
      uploaded,
    ].filter(Boolean),
  );
  const paths = [
    ...new Set(
      gallery
        .map((photo) => photo.path)
        .concat([editorial.comparison.before, editorial.comparison.after]),
    ),
  ].filter((p) => p && !known.has(p));
  for (let i = 0; i < paths.length; i += 8)
    if (
      !(
        await Promise.all(
          paths.slice(i, i + 8).map((path) => isLibraryImage(client, path)),
        )
      ).every(Boolean)
    )
      throw new Error("Selecciona fotografías verificadas desde Multimedia.");
  const cover = uploaded || parsed.data.cover || gallery[0]?.path;
  if (!cover) throw new Error("Selecciona una portada para el proyecto.");
  const photos = uploaded
    ? [
        {
          path: uploaded,
          alt_es: String(form.get("cover_alt_es") || ""),
          caption_es: "",
        },
        ...gallery.filter((p) => p.path !== uploaded),
      ].slice(0, 20)
    : gallery;
  if (!photos.some((photo) => photo.path === cover))
    throw new Error("La portada debe formar parte de la galería.");
  const images = photos.map((photo, sort_order) => {
    const existing = saved.data?.find((row) => row.storage_path === photo.path);
    return {
      storage_path: photo.path,
      alt_es: photo.alt_es,
      caption_es: photo.caption_es,
      alt_en: existing?.alt_en ?? null,
      caption_en: existing?.caption_en ?? null,
      sort_order,
      is_cover: photo.path === cover,
    };
  });
  return { editorial, details, images, date: date || null, cover };
}

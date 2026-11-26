import type { SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_FIELDS, type MediaAsset } from "./types";
export type MediaQuery = {
  q?: string;
  folder?: string;
  type?: string;
  from?: string;
  to?: string;
  usage?: string;
  state?: string;
  page?: string;
};
export async function mediaLibrary(
  client: SupabaseClient,
  query: MediaQuery = {},
) {
  const page = Number.isFinite(Number(query.page))
    ? Math.min(10000, Math.max(1, Math.floor(Number(query.page) || 1)))
    : 1;
  let request = client
    .from("media_library")
    .select(MEDIA_FIELDS, { count: "exact" });
  if (query.q)
    request = request.ilike(
      "name",
      `%${query.q.slice(0, 80).replace(/[\\%_]/g, "\\$&")}%`,
    );
  if (
    ["products", "collections", "projects", "site"].includes(query.folder ?? "")
  )
    request = request.eq("folder", query.folder!);
  if (
    ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
      query.type ?? "",
    )
  )
    request = request.eq("mime", query.type!);
  if (["processing", "failed", "archived"].includes(query.state ?? ""))
    request = request.eq("state", query.state!);
  else request = request.in("state", ["ready", "legacy"]);
  if (query.usage === "used") request = request.gt("usage_count", 0);
  if (query.usage === "unused") request = request.eq("usage_count", 0);
  if (query.usage === "historical") request = request.gt("historical_uses", 0);
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.from ?? ""))
    request = request.gte("created_at", query.from + "T00:00:00-04:00");
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.to ?? ""))
    request = request.lte("created_at", query.to + "T23:59:59.999-04:00");
  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 24, page * 24 - 1);
  if (error || !data || count === null)
    throw new Error("No pudimos consultar la biblioteca multimedia.");
  return {
    items: data as MediaAsset[],
    total: count,
    page,
    pageSize: 24,
    more: page * 24 < count,
  };
}
export async function mediaDetails(client: SupabaseClient, id: string) {
  const [
    { data: asset, error },
    { data: references, error: referenceError },
    { data: entries, error: entryError },
  ] = await Promise.all([
    client
      .from("media_library")
      .select(MEDIA_FIELDS)
      .eq("id", id)
      .maybeSingle(),
    client
      .from("media_asset_references")
      .select("entity_kind,entity_id,source,version")
      .eq("asset_id", id)
      .order("source")
      .order("version", { ascending: false }),
    client.from("studio_entries").select("id,kind,name"),
  ]);
  if (error || referenceError || entryError)
    throw new Error("No pudimos consultar los usos de esta imagen.");
  return {
    asset: asset as MediaAsset | null,
    references: (references ?? []).map((ref) => ({
      ...ref,
      name:
        entries?.find(
          (e) => e.id === ref.entity_id && e.kind === ref.entity_kind,
        )?.name ?? "Contenido anterior",
    })),
  };
}

export function safeMediaUrl(
  value: string | null | undefined,
  origin: string | null,
) {
  if (!value) return null;
  if (
    value.startsWith("/assets/images/") &&
    !value.includes("..") &&
    !/%(2e|2f|5c)/i.test(value)
  )
    return value;
  try {
    const url = new URL(value);
    return origin &&
      url.origin === origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /^\/storage\/v1\/object\/public\/mash-media\/(products|collections|projects|site)\/[a-z0-9._%-]+$/i.test(
        url.pathname,
      ) &&
      !value.includes("..") &&
      !/%(2e|2f|5c)/i.test(value)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function safeAsset(
  asset: MediaAsset,
  origin: string | null,
): MediaAsset {
  return {
    ...asset,
    url: safeMediaUrl(asset.url, origin),
    thumbnail_url: safeMediaUrl(asset.thumbnail_url, origin),
    variants: asset.variants.filter((v) => safeMediaUrl(v.public_url, origin)),
  };
}

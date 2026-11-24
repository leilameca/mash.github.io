import { authenticatedContentClient } from "@/lib/supabase/persistence";
import type { StudioEntry, StudioKind } from "./presentation";
export type ListQuery = {
  saved?: string;
  published?: string;
  q?: string;
  state?: string;
  work?: string;
  sort?: string;
  page?: string;
  view?: string;
  collection?: string;
};
export async function studioEntries(kind?: StudioKind, query: ListQuery = {}) {
  const client = await authenticatedContentClient();
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const size = 20;
  let request = client.from("studio_entries").select("*", { count: "exact" });
  if (kind) request = request.eq("kind", kind);
  if (query.q)
    request = request.ilike(
      "name",
      `%${query.q
        .trim()
        .replace(/[\\%_]/g, "\\$&")
        .slice(0, 80)}%`,
    );
  if (
    ["published", "pending", "never", "hidden", "archived"].includes(
      query.state ?? "",
    )
  )
    request = request.eq("publication_state", query.state!);
  if (["draft", "published", "hidden", "archived"].includes(query.work ?? ""))
    request = request.eq("work_status", query.work!);
  if (query.collection) request = request.eq("collection", query.collection);
  request = request
    .order(query.sort === "name" ? "name" : "updated_at", {
      ascending: query.sort === "name" || query.sort === "oldest",
    })
    .order("id")
    .range((page - 1) * size, page * size - 1);
  const { data, error, count } = await request;
  if (error || !data || count === null)
    throw new Error("No pudimos consultar el listado. Intenta de nuevo.");
  return { entries: data as StudioEntry[], total: count, page, pageSize: size };
}
export async function studioOverview() {
  const client = await authenticatedContentClient();
  const [{ data: summary, error }, { data: activity, error: historyError }] =
    await Promise.all([
      client.from("studio_summary").select("*"),
      client
        .from("content_revisions")
        .select("entity_kind,entity_id,version,created_at,created_by,snapshot")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
  if (error || historyError || !summary || !activity)
    throw new Error("No pudimos consultar el resumen del Studio.");
  const { data: authors, error: authorError } = await client
    .from("admin_users")
    .select("user_id,full_name,email");
  if (authorError)
    throw new Error("No pudimos consultar la actividad del Studio.");
  return {
    summary: summary as Array<{
      kind: StudioKind;
      total: number;
      live_published: number;
      work_draft: number;
      hidden: number;
      archived: number;
      pending: number;
      translations_pending: number;
    }>,
    activity: activity.map((r) => ({
      ...r,
      author: r.created_by
        ? authors?.find((a) => a.user_id === r.created_by)?.full_name ||
          authors?.find((a) => a.user_id === r.created_by)?.email ||
          "Autor no registrado"
        : "Autor no registrado",
    })),
  };
}

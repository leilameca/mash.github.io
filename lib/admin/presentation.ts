export type StudioKind = "product" | "collection" | "project" | "site";
export type StudioEntry = {
  id: string;
  kind: StudioKind;
  name: string;
  slug: string;
  image?: string;
  collection?: string;
  work_status: string;
  publication_state: string;
  live_status?: string;
  published_slug?: string;
  revision: number;
  published_version?: number;
  updated_at: string;
  translation_pending: boolean;
};
export const kindLabels: Record<StudioKind, string> = {
  product: "Producto",
  collection: "Colección",
  project: "Proyecto",
  site: "Sitio web",
};
export const modulePaths: Record<StudioKind, string> = {
  product: "productos",
  collection: "colecciones",
  project: "proyectos",
  site: "contenido",
};
export const stateLabels: Record<string, string> = {
  published: "Publicado",
  pending: "Publicado · cambios pendientes",
  never: "Borrador nunca publicado",
  hidden: "Oculto",
  archived: "Archivado",
};
export function publicationState(
  work: string,
  revision: number,
  live?: { status: string; version: number } | null,
) {
  if (live?.status === "published")
    return live.version === revision ? "published" : "pending";
  if (work === "archived" || live?.status === "archived") return "archived";
  if (work === "hidden" || live?.status === "hidden") return "hidden";
  return "never";
}
export function studioDate(value: string) {
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeZone: "America/Santo_Domingo",
  }).format(new Date(value));
}
export function entryHref(entry: Pick<StudioEntry, "kind" | "id">) {
  return entry.kind === "site"
    ? "/studio-mash/contenido"
    : `/studio-mash/${modulePaths[entry.kind]}/${entry.id}`;
}
export function relevantDiff(
  previous: unknown,
  current: unknown,
  prefix = "",
): Array<{ field: string; before: string; after: string }> {
  const omit = new Set([
    "id",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "revision",
    "published_at",
    "product_id",
    "collection_id",
    "project_id",
    "site_content_id",
  ]);
  if (JSON.stringify(previous) === JSON.stringify(current)) return [];
  if (
    previous &&
    current &&
    typeof previous === "object" &&
    typeof current === "object" &&
    !Array.isArray(previous) &&
    !Array.isArray(current)
  ) {
    const a = previous as Record<string, unknown>,
      b = current as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .filter((k) => !omit.has(k))
      .flatMap((k) => relevantDiff(a[k], b[k], prefix ? `${prefix}.${k}` : k));
  }
  const display = (v: unknown) =>
    v === undefined
      ? "No presente"
      : typeof v === "string"
        ? v
        : (JSON.stringify(v) ?? "No presente");
  return [
    {
      field: prefix || "contenido",
      before: display(previous),
      after: display(current),
    },
  ];
}

export type MediaVariant = {
  role: "thumbnail" | "catalog" | "gallery" | "large";
  public_url: string;
  storage_path: string;
  width: number;
  height: number;
  byte_size: number;
  mime: string;
};
export type MediaAsset = {
  id: string;
  name: string;
  folder: string;
  state: "legacy" | "processing" | "ready" | "failed" | "archived";
  revision: number;
  url: string | null;
  thumbnail_url: string | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  created_at: string;
  usage_count: number;
  working_uses: number;
  historical_uses: number;
  publication_uses: number;
  variants: MediaVariant[];
};
export type MediaReference = {
  entity_kind: string;
  entity_id: string;
  source: string;
  version: number;
  name?: string;
};
export const MEDIA_FIELDS =
  "id,name,folder,state,revision,url,thumbnail_url,mime,width,height,byte_size,created_at,usage_count,working_uses,historical_uses,publication_uses,variants";
export function mediaSize(bytes: number | null | undefined) {
  if (!bytes) return "Peso sin inspeccionar";
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export const folderLabels: Record<string, string> = {
  products: "Productos",
  collections: "Colecciones",
  projects: "Proyectos",
  site: "Sitio web",
};

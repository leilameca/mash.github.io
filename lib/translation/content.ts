import { createHash } from "node:crypto";
import type { ContentKind, ContentSnapshot } from "@/lib/supabase/published";

export type FieldPath = string[];
type Field = { path: FieldPath; es: string; en: string; copy?: boolean };
export type FieldRecord = Record<
  string,
  { hash: string; text: string; manual?: boolean }
>;
const fields = [
  "name",
  "title",
  "description",
  "materials",
  "care",
  "seo_title",
  "seo_description",
] as const;
const technical =
  /(?:^|_)(?:url|href|path|id|email|phone|whatsapp|slug|image|handle)(?:$|_)/i;

export function translationFields(
  kind: ContentKind,
  snapshot: ContentSnapshot,
): Field[] {
  const es = snapshot.translations.find((t) => t.locale === "es");
  const en = snapshot.translations.find((t) => t.locale === "en");
  const result: Field[] = [];
  const add = (
    path: string[],
    source: unknown,
    target: unknown,
    copy = false,
  ) => {
    if (typeof source !== "string" || !source.trim()) return;
    result.push({
      path,
      es: source,
      en: typeof target === "string" ? target : "",
      copy,
    });
  };
  if (kind === "site") {
    const composition = snapshot.value?.composition;
    const visualIds = Array.isArray(composition?.sections)
      ? new Set(
          composition.sections.map((section: { id: string }) => section.id),
        )
      : null;
    for (const [key, value] of Object.entries(es?.value ?? {})) {
      if (visualIds && !visualIds.has(key.split("__")[0])) continue;
      if (technical.test(key) || /(?:image|href|url|path)$/i.test(key))
        continue;
      if (key === "labels" && value && typeof value === "object") {
        for (const [id, text] of Object.entries(value))
          add(["value", "labels", id], text, en?.value?.labels?.[id]);
      } else {
        add(["value", key], value, en?.value?.[key], key === "copyright");
      }
    }
  } else {
    for (const key of fields) {
      add([key], es?.[key], en?.[key], key === "name");
    }
    for (const image of snapshot.images)
      add(["alts", image.storage_path], image.alt_es, image.alt_en);
  }
  return result;
}
export const fieldKey = (path: FieldPath) => JSON.stringify(path);
export const hashText = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export function packFields(
  changes: { path: FieldPath; text: string }[],
  snapshot: ContentSnapshot,
) {
  const text: Record<string, unknown> = {};
  const alts: Record<string, string> = Object.create(null);
  const values: Record<string, unknown> = Object.create(null);
  const labels: Record<string, string> = Object.create(null);
  for (const { path, text: value } of changes) {
    if (path[0] === "alts") alts[path[1]] = value;
    else if (path[0] !== "value") text[path[0]] = value;
    else if (path[1] === "labels") labels[path[2]] = value;
    else values[path[1]] = value;
  }
  if (Object.keys(labels).length) {
    const existing = snapshot.translations.find((t) => t.locale === "en")?.value
      ?.labels;
    values.labels = { ...existing, ...labels };
  }
  if (Object.keys(values).length) text.value = values;
  return { text, alts };
}

export function selectFields(
  all: Field[],
  previous: FieldRecord,
  regenerate: boolean,
) {
  return all.filter(({ path, es, en }) => {
    const prior = previous[fieldKey(path)];
    if (!en.trim()) return true;
    if (!prior || prior.manual || prior.text !== en) return false;
    return regenerate || prior.hash !== hashText(es);
  });
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeXml = (s: string) =>
  s.replace(
    /&(amp|lt|gt|quot|apos);/g,
    (_, tag: string) =>
      (
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }) as Record<
          string,
          string
        >
      )[tag],
  );

export function protectText(source: string, terms: string[]) {
  const escaped = [...new Set(["MASH", ...terms])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((text) => text.replace(/[.*+?^$${}()|[\]\\]/g, "\\$&"));
  const literal = new RegExp(
    `https?://[^\\s<>]+|[\\w.+-]+@[\\w.-]+\\.[a-z]{2,}|(?:\\+?\\d[\\d .()-]{6,}\\d)|(?<![\\p{L}\\p{N}])(?:${escaped.join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  const saved: string[] = [];
  let position = 0;
  let marked = "<text>";
  for (const match of source.matchAll(literal)) {
    marked +=
      escapeXml(source.slice(position, match.index)) +
      `<keep>${saved.length}</keep>`;
    saved.push(match[0]);
    position = match.index + match[0].length;
  }
  marked += escapeXml(source.slice(position)) + "</text>";
  return {
    marked,
    restore(output: string) {
      const wrapped = /^\s*<text>([\s\S]*)<\/text>\s*$/.exec(output);
      if (!wrapped) throw new Error("invalid_response");
      const chunks = wrapped[1].split(/<keep>(\d+)<\/keep>/g);
      const used = new Set<number>();
      const value = chunks
        .map((chunk, index) => {
          if (index % 2 === 0) {
            if (/[<>]/.test(chunk)) throw new Error("invalid_response");
            return unescapeXml(chunk);
          }
          const id = Number(chunk);
          if (used.has(id) || !Object.hasOwn(saved, id))
            throw new Error("invalid_response");
          used.add(id);
          return saved[id];
        })
        .join("")
        .trim();
      if (
        used.size !== saved.length ||
        !value ||
        value.length > Math.max(600, source.length * 4)
      )
        throw new Error("invalid_response");
      return value;
    },
  };
}

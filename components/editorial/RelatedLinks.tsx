import Link from "next/link";
import { localizedPath, type Locale } from "@/lib/i18n";
import {
  localizedTranslation,
  type Publication,
} from "@/lib/supabase/published";
export function RelatedLinks({
  locale,
  groups,
}: {
  locale: Locale;
  groups: {
    label: string;
    prefix: string;
    rows: Publication[];
    ids: string[];
  }[];
}) {
  const result = groups
    .map((group) => ({
      ...group,
      rows: group.ids.flatMap(
        (id) => group.rows.find((row) => row.entity_id === id) ?? [],
      ),
    }))
    .filter((group) => group.rows.length);
  return result.length ? (
    <aside
      className="editorial-related-links"
      aria-label={locale === "es" ? "Contenido relacionado" : "Related content"}
    >
      {result.map((group) => (
        <div key={group.prefix}>
          <h2>{group.label}</h2>
          <ul>
            {group.rows.map((row) => {
              const text = localizedTranslation(
                row.snapshot.translations,
                locale,
              ).text;
              return (
                <li key={row.entity_id}>
                  <Link href={localizedPath(locale, group.prefix + row.slug)}>
                    {text?.name || text?.title || row.slug}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  ) : null;
}

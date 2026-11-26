import type { Locale } from "@/lib/i18n";
import type { VisualDocumentData } from "@/lib/visual/schema";
import { visualChrome, visualItems } from "@/lib/visual/queries";
import { VisualDocument } from "./VisualDocument";

export async function PublishedVisual({
  doc,
  locale,
}: {
  doc: VisualDocumentData;
  locale: Locale;
}) {
  const [items, chrome] = await Promise.all([
    visualItems(),
    visualChrome(locale),
  ]);
  const pendingEnglish = !doc.englishReady && Object.entries(doc.es).some(
    ([key, value]) => value && !doc.inheritedEnglish?.[key],
  );
  return (
    <>
      {locale === "en" && pendingEnglish && (
        <p role="status" className="section-shell">
          Some sections may appear in Spanish while their English translations are reviewed.
        </p>
      )}
      <VisualDocument doc={doc} items={items} chrome={chrome} locale={locale} />
    </>
  );
}

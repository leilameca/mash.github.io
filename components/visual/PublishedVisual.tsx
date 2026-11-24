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
  return (
    <>
      {locale === "en" && !doc.englishReady && (
        <p role="status" className="section-shell">
          English translation pending review. Showing the Spanish original.
        </p>
      )}
      <VisualDocument doc={doc} items={items} chrome={chrome} locale={locale} />
    </>
  );
}

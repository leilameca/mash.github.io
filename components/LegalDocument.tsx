import { site } from "@/lib/content";
import { getLegalDocument, type LegalDocumentKey } from "@/lib/legal";
import type { Locale } from "@/lib/i18n";

export function LegalDocument({ locale, document }: { locale: Locale; document: LegalDocumentKey }) {
  const copy = getLegalDocument(locale, document);

  return (
    <section className="section-shell legal-page">
      <header className="legal-page__header">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="legal-page__summary">{copy.summary}</p>
        <p className="legal-page__updated">
          {copy.updatedLabel}: <time dateTime={copy.updatedDate}>{locale === "es" ? "25 de septiembre de 2026" : "September 25, 2026"}</time>
        </p>
      </header>

      <article className="legal-document">
        {copy.sections.map((section) => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.items && (
              <ul>
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}

        <section className="legal-contact">
          <h2>{copy.contactTitle}</h2>
          <p>{copy.contactText}</p>
          <div>
            <a href={site.emailHref}>{site.email}</a>
            <a href={site.phoneHref}>{site.phone}</a>
          </div>
        </section>
      </article>
    </section>
  );
}

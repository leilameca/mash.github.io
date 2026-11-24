import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { PwaInstall } from "@/components/PwaInstall";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { SiteChromeContent } from "@/lib/supabase/site-content";

export function Footer({
  locale,
  content,
  preview = false,
}: {
  locale: Locale;
  content: SiteChromeContent;
  preview?: boolean;
}) {
  const local = (href: string, label: string) =>
    preview ? (
      <span>{label}</span>
    ) : (
      <Link href={localizedPath(locale, href)}>{label}</Link>
    );
  const contact = (href: string, label: string) =>
    preview ? <span>{label}</span> : <a href={href}>{label}</a>;
  return (
    <footer
      className={preview ? "site-footer visual-preview-footer" : "site-footer"}
      id={preview ? undefined : "contacto"}
    >
      <div className="footer-cta section-shell">
        <p>{content.footerCta}</p>
        {preview ? (
          <span className="button button--gold">
            {content.requestQuoteLabel}
          </span>
        ) : (
          <a
            data-analytics="click_whatsapp"
            href={content.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="button button--gold"
          >
            {content.requestQuoteLabel}
          </a>
        )}
      </div>
      <div className="footer-main section-shell">
        <div className="footer-brand">
          <BrandMark locale={locale} preview={preview} />
          <p>{content.footerDescription}</p>
        </div>
        <nav aria-label="Footer">
          <h2>{content.footerNavigationTitle}</h2>
          {content.navigation
            .filter((item) => item.href)
            .map((item) =>
              preview ? (
                <span key={item.id}>{item.label}</span>
              ) : (
                <Link href={localizedPath(locale, item.href)} key={item.id}>
                  {item.label}
                </Link>
              ),
            )}
        </nav>
        <address>
          <h2>
            {content.navigation.find((item) => item.id === "contact")?.label ??
              (locale === "es" ? "Contacto" : "Contact")}
          </h2>
          {contact(content.phoneHref, content.phone)}
          {contact(content.emailHref, content.email)}
          {preview ? (
            <span>{content.instagramHandle}</span>
          ) : (
            <a href={content.instagram} target="_blank" rel="noreferrer">
              {content.instagramHandle}
            </a>
          )}
          <span>{content.location}</span>
        </address>
        <nav aria-label="Legal">
          <h2>{content.footerLegalTitle}</h2>
          {local("/privacidad", locale === "es" ? "Privacidad" : "Privacy")}
          {local("/cookies", "Cookies")}
          {local("/terminos", locale === "es" ? "Terminos" : "Terms")}
        </nav>
      </div>
      <div className="footer-bottom section-shell">
        <p>{content.copyright}</p>
        {!preview && <PwaInstall locale={locale} />}
      </div>
    </footer>
  );
}

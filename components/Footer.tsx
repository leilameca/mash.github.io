import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { PwaInstall } from "@/components/PwaInstall";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { SiteChromeContent } from "@/lib/supabase/site-content";

export function Footer({ locale, content }: { locale: Locale; content: SiteChromeContent }) {
  return (
    <footer className="site-footer" id="contacto">
      <div className="footer-cta section-shell">
        <p>{content.footerCta}</p>
        <a href={content.whatsapp} target="_blank" rel="noreferrer" className="button button--gold">
          {content.requestQuoteLabel}
        </a>
      </div>
      <div className="footer-main section-shell">
        <div className="footer-brand">
          <BrandMark locale={locale} />
          <p>{content.footerDescription}</p>
        </div>
        <nav aria-label="Footer">
          <h2>{content.footerNavigationTitle}</h2>
          {content.navigation.filter((item) => item.href).map((item) => (
            <Link href={localizedPath(locale, item.href)} key={item.id}>{item.label}</Link>
          ))}
        </nav>
        <address>
          <h2>{content.navigation.find((item) => item.id === "contact")?.label ?? (locale === "es" ? "Contacto" : "Contact")}</h2>
          <a href={content.phoneHref}>{content.phone}</a>
          <a href={content.emailHref}>{content.email}</a>
          <a href={content.instagram} target="_blank" rel="noreferrer">
            {content.instagramHandle}
          </a>
          <span>{content.location}</span>
        </address>
        <nav aria-label="Legal">
          <h2>{content.footerLegalTitle}</h2>
          <Link href={localizedPath(locale, "/privacidad")}>{locale === "es" ? "Privacidad" : "Privacy"}</Link>
          <Link href={localizedPath(locale, "/cookies")}>Cookies</Link>
          <Link href={localizedPath(locale, "/terminos")}>{locale === "es" ? "Terminos" : "Terms"}</Link>
        </nav>
      </div>
      <div className="footer-bottom section-shell">
        <p>{content.copyright}</p>
        <PwaInstall locale={locale} />
      </div>
    </footer>
  );
}

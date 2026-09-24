import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { dictionary, site } from "@/lib/content";
import { localizedPath, type Locale } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  const t = dictionary[locale].nav;

  return (
    <footer className="site-footer" id="contacto">
      <div className="footer-cta section-shell">
        <p>{locale === "es" ? "¿Tienes un proyecto en mente?" : "Have a project in mind?"}</p>
        <a href={site.whatsapp} target="_blank" rel="noreferrer" className="button button--gold">
          {dictionary[locale].common.requestQuote}
        </a>
      </div>
      <div className="footer-main section-shell">
        <div className="footer-brand">
          <BrandMark locale={locale} />
          <p>
            {locale === "es"
              ? "Muebles de exterior para terrazas, patios, balcones, piscinas, hoteles, restaurantes, villas y proyectos comerciales."
              : "Outdoor furniture for terraces, patios, balconies, pools, hotels, restaurants, villas and commercial projects."}
          </p>
        </div>
        <nav aria-label="Footer">
          <h2>{locale === "es" ? "Navegacion" : "Navigation"}</h2>
          <Link href={localizedPath(locale, "/colecciones")}>{t.collections}</Link>
          <Link href={localizedPath(locale, "/productos")}>{t.products}</Link>
          <Link href={localizedPath(locale, "/proyectos")}>{t.projects}</Link>
          <Link href={localizedPath(locale, "/nosotros")}>{t.about}</Link>
          <Link href={localizedPath(locale, "/contacto")}>{t.contact}</Link>
        </nav>
        <address>
          <h2>{t.contact}</h2>
          <a href={site.phoneHref}>{site.phone}</a>
          <a href={site.emailHref}>{site.email}</a>
          <a href={site.instagram} target="_blank" rel="noreferrer">
            {site.instagramHandle}
          </a>
          <span>{site.location[locale]}</span>
        </address>
        <nav aria-label="Legal">
          <h2>Legal</h2>
          <Link href={localizedPath(locale, "/privacidad")}>{locale === "es" ? "Privacidad" : "Privacy"}</Link>
          <Link href={localizedPath(locale, "/cookies")}>Cookies</Link>
          <Link href={localizedPath(locale, "/terminos")}>{locale === "es" ? "Terminos" : "Terms"}</Link>
        </nav>
      </div>
      <div className="footer-bottom section-shell">
        <p>&copy; 2026 {site.fullName}. {locale === "es" ? "Todos los derechos reservados." : "All rights reserved."}</p>
      </div>
    </footer>
  );
}

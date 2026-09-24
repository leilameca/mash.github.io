"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { alternateLocale, localizedPath, type Locale } from "@/lib/i18n";
import { dictionary, site } from "@/lib/content";

const navItems = [
  { key: "home", href: "" },
  { key: "collections", href: "/colecciones" },
  { key: "products", href: "/productos" },
  { key: "projects", href: "/proyectos" },
  { key: "about", href: "/nosotros" },
  { key: "contact", href: "/contacto" }
] as const;

export function Header({ locale }: { locale: Locale }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const t = dictionary[locale].nav;
  const nextLocale = alternateLocale(locale);
  const switchPath = pathname?.replace(/^\/(es|en)/, `/${nextLocale}`) ?? localizedPath(nextLocale);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", isOpen);
    return () => document.body.classList.remove("menu-open");
  }, [isOpen]);

  return (
    <header className={`site-header${isScrolled ? " is-scrolled" : ""}`}>
      <div className="site-header__inner">
        <BrandMark locale={locale} />
        <button
          className="menu-toggle"
          type="button"
          aria-label={isOpen ? t.close : t.menu}
          aria-expanded={isOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="primary-navigation" className={`primary-nav${isOpen ? " is-open" : ""}`} aria-label="Principal">
          {navItems.map((item) => {
            const href = localizedPath(locale, item.href);
            const active = href === localizedPath(locale) ? pathname === href : pathname?.startsWith(href);
            return (
              <Link key={item.key} href={href} aria-current={active ? "page" : undefined}>
                {t[item.key]}
              </Link>
            );
          })}
          <button className="nav-search" type="button" aria-label={locale === "es" ? "Buscar" : "Search"}>
            <span />
          </button>
          <div className="language-switch" aria-label="Language">
            <span aria-current={locale === "es" ? "true" : undefined}>ES</span>
            <Link href={switchPath}>EN</Link>
          </div>
          <a className="nav-quote" href={site.whatsapp} target="_blank" rel="noreferrer">
            {t.quote}
          </a>
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { SiteChromeContent } from "@/lib/supabase/site-content";

export function Header({ locale, content }: { locale: Locale; content: SiteChromeContent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const localePath = pathname?.replace(/^\/(es|en)/, "") ?? "";

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
          aria-label={isOpen ? content.closeLabel : content.menuLabel}
          aria-expanded={isOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="primary-navigation" className={`primary-nav${isOpen ? " is-open" : ""}`} aria-label="Principal">
          {content.navigation.map((item) => {
            const href = localizedPath(locale, item.href);
            const active = href === localizedPath(locale) ? pathname === href : pathname?.startsWith(href);
            return (
              <Link key={item.id} href={href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
          <div className="language-switch" aria-label="Language">
            <Link href={localizedPath("es", localePath)} aria-current={locale === "es" ? "page" : undefined}>
              ES
            </Link>
            <Link href={localizedPath("en", localePath)} aria-current={locale === "en" ? "page" : undefined}>
              EN
            </Link>
          </div>
          <a className="nav-quote" href={content.whatsapp} target="_blank" rel="noreferrer">
            {content.quoteLabel}
          </a>
        </nav>
      </div>
    </header>
  );
}

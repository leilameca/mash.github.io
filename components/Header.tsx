"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { SiteChromeContent } from "@/lib/supabase/site-content";

export function Header({
  locale,
  content,
  previewPath,
}: {
  locale: Locale;
  content: SiteChromeContent;
  previewPath?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const livePath = usePathname();
  const preview = previewPath !== undefined;
  const pathname = previewPath ?? livePath;
  const generatedId = useId();
  const navId = preview ? generatedId : "primary-navigation";
  const localePath = pathname?.replace(/^\/(es|en)/, "") ?? "";

  useEffect(() => {
    if (preview) return;
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [preview]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const mobile = window.matchMedia("(max-width: 920px)");
    const close = () => setIsOpen(false);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        toggle.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !nav.current?.contains(event.target) &&
        !toggle.current?.contains(event.target)
      )
        close();
    };
    let focusFrame = 0;
    const focusMenu = () => {
      const firstLink = preview ? nav.current : nav.current?.querySelector("a");
      if (
        !firstLink ||
        !toggle.current ||
        getComputedStyle(toggle.current).display === "none"
      )
        return;
      if (getComputedStyle(firstLink).visibility === "visible") {
        firstLink.focus({ preventScroll: true });
      } else {
        focusFrame = requestAnimationFrame(focusMenu);
      }
    };
    focusFrame = requestAnimationFrame(focusMenu);
    mobile.addEventListener("change", close);
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      cancelAnimationFrame(focusFrame);
      mobile.removeEventListener("change", close);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [isOpen, preview]);

  return (
    <header
      className={
        preview
          ? "visual-preview-nav"
          : `site-header${isScrolled ? " is-scrolled" : ""}`
      }
    >
      <div className="site-header__inner">
        <BrandMark locale={locale} preview={preview} />
        <button
          ref={toggle}
          className="menu-toggle"
          type="button"
          aria-label={
            preview
              ? locale === "es"
                ? "Menú"
                : "Menu"
              : isOpen
                ? content.closeLabel
                : content.menuLabel
          }
          aria-expanded={isOpen}
          aria-controls={navId}
          onClick={() => setIsOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          ref={nav}
          id={navId}
          tabIndex={preview ? -1 : undefined}
          className={`primary-nav${isOpen ? " is-open" : ""}`}
          aria-label={
            locale === "es"
              ? preview
                ? "Navegación móvil"
                : "Principal"
              : preview
                ? "Mobile navigation"
                : "Main"
          }
        >
          {content.navigation.map((item) => {
            const href = localizedPath(locale, item.href);
            const active =
              href === localizedPath(locale)
                ? pathname === href
                : pathname === href || pathname?.startsWith(href + "/");
            return preview ? (
              <span key={item.id} aria-current={active ? "page" : undefined}>
                {item.label}
              </span>
            ) : (
              <Link
                key={item.id}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          {preview ? (
            <div className="language-switch">
              <span aria-current={locale === "es" ? "page" : undefined}>
                ES
              </span>
              <span aria-current={locale === "en" ? "page" : undefined}>
                EN
              </span>
            </div>
          ) : (
            <div className="language-switch" aria-label="Language">
              <a
                data-analytics={locale !== "es" ? "change_language" : undefined}
                href={localizedPath("es", localePath)}
                aria-current={locale === "es" ? "page" : undefined}
              >
                ES
              </a>
              <a
                data-analytics={locale !== "en" ? "change_language" : undefined}
                href={localizedPath("en", localePath)}
                aria-current={locale === "en" ? "page" : undefined}
              >
                EN
              </a>
            </div>
          )}
          {preview ? (
            <span className="nav-quote">{content.quoteLabel}</span>
          ) : (
            <a
              className="nav-quote"
              data-analytics="click_whatsapp"
              href={content.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              {content.quoteLabel}
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

"use client";
import { ComparePhotos } from "@/components/editorial/ComparePhotos";
import { AnnouncementBanner } from "@/components/editorial/Announcements";
import {
  withinAnnouncementWindow,
  type pageTargets,
} from "@/lib/editorial/schema";
import type { PublicAnnouncement } from "@/lib/editorial/queries";
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n";
import {
  blockRegistry,
  effectiveDesign,
  fieldId,
  palette,
  type Design,
  type TextField,
  type VisualChrome,
  type VisualDocumentData,
  type VisualItem,
  type VisualSection,
} from "@/lib/visual/schema";
import "./visual.css";

const align = { left: "start", center: "center", right: "end" } as const;
const vars = (d: Required<Design>, suffix = "") => ({
  ["--visual-align" + suffix]: d.align,
  ["--visual-justify" + suffix]: align[d.align],
  ["--visual-title" + suffix]: d.titleSize + "px",
  ["--visual-pad" + suffix]: d.padding + "px",
  ["--visual-min" + suffix]: d.height + "px",
  ["--visual-focus" + suffix]: d.x + "% " + d.y + "%",
  ["--visual-cols" + suffix]: d.columns,
  ["--visual-photo" + suffix]: d.hideMedia ? "none" : "block",
  ["--visual-split" + suffix]: d.hideMedia ? "1fr" : "repeat(2,minmax(0,1fr))",
});
function style(section: VisualSection): CSSProperties {
  const d = effectiveDesign(section, "desktop");
  return {
    ...vars(d),
    ...vars(effectiveDesign(section, "tablet"), "-tablet"),
    ...vars(effectiveDesign(section, "mobile"), "-mobile"),
    "--visual-weight": d.weight,
    "--visual-width": d.textWidth + "px",
    "--visual-ink": palette[d.textColor],
    "--visual-bg": palette[d.background],
    "--visual-over": palette[d.overlay],
    "--visual-alpha": d.opacity / 100,
    "--visual-vertical": d.vertical,
    "--visual-margin": d.margin + "px",
    "--visual-ratio": d.ratio.replace(":", "/"),
    "--visual-fit": d.fit,
    "--visual-gap": d.gap + "px",
    "--visual-button-align": align[d.buttonAlign],
  } as CSSProperties;
}
const prefixes = {
  collection: "/colecciones/",
  product: "/productos/",
  project: "/proyectos/",
  news: "/noticias/",
  announcement: "",
} as const;
export function VisualDocument({
  doc,
  items,
  chrome,
  locale,
  preview = false,
  selected,
  onSelect,
  onText,
  showHidden = false,
}: {
  doc: VisualDocumentData;
  items: VisualItem[];
  chrome: VisualChrome;
  locale: Locale;
  preview?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onText?: (id: string, field: TextField, text: string) => void;
  showHidden?: boolean;
}) {
  const interactive = Boolean(onSelect);
  const blocks = doc.layout.sections.filter(
    (section) =>
      (section.visible || (interactive && showHidden)) &&
      (preview || !blockRegistry[section.type].protected),
  );
  const firstHeading = blocks.find(
    (b) => b.visible && doc.es[fieldId(b.id, "title")] && b.type !== "faq",
  )?.id;
  return (
    <div className="mash-visual" lang={locale}>
      {blocks.map((section) => {
        const active = selected === section.id && interactive;
        const text = (field: TextField) =>
          locale === "en" && (preview || doc.englishReady)
            ? doc.en[fieldId(section.id, field)] ||
              doc.es[fieldId(section.id, field)] ||
              ""
            : doc.es[fieldId(section.id, field)] || "";
        const content = (field: TextField) => {
          if (active && onText && (field === "title" || field === "body"))
            return (
              <span
                key={section.id + field + locale}
                className="visual-inline-edit"
                contentEditable
                suppressContentEditableWarning
                aria-label={
                  field === "title"
                    ? "Editar título en el lienzo"
                    : "Editar texto en el lienzo"
                }
                role="textbox"
                tabIndex={0}
                onBlur={(e) =>
                  onText(section.id, field, e.currentTarget.textContent ?? "")
                }
                onPaste={(e) => {
                  e.preventDefault();
                  document.execCommand(
                    "insertText",
                    false,
                    e.clipboardData.getData("text/plain"),
                  );
                }}
              >
                {text(field)}
              </span>
            );
          return text(field);
        };
        const heading = firstHeading === section.id ? "h1" : "h2";
        const Heading = heading;
        const meta = blockRegistry[section.type];
        const options = meta.entity
          ? items.filter((item) => item.kind === meta.entity)
          : [];
        const curated =
          (section.type === "products" && section.id === "legacy-products") ||
          section.type === "news-featured" ||
          (section.type === "projects" && section.id !== "legacy-projects");
        const optionsForBlock = curated
          ? options.filter((item) => item.featured)
          : options;
        const cards = section.entities.length
          ? section.entities.flatMap(
              (id) => options.find((item) => item.id === id) ?? [],
            )
          : optionsForBlock.slice(0, 6);
        const href = section.href ? localizedPath(locale, section.href) : "";
        const action =
          text("button") && href ? (
            <div className="visual-action">
              <PreviewLink
                preview={preview}
                href={href}
                className={
                  "visual-button visual-button--" +
                  (section.design.buttonStyle ?? "solid")
                }
              >
                {text("button")}
              </PreviewLink>
            </div>
          ) : null;
        const copy = (
          <div className="visual-copy">
            {text("eyebrow") && (
              <p className="visual-eyebrow">{text("eyebrow")}</p>
            )}
            {(text("title") || active) && (
              <Heading className="visual-title">{content("title")}</Heading>
            )}
            {(text("body") || active) && (
              <p className="visual-body">{content("body")}</p>
            )}
            {action}
          </div>
        );
        let node: ReactNode;
        if (section.type === "navigation")
          node = (
            <div className="visual-chrome">
              <strong>MASH</strong>
              <nav>
                {chrome.navigation.map((link, index) => (
                  <span key={index}>{link.label}</span>
                ))}
              </nav>
            </div>
          );
        else if (section.type === "footer")
          node = (
            <div className="visual-chrome visual-footer">
              <strong>MASH</strong>
              <p>
                {chrome.footer}
                <br />
                {chrome.copyright}
              </p>
            </div>
          );
        else if (section.type === "spacer")
          node = <div className="visual-spacer" aria-hidden="true" />;
        else if (
          section.type === "hero" ||
          section.type === "carousel" ||
          section.type === "banner"
        )
          node = (
            <Cover images={section.media} alt={text("alt")} locale={locale}>
              {copy}
            </Cover>
          );
        else if (section.type === "image-text" || section.type === "about")
          node = (
            <div className="visual-split">
              {section.media[0] && (
                <VisualPhoto path={section.media[0]} alt={text("alt")} />
              )}{" "}
              {copy}
            </div>
          );
        else if (section.type === "gallery" || section.type === "photo-grid")
          node = (
            <>
              {copy}
              <div className="visual-grid">
                {section.media.map((path) => (
                  <VisualPhoto
                    key={path}
                    path={path}
                    alt={text("alt")}
                    compact
                  />
                ))}
              </div>
            </>
          );
        else if (section.type === "comparison")
          node = (
            <>
              {copy}
              <div className="visual-comparison">
                <ComparePhotos
                  locale={locale}
                  comparison={{
                    before: section.media[0] ?? "",
                    after: section.media[1] ?? "",
                    x: 50,
                    y: 50,
                    fit: "cover",
                  }}
                  inheritCrop
                  beforeLabel={text("before")}
                  afterLabel={text("after")}
                  beforeAlt={text("alt")}
                  afterAlt={text("alt")}
                />
              </div>
            </>
          );
        else if (section.type === "announcements")
          node = (
            <VisualAnnouncements
              locale={locale}
              preview={preview}
              page={doc.page ?? "home"}
              entries={cards.flatMap((card) =>
                card.announcements?.[locale]
                  ? [card.announcements[locale]!]
                  : [],
              )}
            />
          );
        else if (meta.entity)
          node = (
            <>
              {copy}
              <div className="visual-grid">
                {cards.map((card) => (
                  <article key={card.id} className="visual-item">
                    <PreviewLink
                      preview={preview}
                      href={localizedPath(
                        locale,
                        prefixes[card.kind] +
                          (card.kind === "project" ? "" : card.slug),
                      )}
                    >
                      {card.image && <VisualPhoto path={card.image} alt="" />}
                      <strong>
                        {locale === "en"
                          ? card.titleEn || card.title
                          : card.title}
                      </strong>
                    </PreviewLink>
                    {card.kind === "project" && (
                      <p>
                        {locale === "en"
                          ? card.descriptionEn || card.description
                          : card.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </>
          );
        else if (section.type === "contact")
          node = (
            <>
              {copy}
              <address className="visual-contact">
                <PreviewLink
                  preview={preview}
                  href={"tel:" + chrome.phone.replace(/[^+\d]/g, "")}
                >
                  {chrome.phone}
                </PreviewLink>
                <PreviewLink preview={preview} href={"mailto:" + chrome.email}>
                  {chrome.email}
                </PreviewLink>
                <span>{chrome.location}</span>
              </address>
            </>
          );
        else if (section.type === "faq")
          node = (
            <details className="visual-faq">
              <summary>{text("title")}</summary>
              <p>{text("body")}</p>
            </details>
          );
        else node = copy;
        return (
          <section
            key={section.id}
            data-section={section.id}
            data-type={section.type}
            className={`visual-section${active ? " visual-section--active" : ""}${!section.visible ? " visual-section--hidden" : ""}`}
            style={style(section)}
            onClick={onSelect ? () => onSelect(section.id) : undefined}
          >
            {interactive && (
              <button
                type="button"
                className="visual-select-section"
                aria-label={`Seleccionar ${meta.label} en el lienzo`}
                onClick={() => onSelect?.(section.id)}
              >
                {meta.label}
              </button>
            )}
            {node}
          </section>
        );
      })}
    </div>
  );
}
function PreviewLink({
  preview,
  href,
  className,
  children,
}: {
  preview: boolean;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return preview ? (
    <span className={className}>{children}</span>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
function VisualPhoto({
  path,
  alt,
  compact = false,
}: {
  path: string;
  alt: string;
  compact?: boolean;
}) {
  const source = compact
    ? path.replace(
        /(\/storage\/v1\/object\/public\/mash-media\/(?:products|collections|projects|site)\/[0-9a-f-]{36})-gallery\.webp$/,
        "$1-catalog.webp",
      )
    : path;
  return (
    <img
      className="visual-photo"
      src={source}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
function Cover({
  images,
  alt,
  locale,
  children,
}: {
  images: string[];
  alt: string;
  locale: Locale;
  children: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const active = images[index % Math.max(1, images.length)];
  return (
    <div className="visual-cover">
      {active && <VisualPhoto path={active} alt={alt} />}
      {active && <div className="visual-cover-shade" aria-hidden="true" />}
      <div className="visual-cover-copy">{children}</div>
      {images.length > 1 && (
        <div className="visual-carousel">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + images.length - 1) % images.length);
            }}
            aria-label={locale === "es" ? "Foto anterior" : "Previous photo"}
          >
            ‹
          </button>
          <span aria-live="polite">
            {(index % images.length) + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + 1) % images.length);
            }}
            aria-label={locale === "es" ? "Foto siguiente" : "Next photo"}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

function VisualAnnouncements({
  entries,
  locale,
  preview,
  page,
}: {
  entries: PublicAnnouncement[];
  locale: Locale;
  preview: boolean;
  page: (typeof pageTargets)[number];
}) {
  const [now, setNow] = useState<number | null>(null);
  const [dismiss, setDismiss] = useState<string[]>([]);
  useEffect(() => {
    if (!entries.length) return;
    const refresh = () => setNow(Date.now());
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [entries.length]);
  const entry = entries
    .filter(
      (row) =>
        !dismiss.includes(row.id) &&
        (now === null
          ? row.data.pages.includes("all") || row.data.pages.includes(page)
          : withinAnnouncementWindow(row.data, locale, page, now)),
    )
    .sort((a, b) => b.data.priority - a.data.priority)[0];
  if (!entry)
    return preview ? (
      <p className="visual-context">
        {locale === "es"
          ? "No hay anuncios vigentes para esta página."
          : "No active announcements for this page."}
      </p>
    ) : null;
  return (
    <AnnouncementBanner
      entry={entry}
      locale={locale}
      preview={preview}
      onDismiss={() => setDismiss((value) => [...value, entry.id])}
    />
  );
}

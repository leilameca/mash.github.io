"use client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
  pagePaths,
  type Design,
  type Device,
  type TextField,
  type VisualChrome,
  type VisualDocumentData,
  type VisualItem,
  type VisualSection,
} from "@/lib/visual/schema";
import "./visual.css";
import { WorkshopLocation } from "@/components/editorial/WorkshopLocation";
import { HomeHero, HomeLifestyle } from "@/components/editorial/HomeEditorial";
import { HomeSection } from "@/components/editorial/HomeSections";
import { ContactSection } from "@/components/editorial/ContactSection";
import { homeParent, isOriginalHomeSection, type HomeView } from "@/lib/visual/home";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary } from "@/lib/content";

const isLegacyLifestyle = (block: VisualSection) =>
  block.type === "gallery" && /^legacy-lifestyle-(one|two|three)$/.test(block.id);

function homeHeroDesign(section: VisualSection): CSSProperties {
  const desktop = section.design;
  const initial = blockRegistry.hero.preset ?? {};
  const styles: Record<string, string> = {};
  for (const device of ["desktop", "tablet", "mobile"] satisfies Device[]) {
    const suffix = device === "desktop" ? "" : "-" + device;
    const choices = device === "desktop" ? desktop : section[device];
    if (choices.x !== undefined || choices.y !== undefined)
      styles["--home-focus" + suffix] =
        `${choices.x ?? desktop.x ?? 50}% ${choices.y ?? desktop.y ?? 52}%`;
    if (choices.hideMedia !== undefined)
      styles["--home-show-photo" + suffix] = choices.hideMedia ? "none" : "block";
    if (choices.align !== undefined) {
      styles["--home-align" + suffix] = choices.align;
      styles["--home-justify" + suffix] = align[choices.align];
    }
    if (choices.titleSize !== undefined && (suffix || choices.titleSize !== initial.titleSize))
      styles["--home-title-size" + suffix] = choices.titleSize + "px";
    if (choices.height !== undefined && (suffix || choices.height !== initial.height))
      styles["--home-height" + suffix] = choices.height + "px";
    if (choices.padding !== undefined)
      styles["--home-padding" + suffix] = choices.padding + "px";
  }
  if (desktop.fit !== undefined) styles["--home-fit"] = desktop.fit;
  if (desktop.weight !== undefined) styles["--home-weight"] = String(desktop.weight);
  if (desktop.textWidth !== undefined) styles["--home-copy-width"] = desktop.textWidth + "px";
  if (desktop.textColor !== undefined && desktop.textColor !== initial.textColor)
    styles["--home-ink"] = palette[desktop.textColor];
  if (desktop.background !== undefined && desktop.background !== initial.background)
    styles["--home-background"] = palette[desktop.background];
  if (desktop.vertical !== undefined) styles["--home-vertical"] = desktop.vertical;
  if (desktop.buttonAlign !== undefined) styles["--home-button-align"] = align[desktop.buttonAlign];
  if (desktop.overlay !== undefined || desktop.opacity !== undefined)
    styles["--home-overlay"] = `color-mix(in srgb, ${palette[desktop.overlay ?? "ink"]} ${desktop.opacity ?? 45}%, transparent)`;
  return styles as CSSProperties;
}

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
  home,
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
  home?: HomeView;
}) {
  const interactive = Boolean(onSelect);
  const blocks = doc.layout.sections.filter(
    (section) =>
      (section.visible || (interactive && showHidden)) &&
      (preview || !blockRegistry[section.type].protected),
  );
  const mapSection = doc.page === "contact"
    ? blocks.find((block) => block.visible && block.type === "contact")
    : undefined;
  const homeHero = doc.page === "home"
    ? blocks.find((block) => block.id === "legacy-hero" && block.type === "hero")
    : undefined;
  const showroom = doc.page === "home"
    ? blocks.find((block) => block.id === "legacy-showroom" && block.type === "gallery")
    : undefined;
  const textFor = (section: VisualSection, field: TextField) => {
    const key = fieldId(section.id, field);
    if (locale === "en") {
      const english = preview || doc.englishReady ? doc.en : doc.inheritedEnglish;
      return english?.[key] || doc.es[key] || "";
    }
    return doc.es[key] || "";
  };
  const firstHeading = blocks.find(
    (b) => b.visible && doc.es[fieldId(b.id, "title")] && b.type !== "faq",
  )?.id;
  const attached = new Map<string, VisualSection[]>();
  if (home) {
    for (const block of blocks) {
      const parent = homeParent(block.id);
      if (parent && isOriginalHomeSection(block) && doc.layout.sections.some(
        (candidate) => candidate.id === parent && isOriginalHomeSection(candidate),
      )) attached.set(parent, [...(attached.get(parent) ?? []), block]);
    }
  }
  return (
    <div className={home ? "mash-visual mash-visual--home" : "mash-visual"} lang={locale}>
      {blocks.map((section, index) => {
        if (section === showroom) return null;
        if (home && attached.get(homeParent(section.id) ?? "")?.includes(section)) return null;
        if (doc.page === "home" && isLegacyLifestyle(section)) {
          if (index > 0 && isLegacyLifestyle(blocks[index - 1])) return null;
          const entries = [];
          for (let i = index; i < blocks.length && isLegacyLifestyle(blocks[i]); i++) {
            const block = blocks[i];
            const name = textFor(block, "title");
            entries.push({
              id: block.id,
              image: block.media[0],
              label: onSelect ? (
                <button className="visual-lifestyle-select" data-section={block.id} type="button" onClick={() => onSelect(block.id)} aria-pressed={selected === block.id}>{name || "Foto de inspiración"}</button>
              ) : name,
            });
          }
          return <HomeLifestyle key={section.id} locale={locale} entries={entries} />;
        }
        const active = selected === section.id && interactive;
        const text = (field: TextField) => textFor(section, field);
        const contentFor = (
          part: VisualSection,
          field: TextField,
          segment?: { value: string; label: string; merge: (text: string) => string },
        ) => {
          if (interactive && selected === part.id && onText && (field === "title" || field === "body"))
            return (
              <span
                key={part.id + field + locale + (segment?.label ?? "")}
                className="visual-inline-edit"
                contentEditable
                suppressContentEditableWarning
                aria-label={
                  segment?.label ?? (field === "title"
                    ? "Editar título en el lienzo"
                    : "Editar texto en el lienzo")
                }
                role="textbox"
                tabIndex={0}
                onBlur={(e) => {
                  const next = e.currentTarget.textContent ?? "";
                  onText(part.id, field, segment ? segment.merge(next) : next);
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  e.currentTarget.ownerDocument.execCommand(
                    "insertText",
                    false,
                    e.clipboardData.getData("text/plain"),
                  );
                }}
              >
                {segment?.value ?? textFor(part, field)}
              </span>
            );
          return segment?.value ?? textFor(part, field);
        };
        const content = (field: TextField) => contentFor(section, field);
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
          : optionsForBlock.slice(0, section.id === "legacy-news" ? 3 : 6);
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
        const editorial = Boolean(home && (isOriginalHomeSection(section) || section.type === "navigation" || section.type === "footer" || section === homeHero));
        if (section.type === "navigation")
          node = (
            <Header
              locale={locale}
              content={chrome}
              previewPath={localizedPath(locale, pagePaths[doc.page || "home"])}
              publicLayout={Boolean(home)}
            />
          );
        else if (section.type === "footer")
          node = (
            <>
              {home?.contact && <ContactSection locale={locale} site={chrome} content={home.contact} preview />}
              <Footer locale={locale} content={chrome} preview={!home} frame={Boolean(home)} />
            </>
          );
        else if (section.type === "spacer")
          node = <div className="visual-spacer" aria-hidden="true" />;
        else if (section === homeHero) {
          const quote = dictionary[locale].common.quote;
          const [headline, ...intro] = text("title").split(/\r?\n[ \t]*\r?\n/);
          const tagline = intro.join("\n\n").trim();
          node = (
            <HomeHero
              locale={locale}
              eyebrow={text("eyebrow") || `MASH | ${chrome.fullName}`}
              title={tagline ? contentFor(section, "title", {
                value: headline,
                label: "Editar título en el lienzo",
                merge: (next) => next + "\n\n" + tagline,
              }) : content("title")}
              tagline={tagline ? contentFor(section, "title", {
                value: tagline,
                label: "Editar subtítulo de portada",
                merge: (next) => headline + (next.trim() ? "\n\n" + next : ""),
              }) : undefined}
              description={content("body")}
              background={section.media[0]}
              alt={text("alt")}
              heading={heading}
              design={homeHeroDesign(section)}
              showroom={showroom?.visible ? showroom.media : []}
              showroomControl={showroom && onSelect && (
                <button
                  type="button"
                  data-section={showroom.id}
                  className="visual-select-section visual-select-section--showroom"
                  aria-pressed={selected === showroom.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(showroom.id);
                  }}
                >
                  Fotos de portada
                </button>
              )}
              actions={
                <>
                  {text("button") && href && (
                    <PreviewLink
                      preview={preview}
                      href={href}
                      className={section.design.buttonStyle && section.design.buttonStyle !== blockRegistry.hero.preset?.buttonStyle
                        ? "visual-button visual-button--" + section.design.buttonStyle
                        : "button button--gold"}
                    >
                      {text("button")}
                    </PreviewLink>
                  )}
                  {preview ? (
                    <span className="button button--light">{quote}</span>
                  ) : (
                    <QuoteLink className="button button--light">{quote}</QuoteLink>
                  )}
                </>
              }
            />
          );
        }
        else if (home && isOriginalHomeSection(section) && !homeParent(section.id)) {
          if (section.id === "legacy-news" && !home.news.length && !interactive) return null;
          node = (
            <HomeSection
              section={section}
              parts={attached.get(section.id) ?? []}
              view={home}
              locale={locale}
              preview={preview}
              selected={selected}
              content={contentFor}
              text={textFor}
              onSelect={onSelect}
              slugs={cards.map((card) => card.slug)}
            />
          );
        }
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
                        prefixes[card.kind] + card.slug,
                      )}
                    >
                      {card.image && <VisualPhoto path={card.image} alt="" />}
                      <strong>
                        {locale === "en"
                          ? card.titleEn || card.title
                          : card.title}
                      </strong>
                    </PreviewLink>
                    {(card.kind === "project" || card.kind === "news") && (
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
        if (section.id === "legacy-news" && !cards.length && !interactive)
          return null;
        return (
          <section
            key={section.id}
            data-section={section.id}
            data-type={section.type}
            aria-label={section.id === "legacy-news" ? text("title") : undefined}
            className={`visual-section${editorial && !homeParent(section.id) ? " visual-section--editorial" : ""}${active ? " visual-section--active" : ""}${!section.visible ? " visual-section--hidden" : ""}`}
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
            {section === mapSection && (
              <WorkshopLocation locale={locale} map={chrome.workshop} preview={preview} />
            )}
          </section>
        );
      })}
      {doc.page === "contact" && !mapSection && (
        <WorkshopLocation locale={locale} map={chrome.workshop} preview={preview} />
      )}
      {!preview && home?.contact && <ContactSection locale={locale} site={chrome} content={home.contact} />}
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

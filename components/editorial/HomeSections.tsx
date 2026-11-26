import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CollectionCard } from "@/components/CollectionCard";
import { FaqAccordion } from "@/components/FaqAccordion";
import { ProductCard } from "@/components/ProductCard";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary } from "@/lib/content";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { HomeView } from "@/lib/visual/home";
import type { TextField, VisualSection } from "@/lib/visual/schema";
import { NewsCards } from "./NewsCards";

type SectionProps = {
  section: VisualSection;
  parts: VisualSection[];
  view: HomeView;
  locale: Locale;
  preview: boolean;
  selected?: string;
  content: (section: VisualSection, field: TextField) => ReactNode;
  text: (section: VisualSection, field: TextField) => string;
  onSelect?: (id: string) => void;
  slugs: string[];
};

export function HomeSection({
  section,
  parts,
  view,
  locale,
  preview,
  selected,
  content,
  text,
  onSelect,
  slugs,
}: SectionProps) {
  const title = content(section, "title");
  const body = content(section, "body");
  const eyebrow = content(section, "eyebrow");
  const t = dictionary[locale].common;
  const image = section.media[0];
  const action = section.href && text(section, "button") && (
    <Link href={localizedPath(locale, section.href)} className="text-link">
      {text(section, "button")}
    </Link>
  );
  const ordered = <T extends { slug: string },>(entries: T[]) =>
    section.entities.length
      ? slugs.flatMap((slug) => entries.find((entry) => entry.slug === slug) ?? [])
      : entries;
  const heading = (
    <div className="section-heading section-heading--row" data-reveal>
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      <p>{body}</p>
    </div>
  );
  const childControl = (part: VisualSection, label: string) => onSelect && (
    <button
      type="button"
      className="visual-select-section visual-home-child-control"
      aria-pressed={selected === part.id}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(part.id);
      }}
    >
      {label}
    </button>
  );
  switch (section.id) {
    case "legacy-intro":
      return (
        <section className="section-shell showroom-intro" data-scrub-copy>
          <div className="showroom-intro__copy">
            <p className="eyebrow">{eyebrow}</p>
            <h2>{typeof title === "string" ? title.split(" ").map((word, index) => (
              <span key={index} data-scrub-word>{word}{" "}</span>
            )) : title}</h2>
            {text(section, "body") && <p>{body}</p>}
            {action}
          </div>
          <div className="showroom-intro__media" data-image-motion>
            {image && <Image src={image} alt={text(section, "alt") || text(section, "title")} fill sizes="(max-width: 920px) 92vw, 38vw" />}
          </div>
        </section>
      );
    case "legacy-collections": {
      const photo = parts[0];
      return (
        <section className="section-shell chapter">
          {heading}
          <div className="collection-grid">
            {ordered(view.collections).map((collection, index) => (
              <CollectionCard key={collection.slug} collection={collection} locale={locale} featured={index === 0} />
            ))}
            {photo && (
              <div className="collection-card collection-card--project visual-home-child" data-section={photo.id}>
                <Link href={localizedPath(locale, "/proyectos")} className="collection-card__link">
                  <span className="collection-card__image">
                    {photo.media[0] && <Image src={photo.media[0]} alt={text(photo, "alt")} fill sizes="(max-width: 900px) 92vw, 32vw" />}
                  </span>
                  <span className="collection-card__content">
                    <span>{locale === "es" ? "Proyectos" : "Projects"}</span>
                    <strong>{locale === "es" ? "Inspiracion para instalaciones" : "Installation inspiration"}</strong>
                    <small>{locale === "es" ? "Ver proyectos" : "View projects"} →</small>
                  </span>
                </Link>
                {childControl(photo, "Editar foto de proyectos")}
              </div>
            )}
          </div>
          {action}
        </section>
      );
    }
    case "legacy-products":
      return (
        <section className="showroom-band">
          <div className="section-shell product-feature">
            {heading}
            <div className="product-grid product-grid--featured">
              {ordered(section.entities.length ? view.products : view.products.filter((product) => product.featured)).slice(0, 6).map((product) => (
                <ProductCard key={product.slug} product={product} locale={locale} preview={preview} />
              ))}
            </div>
            <Link href={localizedPath(locale, section.href || "/productos")} className="button button--dark">
              {text(section, "button") || t.viewAll}
            </Link>
          </div>
        </section>
      );
    case "legacy-philosophy":
      return (
        <section className="section-shell editorial-split">
          <div className="editorial-split__image" data-image-motion>
            {image && (
              <Image
                src={image}
                alt={text(section, "alt") || (locale === "es" ? "Asesoria de seleccion de muebles de exterior" : "Outdoor furniture selection guidance")}
                className={image === "/assets/images/yascari.jpeg" ? "editorial-split__portrait--yascari" : "editorial-split__portrait"}
                fill
                sizes="(max-width: 900px) 92vw, 42vw"
              />
            )}
          </div>
          <div className="editorial-split__copy" data-reveal>
            <p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{body}</p>
            {action}
          </div>
          {action}
        </section>
      );
    case "legacy-projects":
      return (
        <section className="section-shell projects-preview">
          {heading}
          <div className="project-strip">
            {ordered(view.projects).map((project) => (
              <Link href={localizedPath(locale, "/proyectos/" + project.slug)} key={project.slug} className="project-card">
                <Image src={project.image} alt={project.alt[locale]} fill sizes="(max-width: 900px) 88vw, 44vw" />
                <span>{project.title[locale]}</span>
              </Link>
            ))}
          </div>
        </section>
      );
    case "legacy-benefits":
      return (
        <section className="section-shell benefits-section">
          <div className="section-heading benefits-section__heading" data-reveal>
            <p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{body}</p>
          </div>
          <div className="benefits-grid">
            {parts.map((part, index) => (
              <article className="benefit-card visual-home-child" key={part.id} data-section={part.id}>
                <span className="benefit-card__number">0{index + 1}</span>
                <h3>{content(part, "title")}</h3><p>{content(part, "body")}</p>
                {childControl(part, "Editar beneficio")}
              </article>
            ))}
          </div>
        </section>
      );
    case "legacy-faq":
      return (
        <section className="faq-section">
          <div className="section-shell">
            <div className="section-heading faq-section__heading" data-reveal>
              <p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{body}</p>
            </div>
            <FaqAccordion items={parts.map((part) => ({
              id: part.id,
              question: text(part, "title"),
              answer: text(part, "body"),
              control: childControl(part, "Editar pregunta"),
            }))} />
          </div>
        </section>
      );
    case "legacy-materials": {
      const primary = parts.find((part) => part.id === "legacy-material-one");
      const secondary = parts.find((part) => part.id === "legacy-material-two");
      return (
        <section className="materials-section">
          <div className="section-shell materials-layout">
            <div className="materials-visual" data-image-motion>
              {primary?.media[0] && <Image src={primary.media[0]} alt={text(primary, "alt") || text(primary, "title")} fill sizes="(max-width: 920px) 92vw, 34vw" />}
              {secondary && (
                <div>
                  {secondary.media[0] && <Image src={secondary.media[0]} alt={text(secondary, "alt") || text(secondary, "title")} fill sizes="12rem" />}
                </div>
              )}
            </div>
            <div className="materials-copy">
              <div className="section-heading section-heading--light" data-reveal>
                <p className="eyebrow">{eyebrow}</p><h2>{title}</h2>
              </div>
              <p className="materials-lead">{body}</p>
              <div className="material-panels">
                {parts.map((part) => (
                  <article key={part.id} data-section={part.id} className="visual-home-child">
                    <h3>{content(part, "title")}</h3><p>{content(part, "body")}</p>
                    {childControl(part, "Editar material")}
                  </article>
                ))}
              </div>
              {preview ? <span className="button button--gold">{t.requestQuote}</span> : (
                <QuoteLink className="button button--gold">{t.requestQuote}</QuoteLink>
              )}
            </div>
          </div>
        </section>
      );
    }
    case "legacy-news": {
      const news = ordered(view.news).slice(0, 3);
      if (!news.length && !onSelect) return null;
      return (
        <section className="section-shell product-feature" aria-label={text(section, "title") || (locale === "es" ? "Noticias" : "News")}>
          <div className="section-heading section-heading--row">
            <h2>{title}</h2>
            <Link href={localizedPath(locale, section.href || "/noticias")} className="text-link">
              {text(section, "button")}
            </Link>
          </div>
          <NewsCards entries={news} locale={locale} heading="h3" />
        </section>
      );
    }
  }
}

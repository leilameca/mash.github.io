import { Fragment, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import "./home-editorial.css";

export function HomeHero({
  locale,
  eyebrow,
  title,
  tagline,
  description,
  actions,
  background,
  alt,
  showroom = [],
  showroomControl,
  heading: Heading = "h1",
  design,
}: {
  locale: Locale;
  eyebrow: string;
  title: ReactNode;
  tagline?: ReactNode;
  description: ReactNode;
  actions: ReactNode;
  background?: string;
  alt?: string;
  showroom?: (string | undefined)[];
  showroomControl?: ReactNode;
  heading?: "h1" | "h2";
  design?: CSSProperties;
}) {
  return (
    <div className="home-editorial-frame" style={design}>
      <div className="hero-section">
        <div className="hero-media" data-image-motion>
          {background && (
            <Image
              src={background}
              alt={alt || (locale === "es" ? "Muebles de exterior para terraza y piscina" : "Outdoor furniture for terrace and pool")}
              className="hero-media__image"
              fill
              priority
              sizes="100vw"
            />
          )}
        </div>
        <div className="hero-content">
          <div className="hero-copy" data-reveal>
            <p className="eyebrow">{eyebrow}</p>
            <Heading className="hero-title">{title}</Heading>
            {tagline && <p className="hero-tagline">{tagline}</p>}
            <p className="hero-description">{description}</p>
            <div className="hero-actions">{actions}</div>
          </div>
          {showroom.some(Boolean) && (
            <div className="hero-showroom" aria-hidden="true" data-reveal>
              {showroom[0] && (
                <div className="hero-showroom__main">
                  <Image src={showroom[0]} alt="" fill sizes="(max-width: 920px) 0px, 24vw" />
                </div>
              )}
              {showroom[1] && (
                <div className="hero-showroom__small">
                  <Image src={showroom[1]} alt="" fill sizes="(max-width: 920px) 0px, 14vw" />
                </div>
              )}
              <p>
                {locale === "es"
                  ? "Terrazas, balcones y piscinas con presencia de showroom."
                  : "Terraces, balconies and pools with showroom presence."}
              </p>
            </div>
          )}
        </div>
        {showroomControl}
      </div>
    </div>
  );
}

export function HomeLifestyle({
  locale,
  entries,
}: {
  locale: Locale;
  entries: { id: string; label: ReactNode; image?: string }[];
}) {
  return (
    <div className="home-editorial-frame">
      <section
        className="lifestyle-band"
        aria-label={locale === "es" ? "Inspiración exterior" : "Outdoor inspiration"}
      >
        <div
          className="lifestyle-band__track"
          style={{ gridTemplateColumns: entries.map(({ image }) => image ? "auto minmax(8rem, 14rem)" : "auto").join(" ") }}
          tabIndex={0}
        >
          {entries.map(({ id, label, image }) => (
            <Fragment key={id}>
              <span>{label}</span>
              {image && (
                <div className="lifestyle-band__photo">
                  <Image src={image} alt="" fill sizes="15rem" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </section>
    </div>
  );
}

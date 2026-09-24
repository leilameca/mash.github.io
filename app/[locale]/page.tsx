import Image from "next/image";
import Link from "next/link";
import { CollectionCard } from "@/components/CollectionCard";
import { ProductCard } from "@/components/ProductCard";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary, projects, site } from "@/lib/content";
import { isLocale, localizedPath, type Locale } from "@/lib/i18n";
import { getCatalogCollections, getCatalogProducts } from "@/lib/supabase/catalog";
import { notFound } from "next/navigation";

function splitWords(text: string) {
  return text.split(" ").map((word, index) => (
    <span key={`${word}-${index}`} data-scrub-word>
      {word}{" "}
    </span>
  ));
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = dictionary[locale].common;
  const [collections, catalogProducts] = await Promise.all([getCatalogCollections(), getCatalogProducts(locale)]);
  const featuredProducts = catalogProducts.filter((product) => product.featured).slice(0, 6);
  const heroCopy =
    locale === "es"
      ? "En MASH encuentras muebles resistentes para terrazas, patios, balcones y piscinas, con asesoría para elegir piezas que funcionen en tu espacio y respondan al exterior."
      : "At MASH, you will find outdoor-ready furniture for terraces, patios, balconies and pools, with guidance to choose pieces that work for your space.";
  const philosophy =
    locale === "es"
      ? "Más que muebles, creamos espacios que se viven."
      : "More than furniture, we shape outdoor spaces to be lived in.";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    name: "MASH | Martinez Star Home",
    url: "https://mashoficial.com/",
    image: "https://mashoficial.com/assets/images/oasis-hero.jpg",
    logo: "https://mashoficial.com/assets/images/logo.png",
    telephone: "+1-809-327-2139",
    email: site.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Santiago",
      addressCountry: "DO"
    },
    areaServed: ["Santiago", "Republica Dominicana"],
    sameAs: [site.instagram]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="hero-section">
        <div className="hero-media" data-image-motion>
          <Image
            src="/assets/images/oasis-hero.jpg"
            alt={locale === "es" ? "Muebles de exterior para terraza y piscina" : "Outdoor furniture for terrace and pool"}
            fill
            priority
            sizes="100vw"
          />
        </div>
        <div className="hero-content section-shell">
          <div className="hero-copy" data-reveal>
            <p className="eyebrow">MASH | {site.fullName}</p>
            <h1>{locale === "es" ? "Diseñamos espacios para disfrutarlos afuera." : "We design spaces made to be enjoyed outside."}</h1>
            <p>{heroCopy}</p>
            <div className="hero-actions">
              <Link href={localizedPath(locale, "/colecciones")} className="button button--gold">
                {t.viewCollections}
              </Link>
              <QuoteLink className="button button--light">{t.quote}</QuoteLink>
            </div>
          </div>
          <div className="hero-showroom" aria-hidden="true" data-reveal>
            <div className="hero-showroom__main">
              <Image src="/assets/images/candor-mix-collection.jpeg" alt="" fill sizes="(max-width: 920px) 0px, 24vw" />
            </div>
            <div className="hero-showroom__small">
              <Image src="/assets/images/oculus-mare-dining.jpg" alt="" fill sizes="(max-width: 920px) 0px, 14vw" />
            </div>
            <p>{locale === "es" ? "Terrazas, balcones y piscinas con presencia de showroom." : "Terraces, balconies and pools with showroom presence."}</p>
          </div>
        </div>
      </section>

      <section className="section-shell showroom-intro" data-scrub-copy>
        <div className="showroom-intro__copy">
          <p className="eyebrow">{locale === "es" ? "Showroom exterior" : "Outdoor showroom"}</p>
          <h2>{splitWords(philosophy)}</h2>
        </div>
        <div className="showroom-intro__media" data-image-motion>
          <Image src="/assets/images/area-set-patio-terraza-santiago.jpeg" alt={locale === "es" ? "Muebles para patio y terraza" : "Patio and terrace furniture"} fill sizes="(max-width: 920px) 92vw, 38vw" />
        </div>
      </section>

      <section className="section-shell chapter">
        <div className="section-heading section-heading--row" data-reveal>
          <div>
            <p className="eyebrow">{locale === "es" ? "Colecciones" : "Collections"}</p>
            <h2>{locale === "es" ? "Ambientes completos, no piezas aisladas." : "Complete settings, not isolated pieces."}</h2>
          </div>
          <p>
            {locale === "es"
              ? "Cada coleccion funciona como una entrada clara al catalogo: socializar, comer afuera o descansar junto a la piscina."
              : "Each collection acts as a clear entry into the catalog: gathering, dining outside or resting by the pool."}
          </p>
        </div>
        <div className="collection-grid">
          {collections.map((collection, index) => (
            <CollectionCard key={collection.slug} collection={collection} locale={locale} featured={index === 0} />
          ))}
          <Link href={localizedPath(locale, "/proyectos")} className="collection-card collection-card--project">
            <span className="collection-card__image">
              <Image src="/assets/images/WhatsApp Image 2026-03-03 at 12.33.08 PM.jpeg" alt="" fill sizes="(max-width: 900px) 92vw, 32vw" />
            </span>
            <span className="collection-card__content">
              <span>{locale === "es" ? "Proyectos" : "Projects"}</span>
              <strong>{locale === "es" ? "Inspiracion para instalaciones" : "Installation inspiration"}</strong>
              <small>{locale === "es" ? "Ver proyectos" : "View projects"} →</small>
            </span>
          </Link>
        </div>
      </section>

      <section className="showroom-band">
        <div className="section-shell product-feature">
          <div className="section-heading section-heading--row" data-reveal>
            <div>
              <p className="eyebrow">{locale === "es" ? "Productos destacados" : "Featured products"}</p>
              <h2>{locale === "es" ? "Piezas para mirar de cerca y cotizar con criterio." : "Pieces to inspect closely and quote with intention."}</h2>
            </div>
            <p>
              {locale === "es"
                ? "Sin carrito ni checkout. El recorrido lleva a entender la pieza y pedir una cotizacion por WhatsApp."
                : "No cart or checkout. The path helps visitors understand the piece and request a WhatsApp quote."}
            </p>
          </div>
          <div className="product-grid product-grid--featured">
            {featuredProducts.map((product, index) => (
              <ProductCard key={product.slug} product={product} locale={locale} priority={index < 2} />
            ))}
          </div>
          <Link href={localizedPath(locale, "/productos")} className="button button--dark">
            {t.viewAll}
          </Link>
        </div>
      </section>

      <section className="lifestyle-band" aria-label={locale === "es" ? "Inspiracion exterior" : "Outdoor inspiration"}>
        <div className="lifestyle-band__track">
          <span>{locale === "es" ? "Terrazas" : "Terraces"}</span>
          <div><Image src="/assets/images/cama-balinesa-trap.jpg" alt="" fill sizes="15rem" /></div>
          <span>{locale === "es" ? "Balcones" : "Balconies"}</span>
          <div><Image src="/assets/images/rombois-set.jpg" alt="" fill sizes="15rem" /></div>
          <span>{locale === "es" ? "Piscinas" : "Pools"}</span>
          <div><Image src="/assets/images/oculus-chaise.jpg" alt="" fill sizes="15rem" /></div>
        </div>
      </section>

      <section className="section-shell editorial-split">
        <div className="editorial-split__image" data-image-motion>
          <Image
            src="/assets/images/yascari.jpeg"
            alt={locale === "es" ? "Asesoria de seleccion de muebles de exterior" : "Outdoor furniture selection guidance"}
            fill
            sizes="(max-width: 900px) 92vw, 42vw"
          />
        </div>
        <div className="editorial-split__copy" data-reveal>
          <p className="eyebrow">{locale === "es" ? "Filosofia MASH" : "MASH philosophy"}</p>
          <h2>{philosophy}</h2>
          <p>
            {locale === "es"
              ? "La idea es que compres algo que se vea bien, resista el exterior y tenga sentido para tu terraza, patio, balcon, piscina o proyecto de hospitalidad."
              : "The idea is to choose pieces that look good, perform outdoors and make sense for your terrace, patio, balcony, pool or hospitality project."}
          </p>
        </div>
      </section>

      <section className="section-shell projects-preview">
        <div className="section-heading section-heading--row" data-reveal>
          <div>
            <p className="eyebrow">{locale === "es" ? "Proyectos" : "Projects"}</p>
            <h2>{locale === "es" ? "Imagina las piezas dentro del espacio." : "Imagine the pieces within the space."}</h2>
          </div>
          <p>
            {locale === "es"
              ? "Presentacion visual temporal para preparar la futura galeria de instalaciones completadas con contenido real."
              : "Temporary visual presentation prepared for the future completed-installations gallery with real content."}
          </p>
        </div>
        <div className="project-strip">
          {projects.map((project) => (
            <Link href={localizedPath(locale, "/proyectos")} key={project.slug} className="project-card">
              <Image src={project.image} alt={project.alt[locale]} fill sizes="(max-width: 900px) 88vw, 44vw" />
              <span>{project.title[locale]}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="materials-section">
        <div className="section-shell materials-layout">
          <div className="materials-visual" data-image-motion>
            <Image src="/assets/images/textura-ratan.jpg" alt={locale === "es" ? "Detalle de fibra sintetica" : "Synthetic fiber detail"} fill sizes="(max-width: 920px) 92vw, 34vw" />
            <div>
              <Image src="/assets/images/estructura-acero.jpg" alt={locale === "es" ? "Detalle de estructura galvanizada" : "Galvanized structure detail"} fill sizes="12rem" />
            </div>
          </div>
          <div className="materials-copy">
            <div className="section-heading section-heading--light" data-reveal>
              <p className="eyebrow">{locale === "es" ? "Materiales" : "Materials"}</p>
              <h2>{locale === "es" ? "Hechos para verse bien y responder afuera." : "Made to look good and perform outside."}</h2>
            </div>
            <p className="materials-lead">
              {locale === "es"
                ? "El valor esta en la combinacion: acabado calido, estructura firme y mantenimiento simple para uso real en exterior."
                : "The value is in the combination: warm finish, firm structure and simple maintenance for real outdoor use."}
            </p>
            <div className="material-panels">
              <article>
                <h3>{locale === "es" ? "Fibra sintetica" : "Synthetic fiber"}</h3>
                <p>
                  {locale === "es"
                    ? "Un acabado calido y elegante, pensado para responder mejor al clima exterior de Republica Dominicana."
                    : "A warm and elegant finish chosen to respond better to the Dominican outdoor climate."}
                </p>
              </article>
              <article>
                <h3>{locale === "es" ? "Perfiles galvanizados" : "Galvanized profiles"}</h3>
                <p>
                  {locale === "es"
                    ? "Una base firme y confiable para que el mueble se mantenga estable y listo para exterior."
                    : "A firm, reliable base so each piece stays stable and ready for outdoor use."}
                </p>
              </article>
            </div>
            <QuoteLink className="button button--gold">{t.requestQuote}</QuoteLink>
          </div>
        </div>
      </section>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { CollectionCard } from "@/components/CollectionCard";
import { ProductCard } from "@/components/ProductCard";
import { QuoteLink } from "@/components/QuoteLink";
import { dictionary } from "@/lib/content";
import { isLocale, localizedPath, type Locale } from "@/lib/i18n";
import { getCatalogCollections, getCatalogProducts, getCatalogProjects } from "@/lib/supabase/catalog";
import { getHomeHeroContent, getHomeSectionsContent, getSiteChromeContent } from "@/lib/supabase/site-content";
import { notFound } from "next/navigation";
import { FaqAccordion } from "@/components/FaqAccordion";

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
  const [collections, catalogProducts, projects, heroContent, homeSections, site] = await Promise.all([
    getCatalogCollections(),
    getCatalogProducts(locale),
    getCatalogProjects(locale),
    getHomeHeroContent(locale),
    getHomeSectionsContent(locale),
    getSiteChromeContent(locale)
  ]);
  const featuredProducts = catalogProducts.filter((product) => product.featured).slice(0, 6);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    name: "MASH | Martinez Star Home",
    url: "https://mashoficial.com/",
    image: "https://mashoficial.com/assets/images/oasis-hero-v2.jpg",
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
            src={heroContent.image}
            alt={locale === "es" ? "Muebles de exterior para terraza y piscina" : "Outdoor furniture for terrace and pool"}
            className="hero-media__image"
            fill
            priority
            sizes="100vw"
          />
        </div>
        <div className="hero-content section-shell">
          <div className="hero-copy" data-reveal>
            <p className="eyebrow">MASH | {site.fullName}</p>
            <h1>{heroContent.title}</h1>
            <p>{heroContent.description}</p>
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
          <p className="eyebrow">{homeSections.introEyebrow}</p>
          <h2>{splitWords(homeSections.introTitle)}</h2>
        </div>
        <div className="showroom-intro__media" data-image-motion>
          <Image src={homeSections.introImage} alt={homeSections.introTitle} fill sizes="(max-width: 920px) 92vw, 38vw" />
        </div>
      </section>

      <section className="section-shell chapter">
        <div className="section-heading section-heading--row" data-reveal>
          <div>
            <p className="eyebrow">{homeSections.collectionsEyebrow}</p>
            <h2>{homeSections.collectionsTitle}</h2>
          </div>
          <p>{homeSections.collectionsDescription}</p>
        </div>
        <div className="collection-grid">
          {collections.map((collection, index) => (
            <CollectionCard key={collection.slug} collection={collection} locale={locale} featured={index === 0} />
          ))}
          <Link href={localizedPath(locale, "/proyectos")} className="collection-card collection-card--project">
            <span className="collection-card__image">
              <Image src={homeSections.projectsImage} alt="" fill sizes="(max-width: 900px) 92vw, 32vw" />
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
              <p className="eyebrow">{homeSections.featuredEyebrow}</p>
              <h2>{homeSections.featuredTitle}</h2>
            </div>
            <p>{homeSections.featuredDescription}</p>
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
          <span>{homeSections.lifestyleLabels[0]}</span>
          <div><Image src="/assets/images/cama-balinesa-trap.jpg" alt="" fill sizes="15rem" /></div>
          <span>{homeSections.lifestyleLabels[1]}</span>
          <div><Image src="/assets/images/rombois-set.jpg" alt="" fill sizes="15rem" /></div>
          <span>{homeSections.lifestyleLabels[2]}</span>
          <div><Image src="/assets/images/oculus-chaise.jpg" alt="" fill sizes="15rem" /></div>
        </div>
      </section>

      <section className="section-shell editorial-split">
        <div className="editorial-split__image" data-image-motion>
          <Image
            src={homeSections.philosophyImage}
            alt={locale === "es" ? "Asesoria de seleccion de muebles de exterior" : "Outdoor furniture selection guidance"}
            className="editorial-split__portrait"
            fill
            sizes="(max-width: 900px) 92vw, 42vw"
          />
        </div>
        <div className="editorial-split__copy" data-reveal>
          <p className="eyebrow">{homeSections.philosophyEyebrow}</p>
          <h2>{homeSections.philosophyTitle}</h2>
          <p>{homeSections.philosophyDescription}</p>
        </div>
      </section>

      <section className="section-shell projects-preview">
        <div className="section-heading section-heading--row" data-reveal>
          <div>
            <p className="eyebrow">{homeSections.projectsEyebrow}</p>
            <h2>{homeSections.projectsTitle}</h2>
          </div>
          <p>{homeSections.projectsDescription}</p>
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

      {homeSections.visible.benefits && <section className="section-shell benefits-section">
        <div className="section-heading benefits-section__heading" data-reveal>
          <p className="eyebrow">{homeSections.benefitsEyebrow}</p>
          <h2>{homeSections.benefitsTitle}</h2>
          <p>{homeSections.benefitsDescription}</p>
        </div>
        <div className="benefits-grid">{homeSections.benefits.map((benefit, index) => <article className="benefit-card" key={benefit.title}>
          <span className="benefit-card__number">0{index + 1}</span><h3>{benefit.title}</h3><p>{benefit.description}</p>
        </article>)}</div>
      </section>}

      {homeSections.visible.faq && <section className="faq-section">
        <div className="section-shell">
          <div className="section-heading faq-section__heading" data-reveal>
            <p className="eyebrow">{homeSections.faqEyebrow}</p><h2>{homeSections.faqTitle}</h2><p>{homeSections.faqDescription}</p>
          </div>
          <FaqAccordion items={homeSections.faqs} />
        </div>
      </section>}

      <section className="materials-section">
        <div className="section-shell materials-layout">
          <div className="materials-visual" data-image-motion>
            <Image src={homeSections.materialsPrimaryImage} alt={homeSections.materialOneTitle} fill sizes="(max-width: 920px) 92vw, 34vw" />
            <div>
              <Image src={homeSections.materialsSecondaryImage} alt={homeSections.materialTwoTitle} fill sizes="12rem" />
            </div>
          </div>
          <div className="materials-copy">
            <div className="section-heading section-heading--light" data-reveal>
              <p className="eyebrow">{homeSections.materialsEyebrow}</p>
              <h2>{homeSections.materialsTitle}</h2>
            </div>
            <p className="materials-lead">{homeSections.materialsLead}</p>
            <div className="material-panels">
              <article>
                <h3>{homeSections.materialOneTitle}</h3>
                <p>{homeSections.materialOneDescription}</p>
              </article>
              <article>
                <h3>{homeSections.materialTwoTitle}</h3>
                <p>{homeSections.materialTwoDescription}</p>
              </article>
            </div>
            <QuoteLink className="button button--gold">{t.requestQuote}</QuoteLink>
          </div>
        </div>
      </section>
    </>
  );
}

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { getFallbackMarketingPage, getFallbackSiteChrome, getHomeSectionsContent } from "@/lib/supabase/site-content";
import { StudioShell } from "../StudioShell";
import { GeneralSettingsForm } from "./GeneralSettingsForm";
import { HomeContentForm } from "./HomeContentForm";
import { NavigationForm } from "./NavigationForm";
import { MarketingPagesForm } from "./MarketingPagesForm";
import { HomeSectionsForm } from "./HomeSectionsForm";

const fallback = {
  title_es: "Diseñamos espacios para disfrutarlos afuera.",
  description_es:
    "En MASH encuentras muebles resistentes para terrazas, patios, balcones y piscinas, con asesoría para elegir piezas que funcionen en tu espacio y respondan al exterior.",
  title_en: "We design spaces made to be enjoyed outside.",
  description_en:
    "At MASH, you will find outdoor-ready furniture for terraces, patios, balconies and pools, with guidance to choose pieces that work for your space.",
  image_path: "/assets/images/oasis-hero-v2.jpg"
};

export default async function StudioContentPage() {
  const currentAdmin = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const [{ data }, homeSectionsEs, homeSectionsEn] = await Promise.all([
    admin
      .from("site_content")
      .select("key,value,site_content_translations(locale,value)")
      .in("key", ["home.hero", "site.settings", "site.navigation", "site.footer", "page.about", "page.contact", "page.projects"]),
    getHomeSectionsContent("es"),
    getHomeSectionsContent("en")
  ]);
  const rows = (data ?? []) as any[];
  const getRow = (key: string) => rows.find((item) => item.key === key);
  const getText = (row: any, locale: "es" | "en") =>
    row?.site_content_translations?.find((item: any) => item.locale === locale)?.value ?? {};
  const heroRow = getRow("home.hero");
  const heroEs = getText(heroRow, "es");
  const heroEn = getText(heroRow, "en");
  const settingsRow = getRow("site.settings");
  const settingsEs = getText(settingsRow, "es");
  const settingsEn = getText(settingsRow, "en");
  const footerRow = getRow("site.footer");
  const footerEs = getText(footerRow, "es");
  const footerEn = getText(footerRow, "en");
  const navigationRow = getRow("site.navigation");
  const navigationEs = getText(navigationRow, "es");
  const navigationEn = getText(navigationRow, "en");
  const fallbackEs = getFallbackSiteChrome("es");
  const fallbackEn = getFallbackSiteChrome("en");
  const storedItems = Array.isArray(navigationRow?.value?.items) ? navigationRow.value.items : [];
  const navigationItems = storedItems.length
    ? storedItems.map((item: any) => ({
        id: String(item.id),
        href: String(item.href ?? ""),
        label_es: navigationEs.labels?.[item.id] ?? item.id,
        label_en: navigationEn.labels?.[item.id] ?? item.id,
        visible: item.visible !== false
      }))
    : fallbackEs.navigation.map((item, index) => ({
        id: item.id,
        href: item.href,
        label_es: item.label,
        label_en: fallbackEn.navigation[index]?.label ?? item.label,
        visible: true
      }));
  const pageValue = (key: "about" | "contact" | "projects", locale: "es" | "en") => {
    const row = getRow(`page.${key}`);
    const text = getText(row, locale);
    const defaults = getFallbackMarketingPage(key, locale);
    return {
      eyebrow: text.eyebrow ?? defaults.eyebrow,
      title: text.title ?? defaults.title,
      description: text.description ?? defaults.description,
      image: row?.value?.image_path ?? defaults.image
    };
  };

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Editor del sitio</p>
          <h1>Contenido</h1>
        </div>
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Marca y contacto</p>
        <h2>Datos generales y footer</h2>
        <GeneralSettingsForm
          value={{
            full_name: settingsRow?.value?.full_name ?? fallbackEs.fullName,
            phone: settingsRow?.value?.phone ?? fallbackEs.phone,
            whatsapp: settingsRow?.value?.whatsapp ?? fallbackEs.whatsapp,
            instagram: settingsRow?.value?.instagram ?? fallbackEs.instagram,
            instagram_handle: settingsRow?.value?.instagram_handle ?? fallbackEs.instagramHandle,
            email: settingsRow?.value?.email ?? fallbackEs.email,
            location_es: settingsEs.location ?? fallbackEs.location,
            location_en: settingsEn.location ?? fallbackEn.location,
            footer_cta_es: footerEs.cta ?? fallbackEs.footerCta,
            footer_cta_en: footerEn.cta ?? fallbackEn.footerCta,
            footer_description_es: footerEs.description ?? fallbackEs.footerDescription,
            footer_description_en: footerEn.description ?? fallbackEn.footerDescription,
            footer_navigation_title_es: footerEs.navigation_title ?? fallbackEs.footerNavigationTitle,
            footer_navigation_title_en: footerEn.navigation_title ?? fallbackEn.footerNavigationTitle,
            footer_legal_title_es: footerEs.legal_title ?? fallbackEs.footerLegalTitle,
            footer_legal_title_en: footerEn.legal_title ?? fallbackEn.footerLegalTitle,
            copyright_es: footerEs.copyright ?? fallbackEs.copyright,
            copyright_en: footerEn.copyright ?? fallbackEn.copyright
          }}
        />
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Header</p>
        <h2>Navegacion y botones</h2>
        <NavigationForm
          value={{
            items: navigationItems,
            quote_label_es: navigationEs.quote_label ?? fallbackEs.quoteLabel,
            quote_label_en: navigationEn.quote_label ?? fallbackEn.quoteLabel,
            request_quote_label_es: navigationEs.request_quote_label ?? fallbackEs.requestQuoteLabel,
            request_quote_label_en: navigationEn.request_quote_label ?? fallbackEn.requestQuoteLabel,
            menu_label_es: navigationEs.menu_label ?? fallbackEs.menuLabel,
            menu_label_en: navigationEn.menu_label ?? fallbackEn.menuLabel,
            close_label_es: navigationEs.close_label ?? fallbackEs.closeLabel,
            close_label_en: navigationEn.close_label ?? fallbackEn.closeLabel
          }}
        />
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Pagina de inicio</p>
        <h2>Hero principal</h2>
        <HomeContentForm
          content={{
            title_es: heroEs.title ?? fallback.title_es,
            description_es: heroEs.description ?? fallback.description_es,
            title_en: heroEn.title ?? fallback.title_en,
            description_en: heroEn.description ?? fallback.description_en,
            image_path: heroRow?.value?.image_path ?? fallback.image_path
          }}
        />
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Paginas institucionales</p>
        <h2>Nosotros, contacto y proyectos</h2>
        <MarketingPagesForm
          aboutEs={pageValue("about", "es")}
          aboutEn={pageValue("about", "en")}
          contactEs={pageValue("contact", "es")}
          contactEn={pageValue("contact", "en")}
          projectsEs={pageValue("projects", "es")}
          projectsEn={pageValue("projects", "en")}
        />
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Pagina de inicio</p>
        <h2>Secciones, textos e imagenes</h2>
        <HomeSectionsForm es={homeSectionsEs} en={homeSectionsEn} />
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Arquitectura modular</p>
        <h2>Preparado para crecer por secciones</h2>
        <p>
          El contenido se guarda como bloques bilingues independientes. El mismo sistema permite incorporar despues materiales,
          contacto, menus, banners y nuevas paginas sin cambiar la estructura del catalogo.
        </p>
      </section>
    </StudioShell>
  );
}

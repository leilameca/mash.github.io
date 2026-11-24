const routes = {
  productos: ["catalog", "view_item"],
  colecciones: ["collections", "view_collection"],
  proyectos: ["projects", "view_project"],
  noticias: ["news", "view_article"],
  contacto: ["contact"],
  nosotros: ["about"],
  privacidad: ["privacy"],
  cookies: ["cookies"],
  terminos: ["terms"],
} as const;

export type Interaction =
  | "click_whatsapp"
  | "view_gallery"
  | "compare_photos"
  | "change_language"
  | "click_directions";

export function publicAnalyticsPage(pathname: string) {
  const match =
    /^\/(es|en)(?:\/([a-z]+)(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?)?\/?$/.exec(
      pathname,
    );
  if (!match) return null;
  const [, language, section, slug] = match;
  if (section && !Object.hasOwn(routes, section)) return null;
  const route = section ? routes[section as keyof typeof routes] : ["home"];
  if (!route || (slug && !route[1])) return null;
  return {
    language,
    page_type: route[0],
    detailEvent: slug ? route[1] : undefined,
  };
}

export function analyticsHostAllowed(host: string) {
  return host === "www.mashoficial.com" || host === "mashoficial.com";
}

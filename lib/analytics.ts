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

const interactions: readonly Interaction[] = [
  "click_whatsapp",
  "view_gallery",
  "compare_photos",
  "change_language",
  "click_directions",
];

export type AnalyticsEvent = {
  event: string;
  language: string;
  page_type: string;
};

export const analyticsEventNames = [
  "page_view",
  "view_item",
  "view_collection",
  "view_project",
  "view_article",
  ...interactions,
];

const analyticsPageTypes = [
  "home",
  ...Object.values(routes).map(([type]) => type),
];

export function isAnalyticsEvent(payload: unknown): payload is AnalyticsEvent {
  if (!payload || typeof payload !== "object") return false;
  const detail = payload as Record<string, unknown>;
  return (
    analyticsEventNames.some((name) => name === detail.event) &&
    analyticsPageTypes.some((name) => name === detail.page_type) &&
    (detail.language === "es" || detail.language === "en")
  );
}

export function createAnalyticsCollector(
  receive: (event: AnalyticsEvent) => void,
) {
  let previous = "";
  return (host: string, pathname: string, interaction?: string) => {
    if (!analyticsHostAllowed(host)) return;
    const page = publicAnalyticsPage(pathname);
    if (!page) return;
    const emit = (event: string) =>
      receive({ event, language: page.language, page_type: page.page_type });
    if (interaction !== undefined) {
      if (interactions.some((name) => name === interaction)) emit(interaction);
      return;
    }
    if (previous === pathname) return;
    previous = pathname;
    emit("page_view");
    if (page.detailEvent) emit(page.detailEvent);
  };
}

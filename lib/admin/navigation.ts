import type { StudioIconName } from "@/app/studio-mash/StudioIcon";
export type StudioNavItem = {
  href: string;
  label: string;
  group?: string;
  icon?: StudioIconName;
  pending?: boolean;
};
export const studioNavigation: StudioNavItem[] = [
  { href: "/studio-mash", label: "Inicio", group: "General", icon: "overview" },
  {
    href: "/studio-mash/productos",
    label: "Productos",
    group: "Catálogo",
    icon: "products",
  },
  {
    href: "/studio-mash/colecciones",
    label: "Colecciones",
    group: "Catálogo",
    icon: "collections",
  },
  {
    href: "/studio-mash/proyectos",
    label: "Proyectos",
    group: "Contenido",
    icon: "projects",
  },
  {
    href: "/studio-mash/multimedia",
    label: "Multimedia",
    group: "Contenido",
    icon: "media",
  },
  {
    href: "/studio-mash/contenido",
    label: "Sitio web",
    group: "Contenido",
    icon: "content",
  },
  {
    href: "/studio-mash/noticias",
    label: "Noticias",
    group: "Contenido",
    icon: "news",
    pending: true,
  },
  {
    href: "/studio-mash/traducciones",
    label: "Traducciones",
    group: "Herramientas",
    icon: "translate",
    pending: true,
  },
  {
    href: "/studio-mash/analitica",
    label: "Analítica",
    group: "Herramientas",
    icon: "analytics",
    pending: true,
  },
  {
    href: "/studio-mash/revisiones",
    label: "Historial",
    group: "Herramientas",
    icon: "history",
  },
  {
    href: "/studio-mash/configuracion",
    label: "Configuración",
    group: "Sistema",
    icon: "settings",
  },
];

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MASH | Martinez Star Home",
    short_name: "MASH",
    description: "Muebles de exterior para terrazas, patios, balcones y piscinas.",
    lang: "es",
    start_url: "/es",
    scope: "/",
    display: "standalone",
    background_color: "#f6f1ea",
    theme_color: "#113221",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "Catálogo", short_name: "Catálogo", url: "/es/productos" },
      { name: "Colecciones", short_name: "Colecciones", url: "/es/colecciones" },
      { name: "English", url: "/en" }
    ]
  };
}

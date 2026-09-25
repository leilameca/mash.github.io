import type { Locale } from "./i18n";

export const site = {
  name: "MASH",
  fullName: "Martinez Star Home",
  phone: "+1 (809) 327-2139",
  phoneHref: "tel:+18093272139",
  whatsapp: "https://wa.me/18093272139",
  instagram: "https://instagram.com/martinez_star_home",
  instagramHandle: "@martinez_star_home",
  email: "martinezstarhome@gmail.com",
  emailHref: "mailto:martinezstarhome@gmail.com",
  location: {
    es: "Santiago, Republica Dominicana",
    en: "Santiago, Dominican Republic"
  }
};

export type LocalizedText = Record<Locale, string>;

export type Product = {
  slug: string;
  name: string;
  collectionSlug: string;
  image: string;
  gallery: string[];
  alt: LocalizedText;
  description: LocalizedText;
  materials: LocalizedText;
  dimensions: LocalizedText;
  finishes: LocalizedText;
  care: LocalizedText;
  featured?: boolean;
};

export type Collection = {
  slug: string;
  label: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  image: string;
  alt: LocalizedText;
  note: LocalizedText;
};

export type Project = {
  slug: string;
  title: LocalizedText;
  location: LocalizedText;
  description: LocalizedText;
  image: string;
  alt: LocalizedText;
};

export const dictionary = {
  es: {
    nav: {
      home: "Inicio",
      collections: "Colecciones",
      products: "Productos",
      projects: "Proyectos",
      about: "Nosotros",
      contact: "Contacto",
      quote: "Cotizar",
      menu: "Abrir menu",
      close: "Cerrar menu"
    },
    common: {
      viewCollections: "Ver colecciones",
      quote: "Cotizar",
      requestQuote: "Solicitar cotizacion",
      viewAll: "Ver todos",
      viewProducts: "Ver productos",
      viewDetails: "Ver detalle",
      relatedProducts: "Productos relacionados",
      collection: "Coleccion",
      materials: "Materiales",
      dimensions: "Dimensiones",
      finishes: "Acabados",
      care: "Cuidados"
    },
    meta: {
      homeTitle: "Muebles de exterior en Santiago, Republica Dominicana",
      homeDescription:
        "MASH crea espacios exteriores con muebles para terrazas, patios, balcones, piscinas, hoteles y restaurantes en Republica Dominicana."
    }
  },
  en: {
    nav: {
      home: "Home",
      collections: "Collections",
      products: "Products",
      projects: "Projects",
      about: "About",
      contact: "Contact",
      quote: "Quote",
      menu: "Open menu",
      close: "Close menu"
    },
    common: {
      viewCollections: "View collections",
      quote: "Quote",
      requestQuote: "Request quote",
      viewAll: "View all",
      viewProducts: "View products",
      viewDetails: "View details",
      relatedProducts: "Related products",
      collection: "Collection",
      materials: "Materials",
      dimensions: "Dimensions",
      finishes: "Finishes",
      care: "Care"
    },
    meta: {
      homeTitle: "Outdoor furniture in Santiago, Dominican Republic",
      homeDescription:
        "MASH creates outdoor spaces with furniture for terraces, patios, balconies, pools, hotels and restaurants in the Dominican Republic."
    }
  }
} as const;

export const collections: Collection[] = [
  {
    slug: "terraza",
    label: { es: "Terraza", en: "Terrace" },
    title: {
      es: "Juegos de exterior para recibir con comodidad",
      en: "Outdoor lounge sets made for hosting"
    },
    description: {
      es: "Sets para patios, terrazas sociales y villas donde la comodidad, la presencia visual y la resistencia importan por igual.",
      en: "Sets for patios, social terraces and villas where comfort, visual presence and durability matter equally."
    },
    image: "/assets/images/oasis-set.jpg",
    alt: {
      es: "Juego de terraza Oasis para patio amplio en Santiago",
      en: "Oasis terrace set for a spacious patio in Santiago"
    },
    note: {
      es: "Ideal para terrazas sociales, patios amplios y areas de reunion al aire libre.",
      en: "Ideal for social terraces, spacious patios and open-air gathering areas."
    }
  },
  {
    slug: "dining",
    label: { es: "Dining", en: "Dining" },
    title: {
      es: "Comedores exteriores para balcones, rooftops y restaurantes",
      en: "Outdoor dining for balconies, rooftops and restaurants"
    },
    description: {
      es: "Mesas y sillas con presencia moderna para comer, conversar y recibir en espacios exteriores residenciales o comerciales.",
      en: "Tables and chairs with a modern presence for dining, gathering and hosting in residential or commercial outdoor spaces."
    },
    image: "/assets/images/oculus-mare-dining.jpg",
    alt: {
      es: "Comedor exterior Oculus Mare para terraza en Republica Dominicana",
      en: "Oculus Mare outdoor dining set for a Dominican Republic terrace"
    },
    note: {
      es: "Pensado para balcones, terrazas, restaurantes, hoteles y comedores al aire libre.",
      en: "Designed for balconies, terraces, restaurants, hotels and open-air dining spaces."
    }
  },
  {
    slug: "piscina",
    label: { es: "Piscina", en: "Pool" },
    title: {
      es: "Piezas de descanso para piscina, jardin y villas",
      en: "Relaxation pieces for pools, gardens and villas"
    },
    description: {
      es: "Camas balinesas, chaise lounges y piezas de descanso para crear un ambiente tipo resort en casa o en proyectos de hospitalidad.",
      en: "Daybeds, chaise lounges and relaxation pieces for a resort-like atmosphere at home or in hospitality projects."
    },
    image: "/assets/images/cama-balinesa-trap.jpg",
    alt: {
      es: "Cama balinesa para piscina y villa en Republica Dominicana",
      en: "Outdoor daybed for pool and villa spaces in the Dominican Republic"
    },
    note: {
      es: "Perfecto para piscinas, jardines, villas, hoteles y espacios de descanso exterior.",
      en: "Perfect for pools, gardens, villas, hotels and outdoor relaxation spaces."
    }
  }
];

export const products: Product[] = [
  {
    slug: "oasis-set",
    name: "Oasis Set",
    collectionSlug: "terraza",
    image: "/assets/images/oasis-set.jpg",
    gallery: ["/assets/images/oasis-set.jpg", "/assets/images/oasis-hero.jpg", "/assets/images/oasis-op.jpg"],
    alt: { es: "Juego de terraza Oasis para patio amplio", en: "Oasis terrace set for a spacious patio" },
    description: {
      es: "Un juego de sala exterior amplio y elegante para terrazas donde quieres recibir con estilo, comodidad y una presencia impecable.",
      en: "A spacious and elegant outdoor lounge set for terraces where style, comfort and presence matter."
    },
    materials: { es: "Fibra sintetica y perfiles galvanizados.", en: "Synthetic fiber and galvanized profiles." },
    dimensions: { es: "Dimensiones por confirmar segun composicion.", en: "Dimensions to be confirmed according to composition." },
    finishes: { es: "Acabados sujetos a disponibilidad.", en: "Finishes subject to availability." },
    care: { es: "Limpiar con pano humedo, jabon neutro y secado al aire.", en: "Clean with a damp cloth, mild soap and air drying." },
    featured: true
  },
  {
    slug: "candor-clasico",
    name: "Candor Clasico",
    collectionSlug: "terraza",
    image: "/assets/images/candor-clasico.jpg",
    gallery: ["/assets/images/candor-clasico.jpg", "/assets/images/candor-l.jpg"],
    alt: { es: "Muebles para patio Candor Clasico", en: "Candor Clasico patio furniture" },
    description: {
      es: "Un set sobrio y facil de combinar para patios, balcones amplios o terrazas que necesitan un look limpio y acogedor.",
      en: "A calm, easy-to-pair set for patios, generous balconies or terraces that need a clean, welcoming look."
    },
    materials: { es: "Fibra sintetica y estructura galvanizada.", en: "Synthetic fiber and galvanized structure." },
    dimensions: { es: "Consultar medidas disponibles.", en: "Ask for available dimensions." },
    finishes: { es: "Tonos neutros y acabados segun disponibilidad.", en: "Neutral tones and finishes according to availability." },
    care: { es: "Evitar productos abrasivos. Lavar cojineria en ciclo delicado.", en: "Avoid abrasive products. Wash cushion covers on delicate cycle." },
    featured: true
  },
  {
    slug: "media-luna",
    name: "Media Luna",
    collectionSlug: "terraza",
    image: "/assets/images/media-luna.jpg",
    gallery: ["/assets/images/media-luna.jpg", "/assets/images/area-set-patio-terraza-santiago.jpeg"],
    alt: { es: "Set Media Luna para terraza moderna", en: "Media Luna set for a modern terrace" },
    description: {
      es: "Una opcion con personalidad para proyectos que quieren un punto focal diferente y elegante en exterior.",
      en: "A distinctive option for projects that want a different and elegant outdoor focal point."
    },
    materials: { es: "Fibra sintetica apta para exterior.", en: "Outdoor-ready synthetic fiber." },
    dimensions: { es: "Consultar medidas disponibles.", en: "Ask for available dimensions." },
    finishes: { es: "Acabados por disponibilidad.", en: "Finishes by availability." },
    care: { es: "Cepillo suave, agua y shampoo delicado para la fibra.", en: "Soft brush, water and gentle shampoo for the fiber." }
  },
  {
    slug: "oculus-mare",
    name: "Oculus Mare",
    collectionSlug: "dining",
    image: "/assets/images/oculus-mare-dining.jpg",
    gallery: ["/assets/images/oculus-mare-dining.jpg", "/assets/images/oculus-mare-compacto.jpg"],
    alt: { es: "Comedor exterior Oculus Mare", en: "Oculus Mare outdoor dining set" },
    description: {
      es: "Una mesa con presencia moderna para quienes quieren un comedor exterior con caracter y gran valor visual.",
      en: "A table with modern presence for outdoor dining spaces with character and visual value."
    },
    materials: { es: "Estructura preparada para exterior y acabado tejido.", en: "Outdoor-ready structure and woven finish." },
    dimensions: { es: "Consultar configuracion y medidas.", en: "Ask for configuration and dimensions." },
    finishes: { es: "Acabados segun disponibilidad.", en: "Finishes according to availability." },
    care: { es: "Limpiar despues de lluvia fuerte y dejar secar al aire.", en: "Clean after heavy rain and let air dry." },
    featured: true
  },
  {
    slug: "rombois-set",
    name: "Rombois Set",
    collectionSlug: "dining",
    image: "/assets/images/rombois-set.jpg",
    gallery: ["/assets/images/rombois-set.jpg", "/assets/images/candor-combinado.jpg"],
    alt: { es: "Rombois Set para restaurante o balcon", en: "Rombois Set for restaurant or balcony" },
    description: {
      es: "Calido, elegante y muy acogedor para cenas en familia o reuniones en ambientes de hospitalidad.",
      en: "Warm, elegant and welcoming for family dinners or hospitality spaces."
    },
    materials: { es: "Fibra sintetica con estructura firme.", en: "Synthetic fiber with a firm structure." },
    dimensions: { es: "Consultar medidas disponibles.", en: "Ask for available dimensions." },
    finishes: { es: "Acabados neutros sujetos a disponibilidad.", en: "Neutral finishes subject to availability." },
    care: { es: "Usar jabon neutro y pano humedo.", en: "Use mild soap and a damp cloth." }
  },
  {
    slug: "balinesa-trap",
    name: "Balinesa Trap",
    collectionSlug: "piscina",
    image: "/assets/images/cama-balinesa-trap.jpg",
    gallery: ["/assets/images/cama-balinesa-trap.jpg", "/assets/images/set-cama-trap.jpeg"],
    alt: { es: "Cama balinesa para piscina y villa", en: "Outdoor daybed for pool and villa" },
    description: {
      es: "Una cama balinesa que transforma cualquier area de piscina en un espacio de descanso premium.",
      en: "An outdoor daybed that turns any pool area into a premium rest space."
    },
    materials: { es: "Fibra sintetica y perfiles galvanizados.", en: "Synthetic fiber and galvanized profiles." },
    dimensions: { es: "Consultar medidas y composicion.", en: "Ask for dimensions and composition." },
    finishes: { es: "Acabados por disponibilidad.", en: "Finishes by availability." },
    care: { es: "Secar cojines al aire si se humedecen.", en: "Air dry cushions if they become wet." },
    featured: true
  },
  {
    slug: "chaise-candor",
    name: "Chaise Candor",
    collectionSlug: "piscina",
    image: "/assets/images/chaise-candor.jpg",
    gallery: ["/assets/images/chaise-candor.jpg", "/assets/images/oculus-chaise.jpg"],
    alt: { es: "Chaise exterior resistente al sol", en: "Outdoor chaise resistant to sun exposure" },
    description: {
      es: "Una chaise comoda y bonita para tomar sol, leer o simplemente descansar mejor.",
      en: "A comfortable chaise for sun, reading or quiet rest."
    },
    materials: { es: "Materiales pensados para sol, humedad y uso constante.", en: "Materials chosen for sun, humidity and frequent use." },
    dimensions: { es: "Consultar medidas disponibles.", en: "Ask for available dimensions." },
    finishes: { es: "Tonos neutros segun disponibilidad.", en: "Neutral tones according to availability." },
    care: { es: "Limpiar estructura con pano humedo y jabon neutro.", en: "Clean structure with a damp cloth and mild soap." }
  },
  {
    slug: "candor-mix-collection",
    name: "Candor Mix Collection",
    collectionSlug: "terraza",
    image: "/assets/images/candor-mix-collection.jpeg",
    gallery: ["/assets/images/candor-mix-collection.jpeg", "/assets/images/candor-collection.jpeg"],
    alt: { es: "Candor Mix Collection para terraza premium", en: "Candor Mix Collection for a premium terrace" },
    description: {
      es: "Un set completo que equilibra confort, elegancia y materiales de calidad para crear un ambiente exterior que invita a quedarse.",
      en: "A complete set balancing comfort, elegance and quality materials for an outdoor setting that invites people to stay."
    },
    materials: { es: "Fibra sintetica y estructura galvanizada.", en: "Synthetic fiber and galvanized structure." },
    dimensions: { es: "Consultar composicion y medidas.", en: "Ask for composition and dimensions." },
    finishes: { es: "Acabados sujetos a disponibilidad.", en: "Finishes subject to availability." },
    care: { es: "Rutina simple con pano humedo, jabon neutro y secado natural.", en: "Simple routine with damp cloth, mild soap and natural drying." },
    featured: true
  }
];

export const projects: Project[] = [
  {
    slug: "terraza-social",
    title: { es: "Terraza social", en: "Social terrace" },
    location: { es: "Santiago", en: "Santiago" },
    description: {
      es: "Base visual temporal para futuras instalaciones completadas, usando fotografia existente hasta conectar el contenido real.",
      en: "Temporary visual foundation for future completed installations, using existing photography until real content is connected."
    },
    image: "/assets/images/area-set-patio-terraza-santiago.jpeg",
    alt: { es: "Area exterior amueblada para proyecto residencial", en: "Furnished outdoor area for a residential project" }
  },
  {
    slug: "piscina-villa",
    title: { es: "Piscina de villa", en: "Villa pool" },
    location: { es: "Republica Dominicana", en: "Dominican Republic" },
    description: {
      es: "Una estructura preparada para mostrar galerias de instalaciones reales en la proxima fase.",
      en: "A structure prepared to show real installation galleries in the next phase."
    },
    image: "/assets/images/oculus-descanso-piscina-villa-rd.jpeg",
    alt: { es: "Mueble de descanso exterior junto a piscina", en: "Outdoor lounge piece by a pool" }
  }
];

export function getCollection(slug: string) {
  return collections.find((collection) => collection.slug === slug);
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductsByCollection(collectionSlug: string) {
  return products.filter((product) => product.collectionSlug === collectionSlug);
}

export function getCollectionLabel(product: Product, locale: Locale) {
  return getCollection(product.collectionSlug)?.label[locale] ?? product.collectionSlug;
}

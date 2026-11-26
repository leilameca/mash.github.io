# Arquitectura de MASH

MASH es un catálogo comercial bilingüe que permite explorar colecciones, productos, proyectos y noticias, con cotizaciones por WhatsApp. Next.js App Router sirve `app/[locale]`. `app/studio-mash` administra ese contenido. `middleware.ts` aplica prefijos de idioma, validación de rutas de detalle, redirecciones de slug y actualización de cookies de sesión. El sitio mantiene las URL en español bajo ambos prefijos de idioma. `lib/seo.ts` y las rutas de metadatos concentran canonical, hreflang, sitemap y robots. La PWA solo prepara recursos de instalación y la página sin conexión. Las páginas públicas conservan la política de lectura fresca.

## Flujo de publicación

Studio valida la sesión de Supabase y la pertenencia a la lista de administradores. Las acciones del servidor y API validan los datos y llaman a la persistencia versionada. Guardar actualiza la copia de trabajo y agrega una revisión. Publicar actualiza la revisión expuesta por `published_content`. Restaurar recupera el estado como borrador. Archivar y ocultar retiran el acceso público. Las rutas públicas y el sitemap leen la proyección publicada. Los cambios de URL de entidades compatibles se resuelven por las redirecciones registradas.

## Diseño, medios y editorial

- `lib/visual` define secciones permitidas, valores responsive y adaptación del contenido anterior. `components/visual/VisualDocument.tsx` comparte el renderizador entre lienzo y web. La navegación y pie protegidos aparecen como representación en Studio. La web monta su cabecera y pie reales en el layout.
- `lib/supabase/catalog.ts` y `lib/editorial` transforman instantáneas a modelos de presentación. Las referencias a catálogo usan identificadores persistentes. El comparador se reutiliza en fichas y secciones visuales.
- Multimedia verifica origen, formato, tamaño y contenido. Sharp crea variantes para miniatura, catálogo, galería y ampliación. Las referencias de borrador, publicación e historial protegen activos en uso. Contacto aloja el único mapa, con una carga diferida del iframe de Google Maps y un enlace al punto del taller.
- `components/PublicAnalytics.tsx` emite un evento interno del navegador `mash:analytics` en el host público aprobado. Los datos se limitan a tipo de página, idioma y nombre de evento. La capa no instala etiquetas ni hace solicitudes. Los clics de WhatsApp representan intención de contacto. Consentimiento, exportación a GA4/GTM y confirmaciones comerciales requieren la integración de Fase 9.
- Studio local arranca con un adaptador de Auth y REST más PostgreSQL/WASM. El acceso de ensayo lo monta un proceso de pruebas aparte. `next start` no incluye ese acceso.

Consulta el [modelo de datos](DATABASE.md), la [configuración local](LOCAL_SETUP.md) y la [validación](TESTING.md).

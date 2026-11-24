# MASH | Martinez Star Home

**Fase 2 (rama de trabajo):** requiere la migración `20261124141948_mash_publication_integrity.sql` antes de ejecutar esta versión. No está desplegada en Production. Ver `docs/phase-2/implementation.txt`, el inventario JSON y la tabla CSV de conciliación. Guardar crea un borrador; **Publicar cambios** actualiza la revisión pública. No hay fallback al catálogo estático.

Sitio bilingue de catalogo para MASH, construido con Next.js y un panel privado conectado a Supabase.

## Desarrollo local

```bash
npm install
npm run dev
```

El sitio queda disponible en `http://localhost:3000/es` y el panel en `http://localhost:3000/studio-mash`.

## Variables de entorno

Crea un archivo `.env.local` sin subirlo al repositorio:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

```

La clave `SUPABASE_SERVICE_ROLE_KEY` se conserva para la allowlist y vinculación del login OTP. El contenido y Storage utilizan la sesión administrativa con RLS. Nunca debe exponerse en el navegador ni guardarse en Git.

## Supabase

Las migraciones de `supabase/migrations/` crean:

- administradores autorizados y acceso por codigo OTP de 8 digitos;
- productos, colecciones, proyectos y traducciones en espanol e ingles;
- bloques editables de contenido del sitio;
- el bucket publico `mash-media`, con escritura limitada a administradores;
- politicas RLS para separar lectura publica y gestion privada.

Aplica las migraciones en orden y agrega el correo permitido a `public.admin_users` antes de iniciar sesion.

## Funciones actuales del panel

- Crear y editar productos.
- Cargar varias imágenes por producto desde el dispositivo y elegir cuál es la principal.
- Crear y editar colecciones o categorias, incluyendo orden, estado, traducciones e imagen.
- Subir y consultar archivos en la biblioteca multimedia.
- Editar el titulo, la descripcion y la imagen del hero en espanol e ingles.
- Publicar, ocultar, archivar o mantener contenido como borrador.
- Editar proyectos existentes desde `Contenido > Proyectos`, incluyendo estado, orden, textos e imagen de portada.

Las imagenes admitidas son JPG, PNG, WebP y AVIF, con un maximo de 6 MB por archivo.

## Publicación en Vercel

Importa el repositorio en Vercel con framework `Next.js`, deja los comandos por defecto y agrega estas variables en Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=https://tu-dominio.com

```

Después de publicar, aplica las migraciones de Supabase, confirma que el bucket `mash-media` sea público para lectura y agrega el correo de la clienta a `public.admin_users`. No agregues `SUPABASE_SERVICE_ROLE_KEY` a variables expuestas al cliente.

## Alcance del CMS

La tabla `site_content` funciona como base modular para trasladar progresivamente al panel las demas secciones: materiales, datos de contacto, navegacion, banners, proyectos y paginas adicionales. El panel ya cubre catalogo, categorias, medios y el bloque principal del inicio; un constructor visual completo con secciones reordenables, temas y plugins requiere una fase posterior, equivalente a desarrollar un page builder.

Las imágenes del inicio se gestionan en **Contenido**: la portada y sus dos imágenes de apoyo están en **Hero principal**; introducción, franja visual (tres fotos), filosofía, proyectos y materiales están en **Secciones, textos e imágenes**. La foto de Nosotros se cambia en **Páginas institucionales**. Cambia una foto por guardado en las secciones. Guardar solo textos conserva las últimas imágenes publicadas, incluso desde una pestaña antigua del administrador. Subir un archivo a Multimedia lo añade a la biblioteca; no sustituye automáticamente una foto ya asignada a una sección.

## App instalable (PWA)

El sitio incluye un manifiesto, iconos para Android/iOS y un service worker que se activa en producción. En Android y computadoras compatibles aparece **Instalar MASH** en el footer. En iPhone/iPad, abre el sitio en Safari y usa **Compartir → Añadir a pantalla de inicio**.

La instalación requiere HTTPS (localhost sirve para pruebas). Sin conexión se muestra un aviso en español o inglés. El catálogo, las páginas del admin y los envíos de formularios no se almacenan en la caché del service worker; los contenidos se consultan en línea para reflejar los cambios del admin.

Los iconos de `public/pwa/` se derivan del logo existente. Al modificar los recursos sin conexión, incrementa la versión `CACHE_NAME` en `public/sw.js` para renovar la caché.

## Verificación de la PWA

```bash
npm run test:pwa
npm run build
npm run test:pwa:browser
```

La prueba de navegador levanta temporalmente el servidor de producción y comprueba instalación, iconos, avisos sin conexión y recuperación. Usa Chrome en Windows y Chromium de Playwright en otros sistemas; `PWA_BROWSER_CHANNEL` permite cambiar el navegador utilizado.

## Verificacion

```bash
npm run typecheck
npm run build
```

## Contrato de entornos en Fase 2

Configura `NEXT_PUBLIC_SUPABASE_URL` y una sola clave pública: preferiblemente `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, o la alias legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. La clave pública elegida debe pertenecer al mismo proyecto que la URL. El servidor conserva `SUPABASE_SERVICE_ROLE_KEY` para el login existente. No uses el proyecto real para pruebas de escritura.

La bandera `NEXT_PUBLIC_ENABLE_SUPABASE_CATALOG` ya no decide la fuente del catálogo. `NEXT_PUBLIC_SITE_URL` controla canonical, hreflang y sitemap. Los cambios de Production y el despliegue requieren aprobación separada.

## Verificación de Fase 2

```bash
npm run typecheck
npm run test:admin
npm run test:pwa
npm run test:phase2
npm run build
npm run test:ux
npm run test:pwa:browser
npm run test:phase2:http
```

Las pruebas SQL usan PostgreSQL aislado con PGlite. Las pruebas HTTP usan el build real y una fachada Data API exclusivamente de pruebas sobre esa base. Auth y las pruebas de componentes son simuladas: no acreditan entrega OTP por Resend ni equivalencia completa con PostgREST hosted.

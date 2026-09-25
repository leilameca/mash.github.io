# MASH | Martinez Star Home

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_ENABLE_SUPABASE_CATALOG=true
```

La clave `SUPABASE_SERVICE_ROLE_KEY` solo se utiliza en acciones del servidor protegidas por la sesion administrativa. Nunca debe exponerse en el navegador ni guardarse en Git.

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
- Cargar la imagen principal desde el dispositivo, sin pegar enlaces.
- Crear y editar colecciones o categorias, incluyendo orden, estado, traducciones e imagen.
- Subir y consultar archivos en la biblioteca multimedia.
- Editar el titulo, la descripcion y la imagen del hero en espanol e ingles.
- Publicar, ocultar, archivar o mantener contenido como borrador.

Las imagenes admitidas son JPG, PNG, WebP y AVIF, con un maximo de 6 MB por archivo.

## Alcance del CMS

La tabla `site_content` funciona como base modular para trasladar progresivamente al panel las demas secciones: materiales, datos de contacto, navegacion, banners, proyectos y paginas adicionales. El panel ya cubre catalogo, categorias, medios y el bloque principal del inicio; un constructor visual completo con secciones reordenables, temas y plugins requiere una fase posterior, equivalente a desarrollar un page builder.

## Verificacion

```bash
npm run typecheck
npm run build
```

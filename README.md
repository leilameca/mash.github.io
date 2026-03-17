# MASH

La pagina ahora carga sus colecciones desde `data/colecciones.json` y ya incluye una base de panel admin en `admin/config.yml`.

## Como funciona

- La portada renderiza automaticamente las colecciones usando `js/main.js`.
- Las imagenes nuevas del admin se guardan en `assets/images/uploads/`.
- El cliente podra editar colecciones y productos desde `/admin` sin tocar HTML.

## Acceso al admin

- URL del panel: `/admin`
- Tipo de acceso: inicio de sesion con GitHub
- Usuario admin: la cuenta de GitHub autorizada como editora del repositorio
- Contrasena: la de esa cuenta de GitHub

No se debe guardar la contrasena en este README ni en ningun archivo del proyecto. Lo seguro es entregarla por un medio privado o, mejor aun, crear una cuenta de GitHub exclusiva para el cliente y activar 2FA.

## GitHub Pages

Para que el login funcione en produccion con GitHub Pages, hace falta un servidor OAuth para Decap CMS. El flujo recomendado es este:

1. Crear una GitHub OAuth App.
2. Publicar un auth server para Decap CMS.
3. Poner la URL de ese auth server en `admin/config.yml` con `base_url` y `auth_endpoint`.
4. Autorizar como editor a la cuenta de GitHub que usara el cliente.

### Datos que debes usar en la GitHub OAuth App

- Application name: `MASH Admin`
- Homepage URL: la URL publica del sitio en GitHub Pages
- Authorization callback URL: la URL publica de tu auth server seguida de `/callback`

### Variables del auth server

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ORIGIN`
- `REPO`
- `BRANCH`

### En este proyecto ya quedo listo

- El panel visual con logo en `admin/index.html`
- El estilo del panel en `admin/admin.css`
- La configuracion editorial en `admin/config.yml`
- El catalogo editable en `data/colecciones.json`

## Pruebas locales

- `local_backend: true` ya esta activado.
- Para pruebas locales del CMS necesitas correr un backend local de Decap y servir el sitio en local.
gracias
# Traspaso a otra sesión

Clona o actualiza `feature/mash-3` con avance rápido. Confirma que el SHA de `git rev-parse HEAD` coincide con `git ls-remote origin refs/heads/feature/mash-3`. Lee [Estado](PROJECT_STATUS.md), el [checkpoint de Fase 8](phase-8/implementation.md) y [Configuración local](LOCAL_SETUP.md).

```powershell
git switch feature/mash-3
git pull --ff-only origin feature/mash-3
git status --short
npm ci
npm run typecheck
npm run test:all
$env:MASH_PREVIEW_PORT='3020'
npm run preview:studio
```

En otra terminal establece `MASH_PREVIEW_URL` al puerto de ensayo y ejecuta las suites indicadas en [Pruebas](TESTING.md). Pide a Codex que retome los puntos pendientes del checkpoint en esta rama. La Fase 9 está autorizada para staging independiente. El lanzamiento en producción requiere aprobación expresa. Los reportes de capturas se reproducen localmente y se generan en directorios ignorados. Los valores de configuración deben obtenerse de los administradores de cada servicio.


## Continuidad del staging

Producción ya sirve MASH 3.0 desde el 26 de noviembre de 2026. La migración, verificación y pendientes se registran en el [acta de despliegue](phase-9/delivery.md#despliegue-del-26-de-noviembre-de-2026). Los detalles de preparación que siguen son el historial del ensayo.

El ensayo privado está activo en https://mash-staging.onrender.com. La titular confirmó que funciona después de conectar las credenciales de Supabase de ensayo. Se verificaron de forma independiente HTTPS, 401 sin contraseña para ambas portadas y la entrada de Studio, y las cabeceras de no indexación. El QA autenticado y las integraciones hospedadas quedan en la matriz de preparación. El lanzamiento público sigue sujeto a autorización expresa.

Render conectó el Blueprint y el primer despliegue falló durante la descarga de Google Fonts. Las mismas familias tipográficas se incluyen ahora como archivos WOFF2 locales con sus licencias. El servicio tiene despliegues automáticos desactivados. Desde `mash-staging` usar **Manual Deploy → Deploy latest commit** y revisar **Events** hasta que el despliegue esté activo.

La rama incluye `render.yaml` para un servicio **Free** de Render dedicado al ensayo. Para recrear el entorno en el panel de Render, crear un Blueprint desde `feature/mash-3`, comprobar que el resumen indique exclusivamente Free y completar las variables solicitadas con las claves de `mash-staging`. Render genera la contraseña de acceso. El usuario del cuadro de autenticación es `mash`. Compartir la contraseña mediante un gestor seguro. Studio conserva su propio inicio de sesión. Crear el servicio sin dominio personalizado y comprobar HTTPS, acceso anónimo denegado, `noindex`, catálogo ES/EN y acceso administrativo antes de entregar la URL. La instancia gratuita puede tardar en responder tras quedar inactiva. La compilación local y las 108 pruebas automatizadas pasaron. Además, la compilación respondió 401 a solicitudes anónimas y 503 sin contraseña configurada. Con contraseña correcta, `robots.txt` bloqueó la indexación y la ruta de demostración respondió 404.

El 25 de noviembre de 2026 se creó Supabase `mash-staging` (`iyxfhxoarxagtwiyqqer`) y se aplicaron 14 migraciones de esquema. Con autorización se importaron 8 productos, 4 colecciones, 2 proyectos y 8 bloques públicos de MASH. El entorno quedó sin cuentas, contactos ni borradores de producción. El frontend local conectado a ese proyecto está disponible en el puerto 3039. Quedan el alojamiento privado, las credenciales de Studio, el remitente OTP y DeepL.

El presupuesto autorizado es de US$0. La entrega se puede revisar localmente sin credenciales mediante `npm run preview:studio`. El proyecto `mash-staging` está configurado con protección en Vercel y queda sin despliegue. La consulta de solo lectura a MASH confirmó que el esquema de producción todavía no tiene las tablas de publicación que requiere esta rama. La titular autorizó revisar las propiedades de Google e identificó el contenedor GTM existente. Quedan por verificar el flujo de GA4 y el acceso de la Data API. Consulta la [matriz de preparación](phase-9/readiness.md), el [informe de QA](phase-9/qa.md) y la [guía de operación](phase-9/delivery.md).

Para repetir el ensayo con Supabase real y sin cuenta en la nube, sigue [Supabase local](LOCAL_SETUP.md#supabase-real-en-local-con-us0). Pasaron las 16 migraciones, las rutas ES/EN, el acceso con OTP capturado localmente, la subida con cuatro derivados y el original privado, y la publicación de Noticias en la ficha y en Inicio. La primera ejecución detectó que Inicio lanzaba un error si faltaba el bloque opcional `home.sections`. El arreglo conserva las secciones opcionales ocultas y sigue reportando los errores de conexión.

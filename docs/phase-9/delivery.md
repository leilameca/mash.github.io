# Entrega técnica y operación de MASH 3.0

## Corrección de Inicio del 26 de noviembre de 2026

- La portada y la franja de inspiración comparten componentes entre la composición de Studio y la web. Las fotos de la portada quedan dentro de sus dos marcos. La publi­cación de una composición inicial sin cambios conserva la versión vigente. La sección Contacto se muestra antes de la llamada a cotizar en el pie.
- La migración marcó como pendientes traducciones que el sitio anterior ya mostraba. Inicio conserva los textos ingleses de las instantáneas históricas identificadas por sus huellas y solo cuando el español coincide. Un texto nuevo sigue el proceso de revisión. El cambio no modifica traducciones ni publicaciones en Supabase.
- GA4 Data API respondió para 7, 30 y 90 días sin devolver eventos comerciales. Las credenciales de lectura se configuraron en Vercel Production. La recogida de visitas sigue pendiente de contrastar Medición mejorada y GTM. La traducción automática requiere la variable sensible `MASH_DEEPL_API_KEY`.

## Despliegue del 26 de noviembre de 2026

- Dominio activo en [Vercel](https://vercel.com/leilanys-projects-12493bd9/mash-github-io/4e5HsdepRgWtuCa7btryQ2YX3EG7) con el SHA de código `bd9037907f07d7391d7772ac1a820af2593d5736`. El candidato se construyó con la configuración de producción y sin asignar el dominio hasta la validación. Se promovió el despliegue `dpl_4e5HsdepRgWtuCa7btryQ2YX3EG7`. La versión anterior `dpl_53GgEveLPUhttXEXJ7b4F2191KAu` queda como referencia de reversión. El procedimiento de reintroducir compatibilidad con la versión anterior requiere pausar Studio y conciliar los cambios hechos después del corte.
- Se cotejaron las filas de 13 tablas del respaldo contra producción antes de aplicar las ocho migraciones. Se conservó el acceso público de la versión anterior durante la pausa editorial. Tras promover y verificar el dominio, se retiraron las políticas SELECT temporales y todos los triggers de pausa. La base quedó con 17 migraciones, 22 publicaciones y un producto en borrador.
- Pasaron 11 rutas en español e inglés y 8 revisiones de navegador a 390 y 1440 px. La entrada anónima de Studio redirige al login, la API privada de traducción deniega acceso anónimo y la ruta de demostración devuelve 404. Se comprobó redirección a www, robots y sitemap.
- Siguen pendientes la sesión con OTP de Resend, la traducción real de DeepL, el flujo de archivos y restauración por la API hospedada, DebugView de GA4 y el seguimiento posterior. Se preservaron el presupuesto US$0, DNS y `main`.

## Manual administrativo

1. En Studio, solicita un código en el correo autorizado. Usa el código de ocho dígitos y cierra sesión cuando termines. En el ensayo Docker, el correo llega a Mailpit.
2. Abre Productos, Colecciones o Proyectos. Completa el contenido en español, añade medios desde Multimedia y guarda el borrador. La ficha publicada conserva su versión anterior. En Proyectos puedes configurar galería y el comparador de antes y después.
3. En Traducciones, revisa el inglés de la misma ficha. La generación automática trabaja desde la copia en español cuando hay proveedor configurado. Guarda la revisión, vuelve a la ficha y publica. Comprueba ambos idiomas en una sesión sin cookies de Studio.
4. En el editor visual, selecciona la página y revisa escritorio, tablet y móvil. Guarda y previsualiza antes de publicar. Verifica el título, el recorte y los destinos de los botones. En Inicio, «Listado de noticias» controla la presencia y la posición del bloque.
5. En Noticias, prepara título, extracto, foto y cuerpo. En Anuncios, selecciona idioma, páginas, mensaje, destino y vigencia en hora de Santo Domingo. Confirma la aparición y la salida del anuncio en la página programada.
6. Configuración → Contacto mantiene datos comerciales y mapa del taller. Historial permite restaurar una revisión como borrador. Verifica esa copia y publícala si debe ser la nueva versión visible.
7. Analítica usa la propiedad autorizada de GA4 y admite períodos de 7, 30 y 90 días completos. Los clics hacia WhatsApp son interacciones; una venta requiere confirmación independiente.

## Mantenimiento y estudio de la arquitectura

El render público de App Router lee las instantáneas de Supabase. Studio autentica la solicitud, escribe una revisión y actualiza la instantánea solo al publicar. Para estudiar el flujo, sigue `lib/supabase/persistence.ts`, las migraciones de integridad y `lib/supabase/published.ts`. Repite con `lib/translation/run.ts` para observar la revisión humana y con `components/visual/VisualDocument.tsx` para comparar Studio y web. [Arquitectura](../ARCHITECTURE.md) · [Base de datos](../DATABASE.md)

Revisa mensualmente la cola de traducciones, revisiones, cuota de Storage y estado de GA4. Valida nombres y enlaces con las dos cuentas administradoras. Conserva los secretos en el entorno privado del servidor y registra la fecha de cada cambio de credenciales. Cuenta los activos históricos y separa los que carecen de variantes antes de cualquier reprocesamiento.

## Alojamiento a US$0

| Alternativa | Costo y condición | Estado |
| --- | --- | --- |
| Supabase Free existente | US$0 al mes cotizados; proyecto aislado y sujeto a límites del plan | Activo y verificado |
| Vercel Hobby | US$0 para uso personal no comercial; Pro figura a partir de US$20/mes y puede tener consumo adicional | La cuenta y el plan de uso comercial deben confirmarse antes de publicar |
| Render Free | US$0 dentro de su cuota para ensayos; arranque en frío y disco efímero | Ensayo privado activo y probado por la titular. Faltan prueba hospedada de Sharp y límites de subida |
| Oracle Always Free | US$0 dentro de los límites y si hay capacidad en la región principal. La cuenta puede exigir verificación de pago, la VM puede ser recuperada por inactividad y requiere administrar HTTPS y actualizaciones | Candidato de alojamiento; falta cuenta, capacidad y autorización |
| Cloudflare Workers Free | US$0 dentro de la cuota. App Router puede ejecutarse con OpenNext. El transporte de imágenes y Sharp requieren una prueba de compatibilidad con la carga binaria de MASH | Candidato técnico, sin aprobación de paridad |

Los candidatos deben pasar una prueba de `next build`, arranque, cookies, carga con Sharp, variables privadas, HTTPS, control de acceso y límites reales antes de aceptar un despliegue. Mantén Auth, PostgreSQL y Storage en la referencia aislada ya creada. [Vercel Hobby](https://vercel.com/docs/plans/hobby) · [Vercel precios](https://vercel.com/pricing) · [Render Free](https://render.com/docs/free) · [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) · [Next.js en Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

## Respaldos y recuperación

Antes de una migración, registra fecha, referencia de origen, SHA y recuentos. Exporta esquema y datos de aplicación a un volumen privado, junto con inventario de claves de objetos y copias de medios. Guarda usuarios, sesiones y secretos por los mecanismos autorizados de cada proveedor; conserva archivos privados fuera de Git. Verifica que el tamaño, el hash y la fecha coincidan con el manifiesto.

Restaura en una base de recuperación separada, con un bucket separado. Verifica recuento de tablas, catálogo bilingüe, acceso de una cuenta autorizada, una muestra de originales y derivados y la publicación de un borrador. Establece el punto de recuperación y mide la duración real del ensayo antes de programar la migración. El procedimiento de recuperación queda pendiente de una ejecución con un respaldo autorizado.

## Reversión y decisión de lanzamiento

### Preparación del corte en Vercel

El panel autenticado identifica el equipo actual como **Hobby**. La titular aclaró que MASH es un proyecto personal de portafolio. Las [reglas de uso de Vercel](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) permiten el uso personal no comercial. Confirmar si el WhatsApp de cotización quedará como demostración o recibirá consultas reales del negocio, ya que la evaluación se aplica al uso del despliegue. El presupuesto autorizado sigue en US$0. La referencia del despliegue actual es `53GgEveLPUhttXEXJ7b4F2191KAu` en el panel y `fc2a2b499afc2db4f46d0bac12c65104683090ec` en GitHub.

El 25 de noviembre de 2026 se inspeccionó el esquema `public` de Supabase de producción (`guzuqitvzkenzsvcuttg`) mediante el Table Editor autenticado. El inventario mostró las 12 tablas históricas y no incluyó `content_publications` ni `content_revisions`, requeridas por MASH 3.0. Esto confirma que la base productiva requiere una migración antes del corte. La restauración local documentada cubre el catálogo público. El respaldo productivo completo con Auth y Storage sigue sin prueba de recuperación.

Se repitió el ensayo en PostgreSQL aislado con una copia del catálogo público. Se insertaron los datos en el esquema histórico antes de la migración de integridad. Tras ejecutar las migraciones de esquema con las semillas excluidas, coincidieron los recuentos de las diez tablas importadas. El rol anónimo leyó 4 colecciones, 8 productos, 2 proyectos y 8 bloques publicados y se le denegó acceso a `content_revisions`. El ensayo representa Auth y Storage mediante estructuras locales. Para aplicar en la base real falta conexión PostgreSQL autorizada, exportar y recuperar el respaldo completo en un destino aislado, y conciliar el registro de migraciones antes de modificar producción.

El SQL Editor autenticado confirmó en modo de lectura **9 productos, 4 colecciones, 2 usuarios Auth y 16 objetos Storage** en producción. `supabase_migrations.schema_migrations` contiene las nueve versiones históricas hasta `20260925193000`, incluyendo las tres semillas. El conjunto pendiente son las ocho versiones consecutivas de `20261124141948` a `20261125130000`. El respaldo local del catálogo público incluye ocho productos y no sustituye el respaldo productivo que debe conservar también el noveno registro.

La regresión local de actualización con las semillas históricas conserva el borrador Oculus Mare, sus dos idiomas y sus dos fotografías, y verifica que la vista anónima solo muestre la ficha publicada de control. Este caso representa un borrador histórico y complementa el ensayo sobre la copia pública. Para el respaldo real de nivel de base, Supabase recomienda un volcado para proyectos Free. Los binarios de Storage deben copiarse y verificarse por separado. [Respaldos de Supabase](https://supabase.com/docs/guides/platform/backups).

### Respaldo y ensayo del corte

- Conexión al Session pooler con TLS y nombre del servidor verificados usando el certificado oficial. Se generó un volcado lógico con `pg_dump` de `public`, `private`, `auth`, `storage` y `supabase_migrations`. Se incluye el registro de ACL. Las copias y manifiestos quedan fuera de Git en `.audit-backups/mash-production-preflight/`, con datos privados que deben mantenerse bajo acceso restringido.
- Se copiaron los 16 objetos del bucket histórico `mash-media` y se verificaron sus SHA-256. Se restauró el volcado en PostgreSQL local aislado. Tras ensayar las ocho migraciones se conservaron 9 productos, 4 colecciones, 2 usuarios y 16 registros Storage. La vista pública expuso 8 productos, 4 colecciones, 2 proyectos y 8 bloques. Se conservó un producto en borrador. La prueba verifica filas de Auth y metadatos de Storage. La entrega de OTP y la restauración de objetos mediante la API hospedada siguen pendientes.
- **Dependencia crítica del corte.** Se repitió el ensayo conservando las ACL, con roles locales y sin propietarios originales. El rol anónimo podía leer 8 productos y 8 bloques en las tablas usadas por la versión actual. Después de migrar obtuvo cero filas en esas tablas. MASH 3.0 lee las vistas publicadas y obtiene los recuentos correctos. Revertir solo el despliegue de Vercel no recupera la lectura del catálogo anterior.
- El Preview de Vercel del SHA `44cb5ff66d15b248343a2c8f2b0b2cf1963fe704` compiló. Antes del corte verificar el candidato con variables de producción, la compatibilidad de las rutas y una reversión coordinada del esquema y el despliegue. Mantener las escrituras editoriales detenidas durante el corte y su ventana de validación. [CI](https://github.com/leilameca/mash.github.io/actions/runs/45708209452) · [Promoción en Vercel](https://vercel.com/docs/deployments/promote-preview-to-production).
- El candidato `f05e8f15ae9f6550af07236e479130a41cab13f8` también compiló. Verificado desde el navegador autenticado: `/es` muestra «Contenido no disponible». El panel lista la URL, clave publicable y service role con alcance Production and Preview. Confirmar el destino y el esquema mediante el log del candidato antes de promover.
- En la copia restaurada con ACL se ensayó recuperar las lecturas anteriores aplicando las políticas SELECT históricas dentro de una transacción local. Se recuperaron 8 productos y 8 bloques, y el borrador permaneció privado. El SQL de recuperación inmediata queda fuera de Git. Es aplicable antes de reanudar escrituras editoriales, y cubre lectura pública. Una reversión posterior a nuevos cambios requiere reconciliar las revisiones.
- El 26 de noviembre de 2026 se volvió a comprobar producción con TLS y una transacción de solo lectura. El registro termina en `20260925193000` y las vistas de publicación nuevas siguen ausentes. En una copia restaurada se aplicaron las ocho migraciones y sus asientos de historial en una transacción. Las veinte políticas SELECT históricas permitieron verificar la lectura simultánea de la versión anterior y de la nueva (22 publicaciones, cero borradores públicos). Tras retirarlas, solo la versión nueva conservó acceso público. Revertir la transacción restableció las nueve migraciones y las lecturas anteriores.
- Usar esa compatibilidad únicamente durante una ventana sin escrituras editoriales, para que la versión anterior no pueda mostrar copias de trabajo alteradas. Tras aplicar las migraciones, verificar Preview antes de promover y probar el dominio oficial después. Retirar las políticas de transición antes de habilitar la edición. Si el Preview falla, conservar el despliegue anterior y la lectura pública histórica, investigar el error y mantener la edición detenida hasta decidir la reversión. Este ensayo no aplica cambios a producción.

- El 25 de noviembre de 2026, el panel de Vercel aportado por la titular mostraba el despliegue de `www.mashoficial.com` en estado Ready y Production Current, con origen `main` en `fc2a2b4`. GitHub confirma `fc2a2b499afc2db4f46d0bac12c65104683090ec` como SHA completo de esa referencia. El dominio raíz redirigía a `www` y Vercel servía `/es` con HTTP 200. Antes del corte falta confirmar en el panel el ID de ese despliegue, el plan y su disponibilidad para revertir.
- Identificar por referencia el Supabase que usa Vercel y comparar su registro de migraciones con `supabase/migrations`. Clasificar las tres semillas históricas por separado. Conciliar el catálogo existente antes de incorporar datos de arranque. Documentar los recuentos antes y después en una copia aislada.
- Verificar que el respaldo recupera catálogo, publicación, archivos y acceso administrativo. Revisar también que el despliegue anterior funciona con cualquier cambio compatible de esquema. Si no existe una ruta de reversión comprobada, detener el corte.
- En una compilación de ensayo del SHA candidato, validar la configuración pública de Supabase y la presencia de secretos de servidor sin exportar valores a informes. Conservar las referencias de ambos despliegues y verificar ES, EN, Studio y el comportamiento de las rutas de ensayo antes de decidir el corte.

1. Registra el SHA actual de producción, referencia de base, copia recuperable y responsables. La titular autoriza el cambio antes de iniciar la ventana de lanzamiento.
2. Comprueba HTTPS, acceso de ambos administradores, políticas de Storage, publicación, restauración, traducciones revisadas y SEO. Comprueba GA4 con consentimiento, DebugView en el entorno autorizado, Search Console y exclusión de Studio.
3. Detén el lanzamiento ante pérdida de publicaciones o imágenes, errores de acceso, publicación de borradores, ausencia de respaldo verificable o errores de catálogo. Mantén disponible el despliegue anterior.
4. Si falla la nueva aplicación, restaura el despliegue anterior compatible con la base. Si el defecto afecta a datos, bloquea escrituras, conserva evidencia y ensaya la recuperación en una base aparte antes de decidir el cambio de origen. Evita sobrescribir cambios posteriores sin comparar versiones.
5. Después de publicar, revisa ambos idiomas, formularios y destinos con un recorrido de lectura. Registra métricas, incidencias y ventana de reversión.

La [matriz de preparación](readiness.md) contiene los bloqueos activos y [Pruebas](../TESTING.md) los comandos reproducibles.

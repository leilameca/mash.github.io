# Entrega técnica y operación de MASH 3.0

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
| Render Free | US$0 dentro de su cuota para ensayos; servicio Node compatible en principio, arranque en frío y disco efímero | Candidato de QA hospedado. Falta cuenta autorizada, acceso privado, prueba de Sharp y límites de subida |
| Oracle Always Free | US$0 dentro de los límites y si hay capacidad en la región principal. La cuenta puede exigir verificación de pago, la VM puede ser recuperada por inactividad y requiere administrar HTTPS y actualizaciones | Candidato de alojamiento; falta cuenta, capacidad y autorización |
| Cloudflare Workers Free | US$0 dentro de la cuota. App Router puede ejecutarse con OpenNext. El transporte de imágenes y Sharp requieren una prueba de compatibilidad con la carga binaria de MASH | Candidato técnico, sin aprobación de paridad |

Los candidatos deben pasar una prueba de `next build`, arranque, cookies, carga con Sharp, variables privadas, HTTPS, control de acceso y límites reales antes de aceptar un despliegue. Mantén Auth, PostgreSQL y Storage en la referencia aislada ya creada. [Vercel Hobby](https://vercel.com/docs/plans/hobby) · [Vercel precios](https://vercel.com/pricing) · [Render Free](https://render.com/docs/free) · [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) · [Next.js en Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

## Respaldos y recuperación

Antes de una migración, registra fecha, referencia de origen, SHA y recuentos. Exporta esquema y datos de aplicación a un volumen privado, junto con inventario de claves de objetos y copias de medios. Guarda usuarios, sesiones y secretos por los mecanismos autorizados de cada proveedor; conserva archivos privados fuera de Git. Verifica que el tamaño, el hash y la fecha coincidan con el manifiesto.

Restaura en una base de recuperación separada, con un bucket separado. Verifica recuento de tablas, catálogo bilingüe, acceso de una cuenta autorizada, una muestra de originales y derivados y la publicación de un borrador. Establece el punto de recuperación y mide la duración real del ensayo antes de programar la migración. El procedimiento de recuperación queda pendiente de una ejecución con un respaldo autorizado.

## Reversión y decisión de lanzamiento

1. Registra el SHA actual de producción, referencia de base, copia recuperable y responsables. La titular autoriza el cambio antes de iniciar la ventana de lanzamiento.
2. Comprueba HTTPS, acceso de ambos administradores, políticas de Storage, publicación, restauración, traducciones revisadas y SEO. Comprueba GA4 con consentimiento, DebugView en el entorno autorizado, Search Console y exclusión de Studio.
3. Detén el lanzamiento ante pérdida de publicaciones o imágenes, errores de acceso, publicación de borradores, ausencia de respaldo verificable o errores de catálogo. Mantén disponible el despliegue anterior.
4. Si falla la nueva aplicación, restaura el despliegue anterior compatible con la base. Si el defecto afecta a datos, bloquea escrituras, conserva evidencia y ensaya la recuperación en una base aparte antes de decidir el cambio de origen. Evita sobrescribir cambios posteriores sin comparar versiones.
5. Después de publicar, revisa ambos idiomas, formularios y destinos con un recorrido de lectura. Registra métricas, incidencias y ventana de reversión.

La [matriz de preparación](readiness.md) contiene los bloqueos activos y [Pruebas](../TESTING.md) los comandos reproducibles.

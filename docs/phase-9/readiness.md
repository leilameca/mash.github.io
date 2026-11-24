# Matriz de preparación para lanzamiento

Base de la sesión: `78a63b13ff7ebeda09430d4152d47ac6c13fba24` en `feature/mash-3`. Para identificar el checkpoint que contiene este informe, usa `git rev-parse HEAD` y `git ls-remote origin refs/heads/feature/mash-3`.

| Requisito | Estado | Evidencia o condición pendiente |
| --- | --- | --- |
| Vercel separado | Aprobado para preparar | Proyecto `mash-staging` creado sin enlace a Git ni dominio propio. Vercel devolvió autenticación `prod_deployment_urls_and_all_previews` habilitada y se configuró `MASH_STAGING=1` en Preview. |
| Base Supabase hospedada separada | Bloqueado | La cuenta alcanzó su cuota de dos proyectos gratuitos activos, que se computan entre las organizaciones donde administra. Se descartó una rama facturable. La base activa de MASH se inspeccionó en modo de lectura. Tiene nueve migraciones históricas y carece de `published_content`. |
| Publicación del preview y acceso protegido | Bloqueado | Falta una base hospedada aislada y un plan de alojamiento que cubra este uso comercial sin cargos adicionales. Vercel Hobby se limita a uso personal no comercial. |
| Separación de configuración | Pendiente | Cargar referencia y credenciales del proyecto aislado en los entornos Preview de `mash-staging`. Evitar credenciales de producción y valores secretos en Git o chat. |
| Exclusión de índices y fixtures | Aprobado en local | La compilación aislada con `MASH_STAGING=1` devolvió `X-Robots-Tag: noindex, nofollow, noarchive`, robots con `Disallow: /` y sitemap vacío. El fixture sigue en el servidor de pruebas. Repetir contra el preview publicado y verificar que `/__preview__/enter` esté ausente. |
| Migraciones, permisos y respaldos | Bloqueado | Aplicadas solo a la base local de pruebas. En el proyecto aislado, listar esquemas, historial y datos primero. Si contiene registros, respaldar y verificar la restauración antes de escribir. Antes de ejecutar semillas históricas, obtener autorización sobre los datos que contienen. |
| OTP de Supabase y Resend | Bloqueado | Falta proyecto aislado, configuración de remitente autorizado y acceso al buzón de prueba. Verificar ocho dígitos, expiración, reenvío, restricciones de administradores y sesión. |
| DeepL ES→EN | Bloqueado | Falta configurar credencial de prueba y confirmar texto y consumo autorizados. La suite local usa proveedor de prueba. |
| Supabase Storage y límites de Vercel | Bloqueado | Falta proyecto aislado. Verificar subida, variantes, originales privados, permisos y límites reales. Se mantienen los originales existentes. |
| Publicación, archivos y restauración | Aprobado en local | Las pruebas aisladas comprueban borradores, publicación, traducciones, archivo y persistencia. Falta repetir contra Supabase y Vercel hospedados. |
| GA4 y privacidad | Pendiente de acceso | Código de etiqueta con consentimiento, receptor local simulado y exclusión de hosts de prueba. Falta inventariar propiedad y flujo web, revisar privacidad, autorizar activación y validar en DebugView. |
| GTM y Search Console | Pendiente de acceso | La etiqueta directa cubre el envío previsto. Evaluar GTM al verificar las necesidades de la propiedad. Confirmar la propiedad de Search Console existente mediante cuenta autorizada. La propiedad y su verificación siguen pendientes. |
| Analítica en Studio | Pendiente de acceso | Consulta del lado servidor a la Data API de GA4, autenticación de Studio y estados sin configurar, sin datos o con error. Validar resultados con una cuenta de servicio de solo lectura de la propiedad autorizada. |
| QA independiente hospedado | Bloqueado | Falta un preview protegido operativo. Repetir flujo ES/EN, Studio, Multimedia y permisos en Chromium, Firefox y WebKit. |
| Revisión visual de Yascari y fibra | Pendiente de aprobación | Se ajustó el encuadre del archivo de Yascari que ya usa el sitio. Se conservaron ambos recursos y falta la aprobación visual final del encuadre y de la fotografía de fibra. |
| Lanzamiento | Bloqueado | Requiere QA hospedado, revisión de integraciones y autorización expresa. No se fusionó con `main`, modificó DNS ni promovió producción. |

## Orden de continuación

1. Entregar la rama con la [vista de revisión local](../LOCAL_SETUP.md). Para una entrega hospedada con US$0, reutilizar un proyecto de pruebas independiente autorizado que tenga cupo y pueda destinarse a MASH. Antes de migrar, inspeccionar extensiones, esquemas, migraciones, tablas y recuentos. Si contiene datos, respaldar y probar la restauración.
2. Configurar el Preview de `mash-staging` con la URL de la base separada, clave pública y secretos de servidor en el gestor de Vercel. Desplegar únicamente el SHA verificado de `feature/mash-3` como Preview. Comprobar la protección, robots, la ausencia de la entrada de ensayo y publicar la URL solo a miembros autorizados.
3. Configurar Resend y DeepL en staging y ejecutar el QA con cuentas autorizadas. Revisar la propiedad GA4 y el flujo existentes antes de usar la etiqueta. Para activar GA4, desactivar la medición mejorada que capture automáticamente navegación o interacciones, revisar consentimiento y privacidad, conceder acceso de solo lectura a la cuenta de servicio y verificar eventos con DebugView antes de aprobar cualquier cambio en el sitio real.
4. Registrar el resultado de cada validación, los permisos faltantes y SHA remoto en el traspaso. Para las operaciones finales, conservar el [plan original](../PHASE_9_PLAN.md) y las [pruebas reproducibles](../TESTING.md).

Referencias oficiales [cuota de Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication), [consentimiento de Google](https://developers.google.com/tag-platform/security/guides/consent), [pageviews manuales de GA4](https://developers.google.com/analytics/devguides/collection/ga4/views), [Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport).

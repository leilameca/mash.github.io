# Matriz maestra de aceptación de Fase 9

## Control de entrada

Referencia funcional `c6c24e869d52f5b348f38b9e82c9fe19953fbbae` en `feature/mash-3`. La [matriz de Fase 8](../phase-8/acceptance.md) conserva **14 aprobados y 18 parciales**. La titular autorizó continuar la Fase 9 en el ensayo con esos pendientes registrados.

**Decisión de lanzamiento: NO GO.** El techo autorizado para nuevos servicios es US$0. La titular identificó Vercel como el alojamiento del MASH real con `mashoficial.com`. Render aloja el ensayo privado y aislado.

## Verificación previa

- Pasaron las 108 pruebas de `npm run test:all`, `npm run typecheck` y `npm run build` con `MASH_VERIFICATION_BUILD=1`. Los once documentos base solicitados están presentes. La compilación local deja establecida la referencia para las regresiones posteriores.
- El runner de QA hospedado admite ahora el Render de ensayo. Verificó cuatro rutas anónimas con HTTP 401, desafío Basic, `noindex` y `no-store`. También se comprobó que rechaza `mashoficial.com`. Quedan el SHA desplegado y el recorrido autenticado, que requiere la contraseña de ensayo por un canal seguro.
- El repositorio tiene 17 archivos de migración. El [inventario de ensayo](readiness.md) documenta 14 migraciones de esquema aplicadas y tres semillas históricas omitidas. La producción histórica requiere inventario y conciliación antes de aplicar cambios.
- Render Free queda como ensayo. Su documentación indica suspensión por inactividad y disco efímero. Vercel Hobby restringe el uso comercial. El coste de producción queda por decidir y no se contrató ningún servicio en esta revisión. [Render Free](https://render.com/docs/free) · [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Checkpoint de automatización

- Se configuró MASH checks en GitHub Actions para la rama de trabajo. En local pasaron ESLint, typecheck, compilación y las 108 pruebas. El análisis de dependencias de producción con `npm audit --omit=dev` devolvió cero avisos del registro. La revisión de seguridad de la aplicación y la infraestructura sigue pendiente.
- La regresión de imágenes a 390 px verifica la decodificación de las imágenes visibles. Las dos imágenes decorativas de la portada reservadas para escritorio pueden tener un tamaño intrínseco de cero en móvil pese a responder HTTP 200 y decodificar correctamente.
- La ejecución remota se verifica en [GitHub Actions](https://github.com/leilameca/mash.github.io/actions/workflows/mash-checks.yml). El flujo ejecuta pruebas aisladas sin credenciales de Render, Supabase hospedado, DeepL ni producción.

## Bloques y criterios

| Bloque | Estado | Criterios de aceptación | Dependencias y evidencia de partida |
| --- | --- | --- | --- |
| 9.1 Infraestructura | PARCIAL | Inventario por entorno, condiciones de uso comercial, límites, coste total, responsables y recuperación documentados. | Cierre de Fase 8 para ejecutar el bloque. Render Free y Supabase de ensayo ya preparados. Falta determinar alojamiento comercial de producción y su coste. |
| 9.2 Base de datos | PARCIAL | Inventario del esquema histórico, registro de migraciones, respaldo comprobado de DB/Auth/Storage, restauración aislada, comparación, RLS y reversión ensayada. | 9.1. Migraciones de esquema aplicadas al ensayo y restauración local del catálogo verificada. Queda recuperar Auth y Storage en un destino aislado autorizado. |
| 9.3 Staging | PARCIAL | HTTPS, acceso restringido, variables y datos aislados, noindex, robots, sitemap y ausencia de fixtures comprobados. Despliegue y rollback reproducibles. | 9.1–9.2. La titular probó el ensayo en Render y confirmó funcionamiento. Acceso anónimo y noindex verificados. Falta QA autenticado independiente, comprobar el SHA desplegado y límites del alojamiento. |
| 9.4 Auth y Resend | PARCIAL | Ambas administradoras reciben y validan OTP, con expiración, reenvío, sesión, cierres y rechazos documentados. | 9.2–9.3. OTP de ocho dígitos probado en Mailpit local. Queda remitente autorizado y entrega real en staging. |
| 9.5 Multimedia | PARCIAL | Formatos, límites, cuatro derivados, original privado, reutilización y referencias históricas verificados. Migración incremental y recuperable. | 9.2–9.3. Pruebas locales y derivados históricos generados. Falta subirlos en staging y comprobar permisos, referencias y límites efectivos. |
| 9.6 Traducciones | PARCIAL | DeepL real con presupuesto controlado, revisión humana, protección del trabajo existente y publicación bilingüe comprobada. | 9.2–9.3. Automatización y revisión cubiertas en local con adaptador de ensayo. Falta clave segura y prueba de proveedor real. |
| 9.7 GA4 | PARCIAL | Consentimiento y exclusiones, eventos verificados sin duplicados en DebugView y reportes reales en Studio. | 9.3 y acceso autorizado a GA4. Propiedad y flujo identificados. Data API real respondió sin filas en local. Queda verificación de recogida y acceso hospedado. |
| 9.8 SEO y Search Console | PARCIAL | Canonical, hreflang, sitemap, robots, indexación y propiedad de Search Console verificados en su entorno correspondiente. | 9.3 y acceso a Search Console. Ensayos locales registrados. Queda confirmar propiedad y preparar verificaciones ligadas al lanzamiento. |
| 9.9 Seguridad | PARCIAL | Permisos positivos y negativos, sesiones, protección de secretos, cookies, dependencias y políticas verificadas defensivamente en local y ensayo. Incidencias altas cerradas. | 9.2–9.6. Las suites locales cubren RLS y sesiones. Falta revisión integral del entorno hospedado y de dependencias con evidencia actual. |
| 9.10 QA profesional | PARCIAL | Matriz de flujos ES/EN, navegador, dispositivo, permisos, casos negativos y regresiones. Defectos críticos y altos resueltos. | 9.3–9.9. Recorridos locales registrados. Falta sesión de ensayo para ejecutar los casos autenticados y repetir los flujos dependientes de proveedores. |
| 9.11 Rendimiento y accesibilidad | PARCIAL | Medidas reproducibles móvil y escritorio, axe por superficie y comprobación manual de teclado, lector, táctil y movimiento reducido. | 9.3 y 9.10. Las muestras locales y sus límites constan en QA. Falta evaluación hospedada y completar revisión manual. |
| 9.12 Monitorización | NO INICIADO | Cobertura de disponibilidad, errores y consumo, responsables, alertas probadas y procedimiento de mantenimiento. | 9.1, 9.3 y 9.9. Evaluar herramientas solo tras confirmar utilidad, privacidad y coste. |
| 9.13 GitHub y CI/CD | EN PROCESO | Instalación, lint, tipos, pruebas, build y browser QA reproducibles en CI. Revisión de dependencias, artefactos y reglas de despliegue. | Flujo MASH checks configurado para `feature/mash-3` con diagnósticos de fallo de retención breve. Ver resultados y comandos en [Pruebas](../TESTING.md). |
| 9.14 Documentación | PARCIAL | Manual administrativo, arquitectura, mantenimiento, recuperación y ruta de estudio vinculada a archivos reales, revisados con las administradoras. | Puede avanzar tras el cierre de Fase 8. Existen guías y documentación técnica. Revisar contra 9.2–9.13 antes de entregar. |
| 9.15 Preparación | BLOQUEADO | Acta GO con integraciones y QA aprobados, cero incidencias críticas o altas conocidas, coste y reversión aprobados. | Fase 8 definitiva y 9.1–9.14. Estado inicial NO GO. |
| 9.16 Dominio y lanzamiento | BLOQUEADO | Autorización de cambio, inventario DNS, respaldo final, SHA aprobado, HTTPS, canonical y reversión verificables. | 9.15 y autorización expresa para dominio y producción. |
| 9.17 QA posterior | BLOQUEADO | Smoke no destructivo de producción, registros y responsables para 24 h, 72 h y 7 días. | 9.16. Verificar el dominio oficial solo después del corte autorizado. |
| 9.18 Entrega | PARCIAL | Informe de alcance real, evidencias, costes, responsables, pendientes y caso de estudio divulgable. | Material previo en [entrega](delivery.md). Cierre tras 9.15–9.17 y aceptación de la titular. |

## Orden de ejecución

1. Resolver los criterios de Fase 8 aún parciales en paralelo al trabajo autorizado en ensayo y registrar su aprobación definitiva antes del lanzamiento.
2. Confirmar infraestructura y condiciones comerciales. Verificar staging, inventario de datos y recuperación. Preparar CI y documentación en paralelo.
3. Validar Auth, Storage, DeepL y analítica. Completar SEO y revisión defensiva. Ejecutar QA hospedado y las comprobaciones manuales.
4. Consolidar monitorización, documentación y decisión GO/NO GO. Solicitar autorización aparte para el corte, verificarlo y preparar la entrega.

## Intervenciones de la titular

- Aprobar expresamente el cierre de Fase 8 cuando se hayan resuelto sus criterios pendientes.
- Habilitar acceso autenticado a staging y a los paneles necesarios por canales seguros. Las personas autorizadas introducen OTP y credenciales directamente en el proveedor.
- Aprobar por separado cualquier cambio de recurso, plan con coste, migración hospedada o cambio de DNS o producción. Para el corte se presenta antes un SHA, respaldo recuperable y plan de reversión.

## Referencias

[Estado de servicios y evidencias](readiness.md) · [QA](qa.md) · [Auditoría de paridad](visual-editor-parity.md) · [Modelo de datos](../DATABASE.md) · [Traspaso](../HANDOFF.md).

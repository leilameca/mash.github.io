# QA de integración · 25 de noviembre de 2026

## Incidencias

| Incidencia | Evidencia inicial | Estado |
| --- | --- | --- |
| QA-01 · Contraste en Inicio | Lighthouse encontró etiquetas doradas sobre fondos claros en Colecciones, Proyectos, Beneficios y Preguntas frecuentes. La etiqueta mostró 2,68:1 y los números de beneficios 2,77:1, frente a 4,5:1. | Corregida. La auditoría de contraste de Lighthouse pasó en las dos repeticiones. |
| QA-02 · Analítica sin acceso externo | La sesión observable de Chrome corresponde a otro perfil. Falta abrir Google con la cuenta autorizada de MASH. | Pendiente de acceso |
| QA-03 · Staging sin datos ni frontend | El proyecto Supabase hospedado tiene 14 migraciones de esquema, cero publicaciones y cero usuarios. | Pendiente de contenido autorizado y alojamiento |
| QA-04 · Franja horizontal inaccesible por teclado | Axe marcó `.lifestyle-band__track` a 390 px en Inicio ES y EN. La región desplaza horizontalmente y no entraba en el orden de tabulación. | Corregida. Se verificaron foco visible y desplazamiento con flecha derecha. |

## Alcance

La evidencia se separa entre navegador local con copia del contenido publicado, flujos de escritura de los fixtures, y comprobaciones reales del proyecto Supabase hospedado. Una navegación satisfactoria no acredita un flujo de escritura ni una integración externa.

| Área | Resultado | Entorno |
| --- | --- | --- |
| Regresión existente | 108 pruebas aprobadas; contiene las 105 originales | Node y PostgreSQL/WASM |
| Recorrido bilingüe | 198 visitas correctas en 11 rutas por idioma, a 320, 768 y 1920 px; sin desbordamiento ni excepciones capturadas en el recorrido | Chromium, Firefox y WebKit en local, con copia del contenido publicado |
| Módulos de Studio | 39 visitas correctas, 13 por motor a 390 px, incluido el editor visual; selector de 7 días y estado sin configurar visibles | Chromium, Firefox y WebKit en local, acceso del fixture |
| Permisos, integridad, multimedia e historial | Pruebas existentes verifican borradores, publicación, restauración, autorización, límites de procesamiento y derivados; el ensayo hospedado de escritura está pendiente | QA automatizado local |
| Lighthouse previo a QA-01 | Móvil rendimiento 96, accesibilidad 96, SEO 100 y LCP 1,0 s. Escritorio rendimiento 92, accesibilidad 96, SEO 100 y LCP 0,3 s. Son muestras de laboratorio sobre Inicio con contenido publicado copiado | Compilación local optimizada, Lighthouse 13.6.0 |
| Axe después de las correcciones | 14 combinaciones de ruta y ancho sin infracciones detectadas en la segunda ejecución | Chromium local |
| Lighthouse después de las correcciones | En las dos muestras, rendimiento, accesibilidad y SEO dieron 100. LCP 0,9 s en móvil y 0,2 s en escritorio. Son datos de laboratorio local; faltan resultados hospedados y datos de usuarios reales. | Compilación optimizada local, Lighthouse 13.6.0 |
| Supabase | 14 migraciones de esquema aplicadas. Tres archivos históricos de contenido omitidos. Confirmados original privado, derivados públicos, traducción al guardar y ausencia de acceso anónimo a la vista de Traducciones | Proyecto `mash-staging` hospedado |
| Integraciones de terceros | Pendientes Resend y los dos OTP reales, DeepL, propiedad y flujo de GA4 autorizados, DebugView y Search Console. El contenedor GTM existente se identificó en una captura | Evidencia pendiente de autorización e integración |
| Lector de pantalla | Pendiente pasada manual con lector; los resultados axe se registran por separado | Pendiente |

Los JSON de navegación, axe y Lighthouse se mantienen bajo `.test-artifacts/`. Muestras de laboratorio como LCP y CLS dependen del equipo, navegador y caché.

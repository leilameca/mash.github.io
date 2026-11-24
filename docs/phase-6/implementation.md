# MASH Studio · Fase 6

**Sitio web** abre el editor visual de Inicio, Nosotros, Contacto y Proyectos. El árbol permite seleccionar, mover, duplicar, ocultar y quitar secciones. También se pueden seleccionar directamente desde el lienzo y editar allí el título y el texto. El inspector separa contenido, diseño y ajustes por dispositivo. En pantallas estrechas, Secciones, Lienzo y Propiedades se muestran como paneles alternos.

El selector ofrece portada, carrusel manual, banner, texto editorial, imagen y texto, galería, cuadrícula, colecciones, productos, proyectos, sobre la empresa, llamada a la acción, contacto, separador y preguntas frecuentes. Encabezado y pie aparecen como secciones protegidas y llevan a sus ajustes compartidos. Los bloques de catálogo resuelven identificadores con publicaciones vigentes. Si una entidad seleccionada deja de estar publicada, la página deja de mostrarla.

## Arquitectura y persistencia

- `lib/visual/schema.ts` define el registro, la paleta, los controles admisibles y el esquema 1. El orden de la lista es el orden visual. Cada sección tiene un ID estable. Las fotos del carrusel o galería y las entidades relacionadas aparecen como elementos del árbol.
- `lib/visual/document.ts` adapta la copia de trabajo del CMS anterior. Conserva las rutas de fotos, textos españoles e ingleses y visibilidad. Las composiciones usan registros `visual.home`, `visual.about`, `visual.contact` y `visual.projects`. Hasta publicar uno, su página sigue sirviendo el diseño anterior.
- `components/visual/VisualDocument.tsx` se usa para el lienzo, la previsualización y el cuerpo publicado. El lienzo representa el encabezado y pie compartidos de forma compacta. La página pública conserva sus componentes globales de navegación, pie, cotización y WhatsApp.
- `app/api/studio-visual` requiere sesión administrativa, mismo origen para escritura y versión esperada. Guarda todo el documento en una transacción. La migración `20261124190716_mash_visual_composition.sql` vuelve a validar tipos, orden, rangos, enlaces, medios, identificadores y contenido visible antes de publicar. No inserta datos. Las revisiones y el grafo multimedia registran las rutas del documento, incluso después de retirar una foto.
- La previsualización es privada y se renderiza dentro de Studio. Los enlaces son representaciones sin destino activo. El tamaño del lienzo determina el breakpoint y se escala para el espacio disponible. Tablet y móvil heredan diseño base y guardan solo sus ajustes específicos. La cuadrícula móvil muestra hasta dos columnas.
- Los campos traducibles usan `sección__campo` en la traducción de la copia de trabajo. DeepL, aprobación manual y publicación siguen el flujo de Fase 5. Cambiar únicamente el diseño no crea una solicitud por cambio de texto. Una composición inglesa sin aprobar se muestra con el original español.
- Deshacer y rehacer conserva el trabajo de la sesión, incluso tras guardar. El historial persistente sigue en Historial y restaurar crea una copia de trabajo. El editor advierte antes de abandonar una composición modificada. El guardado es explícito.

## Verificación y capturas

- [Editor de escritorio](screenshots/01-editor-escritorio.png), [biblioteca de secciones](screenshots/02-biblioteca-de-secciones.png), [tableta](screenshots/03-tablet-ajustes.png) y [móvil](screenshots/04-editor-movil.png).
- [Contraste oscuro de Traducciones](screenshots/05-contraste-oscuro.png) y [distribución móvil](screenshots/06-traducciones-movil.png).
- [Validación consolidada](validation.json), [pruebas automatizadas](unit-results.txt) y [recorrido en Chrome](browser-evidence.json).

Pasaron 99 pruebas automatizadas, incluidas las 94 anteriores. También completaron typecheck, build y las regresiones de Studio, HTTP, interfaz pública y PWA. Se corrigieron los estilos compartidos de botones secundarios y deshabilitados, las casillas por tema, la navegación lateral y el foco de teclado. Las pruebas miden los colores capturados de Preferencias, Revisar y Filtrar. Las escrituras de navegador usan la demostración aislada. Las frases sintéticas de las pruebas no están en código que sirve contenido ni en las migraciones.

## Pendientes de QA y límites

La integración hospedada queda para Fase 9. Se mantienen pendientes la comprobación real de DeepL, permisos de Supabase Storage, límites de carga de Vercel, derivados para fotos antiguas y restauración de respaldos hospedados. Las pruebas locales usan PostgreSQL y Sharp reales con fronteras de Auth y Storage simuladas. Los bloques de noticias, anuncios y mapa no forman parte de este registro. Los controles operan con valores acotados y secciones tipadas. Para editar menú y pie se usan los ajustes existentes.

## Reproducción

En PowerShell, ejecuta `$env:MASH_PREVIEW_PORT='3013'; npm run preview:studio` y abre [Studio local](http://localhost:3013/__preview__/enter). La vista usa una base aislada y desactiva DeepL. Ejecuta `npm run test:phase6` para las pruebas dirigidas y `npm run test:phase6:browser` con esa vista iniciada. La salida predeterminada de la prueba de navegador queda en `.test-artifacts/phase6-browser`. Las seis capturas de entrega se guardan cuando `MASH_EVIDENCE_DIR` apunta a `docs/phase-6`.

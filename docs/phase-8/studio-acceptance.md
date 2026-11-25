# Aceptación administrativa de Fase 8

Base `0a3ea367fb7ff95215d6f40ea229ecdcd4784051`. Las pruebas de escritura usan PostgreSQL local y el transporte de Auth y Storage del entorno de pruebas. Se conservan los resultados de [la matriz de aceptación](acceptance.md) y [la auditoría funcional](../phase-9/visual-editor-parity.md).

## S1 · Operaciones por módulo

| Módulo | Operaciones con evidencia de navegador | Defecto o corrección de esta sesión | Casos pendientes |
| --- | --- | --- | --- |
| Inicio | Acceder a módulos, tema y navegación lateral | — | Verificar cada acceso rápido con contenido pendiente y estados vacíos. |
| Productos | Crear, guardar, publicar, buscar, cancelar duplicación, duplicar, elegir medio, ordenar galería y comprobar pertenencia a dos colecciones | Se incorporó Duplicar al menú actual. La copia conserva colecciones secundarias, galería y campos SEO. Se corrigió el envío de estado desde el menú compartido. | Probar paginación, combinaciones de filtros y estados de bloqueo. |
| Colecciones | Editar, guardar y publicar y revisar la versión bilingüe | — | Crear desde cero y probar cambios de estado, orden y filtros. |
| Multimedia | Seleccionar, subir, consultar original y derivados y rechazar archivo inválido | — | Probar edición de metadatos, búsqueda, filtros y bloqueo con referencias activas. |
| Sitio web | Crear, editar, ordenar, ocultar, duplicar, eliminar, guardar y publicar secciones | — | Verificar todas las operaciones en cada composición. |
| Proyectos | Crear, publicar, duplicar, operar galería y comparación | Se comparte el control de duplicación del menú con Productos. | Probar todos los cambios de estado y cancelaciones del formulario. |
| Noticias | Crear, guardar borrador, publicar, seleccionar imagen y archivar | — | Probar edición tras publicación, búsqueda y filtros combinados. |
| Anuncios | Crear, publicar con alcance y horario y comprobar descarte | — | Probar edición, archivo y recuperación por Historial. |
| Traducciones | Revisar textos, editar preferencias y probar diccionario | — | Comprobar todos los controles y conflictos para cada familia de contenido. |
| Configuración | Navegar pestañas con teclado, guardar y publicar negocio y mapa | — | Revisar todas las pestañas y guardado parcial con datos inválidos. |
| Analítica | Abrir módulo y selector de periodo, ver estado sin configuración | — | Interactuar con estados de error y datos mediante pruebas locales del adaptador. |
| Historial | Filtrar entidad, abrir comparación y restaurar borrador | — | Probar filtros de fecha y autor, paginación y cancelación. |

Editar o eliminar un borrador y retirar una publicación tienen efectos distintos. La operación de papelera es reversible. Las operaciones que el módulo no expone no se contabilizan como verificadas.

La regresión de navegador pasó al cancelar el envío a papelera y comprobar que la ficha sigue pública, confirmar el archivo y comprobar el 404, y restaurar como borrador con las dos colecciones y las fotos intactas. Antes de la corrección, el formulario de estados rechazaba la solicitud de archivo porque faltaba el estado en los datos enviados. La verificación cubre Productos. Colecciones y Proyectos reutilizan el formulario y quedan pendientes sus flujos específicos.

Evidencia local fuera de Git en `.test-artifacts/phase8-admin/s1/`. Para reproducir, usar `node tests/phase4-browser.cjs` con `MASH_PREVIEW_URL` apuntando a una instancia de ensayo local.

## Criterios administrativos abiertos

| Criterio | Evidencia disponible | Pendiente para aprobar |
| --- | --- | --- |
| S1 | Inventario y flujos registrados en la tabla anterior. Las 108 pruebas existentes y typecheck pasaron. | Completar las operaciones indicadas por módulo. |
| S2 | Productos y Multimedia ejercitan guardado, persistencia y rechazo de archivo inválido. | Validar obligatorios, máximos, caracteres especiales, cancelación y cambios sin guardar en cada formulario. |
| S3 | Menú de Productos con búsqueda y duplicación confirmada o cancelada. | Inventariar y accionar controles secundarios de los demás módulos. |
| S4 | Configuración editable de negocio, contacto y mapa. | Conectar las cabeceras comerciales y la plantilla de cotización y probar su publicación. |
| S5 | Evidencia previa de conflicto de revisión. La carga de imágenes muestra progreso y un archivo inválido produce un error visible. | Ejercitar vacíos, desconexión, guardado y operaciones bloqueadas en cada superficie. |
| S6 | Pestañas de Configuración y galería de Productos operadas con teclado. | Probar recorrido de foco, regreso, menús táctiles y protección de cambios sin guardar en todas las rutas. |
| S7 | Alternancia de temas y contraste de controles compartidos registrados en la matriz principal. | Medir contraste en formularios, tablas, modales y estados deshabilitados. |

La aprobación técnica requiere la prueba de cada caso aplicable. La titular conserva la valoración de facilidad de uso y preferencias visuales.

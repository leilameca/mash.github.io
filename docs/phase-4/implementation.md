# MASH Studio · Fase 4

La Fase 4 incorpora el editor de productos con galería, una biblioteca multimedia y colecciones múltiples. La implementación parte de `df58cbd232cd76ae219b9d1ad0d1ee2878f1aa90` en `feature/mash-3`. Todas las escrituras de prueba se hicieron con datos sintéticos y PostgreSQL aislado.

## Experiencia de edición

El editor presenta los textos y las fotos en la columna principal. La lateral reúne estado, visibilidad, colecciones y SEO. El slug se propone a partir del nombre al crear. En móvil las secciones se apilan y las acciones siguen accesibles. Se puede crear un borrador, revisarlo y publicarlo con nombre y descripción en español. La ficha indica el estado del inglés y conserva los textos existentes.

La galería permite cargar varios originales, soltar archivos, ordenar por arrastre o con las flechas del teclado, elegir portada, ampliar y editar el alt de una foto desde un panel de propiedades. Al reemplazar se conservan posición, portada y textos alternativos. Retirar una foto cambia la ficha de trabajo. Las versiones ya publicadas y el historial conservan la referencia anterior.

En Multimedia se puede buscar por nombre, cambiar entre cuadrícula y lista, filtrar por carpeta, formato, fecha y uso, seleccionar archivos y reutilizarlos. El detalle muestra dimensiones, peso, formato, original descargable y derivados cuando están registrados. El conteo incluye copia de trabajo, publicaciones e historial. Se muestran hasta 30 referencias por recurso en el detalle. El registro completo protege el archivo.

El inicio muestra tareas editoriales antes del resumen. Los listados ofrecen miniaturas mayores y acciones con iconos y confirmación. El historial muestra diez revisiones por página y permite filtrar por entidad, fecha y autor. La comparación busca la revisión anterior aunque quede fuera de los filtros o de la página actual. Configuración divide un único formulario de guardado en Negocio, Contacto, Redes, Footer y Preferencias.

## Arquitectura y contratos

| Componente | Contrato |
| --- | --- |
| `media_assets` | Identidad UUID, ruta canónica, datos del original, estado y revisión. Una fila anterior puede conservar su ruta con metadatos pendientes. |
| `media_variants` | Cuatro roles WebP por activo listo. Cada ruta, URL, tamaño y hash queda ligado al activo. |
| `media_asset_references` | Relaciona cada recurso con entidad, fuente y versión. La referencia histórica nace en la misma transacción que la revisión. |
| `media_events` | Registra reserva, finalización, fallo, edición de nombre y archivo con actor y fecha. |
| `private.media_upload_jobs` | Reserva de tres minutos con un identificador de intento que controla quién puede finalizar. |
| `product_collections` | Asociación canónica. `products.collection_id` representa la colección principal para clientes anteriores. |
| `published_product_collections` | Lee las asociaciones de la versión publicada y las colecciones públicas vigentes. |

El endpoint `/api/studio-media` exige sesión administrativa y valida origen en las escrituras. El proceso Node comprueba la firma y decodifica mediante Sharp. Acepta JPEG, PNG, WebP y AVIF de una sola imagen. Limita a 30 MB, 40 megapíxeles, 16.000 px por lado y 12 segundos por operación Sharp, con dos trabajos simultáneos por proceso. Aplica orientación EXIF, conserva el original privado y genera WebP con compresión con pérdida, sin ampliación y sin los metadatos del original. Los lados máximos de Miniatura, Tarjeta, Galería y Alta resolución son 256, 768, 1440 y 2400 px. Las fichas y tarjetas públicas de producto usan los derivados generados durante la carga.

El cliente mantiene un UUID para cada archivo. La fila reservada y las cinco rutas permiten reanudar una carga parcial. Una ruta que ya existe se reutiliza si bytes y hash coinciden. El servicio escribe los objetos y finaliza en SQL con el identificador vigente. Si falla la respuesta final, se consulta la base de datos y se indica que la confirmación está pendiente cuando sigue sin poder comprobarse. Conservar los parciales identificados permite recuperarlos sin eliminar archivos que puedan haber quedado asociados.

La escritura de contenido y la restauración siguen usando los contratos transaccionales. Los nuevos snapshots incluyen las asociaciones, variantes y metadatos públicos. La versión pública anterior cambia al publicar. RLS permite consultar el catálogo administrativo a usuarios autorizados y reserva las escrituras para contratos específicos. Las políticas de Storage bloquean la escritura directa desde sesiones de navegador. El original pasa por una ruta autorizada. El archivado exige que el recurso carezca de referencias y comprueba la revisión del recurso.

## Migraciones y fotos existentes

1. `20261124170921_mash_media_catalog.sql` crea las relaciones, registra las rutas existentes y obtiene los usos de los snapshots anteriores. Conserva la URL, la asociación principal y los datos editoriales. Los snapshots anteriores siguen siendo válidos. Su `collection_id` se interpreta como la asociación inicial.
2. `20261124170923_mash_media_storage.sql` crea el bucket privado de originales, limita nuevas escrituras públicas a WebP y sustituye permisos de escritura directa. Los JPEG, PNG u otros archivos anteriores conservan sus rutas.
3. En un entorno hospedado de ensayo, antes de activar el código, revisar el inventario contra el backup, confirmar la cadena de migraciones y configurar el origen exacto de Storage con la cuenta propietaria. Después validar el número de asociaciones, usos históricos, rutas públicas antiguas, acceso a originales, límites reales del proveedor y recuperación de cargas interrumpidas.
4. Los recursos anteriores aparecen con metadatos pendientes. Una reutilización verifica la ruta o presencia del archivo. La migración no lee bytes de Storage ni transforma masivamente las fotos. Una optimización posterior puede registrar derivados comprobados por lote y probar un cambio editorial explícito antes de actualizar publicaciones.

## Evidencia y aceptación

- Editor y galería. [Nuevo editor](screenshots/01-editor-nuevo.png), [galería](screenshots/02-galeria.png), [portada](screenshots/03-portada.png) y [móvil](screenshots/08-editor-movil.png).
- Biblioteca. [Cuadrícula](screenshots/04-biblioteca.png), [detalle](screenshots/05-detalle.png), [selector](screenshots/06-selector-multimedia.png), [carga](screenshots/09-carga.png) y [error](screenshots/10-error.png).
- Selección de [colecciones múltiples](screenshots/07-colecciones-multiples.png).
- Frente al [editor de Fase 3](../phase-3/screenshots/product-edit.png), la Fase 4 reúne las fotos en una cuadrícula y muestra los campos de la foto seleccionada. Estado y colecciones pasan a la columna lateral. Guardar, previsualizar y publicar siguen visibles durante la edición.
- Frente al [historial](../phase-3/screenshots/history.png) y [configuración](../phase-3/screenshots/settings.png) anteriores, la comparación se abre por revisión y configuración muestra un grupo de campos por pestaña.

| Verificación | Evidencia |
| --- | --- |
| Carga múltiple, EXIF, cuatro derivados, límites y archivos inválidos | Suites de procesamiento y carga, más el recorrido de Chrome. |
| Selección, orden, portada, borrador, publicación, SEO y colecciones | Recorrido de Chrome y prueba de transacción en PostgreSQL. |
| Restauración, aislamiento de borradores, RLS, referencias protegidas, reintento parcial y conflicto | Suites SQL y regresiones de Studio. |
| Responsive, teclado, autenticación y PWA | Regresiones de navegador y pruebas anteriores. |

Los cambios se concentran en `app/studio-mash`, las rutas `app/api/studio-media`, `lib/media`, la persistencia y lectura de catálogo en `lib/supabase`, las dos migraciones y las suites de `tests`. El lector público de producto y sus componentes de tarjeta y galería consumen las variantes. El detalle exacto por archivo queda en el diff de la rama.

La evidencia local usa Chrome y Next compilado. Sharp y PostgreSQL son reales. Auth, la API HTTP de datos y el transporte de Storage usan la fachada de pruebas. Las políticas de Storage se ejecutaron en PostgreSQL con un esquema local equivalente para las pruebas. Quedan pendientes de integración hospedada el acceso OTP real, la latencia y límites del proveedor, los permisos efectivos de los buckets y la restauración de un respaldo hospedado. La Fase 4 finaliza en la rama de trabajo y la activación hospedada requiere su propia verificación.

Para abrir una vista local con datos de demostración, ejecuta `npm run preview:studio` y visita `http://localhost:3010/__preview__/enter`. `npm run test:all` ejecuta las suites SQL y JavaScript. El recorrido `npm run test:phase4:browser` requiere la vista de demostración. Las capturas se guardan en `.test-artifacts/phase4-browser` salvo que se indique `MASH_EVIDENCE_DIR`.

El commit de implementación es `b3ef358cdcc11d013d5d4ff6bd993a4a3ad8fdeb`. Se confirmó su publicación en `origin/feature/mash-3`. 

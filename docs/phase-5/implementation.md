# MASH Studio · Fase 5

Traducciones reúne los borradores en español e inglés para revisarlos y editarlos lado a lado. La tabla incluye búsqueda, filtros, paginación y selección múltiple. Los estados proceden de las revisiones y los trabajos guardados. Desde una ficha se puede traducir, regenerar los campos automáticos previa confirmación o guardar el inglés como revisado. Se cubren productos, colecciones, proyectos y bloques editables del sitio, incluida navegación, portada, secciones, páginas informativas, pie, llamadas a la acción, textos alternativos existentes y campos SEO traducibles.

## Proveedor y activación

DeepL usa un endpoint HTTPS para Free o Pro, permite enviar lotes de textos y puede devolver los caracteres facturados. Google Cloud Translation cobra por caracteres y ofrece glosarios administrados. OpenAI ofrece control flexible del tono con facturación por tokens. Para el flujo ES → EN de MASH se eligió el contrato específico de traducción de DeepL y su registro por caracteres. El adaptador implementa una interfaz de servidor intercambiable. [DeepL Translate](https://developers.deepl.com/api-reference/translate/request-translation) · [Google Cloud Translation](https://cloud.google.com/products/translate/pricing) · [OpenAI API](https://platform.openai.com/pricing/)

1. En un entorno autorizado de ensayo, aplicar la cadena de migraciones hasta `20261124183828_mash_translation_workflow.sql` después de verificar la copia de seguridad.
2. Definir `MASH_DEEPL_API_KEY` como variable secreta de servidor. El sufijo `:fx` selecciona DeepL Free. Sin la variable o con valor vacío, el módulo sigue permitiendo revisar y editar manualmente.
3. Abrir **Traducciones → Preferencias de traducción**, definir los términos protegidos y activar la traducción al guardar si se desea. Confirmar con un borrador de prueba y revisar la factura en la cuenta del proveedor. El indicador «configurado» confirma la presencia de la variable. La validez de la credencial se comprueba al usar el servicio.

## Integridad y costos

La migración añade preferencias, trabajos, registro de consumo y una vista administrativa. Guardar el español encola la traducción y, con proveedor configurado, intenta procesar el trabajo después de confirmar el guardado. Una selección de hasta 12 fichas queda encolada en una sola transacción. El navegador confirma los resultados uno a uno y puede retomar los pendientes desde **En cola**. Si termina la ejecución tras la respuesta, el trabajo se recupera al vencer su reserva. En esta fase la recuperación se hace desde Studio.

Cada trabajo usa versión esperada y un identificador de reserva. Una respuesta para una revisión anterior se descarta. Los hashes por campo evitan volver a traducir texto que conserva una traducción válida. La generación conserva el inglés escrito o revisado manualmente, incluidos los valores anteriores al despliegue. El diccionario, nombres comerciales, enlaces y contactos se protegen. Se envían campos editoriales y la generación escribe únicamente en la copia de trabajo. Aprobar el inglés y publicar son acciones distintas. Cuando no hay traducción publicada apta, el lector conserva la política de mostrar el original en español.

El servidor limita a dos trabajos simultáneos y a 15 trabajos iniciados por minuto. DeepL recibe hasta dos lotes para los bloques actuales y tiene 12 segundos de espera por llamada. Los fallos temporales y 429 aplican una espera antes del reintento. Solo se guarda consumo facturado declarado por la respuesta del proveedor. Si se pierde la respuesta remota, la cuenta del proveedor conserva la referencia fiable de consumo.

## Evidencia de Fase 5

- [Centro de traducciones](screenshots/01-centro.png), [revisión](screenshots/02-revision.png) y [preferencias](screenshots/03-preferencias.png).
- [Modo oscuro](screenshots/04-modo-oscuro.png), [móvil](screenshots/05-movil.png) y [Multimedia](screenshots/06-multimedia.png).
- [Pruebas de navegador](browser-evidence.json) y [resultado consolidado](validation.json).

Pasaron 94 pruebas automatizadas, incluidas las 88 anteriores. También completaron typecheck, build y las regresiones de contenido público, interfaz y PWA. La integración con DeepL se probó mediante un transporte simulado en pruebas. PostgreSQL aislado ejecutó las migraciones y contratos reales. Quedan pendientes una llamada real de DeepL, la integración con Supabase hospedado y la verificación de trabajos después de responder bajo los límites efectivos del proyecto Vercel.

## QA de Fase 4

| Observación | Resultado |
| --- | --- |
| Miniaturas vacías | Las 20 imágenes antiguas del catálogo local decodificaron al recorrer la biblioteca. Las cuatro primeras cargan de inmediato. Un fallo provocado mostró el indicador de imagen no disponible. La comprobación de las URLs hospedadas queda pendiente. |
| Derivados de fotos antiguas | Pendiente mantener un inventario con ruta anterior, tamaño y hash, generar derivados por lote en ensayo y enlazarlos después de validar sus usos históricos. La migración de Fase 4 conserva rutas y archivos. |
| Pesos inferiores a 1 KB | Corregido. Se expresan en bytes. |
| Jerarquía de biblioteca | Se reforzaron el total de resultados y los nombres de archivo. La cuadrícula distingue una foto pendiente de una que intentó cargar y falló. |
| Cargas grandes en Vercel | El límite estándar documentado es 4,5 MB. La beta de Node admite hasta 20 MiB de entrada con activación expresa y memoria de 4 GB. El límite local de 30 MB de Sharp no demuestra capacidad hospedada. Probar subidas por debajo y por encima del límite efectivo y descargas grandes en ensayo. [Límites de Functions](https://vercel.com/docs/functions/limitations) · [Beta de cuerpos grandes](https://vercel.com/changelog/vercel-functions-now-support-request-bodies-up-to-20mib) |
| Permisos de Storage hospedado | Pendiente en ensayo. Verificar lectura de derivados, denegación de escrituras directas de navegador y descarga de originales con sesión administrativa. Las políticas SQL pasaron las pruebas aisladas de Fase 4. |
| Aislamiento de la demostración | La ruta está en el servidor de pruebas, que solo escucha en loopback, rechaza el entorno Vercel y desactiva el proveedor. La compilación estándar devuelve 404 en `/__preview__/enter` y no emite cookie. El dominio público actual también respondió 404 sin cookie en una consulta de solo lectura. |

La [vista local de ensayo](http://localhost:3012/__preview__/enter) utiliza datos sintéticos. Para volver a iniciarla, usa el comando del proyecto `npm run preview:studio` y el puerto de tu sesión. Para las capturas ejecuta `npm run test:phase5:browser` con la vista local iniciada.

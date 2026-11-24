# Fase 8 · Experiencia pública y traspaso

**Checkpoint funcional.** La Fase 8 sigue abierta. La rama de partida fue `4c353c0a7b7250811f34d92562e252defdfb126e`.

## Dirección visual

La lectura de las referencias destacó la fotografía de ambientes, la visibilidad del tejido, la composición arquitectónica y la jerarquía editorial. MASH conserva su marca, sus fuentes y su material fotográfico. El ajuste implementado usa el marfil y el marrón existentes, menos superficies con relieve, encuadres rectos y mayor escala tipográfica. [Tribù](https://www.tribu.com/), [DEDON](https://www.dedon.de/), [Kettal](https://www.kettal.com/), [Minotti](https://www.minotti.com/en).

## Implementación

- `app/[locale]/editorial-theme.css` ajusta portada, tarjetas de producto, fichas editoriales, proyectos y Contacto. `Header` mejora el menú móvil, el foco, Escape y el enlace de idioma. El hero conserva las fotografías del CMS.
- El comparador compartido empieza al 50 %, permite mover la división desde la imagen y conserva el teclado. La manija queda dentro de la imagen en los extremos. La barra inferior se retiró.
- El lienzo gana espacio en escritorio, agrupa operaciones en el árbol e incorpora una representación desplegable de la navegación móvil. La publicación conserva el renderer de contenido compartido y la configuración existente.
- `MotionEnhancer` aplica revelados breves mediante IntersectionObserver y respeta la reducción de movimiento. El contenido está visible desde el primer render. `PublicAnalytics` prepara un contrato interno sin etiquetas ni peticiones de analítica.
- Se estabilizó el punto de sustitución SQL del flujo editorial para que archivo y restauración no dependan de LF o CRLF en migraciones previas.

## Validación en esta sesión

- Pasaron typecheck, build optimizado y 103 pruebas automatizadas, incluidas las 102 anteriores.
- Pasaron las regresiones HTTP sobre build aislado, UX pública y administrativa, PWA y los recorridos de las fases 6 y 7 en Chrome. Las pruebas comprueban aislamiento de borradores, publicaciones y rutas, navegación, galería y destino de WhatsApp sin enviar mensajes.
- El recorrido de Fase 8 comprobó ocho rutas públicas en 320, 360, 390, 414, 768, 1024, 1280, 1440 y 1920 px. Incluyó modo horizontal, salto de idioma, teclado y Escape, ausencia de errores JavaScript capturados y exclusión analítica local. Se generaron capturas de escritorio y móvil de las rutas ensayadas y del lienzo móvil. Pueden regenerarse según [Pruebas](../TESTING.md).

Muestra puntual de Chrome 157 contra el build aislado con PostgreSQL/WASM. El navegador cambió de tamaño durante el recorrido. Las cifras sirven como referencia local aproximada. Lighthouse, CLS, INP y resultados en entorno hospedado quedan pendientes.

| Ruta | TTFB | LCP observado |
| --- | ---: | ---: |
| `/es` | 203 ms | 508 ms |
| `/es/colecciones` | 26 ms | 164 ms |
| `/es/productos` | 29 ms | 92 ms |
| `/es/productos/oasis-set` | 33 ms | 376 ms |
| `/es/nosotros` | 21 ms | 296 ms |
| `/es/proyectos` | 22 ms | 264 ms |
| `/es/noticias` | 18 ms | 444 ms |
| `/es/contacto` | 17 ms | 68 ms |

## Cobertura pendiente de Fase 8

1. Iterar el diseño editorial del inicio y revisar cada sección con contenido real publicado. Preparar y validar el uso de Noticias en la composición de Inicio. Revisar composición y navegación entre fichas del catálogo, jerarquía de colecciones y estados vacíos.
2. Realizar revisión visual detallada de Nosotros y confirmar el recorte del retrato de Yascari y la foto de fibra con los archivos aprobados. Revisar galería editorial de proyectos y maquetación de artículos con contenido representativo.
3. Completar equivalencia entre cabecera y pie del editor y la web, ajustar las miniaturas pendientes y revisar la interacción en pantallas táctiles y lectores de pantalla. El menú del lienzo muestra contenido de navegación y sigue en modo de previsualización.
4. Completar la matriz de regresión incluyendo navegación de colecciones, recursos fallidos, enlaces y accesibilidad formal. Medir Lighthouse y Core Web Vitals con un protocolo repetible. La evidencia de esta sesión describe solo los entornos y casos efectivamente ejecutados.
5. Validar eventos con un receptor simulado del contrato interno. El evento de contacto completado se reserva para un flujo con confirmación real. Las integraciones, credenciales, consentimiento y validación externas quedan en el [plan de Fase 9](../PHASE_9_PLAN.md).

## Validación adicional

El recorrido local comprobó Noticias publicadas en Inicio, navegación de catálogo, la alternativa cuando falla una imagen, las galerías editoriales y la correspondencia de navegación y pie entre Studio y web en móvil. Se ampliaron las zonas táctiles del árbol de secciones y se revisó la navegación con teclado. El retrato que ya usa la web se reencuadró sin cambiar el archivo. Sigue pendiente la aprobación visual de Yascari y fibra con contenido de referencia.

Las 14 combinaciones de rutas y anchos incluidas en axe pasaron sin infracciones detectadas. Lighthouse, en una primera muestra local optimizada de Inicio en español, midió 92 de rendimiento en móvil y 99 en escritorio, 96 de accesibilidad en ambos y LCP de 3,35 s y 0,85 s, respectivamente. La auditoría SEO se hizo en un entorno que bloquea la indexación. La prueba local del receptor de analítica verificó consentimiento, revocación y eventos. El [protocolo](../TESTING.md) permite repetir las mediciones.

## Limpieza y continuidad

Se retiraron de Git 47 capturas y un índice de capturas de fases anteriores, con 7.822.832 bytes menos en el árbol de trabajo. Se retiraron referencias a esas imágenes y se conservaron las pruebas, informes técnicos, migraciones y recursos de la aplicación. Se trasladaron 2.160 archivos generados de los directorios de compilación y pruebas a un archivo local fuera del repositorio, con 1.519.204.218 bytes menos dentro de la carpeta del proyecto. El traslado conserva esos bytes en disco. Los respaldos y materiales locales de la herramienta de video también quedaron archivados fuera de Git. El historial sigue intacto.

La revisión de patrones de secretos no encontró coincidencias en los archivos versionados. Los recorridos siguen disponibles en [Pruebas](../TESTING.md) y generan sus evidencias locales en directorios ignorados.

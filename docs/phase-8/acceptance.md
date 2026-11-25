# Matriz de aceptación de Fase 8

Se conserva el punto de partida de 14 de 32 requisitos aprobados. Las aprobaciones locales se sustentan en la revisión de la titular, las pruebas de regresión, el [QA local](../phase-9/qa.md) y la [auditoría del editor](../phase-9/visual-editor-parity.md). La aprobación definitiva corresponde a la titular.

| ID | Requisito | Estado | Evidencia o caso pendiente |
| --- | --- | --- | --- |
| W1 | Diseño de todas las páginas | APROBADO | Revisión visual de la titular. |
| W2 | Calidad y encuadre fotográfico | PARCIAL | Retrato y original de fibra aprobados. Revisar recortes en fichas y vistas estrechas. |
| W3 | Animaciones y transiciones | PARCIAL | Revisar carruseles, transiciones y movimiento reducido por plantilla. |
| W4 | Navegación y enlaces | APROBADO | Recorridos locales y enlace de Noticias en el pie. |
| W5 | Experiencia móvil | PARCIAL | Recorrido a 320 px completado. Quedan interacciones táctiles y estados vacíos por plantilla. |
| W6 | Coherencia ES/EN | PARCIAL | Rutas cubiertas. Falta validar textos y fallback en todas las fichas. |
| S1 | Funcionamiento completo de módulos | PARCIAL | Recorridos y operaciones representativas. Verificar acciones restantes por módulo. |
| S2 | Formularios intuitivos y completos | PARCIAL | Revisar límites, validaciones y persistencia por formulario. |
| S3 | Botones y acciones operativos | PARCIAL | Cubiertos flujos principales. Inventario y prueba de acciones secundarias pendientes. |
| S4 | Todos los contenidos comerciales editables | PARCIAL | Falta cerrar cabeceras comerciales y plantilla de cotización. |
| S5 | Estados y mensajes comprensibles | PARCIAL | Ejercitar errores, vacíos, esperas y confirmaciones por módulo. |
| S6 | Navegación administrativa cómoda | PARCIAL | Recorrido de 13 rutas por motor. Revisar teclado y uso táctil de menús. |
| S7 | Temas claro y oscuro | PARCIAL | Alternancia por clic verificada en 12 rutas a 390 y 1440 px. Queda evaluar el contraste de estados de cada formulario. |
| E1 | Equivalencia del lienzo y la web | PARCIAL | Portada comparada. Quedan variantes de bloques y páginas. |
| E2 | 22 tipos con contenido representativo | PARCIAL | Inserción y publicación probadas. Faltan datos e interacciones específicos por tipo. |
| E3 | Alta, baja y orden de secciones | APROBADO | Alta, duplicación, orden, ocultación y eliminación probados en navegador. |
| E4 | Edición de textos, imágenes y estilos | APROBADO | Edición directa, selección de medio y punto focal responsive probados. |
| E5 | Cabecera y pie equivalentes | PARCIAL | Renderizador compartido. Falta comparar navegación, estados y configuración de ambos extremos. |
| E6 | Fidelidad de vista móvil | PARCIAL | Portada comparada a 390 px. Falta extender a composiciones, menú y galerías. |
| E7 | Mapa de taller administrable | APROBADO | Configuración → Contacto. Borrador, publicación y coincidencia del iframe verificados. |
| I1 | Borrador privado | APROBADO | Sitio conservó la revisión anterior al guardar. |
| I2 | Publicación conserva contenido | PARCIAL | Inicio conserva Noticias en la primera publicación. Falta comparar cada composición y baja intencional. |
| I3 | Restauración de versiones | APROBADO | Historial recupera revisión de trabajo sin modificar automáticamente la publicada. |
| I4 | Publicación de traducciones aprobadas | PARCIAL | Colecciones y Noticias cubiertas. Falta completar publicación y restauración para las otras familias. |
| I5 | Persistencia tras recargar | APROBADO | Verificada en composición, catálogo y configuración. |
| I6 | Conservación de medios y relaciones | APROBADO | Se comprobaron derivados y membresías múltiples. |
| T1 | Regresión automatizada | APROBADO | 108 pruebas superadas en último checkpoint de código. |
| T2 | Typecheck y build | APROBADO | Compilación optimizada con verificación de tipos. |
| T3 | Cierre de incidencias críticas y altas | PARCIAL | Consolidar y reevaluar cada hallazgo abierto. |
| T4 | Accesibilidad básica | APROBADO | Axe sin infracciones en las 14 combinaciones evaluadas. |
| T5 | Rendimiento local | APROBADO | Lighthouse de Inicio local dio 100 en las muestras móvil y escritorio. |
| T6 | GitHub sincronizado y documentado | APROBADO | Checkpoints en `feature/mash-3`. |

La evidencia nueva se guarda fuera de Git en `.test-artifacts/phase8-close/`. Para consultar el SHA remoto del checkpoint, ejecutar `git ls-remote origin refs/heads/feature/mash-3`.

## Checkpoint de Studio y editor

- `node tests/phase8-studio-themes.cjs` completó 48 capturas de 12 superficies sin excepciones del navegador.
- `node tests/phase6-browser.cjs` verificó edición, deshacer, rehacer, reutilización de fotos, orden, duplicado, ocultación, eliminación, conflicto entre revisiones y paso de borrador a publicación. Comprobó 320, 390, 768 y 1440 px y dejó seis capturas.
- El editor aún requiere comparar composiciones completas con datos representativos. Los contrastes medidos se limitan a los controles ejercitados en la suite.

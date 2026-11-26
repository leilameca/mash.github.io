# Checkpoint de Fase 6

Rama `feature/mash-3`. Base `441db0ea52db569f9a7dc0dfc603f36de175bc39`. El informe y los resultados reproducibles están en este directorio.

| Etapa | Punto recuperable |
| --- | --- |
| 6A | `lib/visual` y la migración definen esquema, contrato transaccional, adaptación del CMS y permisos. Reanudar con `npm run test:phase6`. |
| 6B | `app/studio-mash/contenido/editor` contiene barra, árbol, lienzo, inspector, historial de sesión y flujo de guardado. Abrir el editor en la vista de ensayo. |
| 6C | `components/visual` contiene el renderizador compartido. El registro conecta traducciones y Multimedia, y las rutas públicas leen solo composiciones publicadas. |
| 6D | Las vistas se ensayan en 1440, 768, 390 y 320 px. El inspector guarda herencia y ajustes específicos. Las capturas de escritorio, tablet y móvil muestran los paneles. |
| 6E | `validation.json` enlaza las pruebas. Para reproducir, ejecutar `npm run test:all`, `npm run typecheck`, `npm run build` y las pruebas de navegador con la vista local. |

Al continuar en otro equipo, partir del HEAD de la rama remota, instalar con `npm ci` y ejecutar las pruebas dirigidas antes de la vista de ensayo. Revisar el registro de QA antes de autorizar integraciones hospedadas.

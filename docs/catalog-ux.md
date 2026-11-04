# Gestión del catálogo y experiencia de compra

## Administrador

- Buscar por nombre, slug o colección; filtrar por estado y colección.
- Duplicar crea un borrador con textos e imágenes compartidas; nunca publica automáticamente.
- «A la papelera» usa el estado `archived`. Conserva todos los datos y archivos. Los productos previamente archivados también aparecen aquí. Restaurar los devuelve a borrador; publicar requiere una acción explícita.
- El editor agrupa publicación, contenido, fotografías, especificaciones e inglés. La barra de guardado permanece visible. Los errores conservan lo escrito. La vista previa es orientativa y no publica.
- Las fotos se optimizan en el navegador a un máximo de 2000 px, con progreso por archivo, reintento y aviso de baja resolución. La carga individual admite menos de 4 MB; máximo 20 imágenes por producto. Se pueden ordenar arrastrando o con flechas y seleccionar la principal.
- Multimedia permite reutilizar imágenes existentes. Solo se aceptan archivos verificados en el bucket del proyecto. Las cargas que aún no se guardaron en un producto permanecen en Multimedia para reutilizarlas.

## Sitio público

- Galería con miniaturas, ampliación, navegación con flechas y cierre con Escape.
- Cotización por WhatsApp con nombre y URL de la pieza; botón persistente en móvil.
- Selección de hasta diez piezas, almacenada solamente durante la sesión del navegador. No es un checkout ni confirma disponibilidad/precios.
- Catálogo paginado, doce registros por consulta. El detalle consulta por slug y los relacionados se filtran y limitan en la base de datos. La memoización de React solo comparte lecturas dentro de una petición; no introduce caché persistente de contenido.

## Verificación

`npm run build`, `npm run test:admin`, `npm run test:pwa`, `npm run test:ux`.

Las pruebas de administrador utilizan componentes reales con servicios simulados: no escriben datos en producción. Las pruebas públicas arrancan el build local y comprueban escritorio, tablet y móvil. Las pruebas de carga validan acceso y origen; no sustituyen una carga autenticada contra Supabase en producción.

No se requieren migraciones nuevas. La medición de Core Web Vitals en producción sigue pendiente; no se atribuye una mejora porcentual de velocidad a estos cambios.

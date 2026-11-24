# Base de datos

La fuente del esquema es [supabase/migrations](../supabase/migrations). Las migraciones deben aplicarse en orden ascendente, primero sobre una copia aislada. Las migraciones de semillas históricas requieren revisar el inventario y aplicar el procedimiento de conciliación de la [Fase 2](phase-2/implementation.txt) cuando se parte de datos existentes.

| Grupo | Tablas y relaciones |
| --- | --- |
| Acceso | `admin_users` vincula correo permitido y `auth.users`. El acceso a Studio valida la sesión y la lista de administradores. |
| Catálogo | `products`, `collections`, `projects`, traducciones hijas por idioma e imágenes hijas de productos y proyectos. `product_collections` une productos y colecciones por UUID. |
| Editorial | `site_content` y `site_content_translations`. Las claves `visual.*`, `news.*` y `announcement.*` reutilizan las revisiones existentes. Los proyectos guardan relaciones y fotografías adicionales en datos editoriales validados. |
| Publicación | `content_revisions` conserva instantáneas inmutables. `content_publications` identifica la versión pública de cada entidad. `content_redirects` reserva las rutas anteriores. `published_content` expone una selección explícita de datos publicados. |
| Multimedia | `media_assets`, `media_variants`, `media_events`, `media_asset_references` y `private.media_upload_jobs`. `mash-media` contiene derivados públicos. `mash-originals` tiene originales privados. |
| Traducciones | `translation_preferences`, `translation_jobs`, `translation_usage` y `studio_translation_entries`. Las tareas trabajan sobre una revisión y verifican la vigencia antes de aplicar resultados. |
| Otros | `private.mash_environment` identifica el origen de Storage permitido. `contact_requests` pertenece al esquema base. La cotización pública usa WhatsApp. |

La lectura de copias de trabajo se restringe con RLS. Los caminos públicos usan la vista filtrada, sin actor ni copias privadas. Las RPC controlan identidad administrativa y versión esperada antes de escribir. Las políticas restrictivas de Storage bloquean escrituras directas en ambos buckets para clientes anónimos y autenticados. El procesamiento verificado de medios usa un cliente de servidor. Los permisos, restauración y migraciones remotas se validarán en staging durante la Fase 9.

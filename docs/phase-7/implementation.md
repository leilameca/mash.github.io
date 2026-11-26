# MASH Studio · Fase 7

## Funcionalidades

- Studio mantiene la página actual mientras llega la siguiente al navegar entre secciones. Las acciones de guardado conservan su propio estado.
- Proyectos incluye duplicación como borrador, clasificación libre, fecha, descripción breve, portada y galería ordenable, textos de fotografía, relaciones con el catálogo, SEO e historial. La página de cada proyecto publicado tiene una ruta individual y puede mostrar un comparador usable con teclado y pantalla táctil.
- Noticias incluye búsqueda, filtros y estados editoriales. Las fichas tienen bloques de texto tipados, fotografías, traducciones y vínculos al catálogo y a proyectos. Las rutas públicas son `/[locale]/noticias` y `/[locale]/noticias/[slug]`.
- Anuncios se gestiona de forma independiente. La edición usa la hora de Santo Domingo y la base guarda los límites en UTC. Las barras y los banners se eligen por vigencia, idioma, página y prioridad. El cierre se guarda durante la sesión pública.
- El editor visual incorpora bloques de noticias, cuadrícula de proyectos, antes y después y anuncios. El lienzo y la web comparten los renderizadores. Los datos de catálogo que alimentan los bloques proceden de publicaciones.

## Persistencia y privacidad

La [migración editorial](../../supabase/migrations/20261124193928_mash_editorial_content.sql) añade metadatos a proyectos, traducciones y fotografías. Noticias y Anuncios reutilizan las revisiones y el flujo de publicación de `site_content` con identidades estables `news.*` y `announcement.*`. Rige el control de versión de Studio. Restaurar crea un borrador. Las fotografías siguen protegidas por el registro de uso de Multimedia. Los cambios de esquema no agregan contenido de ejemplo.

Contacto muestra el mapa de Google del taller en español e inglés y conserva el enlace original para abrir indicaciones. La ubicación procede del enlace compartido por el negocio. La galería de Proyectos conserva la ubicación general como texto. [Ubicación MASH](https://maps.app.goo.gl/boeE5xkJGyu5Pw4m9), [ayuda de Google Maps](https://support.google.com/maps/answer/7101463?hl=en-en).

## Validación local

La vista de ensayo arranca en loopback con datos de prueba y PostgreSQL/WASM aislado. Para reproducir en PowerShell:

```powershell
npm ci
npm run typecheck
npm run test:all
$env:MASH_VERIFICATION_BUILD='1'
npm run build
$env:MASH_PREVIEW_PORT='3016'
npm run preview:studio
```

En otra terminal:

```powershell
$env:MASH_PREVIEW_URL='http://localhost:3016'
npm run test:phase7:browser
$env:MASH_VERIFICATION_BUILD='1'
$env:MASH_EVIDENCE_DIR='.test-artifacts/phase7-http'
npm run test:phase2:http
```

Abrir [Studio de ensayo](http://localhost:3016/__preview__/enter). El servidor de ensayo guarda esos cambios en memoria.

La comprobación pasó con 102 pruebas automatizadas, incluidas las 99 anteriores, más typecheck, build, pruebas HTTP y los ocho recorridos registrados en Chrome. [Resultados de Chrome](browser-evidence.json), [resultados HTTP](http-evidence.json), [resumen de validación](validation.json).

## Pendientes

- **Fase 8**. Equiparar la navegación móvil del lienzo, compactar acciones del árbol, ampliar el lienzo de escritorio, distinguir miniaturas de secciones y separar preferencias e indicadores de traducción en móvil.
- **Fase 9**. Verificar personalmente edición directa, arrastre, restauración y equivalencia con la publicación. Validar Supabase hospedado, OTP, DeepL, permisos y cargas de Storage, límites de Vercel, derivados antiguos y restauración de respaldos. Revisar la ausencia de datos de ensayo en producción y consolidar capturas, reportes y archivos temporales.

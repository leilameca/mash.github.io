# Pruebas

`npm run typecheck` verifica TypeScript. `npm run build` compila la aplicación. En Windows, usa `$env:MASH_VERIFICATION_BUILD='1'` para separar la compilación de verificación.

`npm run test:all` ejecuta las suites de catálogo, PWA, publicación, Studio, Multimedia, traducción, editor visual, contenido editorial y analítica. Las pruebas de persistencia ejercitan PostgreSQL/WASM. Auth y el adaptador REST de prueba son simulados.

Para pruebas en navegador inicia `npm run preview:studio` y establece `MASH_PREVIEW_URL` al origen local correspondiente. Ejecuta `npm run test:phase3:browser` a `npm run test:phase8:browser`, según la fase a verificar. `npm run test:phase2:http` se ejecuta contra una compilación normal de Next y prueba que el acceso de ensayo no existe allí. Usa `MASH_EVIDENCE_DIR=.test-artifacts/http` para su salida. Los archivos de evidencia se generan fuera de Git.

Consulta los resultados de la sesión en el [checkpoint de Fase 8](phase-8/implementation.md). La aprobación hospedada, Lighthouse, multinavegador y accesibilidad asistida quedan detallados en [Fase 9](PHASE_9_PLAN.md).

Para regenerar las capturas de Fase 8, define `MASH_CAPTURE_SCREENSHOTS=1` antes de ejecutar el recorrido. Inicia un fixture fresco para evitar cambios de publicación de otros recorridos.

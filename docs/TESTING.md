# Pruebas

`npm run typecheck` verifica TypeScript. `npm run build` compila la aplicación. En Windows, usa `$env:MASH_VERIFICATION_BUILD='1'` para separar la compilación de verificación.

`npm run test:all` ejecuta las suites de catálogo, PWA, publicación, Studio, Multimedia, traducción, editor visual, contenido editorial y analítica. Las pruebas de persistencia ejercitan PostgreSQL/WASM. Auth y el adaptador REST de prueba son simulados.

Para pruebas en navegador inicia `npm run preview:studio` y establece `MASH_PREVIEW_URL` al origen local correspondiente. Ejecuta `npm run test:phase3:browser` a `npm run test:phase8:browser`, según la fase a verificar. `npm run test:phase2:http` se ejecuta contra una compilación normal de Next y prueba que el acceso de ensayo no existe allí. Usa `MASH_EVIDENCE_DIR=.test-artifacts/http` para su salida. Los archivos de evidencia se generan fuera de Git.

Consulta los resultados de la sesión en el [checkpoint de Fase 8](phase-8/implementation.md). La aprobación hospedada, Lighthouse, multinavegador y accesibilidad asistida quedan detallados en [Fase 9](PHASE_9_PLAN.md).

Para regenerar las capturas de Fase 8, define `MASH_CAPTURE_SCREENSHOTS=1` antes de ejecutar el recorrido. Inicia un fixture fresco para evitar cambios de publicación de otros recorridos.

## Accesibilidad, Lighthouse y analítica

- `npm run test:accessibility:browser` ejecuta axe con etiquetas WCAG 2.0 y 2.1 A/AA en siete rutas y dos anchos. Devuelve un código de error cuando detecta incumplimientos.
- Para Lighthouse, parte de una compilación optimizada aislada con el fixture local. Ejecuta `npx --yes lighthouse@13.6.0 http://localhost:3022/es --chrome-flags="--headless" --output=json --output-path=.test-artifacts/lighthouse/mobile.json` y repite con `--preset=desktop` y `desktop.json`. En Windows, define `CHROME_PATH` con la ruta de Chrome si el ejecutable no se detecta.
- Para simular el receptor de Google, inicia un fixture adicional con `MASH_PREVIEW_PORT=3024`, `MASH_GA_ENABLED=1` y `NEXT_PUBLIC_MASH_GA_ID=G-TESTONLY`. El runner `npm run test:analytics:browser` redirige el host permitido a loopback, intercepta el script y bloquea peticiones externas. Verifica consentimiento, rechazo, retiro, evento y exclusión local. Usa identificadores ficticios exclusivamente en ese proceso.

## Resultado del checkpoint

Pasaron las 108 pruebas de `npm run test:all`, incluidas las 105 originales, y la compilación optimizada. El [QA del 25 de noviembre](phase-9/qa.md) registra los recorridos con Chromium, Firefox y WebKit y la segunda auditoría axe con 14 combinaciones sin infracciones detectadas. La [matriz de preparación](phase-9/readiness.md) registra qué casos se repitieron con Supabase real en Docker y cuáles dependen de staging.

Para comprobar la protección sin credenciales, define `MASH_QA_STAGING_URL=https://mash-staging.onrender.com` y ejecuta `npm run test:staging:browser -- --anonymous-only`.

Para el recorrido hospedado, instala Chromium, Firefox y WebKit con `npx playwright install chromium firefox webkit`. Inyecta `MASH_QA_STAGING_PASSWORD` desde un gestor seguro al proceso de QA para Render. En un Preview autorizado de Vercel, usa `MASH_QA_STORAGE_STATE` con la ruta al estado de navegador en `playwright/.auth/`. Ejecuta `npm run test:staging:browser`. El runner realiza lecturas, limita las credenciales al origen autorizado y rechaza el dominio de producción. Los flujos de escritura requieren cuentas y registros de ensayo.

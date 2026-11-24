# Ejecutar en otra computadora

Instala Git, Node.js 22 y Chrome. En Linux o macOS, si Playwright no tiene navegador, ejecuta `npx playwright install chromium`.

```powershell
git clone --branch feature/mash-3 https://github.com/leilameca/mash.github.io.git
cd mash.github.io
git rev-parse HEAD
npm ci
npm run typecheck
npm run test:all
$env:MASH_PREVIEW_PORT='3020'
npm run preview:studio
```

Abre [sitio local](http://localhost:3020/es) y [Studio local](http://localhost:3020/__preview__/enter). La demostración funciona sin credenciales y reinicia sus cambios al detenerse. En Bash, inicia con `MASH_PREVIEW_PORT=3020 npm run preview:studio`. Para ejecutar pruebas de navegador en una segunda terminal usa `$env:MASH_PREVIEW_URL='http://localhost:3020'`. Los comandos están en [Pruebas](TESTING.md).

## Configuración para un entorno conectado

### Supabase real en local con US$0

Para revisar solo diseño, catálogo y Studio, basta el comando `npm run preview:studio` de arriba. Si también necesitas probar Auth y Storage con los servicios de Supabase, inicia Docker con contenedores Linux y ejecuta en PowerShell, desde la raíz del repositorio:

```powershell
$env:Path = (Split-Path (Get-Command docker).Source) + ';' + $env:Path
node scripts/prepare-local-supabase.cjs
npx --yes supabase@3.4.0 start --workdir .test-artifacts/supabase-zero-cost --exclude realtime,imgproxy,edge-runtime,logflare,vector,supavisor
Get-Content .test-artifacts/supabase-zero-cost/bootstrap.sql |
  docker exec -i supabase_db_mash-zero-cost psql -U postgres -d postgres -v ON_ERROR_STOP=1
powershell -NoProfile -File scripts/start-local-supabase-preview.ps1
```

Abre [el sitio](http://localhost:3030/es) o [el acceso de Studio](http://localhost:3030/studio-mash). Solicita el código para `studio-local@example.test` y recógelo en [Mailpit local](http://127.0.0.1:54424), sin correo externo. Usa el host `localhost` para la web y Studio, incluida la subida multimedia. Las migraciones cargan los datos iniciales versionados del catálogo como borradores. Puedes publicarlos desde el Studio local si vas a verificar ese flujo.

Los puertos 54420–54429 separan esta instancia de otras instalaciones de Supabase. Usa únicamente datos de ensayo y mantén los puertos dentro del equipo o su red de desarrollo autorizada. El SQL de arranque fija el origen multimedia a la API local mediante una restricción de base de datos. En entornos hospedados sigue vigente el requisito de HTTPS. El lanzador usa las claves locales en el proceso y mantiene GA4 y DeepL desactivados.

Al terminar, detén Next con `Ctrl+C` y ejecuta `npx --yes supabase@3.4.0 stop --workdir .test-artifacts/supabase-zero-cost`. El comando de parada conserva los datos locales.

### Variables de un entorno autorizado

Copia `.env.example` a `.env.local` y usa únicamente valores de un entorno aislado autorizado.

| Variable | Cómo obtenerla |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de prueba en los ajustes de Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública del mismo proyecto. La aplicación también acepta la variable heredada `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio del mismo proyecto, solo del lado servidor. Guardar en un gestor de secretos o en el entorno privado. |
| `NEXT_PUBLIC_SITE_URL` | Origen canónico del entorno correspondiente. |
| `MASH_DEEPL_API_KEY` | Clave de cuenta de prueba de DeepL. Mantener vacía hasta aprobar la prueba externa en Fase 9. |
| `MASH_STAGING` | Configura `1` en un Preview privado para bloquear indexación. |
| `MASH_GA_ENABLED`, `NEXT_PUBLIC_MASH_GA_ID` | Activación y código público del flujo GA4 aprobado. Mantener desactivada en los entornos de ensayo. |
| `MASH_GA_PROPERTY_ID`, `MASH_GA_SERVICE_ACCOUNT_JSON` | ID de propiedad y acceso de solo lectura en el entorno privado del servidor. |

`npm run dev` sirve la aplicación conectada. El correo OTP requiere configurar el proveedor SMTP en Supabase y verificar el remitente con Resend. Los valores se obtienen directamente desde las cuentas autorizadas. La migración de un entorno conectado y la configuración SMTP quedan en [Fase 9](PHASE_9_PLAN.md).

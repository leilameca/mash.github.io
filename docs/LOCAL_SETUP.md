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

Copia `.env.example` a `.env.local` y usa únicamente valores de un entorno aislado autorizado.

| Variable | Cómo obtenerla |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de prueba en los ajustes de Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública del mismo proyecto. La aplicación también acepta la variable heredada `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio del mismo proyecto, solo del lado servidor. Guardar en un gestor de secretos o en el entorno privado. |
| `NEXT_PUBLIC_SITE_URL` | Origen canónico del entorno correspondiente. |
| `MASH_DEEPL_API_KEY` | Clave de cuenta de prueba de DeepL. Mantener vacía hasta aprobar la prueba externa en Fase 9. |

`npm run dev` sirve la aplicación conectada. El correo OTP requiere configurar el proveedor SMTP en Supabase y verificar el remitente con Resend. Los valores se obtienen directamente desde las cuentas autorizadas. La migración de un entorno conectado y la configuración SMTP quedan en [Fase 9](PHASE_9_PLAN.md).

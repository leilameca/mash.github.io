# Traspaso a otra sesión

Clona o actualiza `feature/mash-3` con avance rápido. Confirma que el SHA de `git rev-parse HEAD` coincide con `git ls-remote origin refs/heads/feature/mash-3`. Lee [Estado](PROJECT_STATUS.md), el [checkpoint de Fase 8](phase-8/implementation.md) y [Configuración local](LOCAL_SETUP.md).

```powershell
git switch feature/mash-3
git pull --ff-only origin feature/mash-3
git status --short
npm ci
npm run typecheck
npm run test:all
$env:MASH_PREVIEW_PORT='3020'
npm run preview:studio
```

En otra terminal establece `MASH_PREVIEW_URL` al puerto de ensayo y ejecuta las suites indicadas en [Pruebas](TESTING.md). Pide a Codex que retome los puntos pendientes del checkpoint en esta rama. La Fase 9 está autorizada para staging independiente. El lanzamiento en producción requiere aprobación expresa. Los reportes de capturas se reproducen localmente y se generan en directorios ignorados. Los valores de configuración deben obtenerse de los administradores de cada servicio.


## Continuidad del staging

El presupuesto autorizado es de US$0. La entrega se puede revisar localmente sin credenciales mediante `npm run preview:studio`. El proyecto `mash-staging` está configurado con protección en Vercel y queda sin despliegue. Supabase rechazó la creación por cuota y la rama facturable fue descartada. La consulta de solo lectura a MASH confirmó que el esquema de producción todavía no tiene las tablas de publicación que requiere esta rama. La titular autorizó revisar las propiedades de Google y queda por habilitar acceso técnico a ellas. La [matriz de preparación](phase-9/readiness.md) registra la evidencia y lo que falta para una entrega hospedada.

Para repetir el ensayo con Supabase real y sin cuenta en la nube, sigue [Supabase local](LOCAL_SETUP.md#supabase-real-en-local-con-us0). Pasaron las 16 migraciones, las rutas ES/EN, el acceso con OTP capturado localmente, la subida con cuatro derivados y el original privado, y la publicación de Noticias en la ficha y en Inicio. La primera ejecución detectó que Inicio lanzaba un error si faltaba el bloque opcional `home.sections`. El arreglo conserva las secciones opcionales ocultas y sigue reportando los errores de conexión.

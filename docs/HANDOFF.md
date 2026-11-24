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

En otra terminal establece `MASH_PREVIEW_URL` al puerto de ensayo y ejecuta las suites indicadas en [Pruebas](TESTING.md). Pide a Codex que retome los puntos pendientes del checkpoint en esta rama. La Fase 9, los servicios hospedados y el lanzamiento requieren aprobación independiente. Los reportes de capturas se reproducen localmente y se generan en directorios ignorados. Los valores de configuración deben obtenerse de los administradores de cada servicio.

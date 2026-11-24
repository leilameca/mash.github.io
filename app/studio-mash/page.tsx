import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { studioOverview } from "@/lib/admin/queries";
import {
  kindLabels,
  modulePaths,
  studioDate,
  type StudioKind,
} from "@/lib/admin/presentation";
import { StudioShell } from "./StudioShell";
import { PageHeader, EmptyState } from "./StudioPrimitives";
export default async function Page() {
  const admin = await requireAdmin();
  const { summary, activity } = await studioOverview();
  const total = (key: "pending" | "translations_pending" | "live_published") =>
    summary.reduce((sum, s) => sum + Number(s[key]), 0);
  return (
    <StudioShell admin={admin}>
      <PageHeader
        eyebrow="Inicio"
        title="Tu espacio de trabajo"
        description="Gestiona la presencia digital de MASH."
      >
        <Link className="admin-button" href="/studio-mash/productos/nuevo">
          + Nuevo producto
        </Link>
        <Link
          className="admin-button admin-button--secondary"
          href="/studio-mash/contenido"
        >
          Editar sitio web
        </Link>
      </PageHeader>
      <nav className="studio-quick-links" aria-label="Acciones rápidas">
        <Link href="/studio-mash/colecciones/nueva">+ Crear colección</Link>
        <Link href="/studio-mash/proyectos/nuevo">+ Crear proyecto</Link>
        <Link href="/studio-mash/multimedia">Gestionar imágenes ↗</Link>
        <Link href="/studio-mash/revisiones">Consultar historial →</Link>
      </nav>
      <section className="studio-metrics" aria-label="Resumen del contenido">
        {(["product", "collection", "project"] as StudioKind[]).map((kind) => {
          const s = summary.find((row) => row.kind === kind);
          return (
            <Link
              key={kind}
              href={`/studio-mash/${modulePaths[kind]}`}
              className="studio-metric"
            >
              <span>
                {
                  {
                    product: "Productos",
                    collection: "Colecciones",
                    project: "Proyectos",
                    site: "Sitio web",
                  }[kind]
                }
              </span>
              <strong>{s?.total ?? 0}</strong>
              <small>
                {s?.live_published ?? 0} publicados · {s?.work_draft ?? 0}{" "}
                borradores
              </small>
            </Link>
          );
        })}
        <Link href="/studio-mash/revisiones" className="studio-metric">
          <span>Cambios por publicar</span>
          <strong>{total("pending")}</strong>
          <small>Copias de trabajo pendientes</small>
        </Link>
      </section>
      <div className="studio-dashboard-grid">
        <section className="studio-card">
          <div className="studio-section-heading">
            <div>
              <p className="studio-kicker">Control editorial</p>
              <h2>Estado de publicación</h2>
            </div>
            <span className="studio-dot-label">
              {total("live_published")} en el sitio
            </span>
          </div>
          {summary.map((s) => (
            <div className="studio-editorial-row" key={s.kind}>
              <div>
                <strong>{kindLabels[s.kind]}</strong>
                <small>
                  {s.live_published} publicados de {s.total} · {s.hidden}{" "}
                  ocultos · {s.archived} archivados
                </small>
              </div>
              <progress
                aria-label={`${kindLabels[s.kind]} publicados`}
                max={Math.max(1, s.total)}
                value={s.live_published}
              />
            </div>
          ))}
          <div className="studio-notice">
            <strong>
              {total("translations_pending")} contenidos con inglés pendiente
            </strong>
            <p>Revisa las traducciones manualmente antes de publicar.</p>
            <Link href="/studio-mash/traducciones">Revisar traducciones →</Link>
          </div>
        </section>
        <section className="studio-card">
          <div className="studio-section-heading">
            <div>
              <p className="studio-kicker">Historial</p>
              <h2>Actividad reciente</h2>
            </div>
            <Link href="/studio-mash/revisiones">Ver todo →</Link>
          </div>
          {activity.length ? (
            activity.map((row) => (
              <Link
                className="studio-activity"
                key={`${row.entity_kind}-${row.entity_id}-${row.version}`}
                href={`/studio-mash/revisiones?kind=${row.entity_kind}&id=${row.entity_id}`}
              >
                <span className="studio-activity-mark">↗</span>
                <div>
                  <strong>
                    {kindLabels[row.entity_kind as StudioKind]} · revisión{" "}
                    {row.version}
                  </strong>
                  <small>
                    {row.author} · {studioDate(row.created_at)}
                  </small>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState
              title="Aún no hay revisiones"
              description="Los cambios guardados aparecerán aquí."
            />
          )}
        </section>
      </div>
      <section className="studio-workflow-note">
        <strong>Guardar y publicar son pasos distintos.</strong>
        <p>
          Guardar conserva una copia de trabajo. El sitio cambia cuando
          confirmas una publicación.
        </p>
      </section>
    </StudioShell>
  );
}

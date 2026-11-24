import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import {
  kindLabels,
  studioDate,
  relevantDiff,
  type StudioKind,
} from "@/lib/admin/presentation";
import { StudioShell } from "../StudioShell";
import { PageHeader, EmptyState } from "../StudioPrimitives";
import { RestoreForm } from "./RestoreForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    id?: string;
    page?: string;
    restored?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const scoped = !!(query.id || query.kind);
  const input = z
    .object({
      kind: z.enum(["product", "collection", "project", "site"]),
      id: z.string().uuid(),
    })
    .safeParse(query);
  if (scoped && !input.success) notFound();
  const client = await authenticatedContentClient();
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  let request = client
    .from("content_revisions")
    .select("entity_kind,entity_id,version,snapshot,created_at,created_by", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * 20, page * 20);
  if (input.success)
    request = request
      .eq("entity_kind", input.data.kind)
      .eq("entity_id", input.data.id);
  const [
    { data: rows, error, count },
    { data: authors, error: authorError },
    { data: entries, error: entryError },
  ] = await Promise.all([
    request,
    client.from("admin_users").select("user_id,full_name,email"),
    client
      .from("studio_entries")
      .select("id,kind,name,revision,published_version,live_status"),
  ]);
  if (error || authorError || entryError || !rows || !entries)
    throw new Error("No pudimos consultar el historial.");
  const visible = rows.slice(0, 20);
  const next = rows[20];
  const pageHref = (p: number) =>
    `?${new URLSearchParams({ ...query, page: String(p) } as Record<string, string>)}`;
  return (
    <StudioShell admin={admin}>
      <PageHeader
        eyebrow="Herramientas"
        title="Historial"
        description="Cada guardado conserva una revisión. Restaurar crea una nueva copia de trabajo sin cambiar la publicación."
      />
      {query.restored === "1" && (
        <p className="admin-success" role="status">
          Revisión recuperada como borrador. Revisa el contenido antes de
          publicar.
        </p>
      )}
      <section className="studio-card">
        {scoped && (
          <Link href="/studio-mash/revisiones">← Todo el historial</Link>
        )}
        {!visible.length && (
          <EmptyState
            title="No hay revisiones"
            description="Las revisiones se registran cuando guardas contenido."
          />
        )}
        {visible.map((row, index) => {
          const entry = entries.find(
            (e) => e.id === row.entity_id && e.kind === row.entity_kind,
          );
          const author = authors?.find((a) => a.user_id === row.created_by);
          const prior = rows
            .slice(index + 1)
            .find(
              (r) =>
                r.entity_id === row.entity_id &&
                r.entity_kind === row.entity_kind &&
                r.version === row.version - 1,
            );
          const differences = prior
            ? relevantDiff(prior.snapshot, row.snapshot)
            : [];
          return (
            <article
              className="studio-revision"
              key={`${row.entity_kind}-${row.entity_id}-${row.version}`}
            >
              <div className="studio-revision-header">
                <div>
                  <p className="studio-kicker">
                    {kindLabels[row.entity_kind as StudioKind]}
                  </p>
                  <h2>
                    <Link
                      href={`/studio-mash/revisiones?kind=${row.entity_kind}&id=${row.entity_id}`}
                    >
                      {entry?.name ?? "Contenido"}
                    </Link>{" "}
                    · v{row.version}
                  </h2>
                  <p>
                    <time dateTime={row.created_at}>
                      {studioDate(row.created_at)}
                    </time>{" "}
                    ·{" "}
                    {author?.full_name ||
                      author?.email ||
                      (row.created_by
                        ? "Autor no registrado"
                        : "Autor no registrado")}
                  </p>
                </div>
                {entry?.published_version === row.version &&
                  entry?.live_status === "published" && (
                    <span className="studio-status studio-status--published">
                      Versión pública actual
                    </span>
                  )}
              </div>
              <details>
                <summary>Ver contenido y diferencias</summary>
                {prior ? (
                  <dl className="studio-diff">
                    {differences.length ? (
                      differences.map((d, i) => (
                        <div key={i}>
                          <dt>{d.field}</dt>
                          <dd>
                            <span>Antes</span>
                            {d.before}
                          </dd>
                          <dd>
                            <span>Esta revisión</span>
                            {d.after}
                          </dd>
                        </div>
                      ))
                    ) : (
                      <p>
                        Sin cambios editoriales respecto a la revisión anterior.
                      </p>
                    )}
                  </dl>
                ) : (
                  <p>
                    La revisión anterior no está en esta página. Se muestra el
                    contenido guardado completo.
                  </p>
                )}
                <pre className="studio-snapshot">
                  {JSON.stringify(row.snapshot, null, 2)}
                </pre>
              </details>
              {entry && (
                <RestoreForm
                  kind={row.entity_kind}
                  id={row.entity_id}
                  version={row.version}
                  expectedVersion={entry.revision}
                />
              )}
            </article>
          );
        })}
        <nav className="studio-pagination" aria-label="Paginación">
          {page > 1 ? (
            <Link href={pageHref(page - 1)}>← Anterior</Link>
          ) : (
            <span />
          )}
          {(next || page * 20 < (count ?? 0)) && (
            <Link href={pageHref(page + 1)}>Siguiente →</Link>
          )}
        </nav>
      </section>
    </StudioShell>
  );
}

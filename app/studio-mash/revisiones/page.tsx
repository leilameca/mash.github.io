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
import { MediaImage } from "../multimedia/MediaImage";
import { RestoreForm } from "./RestoreForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    id?: string;
    page?: string;
    restored?: string;
    author?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const pageSize = 10;
  const input = z
    .object({
      kind: z.enum(["", "product", "collection", "project", "site"]).optional(),
      id: z.uuid().optional(),
      author: z
        .union([z.literal(""), z.literal("unknown"), z.uuid()])
        .optional(),
      from: z.union([z.literal(""), z.iso.date()]).optional(),
      to: z.union([z.literal(""), z.iso.date()]).optional(),
    })
    .safeParse(query);
  if (!input.success || (input.data.id && !input.data.kind)) notFound();
  const filters = input.data;
  const client = await authenticatedContentClient();
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  let request = client
    .from("content_revisions")
    .select("entity_kind,entity_id,version,snapshot,created_at,created_by", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .order("entity_id")
    .order("version", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filters.kind) request = request.eq("entity_kind", filters.kind);
  if (filters.id) request = request.eq("entity_id", filters.id);
  if (filters.author === "unknown") request = request.is("created_by", null);
  else if (filters.author) request = request.eq("created_by", filters.author);
  if (filters.from)
    request = request.gte("created_at", `${filters.from}T00:00:00-04:00`);
  if (filters.to)
    request = request.lte("created_at", `${filters.to}T23:59:59.999999-04:00`);
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
  const previous = await Promise.all(
    rows.map(async (row) => {
      if (row.version <= 1) return null;
      const { data, error: comparisonError } = await client
        .from("content_revisions")
        .select("snapshot")
        .eq("entity_kind", row.entity_kind)
        .eq("entity_id", row.entity_id)
        .eq("version", row.version - 1)
        .maybeSingle();
      if (comparisonError)
        throw new Error("No pudimos consultar la revisión anterior.");
      return data;
    }),
  );
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
      if (value) params.set(key, value);
    params.set("page", String(p));
    return `?${params}`;
  };
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
        <form method="get" className="studio-history-filters">
          {filters.id && <input type="hidden" name="id" value={filters.id} />}
          <label>
            Entidad
            <select
              name="kind"
              defaultValue={filters.kind ?? ""}
              disabled={Boolean(filters.id)}
            >
              <option value="">Todas</option>
              {Object.entries(kindLabels).map(([kind, label]) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {filters.id && (
            <input type="hidden" name="kind" value={filters.kind} />
          )}
          <label>
            Desde <input name="from" type="date" defaultValue={filters.from} />
          </label>
          <label>
            Hasta <input name="to" type="date" defaultValue={filters.to} />
          </label>
          <label>
            Autor
            <select name="author" defaultValue={filters.author ?? ""}>
              <option value="">Todos</option>
              <option value="unknown">Sin autor asignado</option>
              {(authors ?? []).map((author) => (
                <option key={author.user_id} value={author.user_id}>
                  {author.full_name || author.email}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-button admin-button--secondary">
            Filtrar
          </button>
          <Link href="/studio-mash/revisiones">Limpiar filtros</Link>
        </form>
        <p className="studio-list-caption">
          {count ?? 0} revisiones · Página {page} de{" "}
          {Math.max(1, Math.ceil((count ?? 0) / pageSize))}
        </p>
        {!rows.length && (
          <EmptyState
            title="No hay revisiones"
            description="Las revisiones se registran cuando guardas contenido."
          />
        )}
        {rows.map((row, index) => {
          const entry = entries.find(
            (e) => e.id === row.entity_id && e.kind === row.entity_kind,
          );
          const author = authors?.find((a) => a.user_id === row.created_by);
          const prior = previous[index];
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
                            <DiffValue
                              value={d.before}
                              photographs={d.field === "images"}
                            />
                          </dd>
                          <dd>
                            <span>Esta revisión</span>
                            <DiffValue
                              value={d.after}
                              photographs={d.field === "images"}
                            />
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
                  <p>No hay una revisión anterior para comparar.</p>
                )}
                <details>
                  <summary>Ver datos completos</summary>
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
              </details>
            </article>
          );
        })}
        <nav className="studio-pagination" aria-label="Paginación">
          {page > 1 ? (
            <Link href={pageHref(page - 1)}>← Anterior</Link>
          ) : (
            <span />
          )}
          {page * pageSize < (count ?? 0) && (
            <Link href={pageHref(page + 1)}>Siguiente →</Link>
          )}
        </nav>
      </section>
    </StudioShell>
  );
}

function DiffValue({
  value,
  photographs,
}: {
  value: string;
  photographs: boolean;
}) {
  if (photographs) {
    try {
      const images: {
        storage_path: string;
        alt_es?: string;
        is_primary?: boolean;
      }[] = JSON.parse(value);
      if (Array.isArray(images))
        return (
          <div className="studio-diff-photos">
            {images.length
              ? images.map((image, index) => (
                  <figure key={image.storage_path}>
                    <MediaImage
                      src={image.storage_path}
                      alt={image.alt_es || ""}
                    />
                    <figcaption>
                      {index + 1}
                      {image.is_primary ? " · Principal" : ""}
                      {image.alt_es && ` · ${image.alt_es}`}
                    </figcaption>
                  </figure>
                ))
              : "Sin fotografías"}
          </div>
        );
    } catch {
      // Older snapshots may omit the gallery.
    }
  }
  return <>{value}</>;
}

import { DuplicateProject } from "./proyectos/DuplicateProject";
import Link from "next/link";
import { MediaImage } from "./multimedia/MediaImage";
import { StudioIcon } from "./StudioIcon";
import {
  entryHref,
  stateLabels,
  studioDate,
  type StudioKind,
} from "@/lib/admin/presentation";
import { studioEntries, type ListQuery } from "@/lib/admin/queries";
import { StatusBadge, EmptyState, PageHeader } from "./StudioPrimitives";
import { StatusForm } from "./StatusForm";
import {
  updateProductStatus,
  updateCollectionStatus,
  updateProjectStatus,
} from "./actions";
const modules = {
  product: {
    title: "Productos",
    new: "Nuevo producto",
    path: "productos",
    create: "nuevo",
  },
  collection: {
    title: "Colecciones",
    new: "Nueva colección",
    path: "colecciones",
    create: "nueva",
  },
  project: {
    title: "Proyectos",
    new: "Nuevo proyecto",
    path: "proyectos",
    create: "nuevo",
  },
};
export async function EntryList({
  kind,
  query,
}: {
  kind: Exclude<StudioKind, "site">;
  query: ListQuery;
}) {
  const { entries, total, page, pageSize } = await studioEntries(kind, query);
  const module = modules[kind];
  const pageLink = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, v]) => !!v) as [string, string][],
    );
    params.set("page", String(p));
    return `?${params}`;
  };
  return (
    <>
      {(query.saved === "1" || query.published === "1") && (
        <p role="status" className="admin-success">
          {query.published === "1"
            ? "Versión publicada correctamente."
            : "Cambios guardados. La versión pública se conserva."}
        </p>
      )}
      <PageHeader
        eyebrow={kind === "project" ? "Contenido" : "Catálogo"}
        title={module.title}
        description="Gestiona el contenido de trabajo y su versión pública."
      >
        <Link
          className="admin-button"
          href={`/studio-mash/${module.path}/${module.create}`}
        >
          + {module.new}
        </Link>
      </PageHeader>
      <section className="studio-table-card">
        <form className="studio-list-filters" method="get">
          <label>
            Buscar
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Buscar por nombre…"
              type="search"
            />
          </label>
          <label>
            Publicación
            <select name="state" defaultValue={query.state ?? ""}>
              <option value="">Todos los estados</option>
              {Object.entries(stateLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trabajo
            <select name="work" defaultValue={query.work ?? ""}>
              <option value="">Todos</option>
              <option value="draft">Borradores</option>
              <option value="published">Listos para publicar</option>
              <option value="hidden">Ocultos</option>
              <option value="archived">Archivados</option>
            </select>
          </label>
          <label>
            Ordenar
            <select name="sort" defaultValue={query.sort ?? "recent"}>
              <option value="recent">Última actualización</option>
              <option value="oldest">Más antiguos</option>
              <option value="name">Nombre A–Z</option>
            </select>
          </label>
          <button className="admin-button admin-button--secondary">
            Filtrar
          </button>
          {(query.q || query.state || query.work) && (
            <Link href={`/studio-mash/${module.path}`}>Limpiar</Link>
          )}
        </form>
        <div className="studio-list-caption">
          <span>
            {total} {total === 1 ? "resultado" : "resultados"}
          </span>
          <span>
            Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
          </span>
        </div>
        {entries.length ? (
          <div className="studio-entry-table">
            <div className="studio-entry-table__head">
              <span>Nombre</span>
              <span>Publicación</span>
              <span>Actualizado</span>
              <span>Acciones</span>
            </div>
            {entries.map((entry) => (
              <article className="studio-entry" key={entry.id}>
                <div className="studio-entry-identity">
                  <Link
                    href={entryHref(entry)}
                    className="studio-entry-thumb"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    {entry.image ? (
                      <MediaImage src={entry.image} alt="" />
                    ) : (
                      <span>—</span>
                    )}
                  </Link>
                  <div>
                    <Link className="studio-entry-name" href={entryHref(entry)}>
                      {entry.name}
                    </Link>
                    <small>{entry.collection || entry.slug}</small>
                    <small>
                      Trabajo:{" "}
                      {{
                        draft: "Borrador",
                        published: "Listo para publicar",
                        hidden: "Oculto",
                        archived: "Archivado",
                      }[entry.work_status] ?? entry.work_status}{" "}
                      · v{entry.revision}
                    </small>
                  </div>
                </div>
                <div>
                  <StatusBadge state={entry.publication_state} />
                  {entry.translation_pending && <small>Inglés pendiente</small>}
                </div>
                <time dateTime={entry.updated_at}>
                  {studioDate(entry.updated_at)}
                </time>
                <details className="studio-entry-menu">
                  <summary aria-label={`Acciones de ${entry.name}`}>
                    <span aria-hidden="true">⋯</span>
                  </summary>
                  <div>
                    <Link href={entryHref(entry)}>
                      <StudioIcon name="content" /> Editar
                    </Link>
                    <Link
                      href={`/studio-mash/revisiones?kind=${kind}&id=${entry.id}`}
                    >
                      <StudioIcon name="history" /> Historial
                    </Link>
                    {entry.live_status === "published" &&
                      entry.published_slug && (
                        <Link
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`/es/${module.path}/${entry.published_slug}`}
                        >
                          <StudioIcon name="external" /> Ver publicado
                        </Link>
                      )}
                    {kind === "project" && (
                      <DuplicateProject
                        id={entry.id}
                        revision={entry.revision}
                      />
                    )}
                    <StatusForm
                      id={entry.id}
                      revision={entry.revision}
                      status={entry.work_status}
                      label={`Estado de ${entry.name}`}
                      menu
                      action={
                        {
                          product: updateProductStatus,
                          collection: updateCollectionStatus,
                          project: updateProjectStatus,
                        }[kind]
                      }
                    />
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
        <nav className="studio-pagination" aria-label="Paginación">
          {page > 1 ? (
            <Link href={pageLink(page - 1)}>← Anterior</Link>
          ) : (
            <span />
          )}
          {page * pageSize < total && (
            <Link href={pageLink(page + 1)}>Siguiente →</Link>
          )}
        </nav>
      </section>
    </>
  );
}

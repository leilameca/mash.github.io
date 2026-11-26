import Link from "next/link";
import { editorialDrafts, editorialPath } from "@/lib/editorial/queries";
import {
  announcementData,
  categories,
  newsData,
  type EditorialKind,
} from "@/lib/editorial/schema";
import { studioDate } from "@/lib/admin/presentation";
import { PageHeader } from "../StudioPrimitives";
import { MediaImage } from "../multimedia/MediaImage";
import { EditorialTrash } from "./EditorialTrash";
import "./studio-editorial.css";

export type EditorialQuery = {
  q?: string;
  state?: string;
  category?: string;
  page?: string;
};
const states = {
  draft: "Borrador",
  pending: "Cambios pendientes",
  published: "Publicado",
  archived: "Papelera",
};
export async function EditorialList({
  kind,
  query,
}: {
  kind: EditorialKind;
  query: EditorialQuery;
}) {
  const listing = await editorialDrafts(kind);
  const root = editorialPath(kind);
  const news = kind === "news";
  const q = String(query.q ?? "")
    .trim()
    .slice(0, 90)
    .toLocaleLowerCase();
  const index = Math.max(
    1,
    Math.min(1000, parseInt(query.page ?? "", 10) || 1),
  );
  const entries = listing.filter(
    (row) =>
      (!q ||
        row.es.title?.toLocaleLowerCase().includes(q) ||
        row.key.includes(q)) &&
      (query.state ? row.status === query.state : row.status !== "archived") &&
      (!news || !query.category || row.value.category === query.category),
  );
  const page = Math.min(index, Math.max(1, Math.ceil(entries.length / 12)));
  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const key of ["q", "state", "category"] as const)
      if (query[key]) params.set(key, query[key]!);
    params.set("page", String(target));
    return root + "?" + params;
  };
  return (
    <>
      <PageHeader
        title={news ? "Noticias" : "Anuncios"}
        eyebrow="Contenido"
        description={
          news
            ? "Organiza y publica las novedades de MASH."
            : "Programa mensajes por idioma, fecha y página."
        }
      >
        {news && (
          <Link
            className="admin-button admin-button--secondary"
            href="/es/noticias"
            target="_blank"
            rel="noopener"
          >
            Ver noticias públicas ↗
          </Link>
        )}
        <Link className="admin-button admin-button--secondary" href={root + (query.state === "archived" ? "" : "?state=archived")}>
          {query.state === "archived" ? "Volver al listado" : "Papelera"}
        </Link>
        <Link className="admin-button" href={root + "/nuevo"}>
          ＋ {news ? "Nueva noticia" : "Nuevo anuncio"}
        </Link>
      </PageHeader>
      <section className="studio-table-card editorial-list">
        <form className="studio-list-filters" method="get">
          <label>
            Buscar{" "}
            <input
              name="q"
              type="search"
              defaultValue={query.q}
              placeholder="Título o ruta…"
            />
          </label>
          <label>
            Estado{" "}
            <select name="state" defaultValue={query.state ?? ""}>
              <option value="">Activos y borradores</option>
              {Object.entries(states).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {news && (
            <label>
              Categoría{" "}
              <select name="category" defaultValue={query.category ?? ""}>
                <option value="">Todas</option>
                {Object.entries(categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="admin-button admin-button--secondary">
            Filtrar
          </button>
          {(query.q || query.state || query.category) && (
            <Link href={root}>Limpiar</Link>
          )}
        </form>
        <div className="studio-list-caption">
          {entries.length} {news ? "noticias" : "anuncios"}{" "}
          <span>Página {page}</span>
        </div>
        {entries.length ? (
          <ul className="editorial-admin-rows">
            {entries.slice((page - 1) * 12, page * 12).map((entry) => {
              const article = newsData.safeParse(entry.value);
              const announcement = announcementData.safeParse(entry.value);
              const now = Date.now();
              const scheduled = announcement.success
                ? !announcement.data.active
                  ? "Desactivado"
                  : announcement.data.end &&
                      Date.parse(announcement.data.end) <= now
                    ? "Vencido"
                    : announcement.data.start &&
                        Date.parse(announcement.data.start) > now
                      ? "Programado"
                      : "Vigente"
                : null;
              return (
                <li key={entry.id}>
                  {article.success && article.data.cover && (
                    <MediaImage src={article.data.cover} alt="" />
                  )}
                  <div className="editorial-admin-entry">
                    <Link href={root + "/" + entry.id}>
                      {entry.es.title || entry.key}
                    </Link>
                    <small>
                      {article.success
                        ? categories[article.data.category]
                        : scheduled}{" "}
                      · {studioDate(entry.updated_at)}
                    </small>
                  </div>
                  <span
                    className={`studio-status studio-status--${entry.status}`}
                  >
                    {states[entry.status]}
                  </span>
                  <div className="editorial-row-actions">
                    <Link
                      className="admin-button admin-button--secondary"
                      href={root + "/" + entry.id}
                    >
                      {entry.status === "archived" ? "Abrir para restaurar" : "Editar"}
                    </Link>
                    {entry.status !== "archived" && <EditorialTrash kind={kind} id={entry.id} revision={entry.revision} />}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="studio-empty">
            <h2>
              {query.state === "archived" && !q && !query.category
                ? "La papelera está vacía"
                : q || query.state || query.category
                ? "No hay coincidencias"
                : news
                  ? "Aún no hay noticias"
                  : "Aún no hay anuncios"}
            </h2>
          </div>
        )}
        <nav className="studio-pagination" aria-label="Paginación editorial">
          {page > 1 && <Link href={href(page - 1)}>← Anterior</Link>}
          {page * 12 < entries.length && (
            <Link href={href(page + 1)}>Siguiente →</Link>
          )}
        </nav>
      </section>
    </>
  );
}

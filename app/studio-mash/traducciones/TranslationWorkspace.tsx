"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { StudioDialog } from "../StudioDialog";
import { StudioIcon } from "../StudioIcon";
import {
  entryHref,
  kindLabels,
  type StudioKind,
} from "@/lib/admin/presentation";
import {
  translationStates,
  translationErrors,
} from "@/lib/translation/presentation";

type State = keyof typeof translationStates;
type Entry = {
  kind: StudioKind;
  id: string;
  revision: number;
  name: string;
  slug: string;
  translation_state: State;
  error_code?: string | null;
  available_at?: string | null;
  job_mode?: "translate" | "regenerate" | "review";
};
type List = {
  entries: Entry[];
  summary: Record<State, number>;
  total: number;
  page: number;
  pageSize: number;
  preferences: { auto_on_save: boolean; terms: string[] };
  providerConfigured: boolean;
};
type Field = {
  key: string;
  path: string[];
  es: string;
  en: string;
  label?: string;
};
type Detail = { entry: Entry; fields: Field[] };
type Mode = "translate" | "regenerate" | "review";

const endpoint = "/api/studio-translations";
const statePairs = Object.entries(translationStates) as [State, string][];
const siteLabels: Record<string, string> = {
  "visual.home": "Inicio · composición",
  "visual.about": "Nosotros · composición",
  "visual.contact": "Contacto · composición",
  "visual.projects": "Proyectos · composición",
  "home.hero": "Portada",
  "home.sections": "Secciones de inicio",
  "site.navigation": "Navegación",
  "site.footer": "Footer",
  "site.settings": "Datos del negocio",
  "page.about": "Nosotros",
  "page.contact": "Contacto",
  "page.projects": "Página de proyectos",
};
const fieldLabels: Record<string, string> = {
  name: "Nombre comercial",
  title: "Título",
  description: "Descripción",
  materials: "Materiales",
  care: "Cuidados",
  seo_title: "Título SEO",
  seo_description: "Descripción SEO",
  copyright: "Copyright",
  cta: "Llamado a la acción",
  quote_label: "Cotización",
  location: "Ubicación",
};
const displayName = (entry: Entry) =>
  entry.kind === "site" ? siteLabels[entry.slug] || entry.name : entry.name;
const fieldLabel = ({ path, label }: Field, i: number) =>
  label ??
  (path[0] === "alts"
    ? `Texto alternativo · Foto ${i + 1}`
    : path[1] === "labels"
      ? `Etiqueta de navegación · ${path[2]}`
      : (fieldLabels[path.at(-1) ?? ""] ??
        (path.at(-1) ?? "").replace(/([A-Z])/g, " $1")));
const editHref = (entry: Entry) =>
  entry.kind === "site" && entry.slug.startsWith("visual.")
    ? "/studio-mash/contenido/editor?pagina=" + entry.slug.slice(7)
    : entry.kind === "site" &&
        ["site.settings", "site.footer"].includes(entry.slug)
      ? "/studio-mash/configuracion"
      : entryHref(entry);

async function api<T>(query = "", init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint + query, {
    cache: "no-store",
    ...init,
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "No pudimos consultar las traducciones.");
  return body;
}
const mutation = <T,>(body: unknown) =>
  api<T>("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export function TranslationWorkspace({
  initial,
  showPreferences,
}: {
  initial?: Pick<Entry, "kind" | "id">;
  showPreferences: boolean;
}) {
  const [filters, setFilters] = useState({ q: "", kind: "", state: "" });
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<List>();
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState<Pick<Entry, "kind" | "id"> | undefined>(
    initial,
  );
  const [detail, setDetail] = useState<Detail>();
  const [detailError, setDetailError] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isEditing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [preferencesOpen, setPreferencesOpen] = useState(showPreferences);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    const params = new URLSearchParams({ ...filters, page: String(page) });
    void api<List>("?" + params, { signal: controller.signal })
      .then(setList)
      .catch((error) => {
        if (!controller.signal.aborted) setListError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, page, refresh]);

  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();
    setDetailError("");
    void api<Detail>("?" + new URLSearchParams(target), {
      signal: controller.signal,
    })
      .then(setDetail)
      .catch((error) => {
        if (!controller.signal.aborted) setDetailError(error.message);
      });
    return () => controller.abort();
  }, [target, refresh]);

  function view(entry: Pick<Entry, "id" | "kind">) {
    setDetail(undefined);
    setEditing(false);
    setEdits({});
    setNotice("");
    setTarget({ id: entry.id, kind: entry.kind });
  }

  async function work(entries: Entry[], mode: Mode) {
    if (busy || !entries.length) return;
    if (
      mode === "regenerate" &&
      !window.confirm(
        "¿Regenerar los campos automáticos? Se conservará el inglés escrito o revisado manualmente.",
      )
    )
      return;
    setBusy(true);
    setNotice("");
    setProgress({ done: 0, total: entries.length });
    const outcomes: { status: string; code?: string; message?: string }[] = [];
    try {
      if (entries.length > 1) {
        try {
          await mutation({
            action: "batch",
            entries: entries.map(({ kind, id, revision }) => ({
              kind,
              id,
              version: revision,
            })),
          });
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : "No pudimos confirmar la cola.",
          );
          return;
        }
      }
      for (const [index, entry] of entries.entries()) {
        try {
          const result = await mutation<{
            status: string;
            code?: string;
            retryAt?: string;
          }>({
            action: "work",
            kind: entry.kind,
            id: entry.id,
            version: entry.revision,
            mode,
            ...(mode === "review" ? { edits } : {}),
          });
          outcomes.push(result);
        } catch (error) {
          outcomes.push({
            status: "error",
            message:
              error instanceof Error ? error.message : "Error de conexión.",
          });
        }
        setProgress({ done: index + 1, total: entries.length });
      }
      const success = outcomes.filter((row) =>
        ["translated", "reviewed"].includes(row.status),
      ).length;
      const result = outcomes[0];
      const description = result.code && translationErrors[result.code];
      setNotice(
        entries.length > 1
          ? `${success} de ${entries.length} confirmados. Puedes continuar los pendientes o reintentar desde su ficha.`
          : result.message ||
              description ||
              ({
                translated: "Traducción procesada en la copia de trabajo.",
                reviewed: "Revisión guardada en la copia de trabajo.",
                stale:
                  "La ficha cambió. Revisa la versión actual antes de continuar.",
                queued:
                  "Hay trabajos en cola. Puedes continuar en unos momentos.",
                processing: "Esta ficha ya se está procesando.",
                unavailable: "DeepL aún no está configurado.",
                error: "Espera antes de reintentar este trabajo.",
              }[result.status] ??
                "Consulta el estado antes de continuar."),
      );
      if (success && mode === "review") {
        setEditing(false);
        setEdits({});
      }
      if (success && !target) setSelected([]);
    } finally {
      setBusy(false);
      setProgress(undefined);
      setRefresh((value) => value + 1);
    }
  }

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setFilters({
      q: String(values.get("q")),
      kind: String(values.get("kind")),
      state: String(values.get("state")),
    });
    setSelected([]);
    setPage(1);
  }
  const available = list?.providerConfigured === true;
  const current = list?.entries ?? [];
  const chosen = current.filter((entry) => selected.includes(entry.id));

  return (
    <>
      <div className="studio-translation-top">
        <p>
          <span
            className={`studio-status ${available ? "studio-status--published" : ""}`}
          >
            DeepL {available ? "configurado" : "sin configurar"}
          </span>
        </p>
        <button
          className="admin-button admin-button--secondary"
          type="button"
          onClick={() => setPreferencesOpen(true)}
        >
          <StudioIcon name="settings" /> Preferencias de traducción
        </button>
      </div>
      <nav
        className="studio-translation-summary"
        aria-label="Estados de traducción"
      >
        {statePairs.map(([state, label]) => (
          <button
            type="button"
            key={state}
            aria-pressed={filters.state === state}
            onClick={() => {
              setFilters((value) => ({
                ...value,
                state: value.state === state ? "" : state,
              }));
              setPage(1);
              setSelected([]);
            }}
          >
            <strong>{list?.summary[state] ?? "—"}</strong>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <section className="studio-table-card studio-translation-list">
        <form
          className="studio-list-filters"
          onSubmit={filter}
          key={JSON.stringify(filters)}
        >
          <label>
            Buscar{" "}
            <input
              name="q"
              type="search"
              placeholder="Nombre del contenido…"
              defaultValue={filters.q}
            />
          </label>
          <label>
            Entidad{" "}
            <select name="kind" defaultValue={filters.kind}>
              <option value="">Todas</option>
              {Object.entries(kindLabels).map(([kind, label]) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado{" "}
            <select name="state" defaultValue={filters.state}>
              <option value="">Todos</option>
              {statePairs.map(([state, label]) => (
                <option key={state} value={state}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-button admin-button--secondary">
            Filtrar
          </button>
        </form>
        <div className="studio-translation-toolbar">
          <span>
            {list?.total ?? 0} contenidos · {chosen.length} seleccionados
          </span>
          <button
            type="button"
            className="admin-button"
            disabled={!chosen.length || busy || !available}
            onClick={() => void work(chosen, "translate")}
          >
            Traducir selección
          </button>
        </div>
        {progress && !target && (
          <p role="status">
            Traducciones procesadas: {progress.done} de {progress.total}
          </p>
        )}
        {notice && !target && <p role="status">{notice}</p>}
        {loading ? (
          <p role="status">Cargando traducciones…</p>
        ) : listError ? (
          <p role="alert">
            {listError}{" "}
            <button
              type="button"
              className="studio-text-button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Reintentar
            </button>
          </p>
        ) : current.length ? (
          <ul className="studio-translation-rows">
            {current.map((entry) => (
              <li key={entry.id}>
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${displayName(entry)}`}
                  checked={selected.includes(entry.id)}
                  onChange={(event) =>
                    setSelected((value) =>
                      event.target.checked
                        ? [...value, entry.id]
                        : value.filter((id) => id !== entry.id),
                    )
                  }
                />
                <div>
                  <strong>{displayName(entry)}</strong>
                  <small>
                    {kindLabels[entry.kind]} · v{entry.revision}
                  </small>
                </div>
                <span
                  className={`studio-status studio-translation-${entry.translation_state}`}
                >
                  {translationStates[entry.translation_state]}
                </span>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onClick={() => view(entry)}
                >
                  Revisar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay contenidos con estos filtros.</p>
        )}
        <nav
          className="studio-pagination"
          aria-label="Paginación de traducciones"
        >
          <button
            type="button"
            className="studio-text-button"
            disabled={page <= 1 || busy}
            onClick={() => {
              setSelected([]);
              setPage((value) => value - 1);
            }}
          >
            ← Anterior
          </button>
          <span>Página {page}</span>
          <button
            type="button"
            className="studio-text-button"
            disabled={!list || page * list.pageSize >= list.total || busy}
            onClick={() => {
              setSelected([]);
              setPage((value) => value + 1);
            }}
          >
            Siguiente →
          </button>
        </nav>
      </section>
      <StudioDialog
        wide
        open={Boolean(target)}
        title={detail ? displayName(detail.entry) : "Revisar traducción"}
        onClose={() => {
          setTarget(undefined);
          setDetail(undefined);
        }}
      >
        {detailError ? (
          <p role="alert">
            {detailError}{" "}
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Reintentar consulta
            </button>
          </p>
        ) : detail ? (
          <>
            <div className="studio-translation-detail-meta">
              <span className="studio-status">
                {translationStates[detail.entry.translation_state]} · v
                {detail.entry.revision}
              </span>
              <Link href={editHref(detail.entry)}>Abrir ficha ↗</Link>
            </div>
            {detail.entry.error_code && (
              <p>
                {translationErrors[detail.entry.error_code] ??
                  "La última operación no se pudo completar."}
              </p>
            )}
            <div className="studio-translation-detail-actions">
              <button
                type="button"
                className="admin-button"
                disabled={busy || !available || isEditing}
                onClick={() =>
                  void work(
                    [detail.entry],
                    detail.entry.translation_state === "error" &&
                      detail.entry.job_mode === "regenerate"
                      ? "regenerate"
                      : "translate",
                  )
                }
              >
                {detail.entry.translation_state === "error"
                  ? "Reintentar"
                  : "Traducir ficha"}
              </button>
              <button
                type="button"
                className="admin-button admin-button--secondary"
                disabled={busy || !available || isEditing}
                onClick={() => void work([detail.entry], "regenerate")}
              >
                Regenerar
              </button>
              <button
                type="button"
                className="admin-button admin-button--secondary"
                disabled={busy}
                onClick={() => setEditing((value) => !value)}
              >
                {isEditing ? "Ver sin editar" : "Editar inglés"}
              </button>
            </div>
            {progress && <p role="status">Procesando traducción…</p>}
            {notice && <p role="status">{notice}</p>}
            <div className="studio-translation-compare">
              <div className="studio-translation-language-labels">
                <span>Español · original</span>
                <span>Inglés · copia de trabajo</span>
              </div>
              {!detail.fields.length && (
                <p>Este contenido todavía no tiene texto traducible.</p>
              )}
              {detail.fields.map((field, index) => (
                <div className="studio-translation-field" key={field.key}>
                  <strong>{fieldLabel(field, index)}</strong>
                  <p lang="es">{field.es}</p>
                  {isEditing ? (
                    <textarea
                      lang="en"
                      rows={field.es.length > 170 ? 4 : 2}
                      aria-label={fieldLabel(field, index)}
                      value={edits[field.key] ?? field.en}
                      disabled={busy}
                      onChange={(event) =>
                        setEdits((values) => ({
                          ...values,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p lang="en">{edits[field.key] ?? (field.en || "—")}</p>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-button"
              disabled={
                busy ||
                !detail.fields.length ||
                detail.fields.some(
                  (field) => !(edits[field.key] ?? field.en).trim(),
                )
              }
              onClick={() => void work([detail.entry], "review")}
            >
              Guardar como revisado
            </button>
            <p>
              La traducción se verá en el sitio después de publicar la ficha.
            </p>
          </>
        ) : (
          <p role="status">Cargando ficha…</p>
        )}
      </StudioDialog>
      <StudioDialog
        open={preferencesOpen}
        title="Preferencias de traducción"
        onClose={() => setPreferencesOpen(false)}
      >
        {list ? (
          <TranslationPreferences
            preferences={list.preferences}
            available={available}
            onSaved={() => setRefresh((value) => value + 1)}
          />
        ) : (
          <p role={listError ? "alert" : "status"}>
            {listError || "Cargando preferencias…"}
          </p>
        )}
      </StudioDialog>
    </>
  );
}

function TranslationPreferences({
  preferences,
  available,
  onSaved,
}: {
  preferences: List["preferences"];
  available: boolean;
  onSaved: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    try {
      await mutation({
        action: "preferences",
        auto: values.has("auto"),
        terms: String(values.get("terms"))
          .split(/\r?\n/)
          .map((term) => term.trim())
          .filter(Boolean),
      });
      setFeedback("Preferencias guardadas.");
      onSaved();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "No pudimos guardar.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="studio-translation-preferences" onSubmit={submit}>
      <p>
        Proveedor:{" "}
        {available
          ? "DeepL configurado en servidor"
          : "DeepL pendiente de configuración"}
        .
      </p>
      <label className="studio-checkbox">
        <input
          type="checkbox"
          name="auto"
          defaultChecked={preferences.auto_on_save}
        />{" "}
        Traducir al guardar cuando cambia el español
      </label>
      <label>
        Diccionario de marca{" "}
        <textarea
          rows={7}
          name="terms"
          defaultValue={preferences.terms.join("\n")}
          placeholder="Un término por línea"
        />
      </label>
      <small>
        Los términos se conservan con su escritura original. MASH y los nombres
        comerciales se conservan por defecto.
      </small>
      <button className="admin-button" disabled={pending}>
        {pending ? "Guardando…" : "Guardar preferencias"}
      </button>
      {feedback && <p role="status">{feedback}</p>}
    </form>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  folderLabels,
  mediaSize,
  type MediaAsset,
  type MediaReference,
} from "@/lib/media/types";
import { studioDate, entryHref } from "@/lib/admin/presentation";
import { StudioDialog } from "../StudioDialog";
import { StudioIcon } from "../StudioIcon";
import { MediaImage } from "./MediaImage";
function normalize(
  row: Partial<MediaAsset> & { url?: string | null; name: string },
): MediaAsset {
  return {
    id: row.id || `legacy-${row.url}`,
    name: row.name,
    folder: row.folder || "products",
    state: row.state || "legacy",
    revision: row.revision || 1,
    url: row.url || null,
    thumbnail_url: row.thumbnail_url || row.url || null,
    mime: row.mime || null,
    width: row.width || null,
    height: row.height || null,
    byte_size: row.byte_size || null,
    created_at: row.created_at || "",
    usage_count: row.usage_count || 0,
    working_uses: row.working_uses || 0,
    historical_uses: row.historical_uses || 0,
    publication_uses: row.publication_uses || 0,
    variants: row.variants || [],
  };
}
export function MediaBrowser({
  picker = false,
  onSelect,
  existingPaths = [],
  maxSelection = 20,
  refreshKey = 0,
}: {
  picker?: boolean;
  onSelect?: (assets: MediaAsset[]) => void;
  existingPaths?: string[];
  maxSelection?: number;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<MediaAsset[]>([]),
    [total, setTotal] = useState(0),
    [more, setMore] = useState(false);
  const [page, setPage] = useState(1),
    [query, setQuery] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState("grid");
  const [selected, setSelected] = useState(new Map<string, MediaAsset>());
  const [detail, setDetail] = useState<MediaAsset | null>(null);
  const [actionBusy, setActionBusy] = useState(false),
    [message, setMessage] = useState("");
  const filters = useRef<HTMLFormElement>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem("mash-media-view-v1") === "list")
        setView("list");
    } catch {}
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ ...query, page: String(page) });
    void fetch(`/api/studio-media?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw Error(data.error || "No pudimos cargar las fotografías.");
        const rows = (data.items ?? []).map(normalize);
        setItems(rows);
        setTotal(data.total ?? rows.length);
        setMore(data.more ?? false);
        setSelected(
          (current) =>
            new Map(
              [...current].map(([id, value]) => [
                id,
                rows.find((row: MediaAsset) => row.id === id) || value,
              ]),
            ),
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, query, retry, refreshKey]);
  const changeView = (next: string) => {
    setView(next);
    try {
      localStorage.setItem("mash-media-view-v1", next);
    } catch {}
  };
  function toggle(asset: MediaAsset) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(asset.id)) next.delete(asset.id);
      else if (next.size < maxSelection) next.set(asset.id, asset);
      return next;
    });
  }
  async function archive() {
    const assets = [...selected.values()];
    if (
      !assets.length ||
      assets.some((a) => a.usage_count > 0) ||
      !window.confirm(
        `¿Archivar ${assets.length} imágenes sin uso? Los archivos se conservarán.`,
      )
    )
      return;
    setActionBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/studio-media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: assets.map(({ id, revision }) => ({ id, revision })),
          intent: "archive",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setMessage(
        data.pending
          ? data.message
          : "Imágenes archivadas. Sus archivos se conservan.",
      );
      setSelected(new Map());
      setRetry((n) => n + 1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No pudimos confirmar el cambio.",
      );
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <section
      className={`studio-media-browser${picker ? " studio-media-browser--picker" : ""}`}
      aria-label={
        picker ? "Elegir imágenes de Multimedia" : "Biblioteca multimedia"
      }
    >
      <form
        ref={filters}
        className="studio-media-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const entries = Object.fromEntries(
            new FormData(event.currentTarget),
          ) as Record<string, string>;
          setPage(1);
          setQuery(
            Object.fromEntries(Object.entries(entries).filter(([, v]) => v)),
          );
        }}
      >
        <label>
          Buscar imágenes
          <input
            type="search"
            name="q"
            placeholder="Nombre del archivo…"
            defaultValue={query.q}
          />
        </label>
        <label>
          Carpeta
          <select name="folder" defaultValue={query.folder || ""}>
            <option value="">Todas</option>
            {Object.entries(folderLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Uso
          <select name="usage" defaultValue={query.usage || ""}>
            <option value="">Cualquier uso</option>
            <option value="used">En uso</option>
            <option value="unused">Sin uso</option>
            <option value="historical">Historial</option>
          </select>
        </label>
        <button className="admin-button admin-button--secondary" type="submit">
          Filtrar imágenes
        </button>
        <details className="studio-media-extra-filters">
          <summary>Más filtros</summary>
          <div>
            <label>
              Formato original
              <select name="type">
                <option value="">Todos</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
                <option value="image/avif">AVIF</option>
              </select>
            </label>
            <label>
              Registrada desde
              <input type="date" name="from" />
            </label>
            <label>
              Hasta
              <input type="date" name="to" />
            </label>
            {!picker && (
              <label>
                Estado
                <select name="state">
                  <option value="">Disponibles y anteriores</option>
                  <option value="processing">En proceso</option>
                  <option value="failed">Cargas incompletas</option>
                  <option value="archived">Archivadas</option>
                </select>
              </label>
            )}
          </div>
        </details>
        {Object.keys(query).length > 0 && (
          <button
            type="button"
            className="studio-text-button"
            onClick={() => {
              filters.current?.reset();
              setPage(1);
              setQuery({});
            }}
          >
            Limpiar filtros
          </button>
        )}
      </form>
      <div className="studio-media-toolbar">
        <div>
          <strong>
            {loading
              ? "Consultando…"
              : `${total} ${total === 1 ? "fotografía" : "fotografías"}`}
          </strong>
          <span>
            {selected.size
              ? `${selected.size} seleccionadas`
              : "Los usos incluyen publicaciones y revisiones anteriores."}
          </span>
        </div>
        <div className="studio-view-switch" aria-label="Vista de biblioteca">
          <button
            type="button"
            aria-label="Vista de cuadrícula"
            aria-pressed={view === "grid"}
            onClick={() => changeView("grid")}
          >
            <StudioIcon name="overview" />
          </button>
          <button
            type="button"
            aria-label="Vista de lista"
            aria-pressed={view === "list"}
            onClick={() => changeView("list")}
          >
            <StudioIcon name="content" />
          </button>
        </div>
      </div>
      {message && (
        <p role="status" className="studio-notice">
          {message}
        </p>
      )}
      {loading ? (
        <div className="studio-media-loading" role="status">
          <span>Cargando fotografías…</span>
          <div aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="studio-media-error" role="alert">
          <StudioIcon name="alert" />
          <h3>No pudimos cargar la biblioteca</h3>
          <p>{error}</p>
          <button
            type="button"
            className="admin-button"
            onClick={() => setRetry((n) => n + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : !items.length ? (
        <div className="studio-empty">
          <h3>No hay fotografías con estos filtros</h3>
          <p>Prueba otra búsqueda o agrega una fotografía nueva.</p>
        </div>
      ) : (
        <ul
          className={`studio-asset-grid${view === "list" ? " studio-asset-grid--list" : ""}`}
        >
          {items.map((asset, index) => {
            const already = existingPaths.includes(asset.url || "");
            const checked = selected.has(asset.id);
            const available =
              !!asset.url && ["ready", "legacy"].includes(asset.state);
            return (
              <li
                key={asset.id}
                className={checked ? "studio-asset--selected" : ""}
              >
                <div className="studio-asset-photo">
                  <button
                    type="button"
                    aria-label={asset.name}
                    disabled={picker && (!available || already)}
                    onClick={() => (picker ? toggle(asset) : setDetail(asset))}
                  >
                    <MediaImage
                      src={asset.thumbnail_url ?? asset.url}
                      eager={index < 4}
                      variants={asset.variants}
                      alt=""
                    />
                  </button>
                  <label className="studio-asset-check">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${asset.name}`}
                      checked={checked}
                      disabled={
                        !available ||
                        (picker && already) ||
                        (!checked && selected.size >= maxSelection)
                      }
                      onChange={() => toggle(asset)}
                    />
                  </label>
                  {already && (
                    <span className="studio-asset-tag">Ya añadida</span>
                  )}
                  {!picker && (
                    <button
                      type="button"
                      className="studio-asset-expand"
                      aria-label={`Ampliar ${asset.name}`}
                      onClick={() => setDetail(asset)}
                    >
                      <StudioIcon name="external" />
                    </button>
                  )}
                </div>
                <div className="studio-asset-copy">
                  <strong title={asset.name}>{asset.name}</strong>
                  <small>
                    {asset.width && asset.height
                      ? `${asset.width} × ${asset.height} px`
                      : "Metadatos por incorporar"}
                    {asset.byte_size ? ` · ${mediaSize(asset.byte_size)}` : ""}
                  </small>
                  <div>
                    <span
                      className={`studio-media-use${asset.usage_count ? " studio-media-use--active" : ""}`}
                    >
                      {asset.usage_count
                        ? `${asset.usage_count} referencias`
                        : "Sin uso"}
                    </span>
                    <span>
                      {asset.state === "processing"
                        ? "Procesando"
                        : asset.state === "failed"
                          ? "Carga incompleta"
                          : asset.state === "archived"
                            ? "Archivada"
                            : folderLabels[asset.folder]}
                    </span>
                  </div>
                  {!asset.url && <small>Ruta pendiente de verificación</small>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <footer className="studio-media-pagination">
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Anterior
        </button>
        <span>
          Página {page} de {Math.max(1, Math.ceil(total / 24))}
        </span>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={!more || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente →
        </button>
      </footer>
      {picker ? (
        <div className="studio-media-selection-bar">
          <span>
            {selected.size} de {maxSelection} seleccionadas
          </span>
          <button
            type="button"
            className="admin-button"
            disabled={!selected.size || loading}
            onClick={() => onSelect?.([...selected.values()])}
          >
            Usar {selected.size} {selected.size === 1 ? "imagen" : "imágenes"}
          </button>
        </div>
      ) : (
        selected.size > 0 && (
          <div className="studio-media-selection-bar">
            <button
              type="button"
              className="studio-text-button"
              onClick={() => setSelected(new Map())}
            >
              Deseleccionar
            </button>
            <span>
              {[...selected.values()].some((a) => a.usage_count > 0)
                ? "La selección incluye imágenes con referencias protegidas."
                : "Archivar no elimina los archivos físicos."}
            </span>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={
                actionBusy ||
                [...selected.values()].some((a) => a.usage_count > 0)
              }
              onClick={() => void archive()}
            >
              {actionBusy ? "Verificando…" : "Archivar selección"}
            </button>
          </div>
        )
      )}
      <MediaDetail
        asset={detail}
        onClose={() => setDetail(null)}
        onChange={() => {
          setDetail(null);
          setRetry((n) => n + 1);
        }}
      />
    </section>
  );
}
export function MediaPicker({
  open,
  onClose,
  onSelect,
  existingPaths = [],
  maxSelection = 20,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (assets: MediaAsset[]) => void;
  existingPaths?: string[];
  maxSelection?: number;
}) {
  return (
    <StudioDialog
      open={open}
      title="Elegir de Multimedia"
      onClose={onClose}
      wide
    >
      <MediaBrowser
        picker
        existingPaths={existingPaths}
        maxSelection={maxSelection}
        onSelect={(assets) => {
          onSelect(assets);
          onClose();
        }}
      />
    </StudioDialog>
  );
}
export function MediaDetail({
  asset,
  onClose,
  onChange,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onChange: () => void;
}) {
  const [references, setReferences] = useState<MediaReference[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    if (!asset) return;
    const controller = new AbortController();
    setName(asset.name);
    setDimensions(null);
    setError("");
    setReferences([]);
    setLoading(true);
    void fetch(`/api/studio-media?id=${asset.id}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        setReferences(data.references ?? []);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("No pudimos consultar los usos de esta imagen.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [asset]);
  async function saveName() {
    if (!asset) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/studio-media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: [{ id: asset.id, revision: asset.revision }],
          intent: "rename",
          name,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      if (data.pending) {
        setError(data.message);
        return;
      }
      onChange();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos guardar el nombre.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (!asset) return null;
  const display =
    asset.variants.find((v) => v.role === "large")?.public_url || asset.url;
  return (
    <StudioDialog
      open={!!asset}
      title="Detalle de la fotografía"
      onClose={onClose}
      wide
    >
      <div className="studio-media-detail">
        <div className="studio-media-detail-preview">
          <MediaImage
            src={display}
            alt={asset.name}
            eager
            onLoad={(width, height) => setDimensions({ width, height })}
          />
        </div>
        <div className="studio-media-detail-properties">
          <label>
            Nombre del archivo
            <input
              value={name}
              maxLength={255}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="admin-button admin-button--secondary"
            disabled={saving || !name.trim() || name === asset.name}
            onClick={() => void saveName()}
          >
            {saving ? "Guardando…" : "Guardar nombre"}
          </button>
          <dl>
            <div>
              <dt>Dimensiones</dt>
              <dd>
                {asset.width && asset.height
                  ? `${asset.width} × ${asset.height} px`
                  : dimensions
                    ? `${dimensions.width} × ${dimensions.height} px · vista actual`
                    : "Sin inspeccionar"}
              </dd>
            </div>
            <div>
              <dt>Formato original</dt>
              <dd>
                {asset.mime?.replace("image/", "").toUpperCase() ||
                  "Sin inspeccionar"}
              </dd>
            </div>
            <div>
              <dt>Peso original</dt>
              <dd>{mediaSize(asset.byte_size)}</dd>
            </div>
            <div>
              <dt>Registrada</dt>
              <dd>
                {asset.created_at
                  ? studioDate(asset.created_at)
                  : "No disponible"}
              </dd>
            </div>
            <div>
              <dt>Carpeta</dt>
              <dd>{folderLabels[asset.folder]}</dd>
            </div>
          </dl>
          {asset.state === "ready" && (
            <a
              className="admin-button admin-button--secondary"
              href={`/api/studio-media/${asset.id}/original`}
              download
            >
              Descargar original
            </a>
          )}
          <p className="studio-media-small-note">
            El archivo y sus versiones se conservan al retirar una referencia
            del producto.
          </p>
        </div>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <section className="studio-media-variants">
        <h3>Versiones disponibles</h3>
        {asset.variants.length ? (
          <div>
            {asset.variants.map((v) => (
              <article key={v.role}>
                <strong>
                  {
                    {
                      thumbnail: "Miniatura",
                      catalog: "Tarjeta de catálogo",
                      gallery: "Galería",
                      large: "Alta resolución",
                    }[v.role]
                  }
                </strong>
                <span>
                  {v.width} × {v.height} px
                </span>
                <span>WebP · {mediaSize(v.byte_size)}</span>
              </article>
            ))}
          </div>
        ) : (
          <p>
            Se conserva la ruta anterior. Este archivo aún no tiene derivados
            incorporados.
          </p>
        )}
      </section>
      <section className="studio-media-references">
        <h3>
          Dónde se utiliza <span>{asset.usage_count} referencias</span>
        </h3>
        {loading ? (
          <p role="status">Consultando usos…</p>
        ) : references.length ? (
          <ul>
            {references.slice(0, 30).map((r, i) => (
              <li key={i}>
                <div>
                  <strong>{r.name || "Contenido anterior"}</strong>
                  <span>
                    {r.source === "working"
                      ? "Copia de trabajo"
                      : r.source === "publication"
                        ? "Publicación conservada"
                        : `Historial · revisión ${r.version}`}
                  </span>
                </div>
                <Link
                  href={
                    r.source === "working"
                      ? entryHref({
                          kind: r.entity_kind as
                            | "product"
                            | "collection"
                            | "project"
                            | "site",
                          id: r.entity_id,
                        })
                      : `/studio-mash/revisiones?kind=${r.entity_kind}&id=${r.entity_id}`
                  }
                >
                  Ver contenido →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          !error && <p>Sin uso actual ni referencias históricas registradas.</p>
        )}
        {references.length > 30 && (
          <p>
            Se muestran las primeras 30 referencias. Todas las revisiones
            cuentan para proteger el archivo.
          </p>
        )}
      </section>
    </StudioDialog>
  );
}

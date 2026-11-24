"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { VisualDocument } from "@/components/visual/VisualDocument";
import {
  blockRegistry,
  fieldId,
  newSection,
  pageLabels,
  widths,
  type BlockType,
  type Device,
  type TextField,
  type VisualChrome,
  type VisualDocumentData,
  type VisualItem,
  type VisualPage,
} from "@/lib/visual/schema";
import {
  beginHistory,
  changeSection,
  duplicateSection,
  historyReducer,
  moveSection,
  removeSection,
} from "@/lib/visual/history";
import { StudioDialog } from "../../StudioDialog";
import { ThemeToggle } from "../../StudioTheme";
import { StudioIcon } from "../../StudioIcon";
import { Inspector } from "./Inspector";
import "./editor.css";

export type EditorData = {
  doc: VisualDocumentData;
  publishedRevision: number | null;
  items: VisualItem[];
  chrome: Record<Locale, VisualChrome>;
};
const deviceLabels = {
  desktop: "Escritorio",
  tablet: "Tablet",
  mobile: "Móvil",
} as const;
const uid = () => crypto.randomUUID();
export function VisualEditor({
  initialPage,
  initial,
}: {
  initialPage: VisualPage;
  initial: EditorData;
}) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState(initial);
  const [history, dispatch] = useReducer(
    historyReducer,
    initial.doc,
    beginHistory,
  );
  const doc = history.present;
  const [baseline, setBaseline] = useState(initial.doc);
  const dirty = doc !== baseline;
  const [selected, setSelected] = useState(
    initial.doc.layout.sections[1]?.id ?? "header",
  );
  const active = doc.layout.sections.find((section) => section.id === selected);
  const [device, setDevice] = useState<Device>("desktop");
  const [locale, setLocale] = useState<Locale>("es");
  const [panel, setPanel] = useState<"tree" | "canvas" | "inspector">("canvas");
  const [settings, setSettings] = useState<"content" | "design" | "responsive">(
    "content",
  );
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [adding, setAdding] = useState(false),
    [preview, setPreview] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [stageWidth, setStageWidth] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const dragged = useRef<string>("");
  const pointer = new Map(
    doc.layout.sections.map((item, index) => [item.id, index]),
  );
  const change = (
    apply: (current: VisualDocumentData) => VisualDocumentData,
    group?: string,
  ) => dispatch({ type: "change", apply, group });
  const insert = (type: BlockType) => {
    const section = newSection(type, uid());
    change((current) => ({
      ...current,
      layout: {
        ...current.layout,
        sections: [
          ...current.layout.sections.slice(0, -1),
          section,
          current.layout.sections.at(-1)!,
        ],
      },
    }));
    setSelected(section.id);
    setPanel("inspector");
    setAdding(false);
  };
  const updateText = (id: string, field: TextField, value: string) => {
    const key = fieldId(id, field);
    if (doc[locale][key] === value || (!value && !doc[locale][key])) return;
    change(
      (current) => ({
        ...current,
        [locale]: { ...current[locale], [key]: value.slice(0, 10000) },
      }),
      "text:" + locale + key,
    );
  };
  const select = (id: string, scroll = false) => {
    if (uploading || busy) return;
    setSelected(id);
    if (scroll) {
      setPanel("canvas");
      requestAnimationFrame(() =>
        canvas.current
          ?.querySelector(`[data-section="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ block: "nearest" }),
      );
    }
  };
  const askLeave = () =>
    !dirty ||
    window.confirm("Tienes cambios sin guardar. ¿Salir de esta composición?");
  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    const observe = (e: ResizeObserverEntry[]) =>
      setStageWidth(e[0].contentRect.width);
    const observer = new ResizeObserver(observe);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        busy ||
        (!event.ctrlKey && !event.metaKey) ||
        event.key.toLowerCase() !== "z" ||
        (event.target instanceof HTMLElement &&
          event.target.closest("input,textarea,[contenteditable]"))
      )
        return;
      event.preventDefault();
      dispatch({ type: event.shiftKey ? "redo" : "undo" });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [busy]);
  async function openPage(next: VisualPage) {
    if (next === page || busy || uploading || !askLeave()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const reply = await fetch("/api/studio-visual?page=" + next, {
        cache: "no-store",
      });
      const json = await reply.json();
      if (!reply.ok) throw new Error(json.error);
      setPage(next);
      setData(json);
      setBaseline(json.doc);
      setSelected(json.doc.layout.sections[1]?.id ?? "header");
      dispatch({ type: "reset", doc: json.doc });
      window.history.replaceState(null, "", "?pagina=" + next);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos abrir la página.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(intent: "save" | "publish") {
    if (busy || uploading) return;
    if (
      intent === "publish" &&
      !window.confirm("¿Publicar esta composición en el sitio?")
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/studio-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page,
          id: doc.id,
          revision: doc.revision,
          layout: doc.layout,
          es: doc.es,
          en: doc.en,
          intent,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const committed = { ...doc, id: result.id, revision: result.revision };
      setData((current) => ({
        ...current,
        publishedRevision: result.publishedRevision,
      }));
      setBaseline(committed);
      dispatch({ type: "commit", doc: committed });
      setNotice(
        intent === "publish" ? "Composición publicada." : "Borrador guardado.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos confirmar el guardado.",
      );
    } finally {
      setBusy(false);
    }
  }
  const frame = widths[device];
  const zoom = stageWidth
    ? Math.min(1, Math.max(0.15, (stageWidth - 20) / frame))
    : 0.55;
  const canAdd = doc.layout.sections.length < 60;
  return (
    <div
      className="visual-editor"
      onClickCapture={(event) => {
        const link =
          event.target instanceof Element ? event.target.closest("a") : null;
        if (
          !link ||
          link.target === "_blank" ||
          link.getAttribute("href")?.startsWith("#") ||
          event.metaKey ||
          event.ctrlKey
        )
          return;
        if (busy || uploading || !askLeave()) event.preventDefault();
      }}
    >
      <a className="studio-skip" href="#visual-canvas">
        Saltar al lienzo
      </a>
      <header className="visual-editor-bar">
        <div className="visual-editor-brand">
          <Link href="/studio-mash" className="visual-studio-link">
            <span className="visual-editor-mark">M</span>
            <span className="visual-sr">Regresar a Studio</span>
          </Link>
          <h1>Sitio web</h1>
        </div>
        <div className="visual-editor-page">
          <label>
            <span className="visual-sr">Página</span>
            <select
              value={page}
              disabled={busy || uploading}
              onChange={(e) => void openPage(e.target.value as VisualPage)}
            >
              {Object.entries(pageLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <span className="visual-editor-state">
            {dirty
              ? "Cambios sin guardar"
              : data.publishedRevision === doc.revision
                ? "Composición publicada"
                : doc.id
                  ? "Borrador guardado"
                  : "Adaptación inicial"}
          </span>
        </div>
        <div
          className="visual-editor-group visual-device-switch"
          aria-label="Dispositivo de vista previa"
        >
          {(Object.keys(widths) as Device[]).map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
            >
              {deviceLabels[key]}
            </button>
          ))}
        </div>
        <div
          className="visual-editor-group"
          aria-label="Historial de la sesión"
        >
          <button
            type="button"
            disabled={!history.past.length || busy}
            onClick={() => dispatch({ type: "undo" })}
            title="Deshacer (Ctrl+Z)"
            aria-label="Deshacer"
          >
            ↶
          </button>
          <button
            type="button"
            disabled={!history.future.length || busy}
            onClick={() => dispatch({ type: "redo" })}
            title="Rehacer (Ctrl+Mayús+Z)"
            aria-label="Rehacer"
          >
            ↷
          </button>
        </div>
        <div className="visual-editor-actions">
          <ThemeToggle />
          <Link
            className="admin-button admin-button--secondary visual-desktop-action"
            href="/studio-mash/contenido?formulario=1"
          >
            Ajustes del sitio
          </Link>
          {doc.id && (
            <Link
              className="admin-button admin-button--secondary visual-desktop-action"
              href={`/studio-mash/revisiones?kind=site&id=${doc.id}`}
            >
              Historial
            </Link>
          )}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => setPreview(true)}
          >
            Previsualizar
          </button>
          <button
            type="button"
            className="admin-button admin-button--secondary"
            disabled={busy || uploading || (!dirty && !!doc.id)}
            onClick={() => void save("save")}
          >
            Guardar
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={busy || uploading}
            onClick={() => void save("publish")}
          >
            Publicar
          </button>
        </div>
      </header>
      {(busy || notice || error) && (
        <div
          className={`visual-editor-feedback${error ? " visual-editor-feedback--error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {error || notice || "Procesando…"}
        </div>
      )}
      <div className="visual-small-tabs" aria-label="Paneles del editor">
        {(["tree", "canvas", "inspector"] as const).map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={panel === key}
            onClick={() => setPanel(key)}
          >
            {
              { tree: "Secciones", canvas: "Lienzo", inspector: "Propiedades" }[
                key
              ]
            }
          </button>
        ))}
      </div>
      <div className="visual-editor-body" data-panel={panel}>
        <aside className="visual-tree" aria-label="Secciones">
          <div className="visual-panel-heading">
            <h2>Secciones</h2>
            <button
              type="button"
              className="visual-icon"
              aria-label="Agregar sección"
              disabled={!canAdd || busy}
              onClick={() => setAdding(true)}
            >
              <StudioIcon name="plus" />
            </button>
          </div>
          <ol className="visual-tree-list">
            {doc.layout.sections.map((item, index) => {
              const info = blockRegistry[item.type],
                protectedItem = info.protected,
                expanded = !collapsed.includes(item.id);
              const title = doc.es[fieldId(item.id, "title")];
              return (
                <li
                  key={item.id}
                  data-current={selected === item.id}
                  draggable={!protectedItem && !busy}
                  onDragStart={(e) => {
                    dragged.current = item.id;
                    e.dataTransfer.setData("text/plain", item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => (dragged.current = "")}
                  onDragOver={(e) => {
                    if (!protectedItem && dragged.current) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragged.current;
                    dragged.current = "";
                    if (!protectedItem && from)
                      change((current) => moveSection(current, from, item.id));
                  }}
                >
                  <div className="visual-tree-row">
                    <button
                      type="button"
                      className="visual-icon visual-expand"
                      aria-expanded={expanded}
                      aria-label={
                        (expanded ? "Contraer " : "Expandir ") + info.label
                      }
                      onClick={() =>
                        setCollapsed((current) =>
                          expanded
                            ? current.concat(item.id)
                            : current.filter((id) => id !== item.id),
                        )
                      }
                    >
                      <span aria-hidden>{expanded ? "▾" : "▸"}</span>
                    </button>
                    <button
                      type="button"
                      className="visual-tree-select"
                      aria-pressed={selected === item.id}
                      onClick={() => select(item.id, true)}
                    >
                      <StudioIcon
                        name={
                          protectedItem
                            ? "content"
                            : info.photos
                              ? "media"
                              : "overview"
                        }
                      />
                      <span>
                        {info.label}
                        {title && <small>{title}</small>}
                      </span>
                    </button>
                    {protectedItem ? (
                      <span
                        className="visual-tree-tag"
                        title="Sección protegida"
                      >
                        Fija
                      </span>
                    ) : !item.visible ? (
                      <span className="visual-tree-tag">Oculta</span>
                    ) : null}
                  </div>
                  {expanded &&
                    selected === item.id &&
                    !protectedItem &&
                    Boolean(item.media.length || item.entities.length) && (
                      <ul
                        className="visual-tree-children"
                        aria-label="Bloques de la sección"
                      >
                        {item.media.map((path, index) => (
                          <li key={path}>
                            <button
                              type="button"
                              disabled={busy || uploading}
                              onClick={() => {
                                setSettings("content");
                                setPanel("inspector");
                                requestAnimationFrame(() =>
                                  document
                                    .getElementById(
                                      "visual-photo-" + item.id + "-" + index,
                                    )
                                    ?.focus(),
                                );
                              }}
                            >
                              Fotografía {index + 1}
                            </button>
                          </li>
                        ))}
                        {item.entities.map((id) => (
                          <li key={id}>
                            {data.items.find((entry) => entry.id === id)
                              ?.title ?? "Entidad fuera del catálogo público"}
                          </li>
                        ))}
                      </ul>
                    )}
                  {expanded && selected === item.id && !protectedItem && (
                    <div className="visual-tree-operations">
                      <button
                        type="button"
                        disabled={index <= 1 || busy}
                        aria-label="Subir sección"
                        onClick={() =>
                          change((current) =>
                            moveSection(
                              current,
                              item.id,
                              doc.layout.sections[index - 1].id,
                            ),
                          )
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={
                          index >= doc.layout.sections.length - 2 || busy
                        }
                        aria-label="Bajar sección"
                        onClick={() =>
                          change((current) =>
                            moveSection(
                              current,
                              item.id,
                              doc.layout.sections[index + 1].id,
                            ),
                          )
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={!canAdd || busy}
                        onClick={() => {
                          const clone = uid();
                          change((current) =>
                            duplicateSection(current, item.id, clone),
                          );
                          setSelected(clone);
                        }}
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          change((current) =>
                            changeSection(current, item.id, (section) => ({
                              ...section,
                              visible: !section.visible,
                            })),
                          )
                        }
                      >
                        {item.visible ? "Ocultar" : "Mostrar"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Eliminar esta sección de la composición?",
                            )
                          ) {
                            change((current) =>
                              removeSection(current, item.id),
                            );
                            setSelected(
                              doc.layout.sections[Math.max(0, index - 1)].id,
                            );
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            className="admin-button admin-button--secondary visual-add"
            disabled={!canAdd || busy}
            onClick={() => setAdding(true)}
          >
            ＋ Añadir sección
          </button>
        </aside>
        <div
          ref={stage}
          className="visual-stage"
          id="visual-canvas"
          tabIndex={-1}
        >
          <div className="visual-stage-toolbar">
            <span>
              {deviceLabels[device]} · {frame} px
            </span>
            <div className="visual-editor-group" aria-label="Idioma del lienzo">
              <button
                type="button"
                aria-pressed={locale === "es"}
                onClick={() => setLocale("es")}
              >
                ES
              </button>
              <button
                type="button"
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
              >
                EN
              </button>
            </div>
            <label className="visual-toggle">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />{" "}
              Ver ocultas
            </label>
          </div>
          <div
            className="visual-frame"
            ref={canvas}
            style={{ width: frame, zoom }}
          >
            <VisualDocument
              doc={doc}
              items={data.items}
              chrome={data.chrome[locale]}
              locale={locale}
              preview
              selected={selected}
              onSelect={(id) => {
                if (!busy && !uploading) setSelected(id);
              }}
              onText={busy ? undefined : updateText}
              showHidden={showHidden}
            />
          </div>
        </div>
        <aside className="visual-inspector" aria-label="Propiedades">
          <div className="visual-panel-heading">
            <h2>{active ? blockRegistry[active.type].label : "Propiedades"}</h2>
            {active && (
              <span className="visual-tree-tag">
                {(pointer.get(active.id) ?? 0) + 1} /{" "}
                {doc.layout.sections.length}
              </span>
            )}
          </div>
          {active && (
            <Inspector
              key={active.id}
              section={active}
              doc={doc}
              items={data.items}
              locale={locale}
              device={device}
              tab={settings}
              setTab={setSettings}
              disabled={busy}
              update={(edit) =>
                change((current) => changeSection(current, active.id, edit))
              }
              groupUpdate={(key, edit) =>
                change(
                  (current) => changeSection(current, active.id, edit),
                  key,
                )
              }
              onStop={() => dispatch({ type: "stop" })}
              onText={updateText}
              onBusy={setUploading}
            />
          )}
        </aside>
      </div>
      <StudioDialog
        open={adding}
        title="Biblioteca de secciones"
        wide
        onClose={() => setAdding(false)}
      >
        <div className="visual-block-library">
          {(
            Object.entries(blockRegistry) as [
              BlockType,
              (typeof blockRegistry)[BlockType],
            ][]
          )
            .filter(([, info]) => !info.protected)
            .map(([type, info]) => (
              <button type="button" key={type} onClick={() => insert(type)}>
                <span
                  className="visual-block-symbol"
                  data-icon={info.representation}
                  aria-hidden
                >
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{info.label}</strong>
              </button>
            ))}
        </div>
      </StudioDialog>
      <StudioDialog
        open={preview}
        title={`Previsualización · ${pageLabels[page]}`}
        wide
        onClose={() => setPreview(false)}
      >
        <div className="visual-preview-dialog">
          <span className="visual-editor-state">
            {locale.toUpperCase()} · {deviceLabels[device]}
          </span>
          <MeasuredPreview width={frame}>
            <VisualDocument
              doc={doc}
              items={data.items}
              chrome={data.chrome[locale]}
              locale={locale}
              preview
            />
          </MeasuredPreview>
        </div>
      </StudioDialog>
    </div>
  );
}

function MeasuredPreview({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) {
  const [available, setAvailable] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setAvailable(entries[0].contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host} className="visual-preview-host">
      <div
        style={{
          width,
          zoom: available ? Math.min(1, available / width) : 0.45,
          margin: "0 auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

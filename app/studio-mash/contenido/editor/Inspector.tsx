"use client";
import { useId, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import {
  blockRegistry,
  effectiveDesign,
  fieldId,
  palette,
  responsiveDesign,
  type Design,
  type Device,
  type ResponsiveDesign,
  type TextField,
  type VisualDocumentData,
  type VisualItem,
  type VisualSection,
} from "@/lib/visual/schema";
import { MediaImage } from "../../multimedia/MediaImage";
import { MediaPicker } from "../../multimedia/MediaBrowser";
import { MediaUploader } from "../../multimedia/MediaUploader";
import { StudioDialog } from "../../StudioDialog";

type Edit = (item: VisualSection) => VisualSection;
type Tab = "content" | "design" | "responsive";
type Control = {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Record<string, string>;
  color?: boolean;
  toggle?: boolean;
  integer?: boolean;
};
const colors = Object.fromEntries(
  Object.keys(palette).map((key, i) => [
    key,
    ["Papel", "Blanco", "Tinta", "Bosque", "Arena", "Oliva"][i],
  ]),
);
const align = { left: "Izquierda", center: "Centro", right: "Derecha" };
const controls: Record<keyof Design, Control> = {
  align: { label: "Alineación horizontal", options: align },
  vertical: {
    label: "Alineación vertical",
    options: { start: "Arriba", center: "Centro", end: "Abajo" },
  },
  titleSize: { label: "Tamaño del título", min: 20, max: 88 },
  weight: {
    label: "Peso tipográfico",
    options: {
      400: "Regular",
      500: "Medio",
      600: "Seminegrita",
      700: "Negrita",
    },
    integer: true,
  },
  textWidth: { label: "Ancho máximo del texto", min: 240, max: 1000, step: 10 },
  textColor: { label: "Color del texto", options: colors, color: true },
  background: { label: "Fondo", options: colors, color: true },
  padding: { label: "Espaciado interior", min: 0, max: 120 },
  margin: { label: "Espaciado exterior", min: 0, max: 100 },
  height: { label: "Altura mínima", min: 0, max: 850, step: 10 },
  ratio: {
    label: "Proporción fotográfica",
    options: {
      "1:1": "1:1",
      "4:3": "4:3",
      "3:2": "3:2",
      "16:9": "16:9",
      "3:4": "3:4",
    },
  },
  fit: {
    label: "Ajuste de imagen",
    options: { cover: "Cubrir", contain: "Contener" },
  },
  x: { label: "Punto focal horizontal", min: 0, max: 100 },
  y: { label: "Punto focal vertical", min: 0, max: 100 },
  overlay: { label: "Color de superposición", options: colors, color: true },
  opacity: { label: "Opacidad de superposición", min: 0, max: 85 },
  buttonAlign: { label: "Alineación del botón", options: align },
  columns: { label: "Columnas", min: 1, max: 4 },
  gap: { label: "Separación entre elementos", min: 4, max: 64 },
  buttonStyle: {
    label: "Estilo del botón",
    options: { solid: "Sólido", outline: "Contorno", light: "Claro" },
  },
  hideMedia: { label: "Ocultar fotografías", toggle: true },
};
const fields: Record<TextField, string> = {
  eyebrow: "Antetítulo",
  title: "Título",
  body: "Texto",
  button: "Texto del botón",
  alt: "Texto alternativo",
  before: "Etiqueta antes",
  after: "Etiqueta después",
};
export function Inspector({
  section,
  doc,
  items,
  locale,
  device,
  tab,
  setTab,
  disabled,
  update,
  groupUpdate,
  onStop,
  onText,
  onBusy,
}: {
  section: VisualSection;
  doc: VisualDocumentData;
  items: VisualItem[];
  locale: Locale;
  device: Device;
  tab: Tab;
  setTab: (tab: Tab) => void;
  disabled: boolean;
  update: (edit: Edit) => void;
  groupUpdate: (key: string, edit: Edit) => void;
  onStop: () => void;
  onText: (id: string, field: TextField, text: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [picker, setPicker] = useState(false),
    [uploader, setUploader] = useState(false);
  const [replace, setReplace] = useState<number | null>(null);
  const baseId = useId();
  const info = blockRegistry[section.type];
  const target =
    tab === "responsive"
      ? device === "desktop"
        ? "tablet"
        : device
      : "design";
  const current = effectiveDesign(
    section,
    target === "design" ? "desktop" : target,
  );
  const available = info.controls.filter(
    (key) => target === "design" || Object.hasOwn(responsiveDesign.shape, key),
  );
  const remaining = info.photos - section.media.length;
  const availableItems = items.filter((i) => i.kind === info.entity);
  const modify = (key: keyof Design, value: string | number | boolean) => {
    groupUpdate(section.id + target + key, (item) => ({
      ...item,
      [target]: { ...item[target], [key]: value },
    }));
  };
  function reset(key?: keyof Design) {
    update((item) => {
      const next: Design = key ? { ...item[target] } : {};
      if (key) delete next[key];
      if (target === "design") {
        if (!key) return { ...item, design: { ...info.preset } };
        const original = info.preset?.[key];
        if (original !== undefined) Object.assign(next, { [key]: original });
      }
      return { ...item, [target]: next };
    });
  }
  function attach(paths: string[]) {
    const indices = replace;
    update((item) => {
      const next = [...item.media];
      if (indices !== null) next.splice(indices, 1, ...paths.slice(0, 1));
      else next.push(...paths);
      return { ...item, media: [...new Set(next)].slice(0, info.photos) };
    });
  }
  if (info.protected)
    return (
      <div className="visual-inspector-content">
        <p>Esta sección se comparte en todas las páginas.</p>
        <Link
          className="admin-button admin-button--secondary"
          href={
            section.type === "navigation"
              ? "/studio-mash/contenido?formulario=1"
              : "/studio-mash/configuracion"
          }
        >
          Abrir ajustes de{" "}
          {section.type === "navigation" ? "navegación" : "footer"}
        </Link>
      </div>
    );
  return (
    <>
      <div
        className="visual-inspector-tabs"
        role="group"
        aria-label="Grupos de propiedades"
      >
        {(["content", "design", "responsive"] as const).map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {
              {
                content: "Contenido",
                design: "Diseño",
                responsive: "Responsive",
              }[key]
            }
          </button>
        ))}
      </div>
      <fieldset className="visual-inspector-content" disabled={disabled}>
        <legend className="visual-sr">Propiedades de {info.label}</legend>
        {tab === "content" ? (
          <>
            {info.fields.map((field) => (
              <label key={field}>
                {fields[field]}{" "}
                <span className="visual-field-language">
                  {locale.toUpperCase()}
                </span>
                {field === "body" ? (
                  <textarea
                    rows={5}
                    maxLength={10000}
                    value={doc[locale][fieldId(section.id, field)] ?? ""}
                    onBlur={onStop}
                    onChange={(e) => onText(section.id, field, e.target.value)}
                  />
                ) : (
                  <input
                    value={doc[locale][fieldId(section.id, field)] ?? ""}
                    maxLength={10000}
                    onBlur={onStop}
                    onChange={(e) => onText(section.id, field, e.target.value)}
                  />
                )}
              </label>
            ))}
            {info.fields.includes("button") && (
              <label>
                Enlace interno
                <input
                  value={section.href}
                  placeholder="/colecciones"
                  onBlur={onStop}
                  onChange={(e) => {
                    const value = e.target.value;
                    groupUpdate(section.id + "href", (item) => ({
                      ...item,
                      href: value,
                    }));
                  }}
                />
              </label>
            )}
            {info.photos > 0 && (
              <div className="visual-media-settings">
                <strong>Fotografías</strong>
                {section.media.map((path, index) => (
                  <div
                    id={"visual-photo-" + section.id + "-" + index}
                    tabIndex={-1}
                    className="visual-media-row"
                    key={path}
                  >
                    <MediaImage src={path} alt={`Fotografía ${index + 1}`} />
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setReplace(index);
                          setPicker(true);
                        }}
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          update((item) => ({
                            ...item,
                            media: item.media.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplace(index);
                          setUploader(true);
                        }}
                      >
                        Subir reemplazo
                      </button>
                      {section.media.length > 1 &&
                        [-1, 1].map((direction) => (
                          <button
                            type="button"
                            key={direction}
                            disabled={
                              index + direction < 0 ||
                              index + direction >= section.media.length
                            }
                            aria-label={
                              direction < 0
                                ? "Adelantar fotografía"
                                : "Retrasar fotografía"
                            }
                            onClick={() =>
                              update((item) => {
                                const media = [...item.media];
                                [media[index], media[index + direction]] = [
                                  media[index + direction],
                                  media[index],
                                ];
                                return { ...item, media };
                              })
                            }
                          >
                            {direction < 0 ? "↑" : "↓"}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
                <button
                  className="admin-button admin-button--secondary"
                  type="button"
                  disabled={!remaining}
                  onClick={() => {
                    setReplace(null);
                    setPicker(true);
                  }}
                >
                  Elegir de Multimedia
                </button>
                <button
                  className="admin-button admin-button--secondary"
                  type="button"
                  disabled={!remaining}
                  onClick={() => {
                    setReplace(null);
                    setUploader(true);
                  }}
                >
                  Cargar fotografía
                </button>
              </div>
            )}
            {info.entity && (
              <details className="visual-entity-select">
                <summary>
                  Seleccionar entidades ({section.entities.length})
                </summary>
                {!availableItems.length && (
                  <p>No hay entidades publicadas disponibles.</p>
                )}
                {availableItems.map((item) => (
                  <label key={item.id} className="visual-toggle">
                    <input
                      type="checkbox"
                      checked={section.entities.includes(item.id)}
                      disabled={
                        !section.entities.includes(item.id) &&
                        section.entities.length >= 12
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        update((block) => ({
                          ...block,
                          entities: checked
                            ? [...block.entities, item.id]
                            : block.entities.filter((id) => id !== item.id),
                        }));
                      }}
                    />
                    {item.title}
                  </label>
                ))}
              </details>
            )}
            {doc.id && (
              <Link
                href={`/studio-mash/traducciones?kind=site&id=${doc.id}`}
                target="_blank"
                rel="noopener"
              >
                Revisar traducciones ↗
              </Link>
            )}
          </>
        ) : (
          <>
            {target !== "design" && (
              <p className="visual-inspector-note">
                Ajustes para {target === "tablet" ? "tablet" : "móvil"}. Los
                campos sin ajuste heredan el diseño general.
              </p>
            )}
            {!!section.media.length && available.includes("x") && (
              <button
                type="button"
                className="visual-focal-picker"
                aria-label="Definir punto focal de la imagen"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  if (!event.detail) {
                    modify("x", 50);
                    modify("y", 50);
                    return;
                  }
                  const x = Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(((event.clientX - rect.x) * 100) / rect.width),
                    ),
                  );
                  const y = Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        ((event.clientY - rect.y) * 100) / rect.height,
                      ),
                    ),
                  );
                  update((item) => ({
                    ...item,
                    [target]: { ...item[target], x, y },
                  }));
                }}
              >
                <MediaImage src={section.media[0]} alt="" />
                <span
                  aria-hidden
                  style={{ left: current.x + "%", top: current.y + "%" }}
                />
              </button>
            )}
            {available.map((key) => {
              const spec = controls[key],
                controlId = baseId + key;
              const changed = Object.hasOwn(section[target], key);
              return (
                <div className="visual-property" key={key}>
                  <div>
                    <label htmlFor={controlId}>{spec.label}</label>
                    <button
                      type="button"
                      className="visual-reset"
                      disabled={!changed}
                      onClick={() => reset(key)}
                      aria-label={`Restablecer ${spec.label.toLowerCase()}`}
                    >
                      ↺
                    </button>
                  </div>
                  {spec.toggle ? (
                    <input
                      id={controlId}
                      type="checkbox"
                      checked={Boolean(current[key])}
                      onChange={(e) => modify(key, e.target.checked)}
                      onBlur={onStop}
                    />
                  ) : spec.options ? (
                    <div className="visual-property-choice">
                      {spec.color && (
                        <span
                          aria-hidden
                          style={{
                            background:
                              palette[current[key] as keyof typeof palette],
                          }}
                        />
                      )}
                      <select
                        id={controlId}
                        value={String(current[key])}
                        onBlur={onStop}
                        onChange={(e) =>
                          modify(
                            key,
                            spec.integer
                              ? Number(e.target.value)
                              : e.target.value,
                          )
                        }
                      >
                        {Object.entries(spec.options).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="visual-property-range">
                      <input
                        id={controlId}
                        type="range"
                        min={spec.min}
                        max={spec.max}
                        step={spec.step ?? 1}
                        value={Number(current[key])}
                        onPointerUp={onStop}
                        onBlur={onStop}
                        onChange={(e) => modify(key, Number(e.target.value))}
                      />
                      <output htmlFor={controlId}>
                        {String(current[key])}
                      </output>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onClick={() => reset()}
            >
              Restablecer{" "}
              {target === "design" ? "diseño" : "ajustes del dispositivo"}
            </button>
          </>
        )}
      </fieldset>
      <MediaPicker
        open={picker}
        onClose={() => setPicker(false)}
        existingPaths={section.media}
        maxSelection={replace !== null ? 1 : Math.max(remaining, 1)}
        onSelect={(assets) =>
          attach(assets.flatMap((asset) => (asset.url ? [asset.url] : [])))
        }
      />
      <StudioDialog
        open={uploader}
        title="Cargar fotografía"
        onClose={() => {
          setUploader(false);
          onBusy(false);
        }}
      >
        <MediaUploader
          folder="site"
          maxFiles={replace !== null ? 1 : Math.max(remaining, 1)}
          compact
          onBusy={onBusy}
          onAdd={(url) => attach([url])}
        />
      </StudioDialog>
    </>
  );
}

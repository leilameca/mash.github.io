"use client";
import { useEffect, useRef, useState } from "react";
import { mediaSize, type MediaAsset } from "@/lib/media/types";
import { StudioIcon } from "../StudioIcon";
import { StudioDialog } from "../StudioDialog";
import { MediaImage } from "../multimedia/MediaImage";
import {
  MediaUploader,
  type MediaUploadHandle,
} from "../multimedia/MediaUploader";
import { MediaDetail, MediaPicker } from "../multimedia/MediaBrowser";
import { ImageManager } from "./ImageManager";
export type ImageAlts = Record<string, { alt_es?: string; alt_en?: string }>;
export function GalleryEditor({
  images,
  primary,
  alts,
  assets,
  onAdd,
  onRemove,
  onMove,
  onPrimary,
  onAlts,
  onReplace,
  onBusy,
  disabled,
}: {
  images: string[];
  primary: string;
  alts: ImageAlts;
  assets: Record<string, MediaAsset>;
  onAdd: (url: string, asset?: MediaAsset) => void;
  onRemove: (url: string) => void;
  onMove: (url: string, index: number) => void;
  onPrimary: (url: string) => void;
  onAlts: (url: string, value: { alt_es?: string; alt_en?: string }) => void;
  onReplace: (oldUrl: string, url: string, asset?: MediaAsset) => void;
  onBusy: (value: boolean) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState(images[0] || "");
  const active = images.includes(selected) ? selected : images[0] || "";
  const index = images.indexOf(active);
  const [metadata, setMetadata] = useState<Record<string, MediaAsset>>({});
  const [sizes, setSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [zoom, setZoom] = useState(false),
    [detail, setDetail] = useState(false),
    [replacement, setReplacement] = useState<string | null>(null),
    [replaceLibrary, setReplaceLibrary] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null),
    [fileDrag, setFileDrag] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const uploader = useRef<MediaUploadHandle>(null);
  const asset = assets[active] ?? metadata[active];
  useEffect(() => {
    if (
      !active ||
      assets[active] ||
      metadata[active] ||
      active.startsWith("data:") ||
      active.startsWith("blob:")
    )
      return;
    const controller = new AbortController();
    void fetch(`/api/studio-media?path=${encodeURIComponent(active)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.asset)
          setMetadata((current) => ({ ...current, [active]: data.asset }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [active, assets, metadata]);
  function move(path: string, target: number) {
    if (target < 0 || target >= images.length || disabled) return;
    onMove(path, target);
    setSelected(path);
    setAnnouncement(`Fotografía movida a la posición ${target + 1}.`);
  }
  function replace(url: string, nextAsset?: MediaAsset) {
    if (!replacement) return;
    onReplace(replacement, url, nextAsset);
    setSelected(url);
    setReplacement(null);
    setReplaceLibrary(false);
    setAnnouncement(
      "Fotografía reemplazada. Se conservaron su posición y los textos alternativos.",
    );
  }
  const dimensions =
    asset?.width && asset.height
      ? { width: asset.width, height: asset.height }
      : sizes[active];
  const fileName =
    asset?.name ||
    (!active || active.startsWith("data:") || active.startsWith("blob:")
      ? `Fotografía ${index + 1}`
      : decodeURIComponent(active.split("/").pop() || "Fotografía"));
  return (
    <section
      className={`studio-gallery-editor${fileDrag ? " studio-gallery-editor--file-drag" : ""}`}
      aria-label="Galería fotográfica"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          setFileDrag(true);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setFileDrag(false);
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length) {
          event.preventDefault();
          setFileDrag(false);
          if (!disabled) uploader.current?.addFiles(event.dataTransfer.files);
        }
      }}
    >
      <div className="studio-gallery-heading">
        <div>
          <h2>Fotografías</h2>
          <p>Ordena las imágenes y elige cuál abre la ficha del producto.</p>
        </div>
        <span>{images.length} / 20</span>
      </div>
      <div
        className={`studio-gallery-workbench${!images.length ? " studio-gallery-workbench--empty" : ""}`}
      >
        <div className="studio-gallery-thumbnails">
          {images.map((path, i) => (
            <article
              key={path}
              className={`studio-gallery-thumb${path === active ? " studio-gallery-thumb--active" : ""}`}
              draggable={!disabled}
              onDragStart={(event) => {
                setDragged(path);
                event.dataTransfer.setData("application/x-mash-photo", path);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragged(null)}
              onDragOver={(event) => {
                if (dragged) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => {
                if (dragged) {
                  event.preventDefault();
                  event.stopPropagation();
                  move(dragged, i);
                  setDragged(null);
                }
              }}
            >
              <button
                type="button"
                aria-label={`Editar fotografía ${i + 1}`}
                aria-pressed={path === active}
                disabled={disabled}
                onClick={() => setSelected(path)}
              >
                <MediaImage
                  src={
                    assets[path]?.thumbnail_url ||
                    metadata[path]?.thumbnail_url ||
                    path
                  }
                  variants={assets[path]?.variants || metadata[path]?.variants}
                  alt={alts[path]?.alt_es || `Fotografía ${i + 1}`}
                />
              </button>
              <span className="studio-gallery-position">{i + 1}</span>
              <label
                className={`studio-gallery-primary${path === primary ? " studio-gallery-primary--selected" : ""}`}
                title={
                  path === primary
                    ? "Imagen principal"
                    : "Elegir como principal"
                }
              >
                <input
                  type="radio"
                  name="gallery_primary_display"
                  aria-label={`Imagen principal: fotografía ${i + 1}`}
                  checked={path === primary}
                  disabled={disabled}
                  onChange={() => onPrimary(path)}
                />
                <span>{path === primary ? "Principal" : "Portada"}</span>
              </label>
              <div className="studio-gallery-reorder">
                <button
                  type="button"
                  aria-label={`Mover imagen ${i + 1} antes`}
                  disabled={disabled || i === 0}
                  onClick={() => move(path, i - 1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={`Mover imagen ${i + 1} después`}
                  disabled={disabled || i === images.length - 1}
                  onClick={() => move(path, i + 1)}
                >
                  →
                </button>
              </div>
            </article>
          ))}
          {!images.length && (
            <div className="studio-gallery-empty">
              <StudioIcon name="media" />
              <strong>Agrega las primeras fotografías</strong>
              <span>Podrás seleccionar la principal y editar sus textos.</span>
            </div>
          )}
        </div>
        {active && (
          <aside
            className="studio-gallery-properties"
            aria-label="Propiedades de la fotografía seleccionada"
          >
            <div className="studio-gallery-property-heading">
              <strong>Fotografía {index + 1}</strong>
              <button
                type="button"
                className="studio-icon-button"
                aria-label="Ampliar fotografía seleccionada"
                onClick={() => setZoom(true)}
              >
                <StudioIcon name="external" />
              </button>
            </div>
            <p className="studio-gallery-file-name" title={fileName}>
              {fileName}
            </p>
            <div className="studio-gallery-selected-preview">
              <MediaImage
                src={asset?.url || active}
                alt=""
                eager
                onLoad={(width, height) =>
                  setSizes((current) => ({
                    ...current,
                    [active]: { width, height },
                  }))
                }
              />
            </div>
            <small className="studio-gallery-metadata">
              {dimensions
                ? `${dimensions.width} × ${dimensions.height} px`
                : "Dimensiones por inspeccionar"}
              {asset?.mime
                ? ` · ${asset.mime.replace("image/", "").toUpperCase()}`
                : ""}
              <br />
              {mediaSize(asset?.byte_size)}
            </small>
            <label>
              Texto alternativo en español
              <textarea
                aria-label="Texto alternativo ES"
                rows={2}
                value={alts[active]?.alt_es || ""}
                disabled={disabled}
                maxLength={600}
                onChange={(e) =>
                  onAlts(active, { ...alts[active], alt_es: e.target.value })
                }
              />
              <small>Describe lo que se ve en esta fotografía.</small>
            </label>
            <details>
              <summary>
                Alt en inglés{" "}
                {alts[active]?.alt_en ? "· conservado" : "· opcional"}
              </summary>
              <label>
                Texto alternativo en inglés
                <textarea
                  aria-label="Texto alternativo EN"
                  rows={2}
                  value={alts[active]?.alt_en || ""}
                  disabled={disabled}
                  maxLength={600}
                  onChange={(e) =>
                    onAlts(active, { ...alts[active], alt_en: e.target.value })
                  }
                />
              </label>
            </details>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={disabled || active === primary}
              onClick={() => onPrimary(active)}
            >
              {active === primary
                ? "✓ Imagen principal"
                : "Usar como principal"}
            </button>
            <div className="studio-gallery-property-actions">
              <button
                type="button"
                className="studio-text-button"
                disabled={disabled}
                onClick={() => setReplacement(active)}
              >
                Reemplazar
              </button>
              {asset && (
                <button
                  type="button"
                  className="studio-text-button"
                  onClick={() => setDetail(true)}
                >
                  Ver archivo
                </button>
              )}
              <button
                type="button"
                className="studio-text-button studio-danger"
                disabled={disabled}
                onClick={() => {
                  onRemove(active);
                  setAnnouncement(
                    "Se retiró la referencia. El archivo se conserva en Multimedia.",
                  );
                }}
              >
                Retirar del producto
              </button>
            </div>
          </aside>
        )}
      </div>
      <ImageManager
        ref={uploader}
        existingPaths={images}
        onAdd={onAdd}
        onBusy={onBusy}
        disabled={disabled}
      />
      <p className="studio-gallery-footnote">
        Arrastra para ordenar o utiliza las flechas. Guardar no cambia la
        versión pública.
      </p>
      <p className="studio-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <StudioDialog
        open={zoom}
        title={`Fotografía ${index + 1}`}
        onClose={() => setZoom(false)}
        className="studio-photo-lightbox"
      >
        <div className="studio-photo-lightbox-image">
          <MediaImage
            src={
              asset?.variants.find((v) => v.role === "large")?.public_url ||
              active
            }
            alt={alts[active]?.alt_es || "Fotografía del producto"}
            eager
          />
        </div>
      </StudioDialog>
      <MediaDetail
        asset={detail ? asset || null : null}
        onClose={() => setDetail(false)}
        onChange={() => {
          setDetail(false);
          setMetadata({});
        }}
      />
      <StudioDialog
        open={!!replacement && !replaceLibrary}
        title="Reemplazar fotografía"
        onClose={() => {
          setReplacement(null);
          onBusy(false);
        }}
      >
        <p>
          Se conservarán la posición y los textos alternativos. La versión
          pública actual continuará visible.
        </p>
        <MediaUploader
          compact
          maxFiles={1}
          disabled={disabled}
          onBusy={onBusy}
          onAdd={replace}
        />
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => setReplaceLibrary(true)}
        >
          Elegir de Multimedia
        </button>
      </StudioDialog>
      <MediaPicker
        open={!!replacement && replaceLibrary}
        onClose={() => {
          setReplaceLibrary(false);
          setReplacement(null);
        }}
        maxSelection={1}
        existingPaths={images}
        onSelect={(selected) => {
          if (selected[0]?.url) replace(selected[0].url, selected[0]);
        }}
      />
    </section>
  );
}

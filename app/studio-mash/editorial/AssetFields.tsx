"use client";
import "./studio-editorial.css";
import { useRef, useState } from "react";
import { MediaImage } from "../multimedia/MediaImage";
import { MediaPicker } from "../multimedia/MediaBrowser";
import { MediaUploader } from "../multimedia/MediaUploader";
import { StudioDialog } from "../StudioDialog";
import type { GalleryPhoto } from "@/lib/editorial/schema";

export function AssetField({
  label,
  path,
  onChange,
  onBusy,
  folder = "site",
}: {
  label: string;
  path: string;
  onChange: (path: string) => void;
  onBusy?: (busy: boolean) => void;
  folder?: string;
}) {
  const [picker, setPicker] = useState(false);
  const [upload, setUpload] = useState(false);
  return (
    <div className="editorial-asset-field">
      <strong>{label}</strong>
      {path && (
        <div className="editorial-asset-thumb">
          <MediaImage src={path} alt={label} />
        </div>
      )}
      <div className="editorial-studio-actions">
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => setPicker(true)}
        >
          Elegir {label.toLowerCase()}
        </button>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => setUpload(true)}
        >
          Cargar {label.toLowerCase()}
        </button>
        {path && (
          <button
            type="button"
            className="studio-text-button"
            onClick={() => onChange("")}
          >
            Retirar
          </button>
        )}
      </div>
      <MediaPicker
        open={picker}
        maxSelection={1}
        onClose={() => setPicker(false)}
        onSelect={(assets) => {
          const url = assets[0]?.url;
          if (url) onChange(url);
        }}
      />
      <StudioDialog
        open={upload}
        title={"Cargar " + label.toLowerCase()}
        onClose={() => {
          setUpload(false);
          onBusy?.(false);
        }}
      >
        <MediaUploader
          folder={folder}
          compact
          maxFiles={1}
          onBusy={onBusy}
          onAdd={onChange}
        />
      </StudioDialog>
    </div>
  );
}

export function ProjectGallery({
  gallery,
  cover,
  onChange,
  onCover,
  onBusy,
}: {
  gallery: GalleryPhoto[];
  cover: string;
  onChange: (photos: GalleryPhoto[]) => void;
  onCover: (path: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [picker, setPicker] = useState(false),
    [upload, setUpload] = useState(false);
  const [selection, setSelection] = useState(cover || gallery[0]?.path);
  const current = useRef(gallery);
  current.current = gallery;
  const chosen =
    gallery.find((photo) => photo.path === selection) ?? gallery[0];
  function add(paths: string[]) {
    const existing = current.current;
    const next = [
      ...existing,
      ...paths
        .filter((path) => !existing.some((p) => p.path === path))
        .map((path) => ({ path, alt_es: "", caption_es: "" })),
    ].slice(0, 20);
    current.current = next;
    onChange(next);
    if (!cover && !existing.length && next.length) {
      onCover(next[0].path);
      setSelection(next[0].path);
    }
  }
  function move(index: number, to: number) {
    const next = [...gallery];
    next.splice(to, 0, next.splice(index, 1)[0]);
    onChange(next);
  }
  const patch = (field: "alt_es" | "caption_es", text: string) =>
    onChange(
      gallery.map((p) =>
        p.path === chosen.path ? { ...p, [field]: text } : p,
      ),
    );
  return (
    <section className="editorial-gallery">
      <ol className="editorial-thumb-grid">
        {gallery.map((photo, index) => (
          <li key={photo.path}>
            <button
              type="button"
              aria-label={`Editar fotografía ${index + 1}`}
              aria-pressed={chosen?.path === photo.path}
              onClick={() => setSelection(photo.path)}
            >
              <MediaImage src={photo.path} alt={photo.alt_es} />
            </button>
            <span>{cover === photo.path ? "Portada" : index + 1}</span>
            <div className="editorial-studio-actions">
              <button
                type="button"
                disabled={index === 0}
                aria-label={`Mover fotografía ${index + 1} antes`}
                onClick={() => move(index, index - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === gallery.length - 1}
                aria-label={`Mover fotografía ${index + 1} después`}
                onClick={() => move(index, index + 1)}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
      {chosen && (
        <div className="editorial-gallery-properties">
          <label>
            Texto alternativo{" "}
            <input
              value={chosen.alt_es}
              maxLength={600}
              onChange={(e) => patch("alt_es", e.target.value)}
            />
          </label>
          <label>
            Pie de fotografía{" "}
            <textarea
              rows={2}
              value={chosen.caption_es}
              maxLength={1700}
              onChange={(e) => patch("caption_es", e.target.value)}
            />
          </label>
          <div className="editorial-studio-actions">
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={cover === chosen.path}
              onClick={() => onCover(chosen.path)}
            >
              Usar como portada
            </button>
            <button
              type="button"
              className="studio-text-button"
              onClick={() => {
                const next = gallery.filter(
                  (photo) => photo.path !== chosen.path,
                );
                onChange(next);
                if (cover === chosen.path) onCover(next[0]?.path ?? "");
              }}
            >
              Retirar de la galería
            </button>
          </div>
        </div>
      )}
      <div className="editorial-studio-actions">
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={gallery.length >= 20}
          onClick={() => setPicker(true)}
        >
          Añadir desde Multimedia
        </button>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={gallery.length >= 20}
          onClick={() => setUpload(true)}
        >
          Cargar fotografías
        </button>
      </div>
      <MediaPicker
        open={picker}
        existingPaths={gallery.map((p) => p.path)}
        maxSelection={Math.max(1, 20 - gallery.length)}
        onClose={() => setPicker(false)}
        onSelect={(assets) =>
          add(assets.flatMap((asset) => (asset.url ? [asset.url] : [])))
        }
      />
      <StudioDialog
        open={upload}
        title="Cargar fotografías del proyecto"
        onClose={() => {
          setUpload(false);
          onBusy(false);
        }}
      >
        <MediaUploader
          folder="projects"
          maxFiles={Math.max(1, 20 - gallery.length)}
          onAdd={(url) => add([url])}
          onBusy={onBusy}
        />
      </StudioDialog>
    </section>
  );
}

export type RelatedOption = {
  id: string;
  name: string;
  kind: "product" | "collection" | "project";
};
export function RelatedChoices({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: RelatedOption[];
  values: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const visible = options.filter((item) =>
    item.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
  );
  return (
    <details className="studio-fieldset editorial-related">
      <summary>
        {label} ({values.length})
      </summary>
      <label>
        Buscar en {label.toLocaleLowerCase()}
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          type="search"
        />
      </label>
      <div className="editorial-related-options">
        {!visible.length && <p>No hay coincidencias.</p>}
        {visible.map((item) => (
          <label key={item.id} className="studio-checkbox">
            <input
              type="checkbox"
              checked={values.includes(item.id)}
              disabled={values.length >= 18 && !values.includes(item.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...values, item.id]
                    : values.filter((id) => id !== item.id),
                )
              }
            />
            {item.name}
          </label>
        ))}
      </div>
    </details>
  );
}

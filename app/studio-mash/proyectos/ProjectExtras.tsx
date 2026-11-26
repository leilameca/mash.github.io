"use client";
import { useEffect, useRef, useState } from "react";
import { ComparePhotos } from "@/components/editorial/ComparePhotos";
import {
  defaultProjectEditorial,
  type GalleryPhoto,
  type ProjectDetails,
  type ProjectEditorial,
} from "@/lib/editorial/schema";
import {
  AssetField,
  ProjectGallery,
  RelatedChoices,
  type RelatedOption,
} from "../editorial/AssetFields";

export type ProjectInitial = {
  editorial?: ProjectEditorial;
  details?: ProjectDetails;
  date?: string | null;
  gallery?: GalleryPhoto[];
  cover?: string;
};
export function ProjectExtras({
  initial,
  options,
  onBusy,
}: {
  initial?: ProjectInitial;
  options: RelatedOption[];
  onBusy: (busy: boolean) => void;
}) {
  const [extra, setExtra] = useState(
    initial?.editorial ?? defaultProjectEditorial,
  );
  const [details, setDetails] = useState(initial?.details ?? {});
  const [gallery, setGallery] = useState(initial?.gallery ?? []);
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const hidden = useRef<HTMLInputElement>(null);
  const previous = useRef("");
  const serial = JSON.stringify({
    editorial: extra,
    details,
    date,
    gallery,
    cover,
  });
  useEffect(() => {
    if (previous.current && previous.current !== serial)
      hidden.current?.dispatchEvent(new Event("input", { bubbles: true }));
    previous.current = serial;
  }, [serial]);
  const patchDetails = (key: keyof ProjectDetails, value: string) =>
    setDetails((old) => ({ ...old, [key]: value }));
  return (
    <>
      <input type="hidden" name="project_extras" ref={hidden} value={serial} />
      <div className="studio-form__grid">
        <label>
          Categoría de proyecto{" "}
          <input
            list="project-category-options"
            value={extra.category}
            maxLength={80}
            onChange={(e) => setExtra({ ...extra, category: e.target.value })}
          />
          <datalist id="project-category-options">
            <option value="Residencial" />
            <option value="Comercial" />
            <option value="Hotelero" />
          </datalist>
        </label>
        <label>
          Fecha de realización{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <label>
        Descripción breve{" "}
        <textarea
          rows={2}
          value={details.excerpt ?? ""}
          maxLength={500}
          onChange={(e) => patchDetails("excerpt", e.target.value)}
        />
      </label>
      <fieldset className="studio-fieldset">
        <legend>Portada y galería</legend>
        <ProjectGallery
          gallery={gallery}
          cover={cover}
          onChange={setGallery}
          onCover={setCover}
          onBusy={onBusy}
        />
      </fieldset>
      <details className="studio-fieldset editorial-fold">
        <summary>Antes y después</summary>
        <div className="studio-form__grid">
          <AssetField
            label="Foto de antes"
            folder="projects"
            path={extra.comparison.before}
            onBusy={onBusy}
            onChange={(path) =>
              setExtra((old) => ({
                ...old,
                comparison: { ...old.comparison, before: path },
              }))
            }
          />
          <AssetField
            label="Foto de después"
            folder="projects"
            path={extra.comparison.after}
            onBusy={onBusy}
            onChange={(path) =>
              setExtra((old) => ({
                ...old,
                comparison: { ...old.comparison, after: path },
              }))
            }
          />
          <label>
            Etiqueta antes{" "}
            <input
              maxLength={200}
              value={details.before_label ?? ""}
              onChange={(e) => patchDetails("before_label", e.target.value)}
            />
          </label>
          <label>
            Etiqueta después{" "}
            <input
              maxLength={200}
              value={details.after_label ?? ""}
              onChange={(e) => patchDetails("after_label", e.target.value)}
            />
          </label>
          <label>
            Alt de antes{" "}
            <input
              maxLength={200}
              value={details.before_alt ?? ""}
              onChange={(e) => patchDetails("before_alt", e.target.value)}
            />
          </label>
          <label>
            Alt de después{" "}
            <input
              maxLength={200}
              value={details.after_alt ?? ""}
              onChange={(e) => patchDetails("after_alt", e.target.value)}
            />
          </label>
          <label>
            Encuadre{" "}
            <select
              value={extra.comparison.fit}
              onChange={(e) =>
                setExtra({
                  ...extra,
                  comparison: {
                    ...extra.comparison,
                    fit: e.target.value as "cover" | "contain",
                  },
                })
              }
            >
              <option value="cover">Cubrir</option>
              <option value="contain">Contener</option>
            </select>
          </label>
          {(["x", "y"] as const).map((axis) => (
            <label key={axis}>
              Foco {axis === "x" ? "horizontal" : "vertical"} ·{" "}
              {extra.comparison[axis]}%
              <input
                type="range"
                min={0}
                max={100}
                value={extra.comparison[axis]}
                onChange={(e) =>
                  setExtra({
                    ...extra,
                    comparison: {
                      ...extra.comparison,
                      [axis]: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
        <ComparePhotos
          comparison={extra.comparison}
          beforeLabel={details.before_label}
          afterLabel={details.after_label}
          beforeAlt={details.before_alt}
          afterAlt={details.after_alt}
        />
      </details>
      <RelatedChoices
        label="Productos relacionados"
        options={options.filter((item) => item.kind === "product")}
        values={extra.products}
        onChange={(products) => setExtra({ ...extra, products })}
      />
      <RelatedChoices
        label="Colecciones relacionadas"
        options={options.filter((item) => item.kind === "collection")}
        values={extra.collections}
        onChange={(collections) => setExtra({ ...extra, collections })}
      />
    </>
  );
}

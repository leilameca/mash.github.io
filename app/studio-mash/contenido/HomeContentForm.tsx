"use client";

import Image from "next/image";
import { useActionState } from "react";
import { upsertHomeContent, type ActionState } from "../actions";

type HomeContent = {
  title_es: string;
  description_es: string;
  title_en: string;
  description_en: string;
  image_path: string;
  showroom_main_image_path: string;
  showroom_small_image_path: string;
};

const initialState: ActionState = {};

const imageFields = [
  ["image_path", "hero_image", "existing_image_path", "Imagen de fondo del hero"],
  ["showroom_main_image_path", "hero_showroom_main_image", "existing_showroom_main_image_path", "Imagen de apoyo 1 (cuadro grande)"],
  ["showroom_small_image_path", "hero_showroom_small_image", "existing_showroom_small_image_path", "Imagen de apoyo 2 (cuadro pequeño)"]
] as const;

export function HomeContentForm({ content }: { content: HomeContent }) {
  const [state, action, pending] = useActionState(upsertHomeContent, initialState);

  return (
    <form action={action} className="studio-form">
      <div className="studio-language-note">
        <strong>Portada del inicio</strong>
        <p>Estos textos y las tres imágenes se muestran en la primera pantalla del sitio público.</p>
      </div>
      <label>
        Titulo en espanol
        <textarea name="title_es" defaultValue={content.title_es} rows={2} required />
        {state.errors?.title_es && <span>{state.errors.title_es}</span>}
      </label>
      <label>
        Descripcion en espanol
        <textarea name="description_es" defaultValue={content.description_es} rows={4} required />
        {state.errors?.description_es && <span>{state.errors.description_es}</span>}
      </label>
      <label>
        Titulo en ingles
        <textarea name="title_en" defaultValue={content.title_en} rows={2} required />
        {state.errors?.title_en && <span>{state.errors.title_en}</span>}
      </label>
      <label>
        Descripcion en ingles
        <textarea name="description_en" defaultValue={content.description_en} rows={4} required />
        {state.errors?.description_en && <span>{state.errors.description_en}</span>}
      </label>
      <fieldset className="studio-fieldset">
        <legend>Imágenes del hero</legend>
        <div className="studio-media-editor-grid">
          {imageFields.map(([key, field, existingField, label]) => (
            <label key={key}>
              {label}
              <span className={`studio-image-preview ${key === "image_path" ? "studio-image-preview--hero" : "studio-image-preview--wide"}`}>
                <Image src={content[key]} alt={label} fill sizes="480px" />
              </span>
              <input type="hidden" name={existingField} value={content[key]} />
              <input name={field} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={pending} />
              <small>Opcional. Si no eliges otra imagen, se conserva la actual. Máximo 6 MB.</small>
              {state.errors?.[field] && <span>{state.errors[field]}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      {state.message && <p className={state.ok ? "admin-success" : "admin-error"}>{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar portada"}
      </button>
    </form>
  );
}

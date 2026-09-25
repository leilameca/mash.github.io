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
};

const initialState: ActionState = {};

export function HomeContentForm({ content }: { content: HomeContent }) {
  const [state, action, pending] = useActionState(upsertHomeContent, initialState);

  return (
    <form action={action} className="studio-form">
      <div className="studio-language-note">
        <strong>Portada del inicio</strong>
        <p>Estos textos y la imagen se muestran en la primera pantalla del sitio publico.</p>
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
      <label>
        Imagen del hero
        <span className="studio-image-preview studio-image-preview--hero">
          <Image src={content.image_path} alt="Hero actual" fill sizes="480px" />
        </span>
        <input type="hidden" name="existing_image_path" value={content.image_path} />
        <input name="hero_image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
        <small>Opcional. Si no eliges otra imagen, se conserva la actual. Maximo 6 MB.</small>
        {state.errors?.hero_image && <span>{state.errors.hero_image}</span>}
      </label>

      {state.message && <p className={state.ok ? "admin-success" : "admin-error"}>{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar portada"}
      </button>
    </form>
  );
}

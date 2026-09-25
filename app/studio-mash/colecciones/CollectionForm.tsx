"use client";

import Image from "next/image";
import { useActionState } from "react";
import { upsertCollection, type ActionState } from "../actions";

type CollectionFormValue = {
  id?: string;
  slug?: string;
  name_es?: string;
  name_en?: string;
  description_es?: string;
  description_en?: string;
  cover_image_path?: string;
  status?: string;
  featured?: boolean;
  sort_order?: number;
};

const initialState: ActionState = {};

export function CollectionForm({ collection }: { collection?: CollectionFormValue }) {
  const [state, action, pending] = useActionState(upsertCollection, initialState);

  return (
    <form action={action} className="studio-form">
      {collection?.id && <input type="hidden" name="id" value={collection.id} />}
      <div className="studio-form__grid">
        <label>
          Slug
          <input name="slug" defaultValue={collection?.slug} placeholder="comedores" required />
          {state.errors?.slug && <span>{state.errors.slug}</span>}
        </label>
        <label>
          Orden
          <input name="sort_order" type="number" min="0" max="9999" defaultValue={collection?.sort_order ?? 0} required />
          {state.errors?.sort_order && <span>{state.errors.sort_order}</span>}
        </label>
        <label>
          Estado
          <select name="status" defaultValue={collection?.status ?? "draft"}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="hidden">Oculto</option>
            <option value="archived">Archivado</option>
          </select>
        </label>
        <label className="studio-checkbox">
          <input type="checkbox" name="featured" defaultChecked={collection?.featured} />
          Coleccion destacada
        </label>
      </div>

      <label>
        Nombre en espanol
        <input name="name_es" defaultValue={collection?.name_es} required />
        {state.errors?.name_es && <span>{state.errors.name_es}</span>}
      </label>
      <label>
        Descripcion en espanol
        <textarea name="description_es" defaultValue={collection?.description_es} rows={4} required />
        {state.errors?.description_es && <span>{state.errors.description_es}</span>}
      </label>

      <label>
        Imagen de portada
        {collection?.cover_image_path && (
          <span className="studio-image-preview studio-image-preview--wide">
            <Image src={collection.cover_image_path} alt="Portada actual" fill sizes="360px" />
          </span>
        )}
        <input type="hidden" name="existing_image_path" value={collection?.cover_image_path ?? ""} />
        <input name="cover_image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required={!collection?.cover_image_path} />
        <small>JPG, PNG, WebP o AVIF. Maximo 6 MB.</small>
        {state.errors?.cover_image && <span>{state.errors.cover_image}</span>}
      </label>

      <div className="studio-language-note">
        <strong>Version en ingles</strong>
        <p>Si dejas un campo vacio, el sitio usara temporalmente el contenido en espanol.</p>
      </div>
      <div className="studio-form__grid">
        <label>
          Nombre en ingles
          <input name="name_en" defaultValue={collection?.name_en} />
        </label>
        <label>
          Descripcion en ingles
          <textarea name="description_en" defaultValue={collection?.description_en} rows={4} />
        </label>
      </div>

      {state.message && <p className="admin-error">{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar coleccion"}
      </button>
    </form>
  );
}

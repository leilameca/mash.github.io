"use client";

import { useActionState } from "react";
import { upsertProduct, type ActionState } from "../actions";

type CollectionOption = {
  id: string;
  label: string;
};

type ProductFormValue = {
  id?: string;
  slug?: string;
  collection_id?: string;
  name_es?: string;
  name_en?: string;
  description_es?: string;
  description_en?: string;
  hero_image_path?: string;
  materials_es?: string;
  dimensions_es?: string;
  finishes_es?: string;
  care_es?: string;
  status?: string;
  featured?: boolean;
};

const initialState: ActionState = {};

export function ProductForm({ collections, product }: { collections: CollectionOption[]; product?: ProductFormValue }) {
  const [state, action, pending] = useActionState(upsertProduct, initialState);

  return (
    <form action={action} className="studio-form">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <div className="studio-form__grid">
        <label>
          Slug
          <input name="slug" defaultValue={product?.slug} placeholder="set-toscana" required />
          {state.errors?.slug && <span>{state.errors.slug}</span>}
        </label>
        <label>
          Coleccion
          <select name="collection_id" defaultValue={product?.collection_id} required>
            <option value="">Selecciona</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.label}
              </option>
            ))}
          </select>
          {state.errors?.collection_id && <span>{state.errors.collection_id}</span>}
        </label>
        <label>
          Estado
          <select name="status" defaultValue={product?.status ?? "draft"}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="hidden">Oculto</option>
            <option value="archived">Archivado</option>
          </select>
        </label>
        <label className="studio-checkbox">
          <input type="checkbox" name="featured" defaultChecked={product?.featured} />
          Destacado en home
        </label>
      </div>

      <label>
        Nombre en espanol
        <input name="name_es" defaultValue={product?.name_es} required />
        {state.errors?.name_es && <span>{state.errors.name_es}</span>}
      </label>
      <label>
        Descripcion en espanol
        <textarea name="description_es" defaultValue={product?.description_es} rows={5} required />
        {state.errors?.description_es && <span>{state.errors.description_es}</span>}
      </label>
      <label>
        Imagen principal
        <input name="hero_image_path" defaultValue={product?.hero_image_path} placeholder="/assets/images/oasis-set.jpg o URL del bucket" required />
        {state.errors?.hero_image_path && <span>{state.errors.hero_image_path}</span>}
      </label>

      <div className="studio-form__grid">
        <label>
          Materiales
          <input name="materials_es" defaultValue={product?.materials_es} />
        </label>
        <label>
          Dimensiones
          <input name="dimensions_es" defaultValue={product?.dimensions_es} />
        </label>
        <label>
          Acabados
          <input name="finishes_es" defaultValue={product?.finishes_es} />
        </label>
        <label>
          Cuidados
          <input name="care_es" defaultValue={product?.care_es} />
        </label>
      </div>

      <div className="studio-language-note">
        <strong>Ingles pendiente de revision</strong>
        <p>Estos campos quedan opcionales para evitar publicar traducciones inventadas.</p>
      </div>
      <div className="studio-form__grid">
        <label>
          Nombre en ingles
          <input name="name_en" defaultValue={product?.name_en} />
        </label>
        <label>
          Descripcion en ingles
          <textarea name="description_en" defaultValue={product?.description_en} rows={3} />
        </label>
      </div>

      {state.message && <p className="admin-error">{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar producto"}
      </button>
    </form>
  );
}

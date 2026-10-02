"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
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
  image_paths?: string[];
  materials_es?: string;
  dimensions_es?: string;
  finishes_es?: string;
  care_es?: string;
  status?: string;
  featured?: boolean;
};

const initialState: ActionState = {};

export function ProductForm({ collections, product }: { collections: CollectionOption[]; product?: ProductFormValue }) {
  const [images, setImages] = useState(() => [...new Set(product?.image_paths ?? (product?.hero_image_path ? [product.hero_image_path] : []))]);
  const [newImages, setNewImages] = useState<Array<{ file: File; url: string }>>([]);
  const previewUrls = useRef(new Set<string>());
  const [primaryImage, setPrimaryImage] = useState(product?.hero_image_path ?? images[0] ?? "");
  const [state, action, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    newImages.forEach(({ file }) => formData.append("product_images", file));
    const newPrimaryIndex = newImages.findIndex(({ url }) => url === primaryImage);
    if (newPrimaryIndex >= 0) formData.set("primary_new_image_index", String(newPrimaryIndex));
    return upsertProduct(previous, formData);
  }, initialState);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function removeImage(path: string) {
    const remainingImages = images.filter((image) => image !== path);
    const remainingNewImages = newImages.filter(({ url }) => url !== path);
    setImages(remainingImages);
    setNewImages(remainingNewImages);
    if (previewUrls.current.delete(path)) URL.revokeObjectURL(path);
    if (primaryImage === path) setPrimaryImage(remainingImages[0] ?? remainingNewImages[0]?.url ?? "");
  }

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
      <div className="studio-form__gallery">
        Galería de imágenes
        <input type="hidden" name="existing_image_paths" value={JSON.stringify(images)} />
        <input type="hidden" name="primary_image_path" value={images.includes(primaryImage) ? primaryImage : ""} />
        <div className="studio-product-gallery">
          {[...images, ...newImages.map(({ url }) => url)].map((path, index) => (
            <div className="studio-product-gallery__item" key={path}>
              <label className="studio-product-gallery__primary">
                <span className="studio-image-preview"><Image src={path} alt={`Imagen ${index + 1}`} fill sizes="150px" unoptimized={path.startsWith("blob:")} /></span>
                <span><input type="radio" name="gallery_primary" value={path} checked={path === primaryImage} onChange={() => setPrimaryImage(path)} disabled={pending} /> Principal</span>
              </label>
              <button type="button" className="studio-product-gallery__remove" onClick={() => removeImage(path)} disabled={pending} aria-label={`Eliminar imagen ${index + 1}`}>Eliminar</button>
            </div>
          ))}
        </div>
        <label>
          Agregar imágenes
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={pending} onChange={(event) => {
            const added = Array.from(event.target.files ?? []).map((file) => ({ file, url: URL.createObjectURL(file) }));
            added.forEach(({ url }) => previewUrls.current.add(url));
            setNewImages((current) => [...current, ...added]);
            if (!primaryImage && added.length) setPrimaryImage(added[0].url);
            event.target.value = "";
          }} />
        </label>
        <small>Agrega varias imágenes. Marca una como principal. Los cambios y las eliminaciones se aplican al guardar. JPG, PNG, WebP o AVIF; máximo 6 MB cada una.</small>
        {state.errors?.hero_image && <span>{state.errors.hero_image}</span>}
      </div>

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

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { deleteProduct, upsertProduct, type ActionState } from "../actions";
import { ImageManager } from "./ImageManager";

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
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValue>({ status: "draft", ...product });
  const field = (name: keyof ProductFormValue) => ({
    value: String(values[name] ?? ""),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues((current) => ({ ...current, [name]: event.target.value }))
  });
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [preview, setPreview] = useState({ name: "", description: "", dimensions: "" });
  const [images, setImages] = useState(() => [...new Set(product?.image_paths ?? (product?.hero_image_path ? [product.hero_image_path] : []))]);
  const [primaryImage, setPrimaryImage] = useState(product?.hero_image_path ?? images[0] ?? "");
  const [state, action, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    formData.set("library_image_paths", JSON.stringify(images.filter((path) => !(product?.image_paths ?? [product?.hero_image_path]).includes(path))));
    return upsertProduct(previous, formData);
  }, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteProduct, initialState);

  useEffect(() => {
    if (deleteState.ok) router.replace("/studio-mash/productos");
  }, [deleteState.ok, router]);

  useEffect(() => {
    if (!dirty || pending || deleting) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const guardLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || event.ctrlKey || event.metaKey || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Salir del editor?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guardLink, true); };
  }, [dirty, pending, deleting]);

  function removeImage(path: string) {
    setDirty(true);
    const remainingImages = images.filter((image) => image !== path);
    setImages(remainingImages);
    if (primaryImage === path) setPrimaryImage(remainingImages[0] ?? "");
  }

  function moveImage(path: string, target: number) {
    const from = images.indexOf(path);
    if (from < 0 || target < 0 || target >= images.length) return;
    const next = [...images]; next.splice(from, 1); next.splice(target, 0, path);
    setImages(next); setDirty(true);
  }

  return (
    <>
    <form ref={formRef} action={action} className="studio-form studio-product-editor" onSubmit={(event) => { if (uploading || deleting) event.preventDefault(); }} onChange={() => setDirty(true)}>
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <div className="studio-savebar">
        <span role="status">{uploading ? "Preparando imágenes…" : pending ? "Guardando producto…" : dirty ? "Cambios sin guardar" : "Sin cambios pendientes"}</span>
        <button type="button" className="studio-edit-link" disabled={pending || deleting} onClick={() => {
          if (!formRef.current) return;
          const data = new FormData(formRef.current);
          setPreview({ name: String(data.get("name_es") || "Producto sin nombre"), description: String(data.get("description_es") || ""), dimensions: String(data.get("dimensions_es") || "") });
          dialogRef.current?.showModal();
        }}>Vista previa</button>
        <button className="admin-button" type="submit" disabled={pending || deleting || uploading}>{pending ? "Guardando…" : "Guardar producto"}</button>
      </div>
      {state.message && <p role="alert" className="admin-error">{state.message}</p>}
      {state.errors && <p role="alert" className="admin-error">Revisa los campos indicados antes de guardar.</p>}
      <fieldset disabled={pending || deleting} className="studio-editor-fields">
      <fieldset className="studio-fieldset"><legend>01 · Publicación</legend>
      <div className="studio-form__grid">
        <label>
          Slug
          <input name="slug" {...field("slug")} placeholder="set-toscana" required />
          {state.errors?.slug && <span>{state.errors.slug}</span>}
        </label>
        <label>
          Colección
          <select name="collection_id" {...field("collection_id")} required>
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
          <select name="status" {...field("status")}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="hidden">Oculto</option>
            <option value="archived">Papelera</option>
          </select>
        </label>
        <label className="studio-checkbox">
          <input type="checkbox" name="featured" checked={Boolean(values.featured)} onChange={(event) => setValues((current) => ({ ...current, featured: event.target.checked }))} />
          Destacado en inicio
        </label>
      </div>
      </fieldset>
      <fieldset className="studio-fieldset"><legend>02 · Información del producto</legend>
      <label>
        Nombre en español
        <input name="name_es" {...field("name_es")} required />
        {state.errors?.name_es && <span>{state.errors.name_es}</span>}
      </label>
      <label>
        Descripción en español
        <textarea name="description_es" {...field("description_es")} rows={5} required />
        {state.errors?.description_es && <span>{state.errors.description_es}</span>}
      </label>
      </fieldset>
      <fieldset className="studio-fieldset"><legend>03 · Fotografías</legend>
      <div className="studio-form__gallery">
        Galería de imágenes
        <input type="hidden" name="existing_image_paths" value={JSON.stringify(images)} />
        <input type="hidden" name="primary_image_path" value={images.includes(primaryImage) ? primaryImage : ""} />
        <div className="studio-product-gallery">
          {images.map((path, index) => (
            <div className="studio-product-gallery__item" key={path} draggable={!pending && !deleting && !uploading} onDragStart={() => setDragged(path)} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (dragged) moveImage(dragged, index); setDragged(null); }}>
              <label className="studio-product-gallery__primary">
                <span className="studio-image-preview"><Image src={path} alt={`Imagen ${index + 1}`} fill sizes="150px" unoptimized={path.startsWith("blob:")} /></span>
                <span><input type="radio" name="gallery_primary" value={path} checked={path === primaryImage} onChange={() => setPrimaryImage(path)} disabled={pending} /> {path === primaryImage ? "★ Principal" : "Elegir principal"}</span>
              </label>
              <button type="button" className="studio-product-gallery__remove" onClick={() => removeImage(path)} disabled={pending} aria-label={`Eliminar imagen ${index + 1}`}>Eliminar</button>
              <div className="studio-inline-actions"><button type="button" disabled={index === 0 || pending} aria-label={`Mover imagen ${index + 1} antes`} onClick={() => moveImage(path, index - 1)}>←</button><button type="button" disabled={index === images.length - 1 || pending} aria-label={`Mover imagen ${index + 1} después`} onClick={() => moveImage(path, index + 1)}>→</button></div>
            </div>
          ))}
        </div>
        <ImageManager disabled={pending || deleting} onBusy={(busy) => { setUploading(busy); if (busy) setDirty(true); }} onAdd={(url) => { setImages((current) => [...new Set([...current, url])]); setPrimaryImage((current) => current || url); setDirty(true); }} />
        <small>Arrastra para ordenar o usa las flechas. Marca la principal con la estrella. Máximo 20 imágenes; los cambios se publican al guardar.</small>
        {state.errors?.hero_image && <span>{state.errors.hero_image}</span>}
      </div>
      </fieldset>
      <fieldset className="studio-fieldset"><legend>04 · Materiales y cuidados</legend>
      <div className="studio-form__grid">
        <label>
          Materiales
          <input name="materials_es" {...field("materials_es")} />
        </label>
        <label>
          Dimensiones
          <input name="dimensions_es" {...field("dimensions_es")} />
        </label>
        <label>
          Acabados
          <input name="finishes_es" {...field("finishes_es")} />
        </label>
        <label>
          Cuidados
          <input name="care_es" {...field("care_es")} />
        </label>
      </div>
      </fieldset>
      <details className="studio-fieldset"><summary>05 · Traducción al inglés (opcional)</summary>
      <div className="studio-language-note">
        <strong>Inglés pendiente de revisión</strong>
        <p>Estos campos quedan opcionales para evitar publicar traducciones inventadas.</p>
      </div>
      <div className="studio-form__grid">
        <label>
          Nombre en inglés
          <input name="name_en" {...field("name_en")} />
        </label>
        <label>
          Descripción en inglés
          <textarea name="description_en" {...field("description_en")} rows={3} />
        </label>
      </div>
      </details>
      </fieldset>
    </form>
    <dialog ref={dialogRef} className="studio-preview-dialog" aria-label="Vista previa del producto">
      <div className="studio-heading"><p>Vista previa · Cambios aún no guardados</p><button type="button" className="studio-edit-link" onClick={() => dialogRef.current?.close()}>Cerrar</button></div>
      {primaryImage && <div className="studio-preview-image"><Image src={primaryImage} alt={preview.name} fill sizes="(max-width: 640px) 90vw, 640px" unoptimized={primaryImage.startsWith("blob:")} /></div>}
      <h2>{preview.name}</h2><p>{preview.description}</p>{preview.dimensions && <p>Dimensiones: {preview.dimensions}</p>}
      <small>Vista orientativa del contenido; no publica ni guarda cambios.</small>
    </dialog>
    {product?.id && (
      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (pending || uploading || !window.confirm("¿Mover este producto a la papelera? Se conservarán sus imágenes. Los cambios sin guardar se descartarán.")) event.preventDefault();
        }}
        className="studio-form"
      >
        <input type="hidden" name="id" value={product.id} />
        {deleteState.message && <p className="admin-error">{deleteState.message}</p>}
        <button className="studio-edit-link studio-danger" type="submit" disabled={deleting || pending || uploading}>
          {deleting ? "Moviendo…" : "Mover a la papelera"}
        </button>
      </form>
    )}
    </>
  );
}

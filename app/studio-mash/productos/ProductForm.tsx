"use client";
import Link from "next/link";
import { ConflictHelp, SubmissionIntent } from "../FormSafety";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { deleteProduct, upsertProduct, type ActionState } from "../actions";
import { GalleryEditor } from "./GalleryEditor";
import type { MediaAsset } from "@/lib/media/types";
import { MediaImage } from "../multimedia/MediaImage";

type CollectionOption = {
  id: string;
  label: string;
};

type ProductFormValue = {
  id?: string;
  revision?: number;
  image_alts?: Record<string, { alt_es?: string; alt_en?: string }>;
  slug?: string;
  seo_title_es?: string;
  seo_description_es?: string;
  collection_id?: string;
  collection_ids?: string[];
  name_es?: string;
  name_en?: string;
  description_es?: string;
  description_en?: string;
  translation_status?: string;
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

export function ProductForm({
  collections,
  product,
}: {
  collections: CollectionOption[];
  product?: ProductFormValue;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValue>({
    status: "draft",
    ...product,
  });
  const manualSlug = useRef(Boolean(product?.id));
  const field = (name: keyof ProductFormValue) => ({
    value: String(values[name] ?? ""),
    onChange: (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const value = event.target.value;
      if (name === "slug") manualSlug.current = true;
      const suggestedSlug =
        name === "name_es" && !manualSlug.current
          ? value
              .normalize("NFD")
              .replace(/[̀-ͯ]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 80)
              .replace(/-$/, "")
          : undefined;
      setValues((current) => ({
        ...current,
        [name]: value,
        ...(suggestedSlug !== undefined ? { slug: suggestedSlug } : {}),
      }));
    },
  });
  const englishComplete =
    product?.translation_status === "complete" &&
    values.name_es === product.name_es &&
    values.description_es === product.description_es &&
    values.name_en === product.name_en &&
    values.description_en === product.description_en;
  const [collectionIds, setCollectionIds] = useState(
    product?.collection_ids?.length
      ? product.collection_ids
      : product?.collection_id
        ? [product.collection_id]
        : [],
  );
  const primaryCollection =
    values.collection_id && collectionIds.includes(values.collection_id)
      ? values.collection_id
      : (collectionIds[0] ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assets, setAssets] = useState<Record<string, MediaAsset>>({});
  const [preview, setPreview] = useState({
    name: "",
    description: "",
    dimensions: "",
  });
  const [images, setImages] = useState(() => [
    ...new Set(
      product?.image_paths ??
        (product?.hero_image_path ? [product.hero_image_path] : []),
    ),
  ]);
  const [imageAlts, setImageAlts] = useState(product?.image_alts ?? {});
  const [primaryImage, setPrimaryImage] = useState(
    product?.hero_image_path ?? images[0] ?? "",
  );
  const [state, action, pending] = useActionState(upsertProduct, initialState);
  useEffect(() => {
    if (state.message || state.errors) submitting.current = false;
  }, [state]);
  useEffect(() => {
    if (state.ok && state.redirectTo) {
      submitting.current = true;
      window.location.assign(state.redirectTo);
    }
  }, [state]);
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteProduct,
    initialState,
  );

  useEffect(() => {
    if (deleteState.ok) router.replace("/studio-mash/productos");
  }, [deleteState.ok, router]);

  useEffect(() => {
    if (!dirty || pending || deleting) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (submitting.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const guardLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        event.ctrlKey ||
        event.metaKey ||
        link.getAttribute("href")?.startsWith("#")
      )
        return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Salir del editor?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
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
    const next = [...images];
    next.splice(from, 1);
    next.splice(target, 0, path);
    setImages(next);
    setDirty(true);
  }

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className="studio-form studio-product-editor"
        onSubmit={(event) => {
          if (uploading || deleting || pending) {
            event.preventDefault();
            return;
          }
          submitting.current = true;
        }}
        onChange={() => setDirty(true)}
        onInvalid={(event) => {
          const details = (event.target as HTMLElement).closest("details");
          if (details) details.open = true;
        }}
      >
        <input type="hidden" name="status" value={product?.status ?? "draft"} />
        {product?.id && (
          <>
            <input type="hidden" name="id" value={product.id} />
            <input
              type="hidden"
              name="revision"
              value={product.revision ?? 0}
            />
          </>
        )}
        <SubmissionIntent />
        <input
          type="hidden"
          name="library_image_paths"
          value={JSON.stringify(
            images.filter(
              (path) =>
                !(product?.image_paths ?? [product?.hero_image_path]).includes(
                  path,
                ),
            ),
          )}
        />
        <input
          type="hidden"
          name="image_alts"
          value={JSON.stringify(imageAlts)}
        />
        <div className="studio-savebar">
          <span role="status">
            {uploading
              ? "Preparando imágenes…"
              : pending
                ? "Guardando producto…"
                : dirty
                  ? "Cambios sin guardar"
                  : "Sin cambios pendientes"}
          </span>
          <button
            type="button"
            className="admin-button admin-button--secondary"
            disabled={pending || deleting}
            onClick={() => {
              if (!formRef.current) return;
              const data = new FormData(formRef.current);
              setPreview({
                name: String(data.get("name_es") || "Producto sin nombre"),
                description: String(data.get("description_es") || ""),
                dimensions: String(data.get("dimensions_es") || ""),
              });
              dialogRef.current?.showModal();
            }}
          >
            Vista previa
          </button>
          <button
            className="admin-button admin-button--secondary"
            type="submit"
            disabled={pending || deleting || uploading}
          >
            {pending
              ? "Guardando…"
              : product?.id
                ? "Guardar cambios"
                : "Guardar borrador"}
          </button>
          <button
            className="admin-button"
            type="submit"
            name="intent"
            value="publish"
            disabled={pending || deleting || uploading}
          >
            Publicar cambios
          </button>
        </div>
        <p>
          Guardar conserva la versión pública actual. Publicar valida y hace
          visibles los cambios.
        </p>
        <ConflictHelp message={state.message} />
        {state.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={state.ok ? "admin-success" : "admin-error"}
          >
            {state.message}
          </p>
        )}
        {state.errors && (
          <p role="alert" className="admin-error">
            Revisa los campos indicados antes de guardar.
          </p>
        )}
        <fieldset
          disabled={pending || deleting}
          className="studio-editor-fields"
        >
          <div className="studio-product-main">
            <fieldset className="studio-fieldset">
              <legend>Información del producto</legend>
              <label>
                Nombre en español
                <input name="name_es" {...field("name_es")} required />
                {state.errors?.name_es && <span>{state.errors.name_es}</span>}
              </label>
              <label>
                Descripción en español
                <textarea
                  name="description_es"
                  {...field("description_es")}
                  rows={5}
                  required
                />
                {state.errors?.description_es && (
                  <span>{state.errors.description_es}</span>
                )}
              </label>
            </fieldset>
            <input
              type="hidden"
              name="existing_image_paths"
              value={JSON.stringify(images)}
            />
            <input
              type="hidden"
              name="primary_image_path"
              value={images.includes(primaryImage) ? primaryImage : ""}
            />
            <GalleryEditor
              images={images}
              primary={primaryImage}
              alts={imageAlts}
              assets={assets}
              disabled={pending || deleting}
              onBusy={setUploading}
              onAdd={(url, asset) => {
                setImages((current) =>
                  [...new Set([...current, url])].slice(0, 20),
                );
                if (asset)
                  setAssets((current) => ({ ...current, [url]: asset }));
                setPrimaryImage((current) => current || url);
                setDirty(true);
              }}
              onRemove={removeImage}
              onMove={moveImage}
              onPrimary={(url) => {
                setPrimaryImage(url);
                setDirty(true);
              }}
              onAlts={(url, alt) => {
                setImageAlts((current) => ({ ...current, [url]: alt }));
                setDirty(true);
              }}
              onReplace={(oldUrl, url, asset) => {
                if (images.includes(url)) return;
                setImages((current) =>
                  current.map((path) => (path === oldUrl ? url : path)),
                );
                setPrimaryImage((current) =>
                  current === oldUrl ? url : current,
                );
                setImageAlts((current) => ({
                  ...current,
                  [url]: current[oldUrl] ?? {},
                }));
                if (asset)
                  setAssets((current) => ({ ...current, [url]: asset }));
                setDirty(true);
              }}
            />
            {state.errors?.hero_image && (
              <p role="alert">{state.errors.hero_image}</p>
            )}
            <fieldset className="studio-fieldset">
              <legend>Materiales y cuidados</legend>
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
            <details className="studio-fieldset">
              <summary>Traducción al inglés (opcional)</summary>
              <div className="studio-language-note">
                <strong>
                  {englishComplete
                    ? "Inglés revisado"
                    : "Inglés pendiente de revisión"}
                </strong>
                <p>
                  Estos campos quedan opcionales para evitar publicar
                  traducciones inventadas.
                </p>
              </div>
              <div className="studio-form__grid">
                <label>
                  Nombre en inglés
                  <input name="name_en" {...field("name_en")} />
                </label>
                <label>
                  Descripción en inglés
                  <textarea
                    name="description_en"
                    {...field("description_en")}
                    rows={3}
                  />
                </label>
              </div>
            </details>
          </div>
          <aside className="studio-product-sidebar">
            <fieldset className="studio-fieldset">
              <legend>Publicación</legend>
              <div className="studio-form__grid">
                <fieldset className="studio-product-memberships">
                  <legend>Colecciones</legend>
                  <input
                    type="hidden"
                    name="collection_ids"
                    value={JSON.stringify(collectionIds)}
                  />
                  {collections.map((collection) => (
                    <label className="studio-checkbox" key={collection.id}>
                      <input
                        type="checkbox"
                        checked={collectionIds.includes(collection.id)}
                        disabled={
                          !collectionIds.includes(collection.id) &&
                          collectionIds.length >= 20
                        }
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setCollectionIds((current) =>
                            checked
                              ? [...current, collection.id]
                              : current.filter((id) => id !== collection.id),
                          );
                        }}
                      />
                      {collection.label}
                    </label>
                  ))}
                </fieldset>
                <label>
                  Colección principal
                  <select
                    name="collection_id"
                    value={primaryCollection}
                    required
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        collection_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona una colección</option>
                    {collections
                      .filter((collection) =>
                        collectionIds.includes(collection.id),
                      )
                      .map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.label}
                        </option>
                      ))}
                  </select>
                  {state.errors?.collection_id && (
                    <span role="alert">{state.errors.collection_id}</span>
                  )}
                </label>
                <label>
                  Estado
                  <select name="display_status" disabled {...field("status")}>
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                    <option value="hidden">Oculto</option>
                    <option value="archived">Papelera</option>
                  </select>
                </label>
                <label className="studio-checkbox">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={Boolean(values.featured)}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        featured: event.target.checked,
                      }))
                    }
                  />
                  Destacado en inicio
                </label>
              </div>
            </fieldset>
            <details
              className="studio-fieldset"
              open={
                !product?.id ||
                Boolean(
                  state.errors?.slug ||
                    state.errors?.seo_title_es ||
                    state.errors?.seo_description_es,
                ) ||
                undefined
              }
            >
              <summary>URL y buscadores</summary>
              <label>
                Slug
                <input
                  name="slug"
                  {...field("slug")}
                  placeholder="set-toscana"
                  required
                />
                {state.errors?.slug && <span>{state.errors.slug}</span>}
              </label>
              <label>
                Título SEO
                <input
                  name="seo_title_es"
                  {...field("seo_title_es")}
                  maxLength={70}
                />
                {state.errors?.seo_title_es && (
                  <span>{state.errors.seo_title_es}</span>
                )}
              </label>
              <label>
                Descripción SEO
                <textarea
                  name="seo_description_es"
                  {...field("seo_description_es")}
                  maxLength={180}
                  rows={3}
                />
                {state.errors?.seo_description_es && (
                  <span>{state.errors.seo_description_es}</span>
                )}
              </label>
            </details>
          </aside>
        </fieldset>
        {product?.id && (
          <Link href={`/studio-mash/revisiones?kind=product&id=${product.id}`}>
            Historial de revisiones
          </Link>
        )}
      </form>
      <dialog
        ref={dialogRef}
        className="studio-preview-dialog"
        aria-label="Vista previa del producto"
      >
        <div className="studio-heading">
          <p>Vista previa · Cambios aún no guardados</p>
          <button
            type="button"
            className="studio-edit-link"
            onClick={() => dialogRef.current?.close()}
          >
            Cerrar
          </button>
        </div>
        {primaryImage && (
          <div className="studio-preview-image">
            <MediaImage src={primaryImage} alt={preview.name} />
          </div>
        )}
        <h2>{preview.name}</h2>
        <p>{preview.description}</p>
        {preview.dimensions && <p>Dimensiones: {preview.dimensions}</p>}
        <small>
          Vista orientativa del contenido; no publica ni guarda cambios.
        </small>
      </dialog>
      {product?.id && (
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              pending ||
              uploading ||
              !window.confirm(
                "¿Mover este producto a la papelera? Se conservarán sus imágenes. Los cambios sin guardar se descartarán.",
              )
            )
              event.preventDefault();
          }}
          className="studio-form"
        >
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="revision" value={product.revision ?? 0} />
          {deleteState.message && (
            <p className="admin-error">{deleteState.message}</p>
          )}
          <button
            className="studio-edit-link studio-danger"
            type="submit"
            disabled={deleting || pending || uploading}
          >
            {deleting ? "Moviendo…" : "Mover a la papelera"}
          </button>
        </form>
      )}
    </>
  );
}

"use client";
import Link from "next/link";
import { FormActions } from "../FormActions";

import Image from "next/image";
import { useActionState } from "react";
import { upsertProject, type ActionState } from "../actions";

export type ProjectFormValue = {
  id?: string;
  revision?: number;
  slug?: string;
  title_es?: string;
  title_en?: string;
  description_es?: string;
  seo_title_es?: string;
  seo_description_es?: string;
  cover_alt_es?: string;
  description_en?: string;
  location?: string;
  cover_image_path?: string;
  status?: string;
  featured?: boolean;
  sort_order?: number;
};

const initialState: ActionState = {};

export function ProjectForm({ project }: { project?: ProjectFormValue }) {
  const [state, action, pending] = useActionState(upsertProject, initialState);

  return (
    <form action={action} className="studio-form">
      <input type="hidden" name="status" value={project?.status ?? "draft"} />

      <p>
        El estado se cambia explícitamente desde el listado. Guardar no publica.
      </p>
      {project?.id && (
        <>
          <input type="hidden" name="id" value={project.id} />
          <input type="hidden" name="revision" value={project.revision ?? 0} />
        </>
      )}
      <div className="studio-form__grid">
        <label>
          Slug
          <input
            name="slug"
            defaultValue={project?.slug}
            placeholder="terraza-social"
            required
          />
          {state.errors?.slug && <span>{state.errors.slug}</span>}
        </label>
        <label>
          Ubicacion
          <input name="location" defaultValue={project?.location} required />
          {state.errors?.location && <span>{state.errors.location}</span>}
        </label>
        <label>
          Orden
          <input
            name="sort_order"
            type="number"
            min="0"
            max="9999"
            defaultValue={project?.sort_order ?? 0}
            required
          />
        </label>
        <label>
          Estado
          <select
            name="display_status"
            disabled
            defaultValue={project?.status ?? "draft"}
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="hidden">Oculto</option>
            <option value="archived">Archivado</option>
          </select>
        </label>
        <label className="studio-checkbox">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={project?.featured}
          />
          Proyecto destacado
        </label>
      </div>
      <label>
        Titulo en espanol
        <input name="title_es" defaultValue={project?.title_es} required />
        {state.errors?.title_es && <span>{state.errors.title_es}</span>}
      </label>
      <label>
        Descripcion en espanol
        <textarea
          name="description_es"
          defaultValue={project?.description_es}
          rows={4}
          required
        />
        {state.errors?.description_es && (
          <span>{state.errors.description_es}</span>
        )}
      </label>
      <label>
        Imagen de portada
        {project?.cover_image_path && (
          <span className="studio-image-preview studio-image-preview--wide">
            <Image
              src={project.cover_image_path}
              alt="Portada actual"
              fill
              sizes="360px"
            />
          </span>
        )}
        <input
          type="hidden"
          name="existing_image_path"
          value={project?.cover_image_path ?? ""}
        />
        <input
          name="cover_image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          required={!project?.cover_image_path}
        />
        <small>JPG, PNG, WebP o AVIF. Maximo 6 MB.</small>
        {state.errors?.cover_image && <span>{state.errors.cover_image}</span>}
      </label>
      <details className="studio-fieldset">
        <summary>Buscadores</summary>
        <label>
          Título SEO{" "}
          <input
            name="seo_title_es"
            maxLength={70}
            defaultValue={project?.seo_title_es}
          />
        </label>
        <label>
          Descripción SEO{" "}
          <textarea
            name="seo_description_es"
            rows={2}
            maxLength={180}
            defaultValue={project?.seo_description_es}
          />
        </label>
      </details>
      <label>
        Texto alternativo de portada{" "}
        <textarea
          name="cover_alt_es"
          rows={2}
          maxLength={600}
          defaultValue={project?.cover_alt_es}
        />
      </label>
      <details className="studio-fieldset">
        <summary>Traducción al inglés (opcional)</summary>
        <div className="studio-form__grid">
          <label>
            Titulo en ingles
            <input name="title_en" defaultValue={project?.title_en} />
          </label>
          <label>
            Descripcion en ingles
            <textarea
              name="description_en"
              defaultValue={project?.description_en}
              rows={4}
            />
          </label>
        </div>
      </details>
      <FormActions
        ok={state.ok}
        redirectTo={state.redirectTo}
        pending={pending}
        existing={!!project?.id}
        message={state.message}
      />
      {project?.id && (
        <Link href={`/studio-mash/revisiones?kind=project&id=${project.id}`}>
          Historial de revisiones
        </Link>
      )}
    </form>
  );
}

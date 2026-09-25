"use client";

import { useActionState } from "react";
import { uploadMedia, type ActionState } from "../actions";

const initialState: ActionState = {};

export function MediaUploadForm() {
  const [state, action, pending] = useActionState(uploadMedia, initialState);

  return (
    <form action={action} className="studio-form">
      <div className="studio-form__grid">
        <label>
          Carpeta
          <select name="folder" defaultValue="products">
            <option value="products">Productos</option>
            <option value="collections">Colecciones</option>
            <option value="projects">Proyectos</option>
            <option value="site">Sitio</option>
          </select>
          {state.errors?.folder && <span>{state.errors.folder}</span>}
        </label>
        <label>
          Imagen desde el dispositivo
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
          <small>JPG, PNG, WebP o AVIF. Maximo 6 MB.</small>
          {state.errors?.image && <span>{state.errors.image}</span>}
        </label>
      </div>
      {state.message && <p className={state.ok ? "admin-success" : "admin-error"}>{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>
        {pending ? "Subiendo..." : "Subir imagen"}
      </button>
    </form>
  );
}

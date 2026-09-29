"use client";

import Image from "next/image";
import { useActionState } from "react";
import { upsertMarketingPages, type ActionState } from "../actions";

type PageValue = { eyebrow: string; title: string; description: string; image?: string };

const initialState: ActionState = {};

function PageFields({ prefix, label, es, en }: { prefix: string; label: string; es: PageValue; en: PageValue }) {
  return (
    <fieldset className="studio-fieldset">
      <legend>{label}</legend>
      <div className="studio-form__grid">
        <label>Etiqueta ES<input name={`${prefix}_eyebrow_es`} defaultValue={es.eyebrow} required /></label>
        <label>Etiqueta EN<input name={`${prefix}_eyebrow_en`} defaultValue={en.eyebrow} required /></label>
        <label>Titulo ES<textarea name={`${prefix}_title_es`} defaultValue={es.title} rows={2} required /></label>
        <label>Titulo EN<textarea name={`${prefix}_title_en`} defaultValue={en.title} rows={2} required /></label>
        <label>Descripcion ES<textarea name={`${prefix}_description_es`} defaultValue={es.description} rows={5} required /></label>
        <label>Descripcion EN<textarea name={`${prefix}_description_en`} defaultValue={en.description} rows={5} required /></label>
      </div>
    </fieldset>
  );
}

export function MarketingPagesForm({ aboutEs, aboutEn, contactEs, contactEn, projectsEs, projectsEn }: {
  aboutEs: PageValue;
  aboutEn: PageValue;
  contactEs: PageValue;
  contactEn: PageValue;
  projectsEs: PageValue;
  projectsEn: PageValue;
}) {
  const [state, action, pending] = useActionState(upsertMarketingPages, initialState);
  const aboutImage = aboutEs.image ?? "/assets/images/yascari.jpeg";
  return (
    <form action={action} className="studio-form">
      <PageFields prefix="about" label="Nosotros" es={aboutEs} en={aboutEn} />
      <label>
        Imagen de Nosotros
        <span className="studio-image-preview studio-image-preview--wide"><Image src={aboutImage} alt="Imagen actual" fill sizes="360px" /></span>
        <input type="hidden" name="about_existing_image" value={aboutImage} />
        <input name="about_image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
        <small>Opcional. Maximo 6 MB.</small>
        {state.errors?.about_image && <span>{state.errors.about_image}</span>}
      </label>
      <PageFields prefix="contact" label="Contacto" es={contactEs} en={contactEn} />
      <PageFields prefix="projects" label="Cabecera de Proyectos" es={projectsEs} en={projectsEn} />
      {state.message && <p className={state.ok ? "admin-success" : "admin-error"}>{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar paginas"}</button>
    </form>
  );
}

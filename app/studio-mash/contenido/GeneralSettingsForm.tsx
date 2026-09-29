"use client";

import { useActionState } from "react";
import { upsertSiteSettings, type ActionState } from "../actions";

export type GeneralSettingsValue = {
  full_name: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  instagram_handle: string;
  email: string;
  location_es: string;
  location_en: string;
  footer_cta_es: string;
  footer_cta_en: string;
  footer_description_es: string;
  footer_description_en: string;
  footer_navigation_title_es: string;
  footer_navigation_title_en: string;
  footer_legal_title_es: string;
  footer_legal_title_en: string;
  copyright_es: string;
  copyright_en: string;
};

const initialState: ActionState = {};

export function GeneralSettingsForm({ value }: { value: GeneralSettingsValue }) {
  const [state, action, pending] = useActionState(upsertSiteSettings, initialState);
  const error = (field: keyof GeneralSettingsValue) => state.errors?.[field];

  return (
    <form action={action} className="studio-form">
      <div className="studio-form__grid">
        <label>Nombre completo<input name="full_name" defaultValue={value.full_name} required />{error("full_name") && <span>{error("full_name")}</span>}</label>
        <label>Telefono visible<input name="phone" defaultValue={value.phone} required />{error("phone") && <span>{error("phone")}</span>}</label>
        <label>URL de WhatsApp<input name="whatsapp" type="url" defaultValue={value.whatsapp} required />{error("whatsapp") && <span>{error("whatsapp")}</span>}</label>
        <label>Correo<input name="email" type="email" defaultValue={value.email} required />{error("email") && <span>{error("email")}</span>}</label>
        <label>URL de Instagram<input name="instagram" type="url" defaultValue={value.instagram} required />{error("instagram") && <span>{error("instagram")}</span>}</label>
        <label>Usuario de Instagram<input name="instagram_handle" defaultValue={value.instagram_handle} required />{error("instagram_handle") && <span>{error("instagram_handle")}</span>}</label>
        <label>Ubicacion en espanol<input name="location_es" defaultValue={value.location_es} required />{error("location_es") && <span>{error("location_es")}</span>}</label>
        <label>Ubicacion en ingles<input name="location_en" defaultValue={value.location_en} required />{error("location_en") && <span>{error("location_en")}</span>}</label>
      </div>

      <div className="studio-language-note"><strong>Footer bilingue</strong><p>Edita el llamado, la descripcion, los titulos y el copyright global.</p></div>
      <div className="studio-form__grid">
        <label>CTA footer ES<input name="footer_cta_es" defaultValue={value.footer_cta_es} required /></label>
        <label>CTA footer EN<input name="footer_cta_en" defaultValue={value.footer_cta_en} required /></label>
        <label>Descripcion footer ES<textarea name="footer_description_es" defaultValue={value.footer_description_es} rows={4} required /></label>
        <label>Descripcion footer EN<textarea name="footer_description_en" defaultValue={value.footer_description_en} rows={4} required /></label>
        <label>Titulo navegacion ES<input name="footer_navigation_title_es" defaultValue={value.footer_navigation_title_es} required /></label>
        <label>Titulo navegacion EN<input name="footer_navigation_title_en" defaultValue={value.footer_navigation_title_en} required /></label>
        <label>Titulo legal ES<input name="footer_legal_title_es" defaultValue={value.footer_legal_title_es} required /></label>
        <label>Titulo legal EN<input name="footer_legal_title_en" defaultValue={value.footer_legal_title_en} required /></label>
        <label>Copyright ES<input name="copyright_es" defaultValue={value.copyright_es} required /></label>
        <label>Copyright EN<input name="copyright_en" defaultValue={value.copyright_en} required /></label>
      </div>
      {state.message && <p className={state.ok ? "admin-success" : "admin-error"}>{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar datos generales"}</button>
    </form>
  );
}

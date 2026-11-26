"use client";
import { PublicationFields, PublishButton } from "../PublicationFields";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { upsertSiteSettings, type ActionState } from "../actions";
import type { workshopContent } from "@/lib/workshop";

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

const tabs = ["Negocio", "Contacto", "Redes", "Footer", "Preferencias"];
const fieldTabs: Record<string, number> = {
  phone: 1,
  whatsapp: 1,
  email: 1,
  instagram: 2,
  instagram_handle: 2,
};
const initialState: ActionState = {};

export function GeneralSettingsForm({
  value,
  preferences,
  workshop,
}: {
  value: GeneralSettingsValue;
  preferences: ReactNode;
  workshop: Record<"es" | "en", ReturnType<typeof workshopContent>>;
}) {
  const [state, action, pending] = useActionState(
    upsertSiteSettings,
    initialState,
  );
  const error = (field: keyof GeneralSettingsValue) => state.errors?.[field];

  const [tab, setTab] = useState(0);
  useEffect(() => {
    const selectAccount = () => {
      if (window.location.hash === "#cuenta") setTab(4);
    };
    selectAccount();
    window.addEventListener("hashchange", selectAccount);
    return () => window.removeEventListener("hashchange", selectAccount);
  }, []);
  useEffect(() => {
    const field = Object.keys(state.errors ?? {})[0];
    if (field)
      setTab(fieldTabs[field] ?? (field.startsWith("workshop_") ? 1 : /^footer_|^copyright_/.test(field) ? 3 : 0));
  }, [state.errors]);
  const panel = (index: number, children: ReactNode) => (
    <section
      className="studio-settings-panel"
      role="tabpanel"
      data-tab={index}
      id={`settings-panel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      hidden={tab !== index}
    >
      {children}
    </section>
  );

  return (
    <form
      action={action}
      className="studio-form studio-spanish-first"
      onInvalid={(event) => {
        const element = event.target as HTMLElement;
        const index = Number(
          element.closest<HTMLElement>("[data-tab]")?.dataset.tab,
        );
        if (Number.isInteger(index) && index !== tab) {
          setTab(index);
          requestAnimationFrame(() => element.focus());
        }
      }}
    >
      <PublicationFields />
      <label className="studio-english-toggle studio-checkbox">
        <input type="checkbox" />
        Mostrar campos en inglés
      </label>
      <div
        className="studio-settings-tabs"
        role="tablist"
        aria-label="Configuración"
      >
        {tabs.map((label, index) => (
          <button
            type="button"
            role="tab"
            key={label}
            id={`settings-tab-${index}`}
            aria-controls={`settings-panel-${index}`}
            aria-selected={tab === index}
            tabIndex={tab === index ? 0 : -1}
            onClick={() => setTab(index)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              setTab(next);
              document.getElementById(`settings-tab-${next}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {panel(
        0,
        <div className="studio-form__grid">
          <label>
            Nombre completo
            <input name="full_name" defaultValue={value.full_name} required />
            {error("full_name") && <span>{error("full_name")}</span>}
          </label>
          <label>
            Ubicacion en espanol
            <input
              name="location_es"
              defaultValue={value.location_es}
              required
            />
            {error("location_es") && <span>{error("location_es")}</span>}
          </label>
          <label>
            Ubicacion en ingles
            <input name="location_en" defaultValue={value.location_en} />
            {error("location_en") && <span>{error("location_en")}</span>}
          </label>
        </div>,
      )}
      {panel(
        1,
        <div className="studio-form__grid">
          <label>
            Telefono visible
            <input name="phone" defaultValue={value.phone} required />
            {error("phone") && <span>{error("phone")}</span>}
          </label>
          <label>
            URL de WhatsApp
            <input
              name="whatsapp"
              type="url"
              defaultValue={value.whatsapp}
              required
            />
            {error("whatsapp") && <span>{error("whatsapp")}</span>}
          </label>
          <label>
            Correo
            <input
              name="email"
              type="email"
              defaultValue={value.email}
              required
            />
            {error("email") && <span>{error("email")}</span>}
          </label>
          <fieldset>
            <legend>Mapa del taller</legend>
            <label>Visibilidad
              <select name="workshop_enabled" defaultValue={workshop.es.visible ? "on" : "off"}>
                <option value="on">Visible</option>
                <option value="off">Oculto</option>
              </select>
            </label>
            <label>Latitud
              <input name="workshop_latitude" type="number" step="any" min="-90" max="90" defaultValue={workshop.es.latitude} required />
            </label>
            <label>Longitud
              <input name="workshop_longitude" type="number" step="any" min="-180" max="180" defaultValue={workshop.es.longitude} required />
            </label>
            <label>Enlace de Google Maps
              <input name="workshop_directions" type="url" defaultValue={workshop.es.directions} required />
              {state.errors?.workshop_directions && <span>{state.errors.workshop_directions}</span>}
            </label>
            {(["es", "en"] as const).map((locale) => (
              <div key={locale}>
                <label>Nombre del establecimiento {locale.toUpperCase()}
                  <input name={`workshop_name_${locale}`} maxLength={150} defaultValue={workshop[locale].name} />
                </label>
                <label>Dirección del taller {locale.toUpperCase()}
                  <input name={`workshop_address_${locale}`} maxLength={250} defaultValue={workshop[locale].address} />
                </label>
                <label>Botón Cómo llegar {locale.toUpperCase()}
                  <input name={`workshop_button_${locale}`} maxLength={80} defaultValue={workshop[locale].button} />
                </label>
              </div>
            ))}
          </fieldset>
        </div>,
      )}
      {panel(
        2,
        <div className="studio-form__grid">
          <label>
            URL de Instagram
            <input
              name="instagram"
              type="url"
              defaultValue={value.instagram}
              required
            />
            {error("instagram") && <span>{error("instagram")}</span>}
          </label>
          <label>
            Usuario de Instagram
            <input
              name="instagram_handle"
              defaultValue={value.instagram_handle}
              required
            />
            {error("instagram_handle") && (
              <span>{error("instagram_handle")}</span>
            )}
          </label>
        </div>,
      )}
      {panel(
        3,
        <div className="studio-form__grid">
          <label>
            CTA footer ES
            <input
              name="footer_cta_es"
              defaultValue={value.footer_cta_es}
              required
            />
          </label>
          <label>
            CTA footer EN
            <input name="footer_cta_en" defaultValue={value.footer_cta_en} />
          </label>
          <label>
            Descripcion footer ES
            <textarea
              name="footer_description_es"
              defaultValue={value.footer_description_es}
              rows={4}
              required
            />
          </label>
          <label>
            Descripcion footer EN
            <textarea
              name="footer_description_en"
              defaultValue={value.footer_description_en}
              rows={4}
            />
          </label>
          <label>
            Titulo navegacion ES
            <input
              name="footer_navigation_title_es"
              defaultValue={value.footer_navigation_title_es}
              required
            />
          </label>
          <label>
            Titulo navegacion EN
            <input
              name="footer_navigation_title_en"
              defaultValue={value.footer_navigation_title_en}
            />
          </label>
          <label>
            Titulo legal ES
            <input
              name="footer_legal_title_es"
              defaultValue={value.footer_legal_title_es}
              required
            />
          </label>
          <label>
            Titulo legal EN
            <input
              name="footer_legal_title_en"
              defaultValue={value.footer_legal_title_en}
            />
          </label>
          <label>
            Copyright ES
            <input
              name="copyright_es"
              defaultValue={value.copyright_es}
              required
            />
          </label>
          <label>
            Copyright EN
            <input name="copyright_en" defaultValue={value.copyright_en} />
          </label>
        </div>,
      )}
      {panel(4, preferences)}
      {state.message && (
        <p className={state.ok ? "admin-success" : "admin-error"}>
          {state.message}
        </p>
      )}
      <div className="studio-settings-actions" hidden={tab === 4}>
        <button className="admin-button" type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar datos generales"}
        </button>
        <PublishButton disabled={pending} />
        <p>Guardar conserva la versión pública actual.</p>
      </div>
    </form>
  );
}

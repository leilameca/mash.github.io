"use client";

import { useActionState, useState } from "react";
import { upsertNavigation, type ActionState } from "../actions";

export type NavigationItemValue = {
  id: string;
  href: string;
  label_es: string;
  label_en: string;
  visible: boolean;
};

export type NavigationValue = {
  items: NavigationItemValue[];
  quote_label_es: string;
  quote_label_en: string;
  request_quote_label_es: string;
  request_quote_label_en: string;
  menu_label_es: string;
  menu_label_en: string;
  close_label_es: string;
  close_label_en: string;
};

const initialState: ActionState = {};

export function NavigationForm({ value }: { value: NavigationValue }) {
  const [state, action, pending] = useActionState(upsertNavigation, initialState);
  const [items, setItems] = useState(value.items);

  const update = (index: number, patch: Partial<NavigationItemValue>) =>
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  const move = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };
  const add = () => {
    const id = `enlace-${Date.now()}`;
    setItems((current) => [...current, { id, href: "/", label_es: "Nuevo enlace", label_en: "New link", visible: true }]);
  };

  return (
    <form action={action} className="studio-form">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <div className="studio-nav-editor">
        {items.map((item, index) => (
          <article key={item.id} className="studio-nav-editor__item">
            <div className="studio-form__grid">
              <label>Etiqueta ES<input value={item.label_es} onChange={(event) => update(index, { label_es: event.target.value })} /></label>
              <label>Etiqueta EN<input value={item.label_en} onChange={(event) => update(index, { label_en: event.target.value })} /></label>
              <label>Ruta interna<input value={item.href} placeholder="/productos" onChange={(event) => update(index, { href: event.target.value })} /></label>
              <label className="studio-checkbox"><input type="checkbox" checked={item.visible} onChange={(event) => update(index, { visible: event.target.checked })} />Visible</label>
            </div>
            <div className="studio-inline-actions">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>Subir</button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1}>Bajar</button>
              <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button>
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="studio-edit-link" onClick={add} disabled={items.length >= 12}>Agregar enlace</button>

      <div className="studio-language-note"><strong>Botones y accesibilidad</strong><p>Estas etiquetas controlan el CTA principal y el menu movil.</p></div>
      <div className="studio-form__grid">
        <label>CTA navbar ES<input name="quote_label_es" defaultValue={value.quote_label_es} required /></label>
        <label>CTA navbar EN<input name="quote_label_en" defaultValue={value.quote_label_en} required /></label>
        <label>Solicitar cotizacion ES<input name="request_quote_label_es" defaultValue={value.request_quote_label_es} required /></label>
        <label>Solicitar cotizacion EN<input name="request_quote_label_en" defaultValue={value.request_quote_label_en} required /></label>
        <label>Abrir menu ES<input name="menu_label_es" defaultValue={value.menu_label_es} required /></label>
        <label>Abrir menu EN<input name="menu_label_en" defaultValue={value.menu_label_en} required /></label>
        <label>Cerrar menu ES<input name="close_label_es" defaultValue={value.close_label_es} required /></label>
        <label>Cerrar menu EN<input name="close_label_en" defaultValue={value.close_label_en} required /></label>
      </div>
      {state.message && <p className={state.ok ? "admin-success" : "admin-error"}>{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar navegacion"}</button>
    </form>
  );
}

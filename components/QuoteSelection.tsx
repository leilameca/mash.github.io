"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { QuoteLink } from "./QuoteLink";
type Item = { slug: string; name: string };
const Selection = createContext<{ items: Item[]; toggle: (item: Item) => void } | null>(null);
export function QuoteSelectionProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const es = locale === "es";
  useEffect(() => { try { const saved = JSON.parse(sessionStorage.getItem("mash-quote") || "[]"); if (Array.isArray(saved)) setItems(saved.filter((item) => typeof item?.slug === "string" && /^[a-z0-9-]+$/.test(item.slug) && typeof item?.name === "string").slice(0, 10)); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) { try { sessionStorage.setItem("mash-quote", JSON.stringify(items)); } catch {} } }, [items, ready]);
  const toggle = (item: Item) => setItems((current) => current.some((entry) => entry.slug === item.slug) ? current.filter((entry) => entry.slug !== item.slug) : current.length < 10 ? [...current, item] : current);
  const message = `${es ? "Hola, me gustaría cotizar estas piezas:" : "Hello, I would like a quote for these pieces:"}\n${items.map((item) => `${item.name}\nhttps://www.mashoficial.com/${locale}/productos/${item.slug}`).join("\n\n")}`;
  return <Selection.Provider value={{ items, toggle }}>{children}
    {items.length > 0 && <button className="quote-selection-trigger" onClick={() => dialog.current?.showModal()}>{es ? "Mi cotización" : "My quote"} · {items.length}</button>}
    <dialog ref={dialog} className="quote-selection-dialog" aria-label={es ? "Tu selección para cotizar" : "Your quote selection"}>
      <button className="button button--dark" onClick={() => dialog.current?.close()}>{es ? "Cerrar" : "Close"}</button>
      <h2>{es ? "Las piezas para tu espacio" : "Pieces for your space"}</h2>
      <p>{es ? "Hasta 10 productos. Confirmaremos disponibilidad y precios por WhatsApp." : "Up to 10 products. Availability and prices are confirmed via WhatsApp."}</p>
      <ul>{items.map((item) => <li key={item.slug}><span>{item.name}</span><button onClick={() => toggle(item)} aria-label={`${es ? "Quitar" : "Remove"} ${item.name}`}>×</button></li>)}</ul>
      {items.length ? <QuoteLink className="button button--gold" message={message}>{es ? "Enviar por WhatsApp" : "Send via WhatsApp"}</QuoteLink> : <p>{es ? "Tu selección está vacía." : "Your selection is empty."}</p>}
    </dialog>
  </Selection.Provider>;
}
export function AddToQuote({ slug, name, locale }: Item & { locale: string }) {
  const selection = useContext(Selection);
  if (!selection) return null;
  const selected = selection.items.some((item) => item.slug === slug);
  return <button className="quote-selection-add" aria-pressed={selected} disabled={!selected && selection.items.length >= 10} onClick={() => selection.toggle({ slug, name })}>{locale === "es" ? (selected ? "✓ En tu cotización" : selection.items.length >= 10 ? "Máximo 10 piezas" : "+ Agregar a cotización") : (selected ? "✓ Added to quote" : selection.items.length >= 10 ? "Maximum 10 pieces" : "+ Add to quote")}</button>;
}

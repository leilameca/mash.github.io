"use client";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteProduct, duplicateProduct, updateProductStatus, type ActionState } from "../actions";
import { StatusForm } from "../StatusForm";

type Product = { id: string; slug: string; name: string; collection: string; status: string; image?: string };
const labels: Record<string, string> = { published: "Publicado", draft: "Borrador", hidden: "Oculto", archived: "Papelera" };
function ProductActions({ product }: { product: Product }) {
  const [state, action, pending] = useActionState(async (previous: ActionState, data: FormData) => {
    const intent = data.get("intent");
    if (intent === "duplicate") return duplicateProduct(previous, data);
    if (intent === "trash") return deleteProduct(previous, data);
    data.set("status", "draft");
    return updateProductStatus(previous, data);
  }, {});
  return <form action={action} className="studio-product-actions" onSubmit={(event) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    if (submitter?.value === "trash" && !window.confirm(`¿Mover «${product.name}» a la papelera? Podrás restaurarlo con sus imágenes.`)) event.preventDefault();
  }}>
    <input type="hidden" name="id" value={product.id} />
    <Link className="studio-edit-link" href={`/studio-mash/productos/${product.id}`}>Editar</Link>
    {product.status === "published" && <Link className="studio-edit-link" href={`/es/productos/${product.slug}`} target="_blank" rel="noopener noreferrer">Ver en sitio ↗</Link>}
    {product.status === "archived" ? <button name="intent" value="restore" disabled={pending}>Restaurar borrador</button> : <>
      <button name="intent" value="duplicate" disabled={pending}>Duplicar</button>
      <button name="intent" value="trash" disabled={pending}>A la papelera</button>
    </>}
    <span role="status" className={state.ok ? "admin-success" : "admin-error"}>{pending ? "Procesando…" : state.message}</span>
  </form>;
}
export function ProductList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] = useState("");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = products.filter((product) => (status === "all" ? product.status !== "archived" : product.status === status) && (!collection || product.collection === collection) && normalize(`${product.name} ${product.slug} ${product.collection}`).includes(normalize(query.trim())));
  return <section className="studio-table-card">
    <div className="studio-catalog-filters">
      <label>Buscar producto<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, colección o slug" /></label>
      <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los activos</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label} ({products.filter((p) => p.status === key).length})</option>)}</select></label>
      <label>Colección<select value={collection} onChange={(event) => setCollection(event.target.value)}><option value="">Todas las colecciones</option>{[...new Set(products.map((p) => p.collection))].sort().map((name) => <option key={name}>{name}</option>)}</select></label>
    </div>
    <p role="status" className="studio-result-count">{filtered.length} {filtered.length === 1 ? "producto" : "productos"}{status === "archived" ? " en la papelera · Restaurar no publica el producto." : " · Ordenados por última actualización"}</p>
    <div className="studio-table">{filtered.map((product) => <article key={product.id} className="studio-product-row">
      <div className="studio-row__image">{product.image && <Image src={product.image} alt={product.name} fill sizes="80px" />}</div>
      <div className="studio-product-info"><h2>{product.name}</h2><p>{product.collection}</p><span className={`studio-status studio-status--${product.status}`}>{labels[product.status]}</span></div>
      {product.status !== "archived" && <StatusForm id={product.id} status={product.status} label={`Estado de ${product.name}`} action={updateProductStatus} />}
      <ProductActions product={product} />
    </article>)}</div>
    {!filtered.length && <div className="studio-empty"><h2>{status === "archived" ? "Tu papelera está vacía" : "No encontramos productos"}</h2><p>Prueba otro nombre o cambia los filtros.</p><button className="studio-edit-link" onClick={() => { setQuery(""); setStatus("all"); setCollection(""); }}>Limpiar filtros</button></div>}
  </section>;
}

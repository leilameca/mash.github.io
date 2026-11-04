"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Upload = { id: string; file: File; progress: number; status: "pending" | "uploading" | "done" | "error"; message?: string };
async function optimize(file: File) {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) throw new Error("Usa JPG, PNG, WebP o AVIF.");
  if (file.size > 30 * 1024 * 1024) throw new Error("El original supera 30 MB. Reduce su tamaño antes de subirlo.");
  const bitmap = await createImageBitmap(file);
  try {
    const warning = Math.min(bitmap.width, bitmap.height) < 700 ? "Resolución baja: recomendamos al menos 700 px por lado." : "";
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No pudimos procesar la imagen.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .86));
    const optimized = blob && (scale < 1 || blob.size < file.size) ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file;
    if (optimized.size > 3.8 * 1024 * 1024) throw new Error("La imagen sigue siendo demasiado pesada. Reduce su tamaño.");
    return { file: optimized, warning };
  } finally { bitmap.close(); }
}

export function ImageManager({ onAdd, onBusy, disabled }: { onAdd: (url: string) => void; onBusy: (busy: boolean) => void; disabled: boolean }) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState("products");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<Array<{ name: string; url: string }>>([]);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const running = useRef(false);
  const requests = useRef(new Set<XMLHttpRequest>());
  const mounted = useRef(true);
  const callbacks = useRef({ onAdd, onBusy });
  callbacks.current = { onAdd, onBusy };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; requests.current.forEach((xhr) => xhr.abort()); }; }, []);
  const patch = (id: string, value: Partial<Upload>) => { if (mounted.current) setUploads((rows) => rows.map((row) => row.id === id ? { ...row, ...value } : row)); };
  async function run(rows: Upload[]) {
    if (running.current) return;
    running.current = true; callbacks.current.onBusy(true);
    for (const row of rows) {
      if (!mounted.current) break;
      patch(row.id, { status: "uploading", progress: 0, message: "Optimizando…" });
      try {
        const result = await optimize(row.file);
        if (!mounted.current) break;
        patch(row.id, { message: result.warning || "Subiendo…" });
        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest(); requests.current.add(xhr);
          xhr.open("POST", "/api/studio-media"); xhr.timeout = 120000;
          xhr.upload.onprogress = (event) => { if (event.lengthComputable) patch(row.id, { progress: Math.round(event.loaded / event.total * 100) }); };
          xhr.onload = () => { requests.current.delete(xhr); try { const data = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url); else reject(new Error(data.error || "No pudimos subir la imagen.")); } catch { reject(new Error("Respuesta no válida. Intenta de nuevo.")); } };
          xhr.onerror = xhr.ontimeout = xhr.onabort = () => { requests.current.delete(xhr); reject(new Error("La carga se interrumpió. Puedes reintentar.")); };
          const data = new FormData(); data.set("image", result.file); xhr.send(data);
        });
        if (!mounted.current) break;
        callbacks.current.onAdd(url);
        patch(row.id, { status: "done", progress: 100, message: result.warning || "Lista para guardar en el producto" });
      } catch (reason) { patch(row.id, { status: "error", message: reason instanceof Error ? reason.message : "No pudimos subir la imagen." }); }
    }
    running.current = false;
    if (mounted.current) callbacks.current.onBusy(false);
  }
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setItems([]);
    fetch(`/api/studio-media?folder=${folder}&page=${page}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setItems(data.items); setMore(data.more);
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message || "No pudimos cargar la biblioteca."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, folder, page]);
  return <div className="studio-image-manager">
    <label>Agregar fotografías<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={disabled || running.current} onChange={(event) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (files.length > 20) { setError("Selecciona hasta 20 imágenes a la vez."); return; }
      const rows = files.map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: "pending" as const }));
      setUploads((current) => [...current, ...rows]); void run(rows);
    }} /></label>
    <small>Optimizamos las fotos hasta 2000 px, sin ampliarlas. Las cargas quedan disponibles en Multimedia; guarda el producto para publicar su galería.</small>
    <ul className="studio-upload-list">{uploads.map((row) => <li key={row.id}><span>{row.file.name}</span><progress max={100} value={row.progress} aria-label={`Carga de ${row.file.name}`} /><small role="status">{row.status === "uploading" && row.progress === 100 ? "Confirmando carga…" : row.message}</small>{row.status === "error" && <button type="button" className="studio-edit-link" disabled={disabled || running.current} onClick={() => void run([row])}>Reintentar</button>}</li>)}</ul>
    <button type="button" className="studio-edit-link" disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Cerrar biblioteca" : "Elegir de Multimedia"}</button>
    {error && <p role="alert" className="admin-error">{error}</p>}
    {open && <div className="studio-library"><label>Carpeta<select value={folder} onChange={(event) => { setFolder(event.target.value); setPage(0); }}><option value="products">Productos</option><option value="collections">Colecciones</option><option value="projects">Proyectos</option><option value="site">Sitio</option></select></label>
      {loading ? <p role="status">Cargando imágenes…</p> : <div className="studio-media-grid">{items.map((item) => <button type="button" key={item.url} className="studio-library-image" disabled={disabled} onClick={() => callbacks.current.onAdd(item.url)}><span><Image src={item.url} alt={item.name} fill sizes="150px" /></span><small>{item.name}</small></button>)}</div>}
      {!loading && !items.length && <p>No hay imágenes en esta página.</p>}
      <div className="studio-inline-actions"><button type="button" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1}</span><button type="button" disabled={!more || loading} onClick={() => setPage(page + 1)}>Siguiente</button></div>
    </div>}
  </div>;
}

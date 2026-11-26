"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";
import { AnnouncementBanner } from "@/components/editorial/Announcements";
import {
  announcementData,
  categories,
  fromSantoDomingo,
  inSantoDomingo,
  newsData,
  pageTargets,
  slugify,
  targetLabels,
  type Announcement,
  type EditorialCopy,
  type EditorialKind,
  type NewsData,
} from "@/lib/editorial/schema";
import type { EntryCopy } from "@/lib/editorial/queries";
import { PageHeader } from "../StudioPrimitives";
import { MediaImage } from "../multimedia/MediaImage";
import { AssetField, RelatedChoices, type RelatedOption } from "./AssetFields";
import { confirmEditorialTrash } from "./EditorialTrash";
import "./studio-editorial.css";

const emptyArticle: NewsData = {
  category: "news",
  date: "",
  author: "",
  featured: false,
  cover: "",
  gallery: [],
  blocks: [],
  products: [],
  projects: [],
  archived: false,
};
const emptyAnnouncement: Announcement = {
  active: false,
  start: "",
  end: "",
  href: "",
  priority: 0,
  pages: ["all"],
  language: "es",
  presentation: "bar",
  dismissible: true,
  archived: false,
};
const blockLabels = {
  paragraph: "Párrafo",
  heading: "Subtítulo",
  quote: "Cita",
};
type Entry = EntryCopy & { value: Record<string, unknown> };

export function EditorialEditor({
  kind,
  entry,
  options,
}: {
  kind: EditorialKind;
  entry?: Entry;
  options: RelatedOption[];
}) {
  const article = kind === "news",
    root = "/studio-mash/" + (article ? "noticias" : "anuncios");
  const parsedNews = newsData.safeParse(entry?.value);
  const parsedAnnouncement = announcementData.safeParse(entry?.value);
  const [news, setNews] = useState(
    parsedNews.success ? parsedNews.data : emptyArticle,
  );
  const [announcement, setAnnouncement] = useState(
    parsedAnnouncement.success ? parsedAnnouncement.data : emptyAnnouncement,
  );
  const [es, setEs] = useState<EditorialCopy>(entry?.es ?? {});
  const [en, setEn] = useState<EditorialCopy>(entry?.en ?? {});
  const [locale, setLocale] = useState<"es" | "en">("es");
  const [slug, setSlug] = useState(article ? (entry?.key.slice(5) ?? "") : "");
  const [identity, setIdentity] = useState(
    entry ? { id: entry.id, revision: entry.revision, key: entry.key } : null,
  );
  const [status, setStatus] = useState(entry?.status ?? "draft");
  const [start, setStart] = useState(inSantoDomingo(announcement.start));
  const [end, setEnd] = useState(inSantoDomingo(announcement.end));
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const override = useRef(Boolean(entry));
  const version = JSON.stringify({
    news,
    announcement,
    es,
    en,
    slug,
    start,
    end,
  });
  const [saved, setSaved] = useState(version);
  const dirty = version !== saved;

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as HTMLElement)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !link ||
        link.target === "_blank" ||
        link.getAttribute("href")?.startsWith("#") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Salir de la ficha?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", handler);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", handler);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  const editing = locale === "es" ? es : en;
  function update(key: string, value: string) {
    if (locale === "es") {
      setEs((previous) => ({ ...previous, [key]: value }));
      if (key === "title" && article && !override.current)
        setSlug(slugify(value));
    } else setEn((previous) => ({ ...previous, [key]: value }));
  }
  function control(
    label: string,
    key: string,
    options: { rows?: number; max?: number; required?: boolean } = {},
  ) {
    const { rows, max = 200, required } = options;
    return (
      <label>
        {label}
        {rows ? (
          <textarea
            rows={rows}
            maxLength={max}
            required={required}
            value={editing[key] ?? ""}
            onChange={(event) => update(key, event.target.value)}
          />
        ) : (
          <input
            maxLength={max}
            required={required}
            value={editing[key] ?? ""}
            onChange={(event) => update(key, event.target.value)}
          />
        )}
      </label>
    );
  }
  function reorder<T>(array: T[], from: number, to: number) {
    const next = [...array];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploading) return;
    const intent =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ??
      "save";
    if (
      intent === "publish" &&
      !window.confirm("¿Publicar esta versión en el sitio?")
    )
      return;
    await commit(intent);
  }
  async function commit(intent: string) {
    setFeedback(null);
    setBusy(true);
    try {
      const value = intent === "archive" ? undefined : article
        ? { ...news, archived: false }
        : {
            ...announcement,
            start: fromSantoDomingo(start),
            end: fromSantoDomingo(end),
            archived: false,
          };
      const response = await fetch("/api/studio-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          id: identity?.id,
          revision: identity?.revision ?? 0,
          slug: article ? slug : undefined,
          intent,
          ...(intent === "archive" ? {} : { value, es, en }),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setIdentity({
        id: json.id,
        revision: json.revision,
        key: json.key ?? identity?.key,
      });
      setStatus(
        intent === "archive"
          ? "archived"
          : intent === "publish"
            ? "published"
            : status === "published" || status === "pending"
              ? "pending"
              : "draft",
      );
      if (intent !== "archive") setSaved(version);
      override.current = true;
      window.history.replaceState(null, "", root + "/" + json.id);
      setFeedback({
        error: false,
        message:
          intent === "archive"
            ? "Ficha movida a la papelera."
            : intent === "publish"
              ? "Versión publicada."
              : "Borrador guardado.",
      });
    } catch (error) {
      setFeedback({
        error: true,
        message:
          error instanceof Error
            ? error.message
            : "No pudimos confirmar el guardado.",
      });
    } finally {
      setBusy(false);
    }
  }
  const statusLabels = {
    draft: "Borrador",
    pending: "Cambios pendientes",
    published: "Publicado",
    archived: "En papelera",
  };
  return (
    <>
      <PageHeader
        eyebrow={article ? "Noticias" : "Anuncios"}
        title={
          article
            ? entry
              ? "Editar noticia"
              : "Nueva noticia"
            : entry
              ? "Editar anuncio"
              : "Nuevo anuncio"
        }
      >
        <Link className="admin-button admin-button--secondary" href={root}>
          ← Volver al listado
        </Link>
      </PageHeader>
      <form
        className="studio-form editorial-editor"
        data-form-managed
        onSubmit={submit}
      >
        <div className="editorial-editor-bar">
          <div>
            <span className={`studio-status studio-status--${status}`}>
              {statusLabels[status]}
            </span>
            {dirty && <small>Cambios sin guardar</small>}
          </div>
          <div className="editorial-studio-actions">
            <button
              type="submit"
              value="save"
              className="admin-button admin-button--secondary"
              disabled={busy || uploading}
            >
              {status === "archived" ? "Restaurar como borrador" : "Guardar borrador"}
            </button>
            <button
              type="submit"
              value="publish"
              className="admin-button"
              disabled={busy || uploading}
            >
              Publicar
            </button>
          </div>
        </div>
        {feedback && (
          <p
            className={feedback.error ? "admin-error" : "admin-success"}
            role={feedback.error ? "alert" : "status"}
          >
            {feedback.message}
          </p>
        )}
        {uploading && <p role="status">Procesando fotografías…</p>}
        <fieldset className="editorial-editor-fields" disabled={busy}>
          <div className="editorial-editor-main">
            <section className="studio-card editorial-card">
              <div className="editorial-card-head">
                <h2>{article ? "Contenido de la noticia" : "Mensaje"}</h2>
                <div
                  className="editorial-language"
                  role="group"
                  aria-label="Idioma de edición"
                >
                  <button
                    type="button"
                    aria-pressed={locale === "es"}
                    onClick={() => setLocale("es")}
                  >
                    Español
                  </button>
                  <button
                    type="button"
                    aria-pressed={locale === "en"}
                    onClick={() => setLocale("en")}
                  >
                    Inglés
                  </button>
                </div>
              </div>
              {control(article ? "Título" : "Título interno", "title", {
                required: locale === "es",
              })}
              {article ? (
                <>
                  {control("Extracto", "excerpt", { rows: 3, max: 500 })}
                  <div className="editorial-section-stripe">
                    <strong>Cuerpo de la noticia</strong>
                    <div className="editorial-studio-actions">
                      {Object.entries(blockLabels).map(([type, label]) => (
                        <button
                          key={type}
                          type="button"
                          className="studio-text-button"
                          disabled={news.blocks.length >= 30}
                          onClick={() =>
                            setNews((current) => ({
                              ...current,
                              blocks: [
                                ...current.blocks,
                                {
                                  id: crypto.randomUUID(),
                                  type: type as keyof typeof blockLabels,
                                },
                              ],
                            }))
                          }
                        >
                          ＋ {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {news.blocks.map((block, index) => (
                    <div className="editorial-text-block" key={block.id}>
                      {control(
                        `${index + 1}. ${blockLabels[block.type]}`,
                        "body-" + block.id,
                        { rows: block.type === "heading" ? 2 : 4, max: 10000 },
                      )}
                      <div className="editorial-studio-actions">
                        <button
                          type="button"
                          aria-label={`Subir bloque ${index + 1}`}
                          disabled={index === 0}
                          onClick={() =>
                            setNews({
                              ...news,
                              blocks: reorder(news.blocks, index, index - 1),
                            })
                          }
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Bajar bloque ${index + 1}`}
                          disabled={index === news.blocks.length - 1}
                          onClick={() =>
                            setNews({
                              ...news,
                              blocks: reorder(news.blocks, index, index + 1),
                            })
                          }
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("¿Quitar este bloque de texto?"))
                              setNews({
                                ...news,
                                blocks: news.blocks.filter(
                                  (item) => item.id !== block.id,
                                ),
                              });
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {control("Texto del anuncio", "message", {
                    rows: 3,
                    max: 600,
                  })}
                  {control("Llamada a la acción", "cta", { max: 90 })}
                  <label>
                    Enlace de la acción{" "}
                    <input
                      value={announcement.href}
                      maxLength={300}
                      placeholder="/colecciones"
                      onChange={(event) =>
                        setAnnouncement({
                          ...announcement,
                          href: event.target.value,
                        })
                      }
                    />
                  </label>
                  {editing.message && (
                    <AnnouncementBanner
                      locale={locale}
                      preview
                      entry={{
                        id: identity?.id ?? "",
                        data: announcement,
                        message: editing.message,
                        cta: editing.cta,
                        publishedAt: "",
                      }}
                    />
                  )}
                </>
              )}
            </section>
            {article && (
              <section className="studio-card editorial-card">
                <h2>Fotografías</h2>
                <AssetField
                  label="Portada"
                  path={news.cover}
                  onChange={(cover) =>
                    setNews((current) => ({ ...current, cover }))
                  }
                  onBusy={setUploading}
                />
                {control("Texto alternativo de portada", "cover_alt", {
                  max: 600,
                })}
                {news.gallery.map((photo, index) => (
                  <div key={photo.id} className="editorial-news-photo">
                    <AssetField
                      label={`Fotografía ${index + 1}`}
                      path={photo.path}
                      onChange={(path) =>
                        setNews((old) => ({
                          ...old,
                          gallery: old.gallery
                            .map((item) =>
                              item.id === photo.id
                                ? { id: item.id, path }
                                : item,
                            )
                            .filter((item) => item.path),
                        }))
                      }
                      onBusy={setUploading}
                    />
                    {control("Texto alternativo", "alt-" + photo.id, {
                      max: 600,
                    })}
                    {control("Pie de fotografía", "caption-" + photo.id, {
                      rows: 2,
                      max: 1000,
                    })}
                    <div className="editorial-studio-actions">
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={`Subir foto ${index + 1}`}
                        onClick={() =>
                          setNews({
                            ...news,
                            gallery: reorder(news.gallery, index, index - 1),
                          })
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === news.gallery.length - 1}
                        aria-label={`Bajar foto ${index + 1}`}
                        onClick={() =>
                          setNews({
                            ...news,
                            gallery: reorder(news.gallery, index, index + 1),
                          })
                        }
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
                {news.gallery.length < 12 && (
                  <AssetField
                    label="Nueva foto de galería"
                    path=""
                    onChange={(path) => {
                      if (path)
                        setNews((old) => ({
                          ...old,
                          gallery: [
                            ...old.gallery,
                            { id: crypto.randomUUID(), path },
                          ].slice(0, 12),
                        }));
                    }}
                    onBusy={setUploading}
                  />
                )}
              </section>
            )}
          </div>
          <aside className="editorial-editor-side">
            <section className="studio-card editorial-card">
              <h2>{article ? "Datos editoriales" : "Programación"}</h2>
              {article ? (
                <>
                  <label>
                    Ruta permanente{" "}
                    <input
                      value={slug}
                      readOnly={Boolean(identity)}
                      maxLength={90}
                      onChange={(event) => {
                        override.current = true;
                        setSlug(event.target.value);
                      }}
                    />
                  </label>
                  <label>
                    Categoría{" "}
                    <select
                      value={news.category}
                      onChange={(event) =>
                        setNews({
                          ...news,
                          category: event.target.value as NewsData["category"],
                        })
                      }
                    >
                      {Object.entries(categories).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fecha editorial{" "}
                    <input
                      type="date"
                      value={news.date}
                      onChange={(event) =>
                        setNews({ ...news, date: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Autor público{" "}
                    <input
                      value={news.author}
                      maxLength={100}
                      onChange={(event) =>
                        setNews({ ...news, author: event.target.value })
                      }
                    />
                  </label>
                  <label className="studio-checkbox">
                    <input
                      type="checkbox"
                      checked={news.featured}
                      onChange={(event) =>
                        setNews({ ...news, featured: event.target.checked })
                      }
                    />
                    Noticia destacada
                  </label>
                  <details className="studio-fieldset editorial-fold">
                    <summary>Buscadores</summary>
                    {control("Título SEO", "seo_title", { max: 70 })}
                    {control("Descripción SEO", "seo_description", {
                      rows: 2,
                      max: 180,
                    })}
                  </details>
                </>
              ) : (
                <>
                  <label className="studio-checkbox">
                    <input
                      type="checkbox"
                      checked={announcement.active}
                      onChange={(event) =>
                        setAnnouncement({
                          ...announcement,
                          active: event.target.checked,
                        })
                      }
                    />
                    Activo al publicar
                  </label>
                  <small>Hora de Santo Domingo</small>
                  <label>
                    Inicio{" "}
                    <input
                      type="datetime-local"
                      value={start}
                      onChange={(event) => setStart(event.target.value)}
                    />
                  </label>
                  <label>
                    Fin{" "}
                    <input
                      type="datetime-local"
                      value={end}
                      onChange={(event) => setEnd(event.target.value)}
                    />
                  </label>
                  <label>
                    Prioridad{" "}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={announcement.priority}
                      onChange={(event) =>
                        setAnnouncement({
                          ...announcement,
                          priority: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Idioma público{" "}
                    <select
                      value={announcement.language}
                      onChange={(event) =>
                        setAnnouncement({
                          ...announcement,
                          language: event.target
                            .value as Announcement["language"],
                        })
                      }
                    >
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                      <option value="both">Ambos</option>
                    </select>
                  </label>
                  <label>
                    Formato{" "}
                    <select
                      value={announcement.presentation}
                      onChange={(event) =>
                        setAnnouncement({
                          ...announcement,
                          presentation: event.target
                            .value as Announcement["presentation"],
                        })
                      }
                    >
                      <option value="bar">Barra</option>
                      <option value="banner">Banner</option>
                    </select>
                  </label>
                  <label className="studio-checkbox">
                    <input
                      type="checkbox"
                      checked={announcement.dismissible}
                      onChange={(event) =>
                        setAnnouncement({
                          ...announcement,
                          dismissible: event.target.checked,
                        })
                      }
                    />
                    Permitir cerrar
                  </label>
                  <fieldset className="editorial-page-targets">
                    <legend>Páginas</legend>
                    {pageTargets.map((page) => (
                      <label className="studio-checkbox" key={page}>
                        <input
                          type="checkbox"
                          checked={announcement.pages.includes(page)}
                          onChange={(event) => {
                            const current = announcement.pages.filter(
                              (key) => key !== "all" && key !== page,
                            );
                            const next = event.target.checked
                              ? page === "all"
                                ? ["all" as const]
                                : [...current, page]
                              : current;
                            setAnnouncement({
                              ...announcement,
                              pages: next.length ? next : ["all"],
                            });
                          }}
                        />
                        {targetLabels[page]}
                      </label>
                    ))}
                  </fieldset>
                </>
              )}
            </section>
            {article && (
              <section className="studio-card editorial-card">
                <h2>Relaciones</h2>
                <RelatedChoices
                  label="Productos relacionados"
                  options={options.filter((item) => item.kind === "product")}
                  values={news.products}
                  onChange={(products) => setNews({ ...news, products })}
                />
                <RelatedChoices
                  label="Proyectos relacionados"
                  options={options.filter((item) => item.kind === "project")}
                  values={news.projects}
                  onChange={(projects) => setNews({ ...news, projects })}
                />
              </section>
            )}
            {identity && (
              <section className="studio-card editorial-card">
                <h2>Revisión v{identity.revision}</h2>
                {article &&
                  (status === "published" || status === "pending") && (
                    <Link
                      href={"/es/noticias/" + slug}
                      target="_blank"
                      rel="noopener"
                    >
                      Ver noticia pública ↗
                    </Link>
                  )}
                <Link
                  href={`/studio-mash/traducciones?kind=site&id=${identity.id}`}
                  target="_blank"
                  rel="noopener"
                >
                  Revisar traducciones ↗
                </Link>
                <Link
                  href={`/studio-mash/revisiones?kind=site&id=${identity.id}`}
                >
                  Historial
                </Link>
                {status !== "archived" && (
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={() => {
                      if (confirmEditorialTrash(kind))
                        void commit("archive");
                    }}
                  >
                    Mover a papelera
                  </button>
                )}
              </section>
            )}
          </aside>
        </fieldset>
      </form>
    </>
  );
}

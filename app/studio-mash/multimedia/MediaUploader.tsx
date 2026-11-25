"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { mediaSize, type MediaAsset } from "@/lib/media/types";
import { StudioIcon } from "../StudioIcon";
type Job = {
  id: string;
  file: File;
  progress: number;
  state:
    | "pending"
    | "uploading"
    | "processing"
    | "done"
    | "error"
    | "confirming";
  message?: string;
};
export type MediaUploadHandle = {
  addFiles: (files: FileList | File[]) => void;
};
export const MediaUploader = forwardRef<
  MediaUploadHandle,
  {
    folder?: string;
    onAdd: (url: string, asset?: MediaAsset) => void;
    onBusy?: (busy: boolean) => void;
    disabled?: boolean;
    compact?: boolean;
    maxFiles?: number;
  }
>(function MediaUploader(
  {
    folder = "products",
    onAdd,
    onBusy,
    disabled = false,
    compact = false,
    maxFiles = 20,
  },
  forwardedRef,
) {
  const [selectionError, setSelectionError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const running = useRef(false),
    mounted = useRef(true);
  const requests = useRef(new Set<XMLHttpRequest>());
  const callbacks = useRef({ onAdd, onBusy });
  callbacks.current = { onAdd, onBusy };
  useEffect(() => {
    const activeRequests = requests.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeRequests.forEach((request) => request.abort());
    };
  }, []);
  const patch = (id: string, values: Partial<Job>) => {
    if (mounted.current)
      setJobs((current) =>
        current.map((j) => (j.id === id ? { ...j, ...values } : j)),
      );
  };
  async function verify(job: Job) {
    try {
      const response = await fetch(`/api/studio-media?id=${job.id}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (data.asset?.state === "ready") {
        callbacks.current.onAdd(data.asset.url, data.asset);
        patch(job.id, {
          state: "done",
          progress: 100,
          message: "Lista para guardar en el producto",
        });
      } else
        patch(job.id, {
          state: data.asset?.state === "failed" ? "error" : "confirming",
          message:
            data.asset?.state === "failed"
              ? "Carga incompleta. Reintenta el mismo archivo."
              : "Aún está en proceso. Verifica de nuevo antes de reintentar.",
        });
    } catch {
      patch(job.id, {
        state: "confirming",
        message:
          "No pudimos confirmar su estado. Conservamos el identificador de esta carga.",
      });
    }
  }
  async function run(queue: Job[]) {
    if (running.current || disabled) return;
    running.current = true;
    callbacks.current.onBusy?.(true);
    for (const job of queue) {
      if (!mounted.current) break;
      patch(job.id, {
        state: "uploading",
        progress: 0,
        message: "Subiendo original…",
      });
      try {
        if (!job.file.size || job.file.size > 30 * 1024 * 1024)
          throw Error("El original debe pesar como máximo 30 MB.");
        const data = await new Promise<{
          url?: string;
          asset?: MediaAsset;
          pending?: boolean;
          message?: string;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          requests.current.add(xhr);
          xhr.open("POST", "/api/studio-media");
          xhr.timeout = 180000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              patch(job.id, {
                progress: Math.round((e.loaded / e.total) * 100),
                state: e.loaded === e.total ? "processing" : "uploading",
                message:
                  e.loaded === e.total
                    ? "Generando versiones optimizadas…"
                    : "Subiendo original…",
              });
          };
          xhr.onload = () => {
            requests.current.delete(xhr);
            try {
              const result = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(result);
              else
                reject(
                  Error(
                    result.error ||
                      "No pudimos confirmar la carga. Reintenta el mismo archivo.",
                  ),
                );
            } catch {
              reject(Error("Respuesta no válida. Reintenta esta misma carga."));
            }
          };
          xhr.onerror =
            xhr.ontimeout =
            xhr.onabort =
              () => {
                requests.current.delete(xhr);
                reject(
                  Error(
                    "La conexión se interrumpió. Puedes reintentar esta misma carga sin duplicarla.",
                  ),
                );
              };
          const form = new FormData();
          form.set("image", job.file);
          form.set("upload_id", job.id);
          form.set("folder", folder);
          xhr.send(form);
        });
        if (!mounted.current) break;
        if (data.pending) {
          patch(job.id, {
            state: "confirming",
            message: data.message || "La carga necesita verificación.",
          });
        } else if (data.url) {
          callbacks.current.onAdd(data.url, data.asset);
          patch(job.id, {
            state: "done",
            progress: 100,
            message: "Lista para guardar en el producto",
          });
        } else throw Error("No pudimos confirmar el recurso.");
      } catch (error) {
        patch(job.id, {
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "No pudimos confirmar la carga.",
        });
      }
    }
    running.current = false;
    if (mounted.current) callbacks.current.onBusy?.(false);
  }
  function add(files: FileList | File[] | null) {
    if (!files || running.current || disabled) return;
    if (files.length > maxFiles) {
      setSelectionError(
        `Puedes seleccionar hasta ${maxFiles} fotografías en esta carga.`,
      );
      return;
    }
    setSelectionError("");
    const queue = Array.from(files)
      .slice(0, 20)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        state: "pending" as const,
      }));
    setJobs((current) => [...current, ...queue]);
    void run(queue);
  }
  useImperativeHandle(forwardedRef, () => ({ addFiles: add }));
  return (
    <div
      className={`studio-media-uploader${compact ? " studio-media-uploader--compact" : ""}`}
    >
      <div
        className={`studio-media-drop${drag ? " studio-media-drop--active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          add(event.dataTransfer.files);
        }}
      >
        <StudioIcon name="media" />
        <div>
          <strong>Arrastra fotografías aquí</strong>
          <span>JPG, PNG, WebP o AVIF · originales hasta 30 MB</span>
        </div>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={disabled || running.current}
          onClick={() => input.current?.click()}
        >
          Agregar fotografías
        </button>
        <input
          ref={input}
          type="file"
          multiple={maxFiles > 1}
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-label="Subir fotografías"
          data-studio-upload-input
          hidden
          disabled={disabled}
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {selectionError && (
        <p role="alert" className="admin-error">
          {selectionError}
        </p>
      )}
      {jobs.length > 0 && (
        <ul className="studio-upload-jobs" aria-label="Estado de las cargas">
          {jobs.map((job) => (
            <li key={job.id} data-upload-state={job.state}>
              <div>
                <strong>{job.file.name}</strong>
                <small>{mediaSize(job.file.size)}</small>
              </div>
              <div>
                <span role="status">{job.message || "En espera"}</span>
                {["pending", "uploading", "processing"].includes(job.state) && (
                  <progress
                    max={100}
                    value={job.progress}
                    aria-label={`Carga de ${job.file.name}`}
                  />
                )}
              </div>
              {job.state === "done" ? (
                <span className="studio-upload-done">
                  <StudioIcon name="check" />
                  Lista
                </span>
              ) : job.state === "error" ? (
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  disabled={disabled || running.current}
                  onClick={() => void run([job])}
                >
                  Reintentar
                </button>
              ) : job.state === "confirming" ? (
                <div className="studio-upload-recovery">
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={() => void verify(job)}
                  >
                    Verificar estado
                  </button>
                  <button
                    type="button"
                    className="studio-text-button"
                    disabled={disabled || running.current}
                    onClick={() => void run([job])}
                  >
                    Reintentar la misma carga
                  </button>
                </div>
              ) : (
                <span className="studio-upload-percent">
                  {job.state === "processing"
                    ? "Procesando"
                    : `${job.progress}%`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

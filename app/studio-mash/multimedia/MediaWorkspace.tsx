"use client";
import { useState } from "react";
import { MediaUploader } from "./MediaUploader";
import { MediaBrowser } from "./MediaBrowser";
import { folderLabels } from "@/lib/media/types";
export function MediaWorkspace() {
  const [folder, setFolder] = useState("products"),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  return (
    <>
      <section className="studio-card studio-media-upload-card">
        <div className="studio-section-heading">
          <div>
            <h2>Agregar fotografías</h2>
            <p>Conservamos el original y preparamos versiones para el sitio.</p>
          </div>
          <label>
            Carpeta de destino
            <select
              value={folder}
              disabled={busy}
              onChange={(e) => setFolder(e.target.value)}
            >
              {Object.entries(folderLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <MediaUploader
          folder={folder}
          onBusy={setBusy}
          onAdd={() => setRefresh((n) => n + 1)}
        />
      </section>
      <section className="studio-card studio-media-library-card">
        <MediaBrowser refreshKey={refresh} />
      </section>
    </>
  );
}

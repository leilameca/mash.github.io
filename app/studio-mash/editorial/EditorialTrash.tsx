"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EditorialKind } from "@/lib/editorial/schema";

export function confirmEditorialTrash(kind: EditorialKind) {
  const label = kind === "news" ? "esta noticia" : "este anuncio";
  return window.confirm(
    `¿Mover ${label} a la papelera? Si está publicado, se retirará de la web. Podrás recuperarlo desde Papelera.`,
  );
}

export function EditorialTrash({
  kind,
  id,
  revision,
}: {
  kind: EditorialKind;
  id: string;
  revision: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy || !confirmEditorialTrash(kind)) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/studio-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, revision, intent: "archive" }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "No pudimos mover la ficha a la papelera.");
      }
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No pudimos mover la ficha a la papelera.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="admin-button admin-button--secondary" disabled={busy} onClick={() => void remove()}>
        {busy ? "Moviendo…" : "Eliminar"}
      </button>
      {error && <small role="alert" className="admin-error">{error}</small>}
    </>
  );
}

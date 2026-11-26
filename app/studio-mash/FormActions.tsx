"use client";
import { useEffect } from "react";
import { ConflictHelp, SubmissionIntent } from "./FormSafety";
export function FormActions({
  pending,
  existing,
  message,
  ok,
  redirectTo,
}: {
  pending: boolean;
  existing: boolean;
  message?: string;
  ok?: boolean;
  redirectTo?: string;
}) {
  useEffect(() => {
    if (ok && redirectTo) window.location.assign(redirectTo);
  }, [ok, redirectTo]);
  return (
    <>
      <SubmissionIntent />
      <ConflictHelp message={message} />
      {message && (
        <p
          className={ok ? "admin-success" : "admin-error"}
          role={ok ? "status" : "alert"}
        >
          {message}
        </p>
      )}
      <div
        className="studio-savebar"
        role="group"
        aria-label="Acciones editoriales"
      >
        <span>Guardar conserva la versión pública actual.</span>
        <button
          className="admin-button admin-button--secondary"
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Guardando…"
            : existing
              ? "Guardar cambios"
              : "Guardar borrador"}
        </button>
        <button
          className="admin-button"
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
        >
          Publicar cambios
        </button>
      </div>
    </>
  );
}

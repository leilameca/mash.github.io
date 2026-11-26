"use client";
import { useActionState, useEffect } from "react";
import { restoreRevision } from "../actions";
export function RestoreForm({
  kind,
  id,
  version,
  expectedVersion,
}: {
  kind: string;
  id: string;
  version: number;
  expectedVersion: number;
}) {
  const [state, action, pending] = useActionState(restoreRevision, {});
  useEffect(() => {
    if (state.ok && state.redirectTo) window.location.assign(state.redirectTo);
  }, [state]);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "¿Restaurar esta revisión como nueva copia de trabajo? El sitio público conservará su versión actual.",
          )
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="revision" value={expectedVersion} />
      <button className="admin-button" disabled={pending}>
        Restaurar como borrador
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}

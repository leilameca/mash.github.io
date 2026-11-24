"use client";
import { useActionState, useEffect } from "react";
import { duplicateProject } from "../actions";
import { StudioIcon } from "../StudioIcon";
export function DuplicateProject({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [state, submit, pending] = useActionState(duplicateProject, {});
  useEffect(() => {
    if (state.ok && state.redirectTo) window.location.assign(state.redirectTo);
  }, [state]);
  return (
    <form
      action={submit}
      className="editorial-duplicate"
      onSubmit={(event) => {
        if (!window.confirm("¿Crear una copia como borrador?"))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <button
        type="submit"
        className="admin-button admin-button--secondary"
        disabled={pending}
      >
        <StudioIcon name="plus" />
        Duplicar proyecto
      </button>
      {state.message && !state.ok && <p role="alert">{state.message}</p>}
    </form>
  );
}

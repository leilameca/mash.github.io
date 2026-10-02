"use client";

import { useActionState, useEffect, useState } from "react";
import type { ActionState } from "./actions";

export function StatusForm({ id, status, label, action }: {
  id: string;
  status: string;
  label: string;
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, submit, pending] = useActionState(action, {});
  const [selectedStatus, setSelectedStatus] = useState(status);
  useEffect(() => { setSelectedStatus(status); }, [status]);
  return (
    <form action={submit} className="studio-row__actions">
      <input type="hidden" name="id" value={id} />
      <select name="status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} aria-label={label} disabled={pending}>
        <option value="draft">Borrador</option>
        <option value="published">Publicado</option>
        <option value="hidden">Oculto</option>
        <option value="archived">Archivado</option>
      </select>
      <button type="submit" disabled={pending}>{pending ? "Guardando..." : "Aplicar"}</button>
      {state.message && <p role="status" className={state.ok ? "admin-success" : "admin-error"}>{state.message}</p>}
    </form>
  );
}

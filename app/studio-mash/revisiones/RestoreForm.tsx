"use client";
import { useActionState } from "react";
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
  return (
    <form action={action}>
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

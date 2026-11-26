"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { StudioIcon, type StudioIconName } from "./StudioIcon";
import type { ActionState } from "./actions";

export function StatusForm({
  id,
  status,
  label,
  action,
  revision,
  menu = false,
}: {
  revision?: number;
  menu?: boolean;
  id: string;
  status: string;
  label: string;
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, submit, pending] = useActionState(action, {});
  const menuStatus = useRef<HTMLInputElement>(null);
  const [selectedStatus, setSelectedStatus] = useState(status);
  useEffect(() => {
    setSelectedStatus(status);
  }, [status]);
  const actions: {
    status: string;
    label: string;
    icon: StudioIconName;
    prompt: string;
  }[] = [
    {
      status: "published",
      label: "Publicar versión",
      icon: "check",
      prompt: "¿Publicar esta versión en el sitio?",
    },
    {
      status: "draft",
      label: "Pasar a borrador",
      icon: "content",
      prompt: "¿Pasar este contenido a borrador?",
    },
    {
      status: "hidden",
      label: "Ocultar del sitio",
      icon: "close",
      prompt: "¿Ocultar este contenido del sitio?",
    },
    {
      status: "archived",
      label: "Mover a papelera",
      icon: "alert",
      prompt: "¿Mover este contenido a papelera?",
    },
  ];
  if (menu)
    return (
      <form
        action={submit}
        className="studio-entry-status-actions"
        aria-label={label}
        onSubmit={(event) => {
          const button = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          const choice = actions.find((item) => item.status === button?.value);
          if (!choice || !menuStatus.current || !window.confirm(choice.prompt)) {
            event.preventDefault();
            return;
          }
          menuStatus.current.value = choice.status;
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision ?? 0} />
        <input type="hidden" name="status" ref={menuStatus} />
        {actions.map((item) => (
          <button
            key={item.status}
            type="submit"
            value={item.status}
            disabled={pending}
          >
            <StudioIcon name={item.icon} /> {item.label}
          </button>
        ))}
        {state.message && (
          <p role={state.ok ? "status" : "alert"}>{state.message}</p>
        )}
      </form>
    );
  return (
    <form
      action={submit}
      className="studio-row__actions"
      onSubmit={(event) => {
        if (
          !window.confirm(
            selectedStatus === "published"
              ? "¿Publicar esta versión en el sitio?"
              : "¿Cambiar el estado de este contenido?",
          )
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision ?? 0} />
      <select
        name="status"
        value={selectedStatus}
        onChange={(event) => setSelectedStatus(event.target.value)}
        aria-label={label}
        disabled={pending}
      >
        <option value="draft">Borrador</option>
        <option value="published">Publicado</option>
        <option value="hidden">Oculto</option>
        <option value="archived">Archivado / papelera</option>
      </select>
      <button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Aplicar"}
      </button>
      {state.message && (
        <p role="status" className={state.ok ? "admin-success" : "admin-error"}>
          {state.message}
        </p>
      )}
    </form>
  );
}

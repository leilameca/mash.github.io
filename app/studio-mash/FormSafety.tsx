"use client";
import { useEffect, useRef } from "react";
/** Shared protection for uncontrolled editors. ProductForm has its own dirty state. */
export function FormSafety() {
  useEffect(() => {
    const dirty = new Set<HTMLFormElement>();
    const inFlight = new Set<HTMLFormElement>();
    const change = (event: Event) => {
      const form = (event.target as HTMLElement)?.closest<HTMLFormElement>(
        "form.studio-form",
      );
      if (form && !form.classList.contains("studio-product-editor")) {
        dirty.add(form);
        form.dataset.dirty = "true";
      }
    };
    const leave = (event: BeforeUnloadEvent) => {
      if ([...dirty].some((f) => f.isConnected && !inFlight.has(f))) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      const publish = (event.target as HTMLElement)?.closest<HTMLButtonElement>(
        'button[type="submit"][value="publish"]',
      );
      if (
        publish?.form?.matches("form.studio-form") &&
        !window.confirm("¿Publicar estos cambios en el sitio?")
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const link = (event.target as HTMLElement)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !link ||
        link.target === "_blank" ||
        link.getAttribute("href")?.startsWith("#")
      )
        return;
      if (
        [...dirty].some((f) => f.isConnected) &&
        !window.confirm("Tienes cambios sin guardar. ¿Salir del editor?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const submit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (!form.matches("form.studio-form")) return;
      if (inFlight.has(form)) {
        event.preventDefault();
        return;
      }
      inFlight.add(form);
    };
    const observer = new MutationObserver(() => {
      for (const form of inFlight) {
        if (
          !form.isConnected ||
          form.querySelector('button[type="submit"]:not(:disabled)')
        )
          inFlight.delete(form);
      }

      for (const form of dirty) {
        if (!form.isConnected || form.querySelector(".admin-success")) {
          dirty.delete(form);
          delete form.dataset.dirty;
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });
    document.addEventListener("change", change);
    document.addEventListener("input", change);
    document.addEventListener("click", navigate, true);
    document.addEventListener("submit", submit, true);
    window.addEventListener("beforeunload", leave);
    return () => {
      observer.disconnect();
      document.removeEventListener("change", change);
      document.removeEventListener("input", change);
      document.removeEventListener("click", navigate, true);
      document.removeEventListener("submit", submit, true);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  return null;
}
export function ConflictHelp({ message }: { message?: string }) {
  if (
    !message ||
    !/versi|conflict|otra persona|pestaña|otro administrador|actualizado/i.test(
      message,
    )
  )
    return null;
  return (
    <aside className="studio-notice">
      <strong>Tus campos se conservan en este editor.</strong>
      <p>
        Abre la versión más reciente en otra pestaña y compara sus cambios con
        el historial antes de volver a guardar.
      </p>
      <a href="" target="_blank" rel="noopener noreferrer">
        Abrir versión más reciente ↗
      </a>
    </aside>
  );
}

/** An owned field survives the pending transition that disables the submitter. */
export function SubmissionIntent() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = ref.current,
      form = input?.form;
    if (!input || !form) return;
    const set = (event: SubmitEvent) => {
      input.value =
        (event.submitter as HTMLButtonElement | null)?.value === "publish"
          ? "publish"
          : "save";
    };
    form.addEventListener("submit", set, true);
    return () => form.removeEventListener("submit", set, true);
  }, []);
  return <input ref={ref} type="hidden" name="intent" defaultValue="save" />;
}

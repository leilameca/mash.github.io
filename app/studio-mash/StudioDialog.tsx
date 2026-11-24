"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { StudioIcon } from "./StudioIcon";
export function StudioDialog({
  open,
  title,
  onClose,
  children,
  wide = false,
  className = "",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    const node = ref.current;
    if (open && !node?.open) node?.showModal();
    if (!open && node?.open) node.close();
  }, [open, mounted]);
  if (!mounted || !open) return null;
  return createPortal(
    <dialog
      ref={ref}
      className={`studio-dialog${wide ? " studio-dialog--wide" : ""} ${className}`}
      aria-labelledby={heading}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        ref.current?.close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            ref.current?.close();
        }
      }}
    >
      <header className="studio-dialog-heading">
        <h2 id={heading}>{title}</h2>
        <button
          type="button"
          className="studio-icon-button"
          aria-label="Cerrar"
          onClick={() => ref.current?.close()}
        >
          <StudioIcon name="close" />
        </button>
      </header>
      <div className="studio-dialog-content">{children}</div>
    </dialog>,
    document.getElementById("mash-studio-root") ?? document.body,
  );
}

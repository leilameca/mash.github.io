"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { StudioNav } from "./StudioNav";
import { StudioIcon } from "./StudioIcon";
import type { StudioNavItem } from "@/lib/admin/navigation";
export function StudioSidebar({
  items,
  children,
}: {
  items: StudioNavItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  const path = usePathname();
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("mash-studio-sidebar") === "collapsed");
    } catch {}
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const content = document.querySelector<HTMLElement>(".studio-main");
    if (content) content.inert = true;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("button,a")?.focus();
    return () => {
      if (content) content.inert = false;
      document.body.style.overflow = old;
    };
  }, [open]);
  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };
  return (
    <aside
      className={`studio-sidebar${open ? " studio-sidebar--open" : ""}${collapsed ? " studio-sidebar--collapsed" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          close();
        }
        if (e.key === "Tab" && open) {
          const nodes = [
            ...(panel.current?.querySelectorAll<HTMLElement>(
              "a[href],button:not([disabled])",
            ) ?? []),
          ];
          if (!nodes.length) return;
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div className="studio-sidebar__header">
        <Link
          href="/studio-mash"
          className="studio-logo"
          aria-label="MASH Studio, inicio"
        >
          <span className="studio-brand-mark">M</span>
          <span className="studio-brand-name">
            MASH<small>STUDIO</small>
          </span>
        </Link>
        <button
          className="studio-collapse-toggle studio-icon-button"
          type="button"
          aria-label={
            collapsed ? "Expandir barra lateral" : "Contraer barra lateral"
          }
          onClick={() => {
            setCollapsed(!collapsed);
            try {
              localStorage.setItem(
                "mash-studio-sidebar",
                !collapsed ? "collapsed" : "expanded",
              );
            } catch {}
          }}
        >
          <StudioIcon name="chevron" />
        </button>
        <button
          ref={toggle}
          className="studio-menu-toggle studio-icon-button"
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <span>{open ? "Cerrar menú" : "Menú"}</span>
          <StudioIcon name={open ? "close" : "overview"} />
        </button>
      </div>
      {open && (
        <button
          type="button"
          className="studio-drawer-backdrop"
          aria-label="Cerrar navegación"
          tabIndex={-1}
          onClick={close}
        />
      )}
      <div
        ref={panel}
        id={panelId}
        className="studio-sidebar__panel"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? "Navegación de Studio" : undefined}
      >
        <button
          type="button"
          className="studio-drawer-close studio-icon-button"
          onClick={close}
        >
          Cerrar <StudioIcon name="close" />
        </button>
        <StudioNav items={items} />
        <div className="studio-sidebar__footer">
          <span className="studio-workspace-dot" />
          <span className="studio-nav-label">MASH · Espacio de trabajo</span>
          {children}
        </div>
      </div>
    </aside>
  );
}

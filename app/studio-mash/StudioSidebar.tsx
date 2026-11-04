"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { StudioNav } from "./StudioNav";

export function StudioSidebar({ items, children }: { items: Array<{ href: string; label: string }>; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const active = items.find((item) => item.href === "/studio-mash" ? pathname === item.href : pathname.startsWith(item.href));

  useEffect(() => { setOpen(false); }, [pathname]);

  return <aside className={`studio-sidebar${open ? " studio-sidebar--open" : ""}`} onKeyDown={(event) => {
    if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); }
  }}>
    <div className="studio-sidebar__header">
      <Link href="/studio-mash" className="studio-logo" aria-label="MASH admin"><span>MASH</span><small>Admin privado</small></Link>
      <button ref={toggle} type="button" className="studio-menu-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <span>{open ? "Cerrar menú" : "Menú"}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d={open ? "m6 6 12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"} /></svg>
      </button>
    </div>
    <div className="studio-mobile-location" aria-hidden="true">{active?.label ?? "Administración"}</div>
    <div id={panelId} className="studio-sidebar__panel" onClick={(event) => {
      const link = (event.target as Element).closest("a");
      if (link && !event.defaultPrevented && !event.ctrlKey && !event.metaKey) setOpen(false);
    }}>
      <StudioNav items={items} />
      {children}
    </div>
  </aside>;
}

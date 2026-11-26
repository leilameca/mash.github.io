"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { studioNavigation } from "@/lib/admin/navigation";
import { ThemeToggle } from "./StudioTheme";
import { StudioIcon } from "./StudioIcon";
import type { ReactNode } from "react";
export function StudioHeader({
  email,
  logout,
}: {
  email: string;
  logout: ReactNode;
}) {
  const path = usePathname();
  const item = studioNavigation.find(
    (i) => i.href !== "/studio-mash" && path.startsWith(i.href),
  );
  const detail = item && path.slice(item.href.length + 1);
  const label = !item ? "Inicio" : item.label;
  return (
    <header className="studio-topbar">
      <nav aria-label="Ruta de navegación" className="studio-breadcrumb">
        <Link href="/studio-mash">Studio</Link>
        <span aria-hidden="true">/</span>
        {detail ? (
          <>
            <Link href={item!.href}>{label}</Link>
            <span>/</span>
            <span>
              {detail === "nuevo" || detail === "nueva" ? "Nuevo" : "Editar"}
            </span>
          </>
        ) : (
          <span aria-current="page">{label}</span>
        )}
      </nav>
      <div className="studio-topbar__actions">
        <Link
          href="/es"
          target="_blank"
          rel="noopener noreferrer"
          className="studio-public-link"
        >
          Ver sitio <StudioIcon name="external" />
        </Link>
        <ThemeToggle />
        <details
          className="studio-account"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.open = false;
              e.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label="Menú de cuenta" title={email}>
            <span className="studio-avatar">
              {email.slice(0, 2).toUpperCase()}
            </span>
          </summary>
          <div className="studio-account-menu">
            <small>Sesión administrativa</small>
            <strong>{email}</strong>
            <Link href="/studio-mash/configuracion#cuenta">
              Cuenta y seguridad
            </Link>
            {logout}
          </div>
        </details>
      </div>
    </header>
  );
}

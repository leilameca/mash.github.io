import Link from "next/link";
import { logoutAdmin } from "./actions";
import type { AdminProfile } from "@/lib/supabase/auth";

const nav = [
  { href: "/studio-mash", label: "Resumen" },
  { href: "/studio-mash/productos", label: "Productos" },
  { href: "/studio-mash/colecciones", label: "Colecciones" },
  { href: "/studio-mash/proyectos", label: "Proyectos" },
  { href: "/studio-mash/multimedia", label: "Multimedia" }
];

export function StudioShell({ children, admin }: { children: React.ReactNode; admin: AdminProfile }) {
  return (
    <main className="studio">
      <aside className="studio-sidebar">
        <Link href="/studio-mash" className="studio-logo" aria-label="MASH admin">
          <span>MASH</span>
          <small>Admin privado</small>
        </Link>
        <nav className="studio-nav" aria-label="Administracion">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAdmin}>
          <button className="studio-logout" type="submit">
            Cerrar sesion
          </button>
        </form>
      </aside>
      <section className="studio-main">
        <header className="studio-topbar">
          <div>
            <p>Sesion activa</p>
            <strong>{admin.email}</strong>
          </div>
          <Link href="/es" className="studio-public-link">
            Ver sitio
          </Link>
        </header>
        {children}
      </section>
    </main>
  );
}

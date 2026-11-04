import Link from "next/link";
import { StudioSidebar } from "./StudioSidebar";
import { StudioIcon } from "./StudioIcon";
import { logoutAdmin } from "./actions";
import type { AdminProfile } from "@/lib/supabase/auth";

const nav = [
  { href: "/studio-mash", label: "Resumen" },
  { href: "/studio-mash/productos", label: "Productos" },
  { href: "/studio-mash/colecciones", label: "Colecciones" },
  { href: "/studio-mash/contenido", label: "Contenido" },
  { href: "/studio-mash/proyectos", label: "Proyectos" },
  { href: "/studio-mash/multimedia", label: "Multimedia" }
];

export function StudioShell({ children, admin }: { children: React.ReactNode; admin: AdminProfile }) {
  return (
    <main className="studio">
      <StudioSidebar items={nav}>
        <form action={logoutAdmin}>
          <button className="studio-logout" type="submit">
            <StudioIcon name="logout" /> Cerrar sesión
          </button>
        </form>
      </StudioSidebar>
      <section className="studio-main">
        <header className="studio-topbar">
          <div>
            <p>Sesion activa</p>
            <strong>{admin.email}</strong>
          </div>
          <Link href="/es" className="studio-public-link">
            Ver sitio <StudioIcon name="external" />
          </Link>
        </header>
        {children}
      </section>
    </main>
  );
}

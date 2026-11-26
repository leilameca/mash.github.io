import { FormSafety } from "./FormSafety";
import { StudioSidebar } from "./StudioSidebar";
import { StudioHeader } from "./StudioHeader";
import { StudioIcon } from "./StudioIcon";
import { studioNavigation } from "@/lib/admin/navigation";
import { logoutAdmin } from "./actions";
import type { AdminProfile } from "@/lib/supabase/auth";
export function StudioShell({
  children,
  admin,
}: {
  children: React.ReactNode;
  admin: AdminProfile;
}) {
  const logout = (
    <form action={logoutAdmin}>
      <button className="studio-logout" type="submit">
        <StudioIcon name="logout" />
        Cerrar sesión
      </button>
    </form>
  );
  return (
    <div className="studio">
      <FormSafety />
      <a className="studio-skip" href="#studio-content">
        Saltar al contenido
      </a>
      <StudioSidebar items={studioNavigation}>{logout}</StudioSidebar>
      <div className="studio-main">
        <StudioHeader email={admin.email} logout={logout} />
        <main id="studio-content" className="studio-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="studio-footnote">
          MASH Studio <span>Gestión de catálogo y contenido</span>
        </footer>
      </div>
    </div>
  );
}

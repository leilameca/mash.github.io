import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";

const folders = ["products/", "collections/", "projects/", "site/"];

export default async function StudioMediaPage() {
  const currentAdmin = await requireAdmin();

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Storage</p>
          <h1>Multimedia</h1>
        </div>
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Bucket</p>
        <h2>mash-media</h2>
        <p>
          Las politicas permiten lectura publica de imagenes y escritura solo para administradores autenticados. Usa estas
          carpetas para mantener rutas limpias y faciles de migrar.
        </p>
        <div className="studio-folder-grid">
          {folders.map((folder) => (
            <code key={folder}>{folder}</code>
          ))}
        </div>
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Pendiente operativo</p>
        <h2>Subida directa desde el panel</h2>
        <p>
          La migracion de Storage y las politicas RLS ya estan definidas. La subida visual se deja para el siguiente paso
          cuando existan credenciales reales para probar tamano, tipo de archivo y rutas finales.
        </p>
      </section>
    </StudioShell>
  );
}

import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { PageHeader, EmptyState } from "../StudioPrimitives";
export default async function Page() {
  const admin = await requireAdmin();
  return (
    <StudioShell admin={admin}>
      <PageHeader title="Analítica" eyebrow="Pendiente" />
      <section className="studio-card">
        <EmptyState
          title="Disponible en una próxima fase"
          description="La conexión con una plataforma de analítica está pendiente. No se muestran visitas ni métricas estimadas."
        />
      </section>
    </StudioShell>
  );
}

import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { PageHeader, EmptyState } from "../StudioPrimitives";
export default async function Page() {
  const admin = await requireAdmin();
  return (
    <StudioShell admin={admin}>
      <PageHeader title="Noticias" eyebrow="Pendiente" />
      <section className="studio-card">
        <EmptyState
          title="Disponible en una próxima fase"
          description="El módulo de noticias está pendiente. La publicación editorial se incorporará en una fase posterior."
        />
      </section>
    </StudioShell>
  );
}

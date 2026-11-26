import { relatedOptions } from "@/lib/editorial/queries";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../../StudioShell";
import { ProjectForm } from "../ProjectForm";

export default async function NewProjectPage() {
  const currentAdmin = await requireAdmin();
  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Contenido</p>
          <h1>Nuevo proyecto</h1>
        </div>
      </section>
      <section className="studio-card">
        <ProjectForm options={await relatedOptions()} />
      </section>
    </StudioShell>
  );
}

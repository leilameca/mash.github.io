import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../../StudioShell";
import { CollectionForm } from "../CollectionForm";

export default async function NewCollectionPage() {
  const currentAdmin = await requireAdmin();

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Nueva coleccion</h1>
        </div>
      </section>
      <section className="studio-card">
        <CollectionForm />
      </section>
    </StudioShell>
  );
}

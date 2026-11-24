import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import { entryHref, kindLabels } from "@/lib/admin/presentation";
import { StudioShell } from "../StudioShell";
import { PageHeader, EmptyState } from "../StudioPrimitives";
export default async function Page() {
  const admin = await requireAdmin();
  const client = await authenticatedContentClient();
  const { data, error } = await client
    .from("studio_entries")
    .select("*")
    .eq("translation_pending", true)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("No pudimos consultar las traducciones.");
  return (
    <StudioShell admin={admin}>
      <PageHeader
        title="Traducciones"
        eyebrow="Herramientas"
        description="Revisión manual de contenido con inglés pendiente. La traducción por API está pendiente de implementación."
      />
      <section className="studio-card">
        {data?.length ? (
          data.map((entry) => (
            <article className="studio-activity" key={entry.id}>
              <div>
                <strong>{entry.name}</strong>
                <small>
                  {kindLabels[entry.kind as keyof typeof kindLabels]} · Inglés
                  pendiente
                </small>
              </div>
              <Link href={entryHref(entry)}>Editar traducción →</Link>
            </article>
          ))
        ) : (
          <EmptyState
            title="Sin traducciones pendientes"
            description="No hay contenido marcado con inglés pendiente."
          />
        )}
      </section>
    </StudioShell>
  );
}

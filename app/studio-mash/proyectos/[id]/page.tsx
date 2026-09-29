import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../../StudioShell";
import { ProjectForm } from "../ProjectForm";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const currentAdmin = await requireAdmin();
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id,slug,status,featured,sort_order,location,cover_image_path,project_translations(locale,title,description)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  const translations = (project as any).project_translations ?? [];
  const es = translations.find((item: any) => item.locale === "es");
  const en = translations.find((item: any) => item.locale === "en");

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading"><div><p>Contenido</p><h1>Editar proyecto</h1></div></section>
      <section className="studio-card">
        <ProjectForm project={{
          id: (project as any).id,
          slug: (project as any).slug,
          status: (project as any).status,
          featured: (project as any).featured,
          sort_order: (project as any).sort_order,
          location: (project as any).location,
          cover_image_path: (project as any).cover_image_path,
          title_es: es?.title,
          description_es: es?.description,
          title_en: en?.title,
          description_en: en?.description
        }} />
      </section>
    </StudioShell>
  );
}

import { PublicationNotice } from "../../PublicationNotice";
import { notFound } from "next/navigation";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../../StudioShell";
import { ProjectForm } from "../ProjectForm";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentAdmin = await requireAdmin();
  const { id } = await params;
  const admin = await authenticatedContentClient();
  const { data: project, error } = await admin
    .from("projects")
    .select(
      "id,revision,slug,status,featured,sort_order,location,cover_image_path,project_translations(locale,title,description,seo_title,seo_description),project_images(storage_path,is_cover,alt_es)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error("No pudimos consultar el contenido. Intenta de nuevo.");
  if (!project) notFound();
  const translations = (project as any).project_translations ?? [];
  const es = translations.find((item: any) => item.locale === "es");
  const en = translations.find((item: any) => item.locale === "en");

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Contenido</p>
          <h1>Editar proyecto</h1>
        </div>
      </section>
      <PublicationNotice kind="project" id={id} />
      <section className="studio-card">
        <ProjectForm
          project={{
            id: (project as any).id,
            revision: (project as any).revision,
            slug: (project as any).slug,
            status: (project as any).status,
            featured: (project as any).featured,
            sort_order: (project as any).sort_order,
            location: (project as any).location,
            cover_image_path: (project as any).cover_image_path,
            title_es: es?.title,
            description_es: es?.description,
            seo_title_es: es?.seo_title,
            seo_description_es: es?.seo_description,
            cover_alt_es:
              project.project_images.find(
                (image) => image.storage_path === project.cover_image_path,
              )?.alt_es ??
              project.project_images.find((image) => image.is_cover)?.alt_es,
            title_en: en?.title,
            description_en: en?.description,
          }}
        />
      </section>
    </StudioShell>
  );
}

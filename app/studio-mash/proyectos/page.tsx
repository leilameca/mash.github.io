import Image from "next/image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";

export default async function StudioProjectsPage() {
  const currentAdmin = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select("id,slug,status,location,cover_image_path,project_translations(locale,title,description)")
    .order("updated_at", { ascending: false });

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Contenido</p>
          <h1>Proyectos</h1>
        </div>
      </section>
      <section className="studio-table-card">
        <div className="studio-table">
          {(projects ?? []).map((project: any) => {
            const es = project.project_translations?.find((item: any) => item.locale === "es");
            return (
              <article className="studio-row" key={project.id}>
                <div className="studio-row__image">
                  {project.cover_image_path ? <Image src={project.cover_image_path} alt="" fill sizes="72px" /> : null}
                </div>
                <div>
                  <h2>{es?.title ?? project.slug}</h2>
                  <p>{project.location ?? "Ubicacion pendiente"}</p>
                </div>
                <span className={`studio-status studio-status--${project.status}`}>{project.status}</span>
              </article>
            );
          })}
          {(projects ?? []).length === 0 && (
            <div className="studio-empty">
              <h2>No hay proyectos publicados.</h2>
              <p>La estructura esta lista para contenido real aprobado por MASH.</p>
            </div>
          )}
        </div>
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Regla editorial</p>
        <h2>No inventar instalaciones</h2>
        <p>Los proyectos deben cargarse solo con fotos, ubicaciones y descripciones confirmadas por el negocio.</p>
      </section>
    </StudioShell>
  );
}

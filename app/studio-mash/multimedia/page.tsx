import Image from "next/image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { MEDIA_BUCKET, type MediaFolder } from "@/lib/supabase/media";
import { StudioShell } from "../StudioShell";
import { MediaUploadForm } from "./MediaUploadForm";

const folders: MediaFolder[] = ["products", "collections", "projects", "site"];

export default async function StudioMediaPage() {
  const currentAdmin = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const mediaGroups = await Promise.all(
    folders.map(async (folder) => {
      const { data } = await admin.storage.from(MEDIA_BUCKET).list(folder, {
        limit: 24,
        sortBy: { column: "created_at", order: "desc" }
      });
      return {
        folder,
        items: (data ?? [])
          .filter((item) => item.id)
          .map((item) => ({
            name: item.name,
            url: admin.storage.from(MEDIA_BUCKET).getPublicUrl(`${folder}/${item.name}`).data.publicUrl
          }))
      };
    })
  );

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Storage</p>
          <h1>Multimedia</h1>
        </div>
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Nueva imagen</p>
        <h2>Cargar desde el dispositivo</h2>
        <p>Las imagenes quedan guardadas en el bucket privado de administracion y se sirven publicamente en el sitio.</p>
        <MediaUploadForm />
      </section>
      {mediaGroups.map((group) => (
        <section className="studio-card" key={group.folder}>
          <p className="studio-kicker">{group.folder}/</p>
          <h2>{group.items.length ? "Archivos recientes" : "Carpeta vacia"}</h2>
          {group.items.length > 0 && (
            <div className="studio-media-grid">
              {group.items.map((item) => (
                <figure key={item.url}>
                  <span><Image src={item.url} alt="" fill sizes="180px" /></span>
                  <figcaption title={item.name}>{item.name}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      ))}
    </StudioShell>
  );
}

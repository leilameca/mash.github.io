import Image from "next/image";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";

export default async function StudioCollectionsPage() {
  const currentAdmin = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: collections } = await admin
    .from("collections")
    .select("id,slug,status,featured,sort_order,cover_image_path,collection_translations(locale,name,description)")
    .order("sort_order", { ascending: true });

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Colecciones</h1>
        </div>
        <Link href="/studio-mash/colecciones/nueva" className="admin-button">
          Nueva coleccion
        </Link>
      </section>
      <section className="studio-grid-cards">
        {(collections ?? []).map((collection: any) => {
          const es = collection.collection_translations?.find((item: any) => item.locale === "es");
          return (
            <article className="studio-collection-card" key={collection.id}>
              <div className="studio-collection-card__image">
                {collection.cover_image_path ? <Image src={collection.cover_image_path} alt="" fill sizes="(max-width: 800px) 90vw, 28vw" /> : null}
              </div>
              <div>
                <span className={`studio-status studio-status--${collection.status}`}>{collection.status}</span>
                <h2>{es?.name ?? collection.slug}</h2>
                <p>{es?.description ?? "Descripcion pendiente"}</p>
                <p>Orden {collection.sort_order}</p>
                <Link href={`/studio-mash/colecciones/${collection.id}`} className="studio-edit-link">
                  Editar
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </StudioShell>
  );
}

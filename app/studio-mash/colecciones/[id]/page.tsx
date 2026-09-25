import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../../StudioShell";
import { CollectionForm } from "../CollectionForm";

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const currentAdmin = await requireAdmin();
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data: collection } = await admin
    .from("collections")
    .select("id,slug,status,featured,sort_order,cover_image_path,collection_translations(locale,name,description)")
    .eq("id", id)
    .maybeSingle();

  if (!collection) notFound();
  const translations = (collection as any).collection_translations ?? [];
  const es = translations.find((item: any) => item.locale === "es");
  const en = translations.find((item: any) => item.locale === "en");

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Editar coleccion</h1>
        </div>
      </section>
      <section className="studio-card">
        <CollectionForm
          collection={{
            id: (collection as any).id,
            slug: (collection as any).slug,
            status: (collection as any).status,
            featured: (collection as any).featured,
            sort_order: (collection as any).sort_order,
            cover_image_path: (collection as any).cover_image_path,
            name_es: es?.name,
            description_es: es?.description,
            name_en: en?.name,
            description_en: en?.description
          }}
        />
      </section>
    </StudioShell>
  );
}

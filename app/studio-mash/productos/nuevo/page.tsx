import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../../StudioShell";
import { ProductForm } from "../ProductForm";

async function getCollections() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("collections").select("id,slug,collection_translations(locale,name)").order("sort_order");
  return (data ?? []).map((collection: any) => ({
    id: collection.id,
    label: collection.collection_translations?.find((item: any) => item.locale === "es")?.name ?? collection.slug
  }));
}

export default async function NewProductPage() {
  const currentAdmin = await requireAdmin();
  const collections = await getCollections();

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Nuevo producto</h1>
        </div>
      </section>
      <section className="studio-card">
        <ProductForm collections={collections} />
      </section>
    </StudioShell>
  );
}

import { notFound } from "next/navigation";
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

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const currentAdmin = await requireAdmin();
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const [{ data: product }, collections] = await Promise.all([
    admin
      .from("products")
      .select("id,slug,collection_id,status,featured,dimensions,finishes,product_translations(locale,name,description,materials,care),product_images(storage_path,is_primary,sort_order)")
      .eq("id", id)
      .maybeSingle(),
    getCollections()
  ]);

  if (!product) notFound();

  const es = (product as any).product_translations?.find((item: any) => item.locale === "es");
  const en = (product as any).product_translations?.find((item: any) => item.locale === "en");

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Editar producto</h1>
        </div>
      </section>
      <section className="studio-card">
        <ProductForm
          collections={collections}
          product={{
            id: (product as any).id,
            slug: (product as any).slug,
            collection_id: (product as any).collection_id,
            status: (product as any).status,
            featured: (product as any).featured,
            hero_image_path:
              (product as any).product_images?.find((image: any) => image.is_primary)?.storage_path ??
              (product as any).product_images?.[0]?.storage_path,
            name_es: es?.name,
            description_es: es?.description,
            materials_es: es?.materials,
            dimensions_es: (product as any).dimensions,
            finishes_es: (product as any).finishes?.[0],
            care_es: es?.care,
            name_en: en?.name,
            description_en: en?.description
          }}
        />
      </section>
    </StudioShell>
  );
}

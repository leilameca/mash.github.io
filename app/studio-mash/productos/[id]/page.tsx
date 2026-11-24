import { PublicationNotice } from "../../PublicationNotice";
import { notFound } from "next/navigation";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../../StudioShell";
import { ProductForm } from "../ProductForm";

async function getCollections() {
  const admin = await authenticatedContentClient();
  const { data, error } = await admin
    .from("collections")
    .select("id,revision,slug,collection_translations(locale,name)")
    .order("sort_order");
  if (error)
    throw new Error("No pudimos consultar las colecciones. Intenta de nuevo.");
  return (data ?? []).map((collection: any) => ({
    id: collection.id,
    label:
      collection.collection_translations?.find(
        (item: any) => item.locale === "es",
      )?.name ?? collection.slug,
  }));
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentAdmin = await requireAdmin();
  const { id } = await params;
  const admin = await authenticatedContentClient();
  const [{ data: product, error: productError }, collections] =
    await Promise.all([
      admin
        .from("products")
        .select(
          "id,revision,slug,collection_id,status,featured,dimensions,finishes,product_collections(collection_id,sort_order),product_translations(locale,name,description,materials,care,seo_title,seo_description,translation_status),product_images(storage_path,alt_es,alt_en,is_primary,sort_order)",
        )
        .eq("id", id)
        .maybeSingle(),
      getCollections(),
    ]);

  if (productError)
    throw new Error("No pudimos consultar el producto. Intenta de nuevo.");
  if (!product) notFound();

  const es = (product as any).product_translations?.find(
    (item: any) => item.locale === "es",
  );
  const en = (product as any).product_translations?.find(
    (item: any) => item.locale === "en",
  );

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Editar producto</h1>
        </div>
      </section>
      <PublicationNotice kind="product" id={id} />
      <section className="studio-card">
        <ProductForm
          collections={collections}
          product={{
            id: (product as any).id,
            revision: (product as any).revision,
            slug: (product as any).slug,
            collection_id: product.collection_id,
            collection_ids: [...product.product_collections]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((membership) => membership.collection_id),
            status: (product as any).status,
            featured: (product as any).featured,
            hero_image_path:
              (product as any).product_images?.find(
                (image: any) => image.is_primary,
              )?.storage_path ??
              (product as any).product_images?.[0]?.storage_path,
            image_alts: Object.fromEntries(
              ((product as any).product_images ?? []).map((image: any) => [
                image.storage_path,
                { alt_es: image.alt_es ?? "", alt_en: image.alt_en ?? "" },
              ]),
            ),
            image_paths: [...((product as any).product_images ?? [])]
              .sort(
                (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
              )
              .map((image: any) => image.storage_path),
            name_es: es?.name,
            seo_title_es: es?.seo_title,
            seo_description_es: es?.seo_description,
            description_es: es?.description,
            materials_es: es?.materials,
            dimensions_es: (product as any).dimensions,
            finishes_es: (product as any).finishes?.join(", "),
            care_es: es?.care,
            name_en: en?.name,
            description_en: en?.description,
            translation_status: en?.translation_status,
          }}
        />
      </section>
    </StudioShell>
  );
}

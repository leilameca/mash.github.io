import Link from "next/link";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { ProductList } from "./ProductList";

export default async function StudioProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const currentAdmin = await requireAdmin();
  const admin = await authenticatedContentClient();
  const { data: products, error } = await admin
    .from("products")
    .select(
      "id,revision,slug,status,featured,collections(slug),product_translations(locale,name),product_images(storage_path,is_primary,sort_order)",
    )
    .order("updated_at", { ascending: false });

  const { data: publications, error: publicationError } = await admin
    .from("content_publications")
    .select("entity_id,slug,version,status")
    .eq("entity_kind", "product");
  if (publicationError)
    throw new Error("No pudimos consultar los estados de publicación.");
  return (
    <StudioShell admin={currentAdmin}>
      {saved === "1" && (
        <p className="admin-success" role="status">
          Producto guardado correctamente.
        </p>
      )}
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Productos</h1>
        </div>
        <Link href="/studio-mash/productos/nuevo" className="admin-button">
          Nuevo producto
        </Link>
      </section>
      {error ? (
        <p role="alert">No pudimos cargar los productos. Recarga la página.</p>
      ) : (
        <ProductList
          products={(products ?? []).map((product: any) => ({
            publishedSlug: publications?.find(
              (p) => p.entity_id === product.id && p.status === "published",
            )?.slug,
            hasUnpublishedChanges:
              publications?.find((p) => p.entity_id === product.id)?.version !==
              product.revision,
            id: product.id,
            revision: product.revision,
            slug: product.slug,
            status: product.status,
            name:
              product.product_translations?.find(
                (item: any) => item.locale === "es",
              )?.name ?? product.slug,
            collection: product.collections?.slug ?? "Sin colección",
            image:
              product.product_images?.find((image: any) => image.is_primary)
                ?.storage_path ?? product.product_images?.[0]?.storage_path,
          }))}
        />
      )}
    </StudioShell>
  );
}

import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { ProductList } from "./ProductList";

export default async function StudioProductsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const currentAdmin = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: products, error } = await admin
    .from("products")
    .select("id,slug,status,featured,collections(slug),product_translations(locale,name),product_images(storage_path,is_primary,sort_order)")
    .order("updated_at", { ascending: false });

  return (
    <StudioShell admin={currentAdmin}>
      {saved === "1" && <p className="admin-success" role="status">Producto guardado correctamente.</p>}
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Productos</h1>
        </div>
        <Link href="/studio-mash/productos/nuevo" className="admin-button">
          Nuevo producto
        </Link>
      </section>
      {error ? <p role="alert">No pudimos cargar los productos. Recarga la página.</p> : <ProductList products={(products ?? []).map((product: any) => ({
        id: product.id, slug: product.slug, status: product.status,
        name: product.product_translations?.find((item: any) => item.locale === "es")?.name ?? product.slug,
        collection: product.collections?.slug ?? "Sin colección",
        image: product.product_images?.find((image: any) => image.is_primary)?.storage_path ?? product.product_images?.[0]?.storage_path
      }))} />}
    </StudioShell>
  );
}

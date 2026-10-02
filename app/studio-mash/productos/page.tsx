import Image from "next/image";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { updateProductStatus } from "../actions";
import { StatusForm } from "../StatusForm";

export default async function StudioProductsPage() {
  const currentAdmin = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: products } = await admin
    .from("products")
    .select("id,slug,status,featured,collections(slug),product_translations(locale,name),product_images(storage_path,is_primary,sort_order)")
    .order("updated_at", { ascending: false });

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Catalogo</p>
          <h1>Productos</h1>
        </div>
        <Link href="/studio-mash/productos/nuevo" className="admin-button">
          Nuevo producto
        </Link>
      </section>
      <section className="studio-table-card">
        <div className="studio-table">
          {(products ?? []).map((product: any) => {
            const translation = product.product_translations?.find((item: any) => item.locale === "es") ?? product.product_translations?.[0];
            const primaryImage =
              product.product_images?.find((image: any) => image.is_primary)?.storage_path ?? product.product_images?.[0]?.storage_path;
            return (
              <article className="studio-row" key={product.id}>
                <div className="studio-row__image">
                  {primaryImage ? <Image src={primaryImage} alt="" fill sizes="72px" /> : null}
                </div>
                <div>
                  <h2>{translation?.name ?? product.slug}</h2>
                  <p>{product.collections?.slug ?? "sin-coleccion"} · {product.slug}</p>
                </div>
                <span className={`studio-status studio-status--${product.status}`}>{product.status}</span>
                <StatusForm id={product.id} status={product.status} label={`Estado de ${translation?.name ?? product.slug}`} action={updateProductStatus} />
                <Link href={`/studio-mash/productos/${product.id}`} className="studio-edit-link">
                  Editar
                </Link>
              </article>
            );
          })}
          {(products ?? []).length === 0 && (
            <div className="studio-empty">
              <h2>No hay productos en Supabase.</h2>
              <p>Crea el primero o aplica las migraciones semilla del proyecto.</p>
            </div>
          )}
        </div>
      </section>
    </StudioShell>
  );
}

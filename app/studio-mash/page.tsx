import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "./StudioShell";

async function getCounts() {
  const admin = createSupabaseAdminClient();
  const [products, collections, projects, contacts] = await Promise.all([
    admin.from("products").select("id", { count: "exact", head: true }),
    admin.from("collections").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id", { count: "exact", head: true }),
    admin.from("contact_requests").select("id", { count: "exact", head: true })
  ]);

  return [
    { label: "Productos", value: products.count ?? 0, href: "/studio-mash/productos" },
    { label: "Colecciones", value: collections.count ?? 0, href: "/studio-mash/colecciones" },
    { label: "Proyectos", value: projects.count ?? 0, href: "/studio-mash/proyectos" },
    { label: "Solicitudes", value: contacts.count ?? 0, href: "/studio-mash" }
  ];
}

export default async function StudioHomePage() {
  const currentAdmin = await requireAdmin();
  const counts = await getCounts();

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-hero">
        <div>
          <p>Panel privado</p>
          <h1>Contenido editable para MASH 2.0.</h1>
        </div>
        <Link href="/studio-mash/productos/nuevo" className="admin-button">
          Nuevo producto
        </Link>
      </section>
      <section className="studio-stats">
        {counts.map((item) => (
          <Link href={item.href} className="studio-stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Link>
        ))}
      </section>
      <section className="studio-card">
        <div>
          <p className="studio-kicker">Checklist</p>
          <h2>Antes de publicar contenido</h2>
        </div>
        <ul className="studio-checklist">
          <li>Usar texto base en espanol aprobado por MASH.</li>
          <li>No inventar proyectos, reclamos legales ni descripciones finales en ingles.</li>
          <li>Subir imagenes reales optimizadas en la carpeta correcta del bucket.</li>
          <li>Publicar solo cuando la traduccion y disponibilidad hayan sido revisadas.</li>
        </ul>
      </section>
    </StudioShell>
  );
}

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { HomeContentForm } from "./HomeContentForm";

const fallback = {
  title_es: "Diseñamos espacios para disfrutarlos afuera.",
  description_es:
    "En MASH encuentras muebles resistentes para terrazas, patios, balcones y piscinas, con asesoría para elegir piezas que funcionen en tu espacio y respondan al exterior.",
  title_en: "We design spaces made to be enjoyed outside.",
  description_en:
    "At MASH, you will find outdoor-ready furniture for terraces, patios, balconies and pools, with guidance to choose pieces that work for your space.",
  image_path: "/assets/images/oasis-hero-v2.jpg"
};

export default async function StudioContentPage() {
  const currentAdmin = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("site_content")
    .select("value,site_content_translations(locale,value)")
    .eq("key", "home.hero")
    .maybeSingle();
  const row = data as any;
  const es = row?.site_content_translations?.find((item: any) => item.locale === "es")?.value ?? {};
  const en = row?.site_content_translations?.find((item: any) => item.locale === "en")?.value ?? {};

  return (
    <StudioShell admin={currentAdmin}>
      <section className="studio-heading">
        <div>
          <p>Editor del sitio</p>
          <h1>Contenido</h1>
        </div>
      </section>
      <section className="studio-card">
        <HomeContentForm
          content={{
            title_es: es.title ?? fallback.title_es,
            description_es: es.description ?? fallback.description_es,
            title_en: en.title ?? fallback.title_en,
            description_en: en.description ?? fallback.description_en,
            image_path: row?.value?.image_path ?? fallback.image_path
          }}
        />
      </section>
      <section className="studio-card">
        <p className="studio-kicker">Arquitectura modular</p>
        <h2>Preparado para crecer por secciones</h2>
        <p>
          El contenido se guarda como bloques bilingues independientes. El mismo sistema permite incorporar despues materiales,
          contacto, menus, banners y nuevas paginas sin cambiar la estructura del catalogo.
        </p>
      </section>
    </StudioShell>
  );
}

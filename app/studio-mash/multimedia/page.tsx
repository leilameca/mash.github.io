import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { PageHeader } from "../StudioPrimitives";
import { MediaWorkspace } from "./MediaWorkspace";
export default async function Page() {
  const admin = await requireAdmin();
  return (
    <StudioShell admin={admin}>
      <PageHeader
        eyebrow="Contenido"
        title="Multimedia"
        description="Una biblioteca para reutilizar tus fotografías y conservar su historial."
      />
      <MediaWorkspace />
    </StudioShell>
  );
}

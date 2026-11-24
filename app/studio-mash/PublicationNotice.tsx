import Link from "next/link";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import { modulePaths, type StudioKind } from "@/lib/admin/presentation";
import { StatusBadge } from "./StudioPrimitives";
export async function PublicationNotice({
  kind,
  id,
}: {
  kind: StudioKind;
  id: string;
}) {
  const client = await authenticatedContentClient();
  const { data, error } = await client
    .from("studio_entries")
    .select("*")
    .eq("id", id)
    .eq("kind", kind)
    .single();
  if (error || !data)
    throw new Error("No pudimos consultar la publicación actual.");
  return (
    <aside className="studio-publication-notice">
      <StatusBadge state={data.publication_state} />
      <div>
        <strong>Copia de trabajo v{data.revision}</strong>
        <p>
          {data.live_status === "published"
            ? `La versión pública v${data.published_version} continúa visible hasta que publiques los cambios.`
            : "Este contenido no está visible en el sitio."}
        </p>
      </div>
      {data.live_status === "published" && (
        <Link
          href={
            kind === "project"
              ? "/es/proyectos"
              : `/es/${modulePaths[kind]}/${data.published_slug}`
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver versión publicada ↗
        </Link>
      )}
      <Link href={`/studio-mash/traducciones?kind=${kind}&id=${id}`}>Traducción en inglés</Link>
      <Link href={`/studio-mash/revisiones?kind=${kind}&id=${id}`}>
        Historial
      </Link>
    </aside>
  );
}

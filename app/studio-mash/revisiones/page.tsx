import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import { StudioShell } from "../StudioShell";
import { RestoreForm } from "./RestoreForm";
export default async function RevisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; id?: string }>;
}) {
  const admin = await requireAdmin();
  const input = z
    .object({
      kind: z.enum(["product", "collection", "project", "site"]),
      id: z.string().uuid(),
    })
    .safeParse(await searchParams);
  if (!input.success) notFound();
  const { kind, id } = input.data;
  const client = await authenticatedContentClient();
  const table = {
    product: "products",
    collection: "collections",
    project: "projects",
    site: "site_content",
  }[kind];
  const [{ data: entry, error: entryError }, { data: revisions, error }] =
    await Promise.all([
      client.from(table).select("revision").eq("id", id).single(),
      client
        .from("content_revisions")
        .select("version,created_at")
        .eq("entity_kind", kind)
        .eq("entity_id", id)
        .order("version", { ascending: false }),
    ]);
  if (error || entryError)
    throw new Error("No pudimos consultar el historial.");
  return (
    <StudioShell admin={admin}>
      <h1>Historial de revisiones</h1>
      <p>
        Restaurar crea un borrador nuevo. La versión pública se conserva hasta
        una publicación explícita.
      </p>
      <Link href="/studio-mash">Volver al panel</Link>
      {revisions?.map((row) => (
        <article className="studio-card" key={row.version}>
          <h2>Revisión {row.version}</h2>
          <p>{row.created_at}</p>
          <RestoreForm
            kind={kind}
            id={id}
            version={row.version}
            expectedVersion={entry.revision}
          />
        </article>
      ))}
    </StudioShell>
  );
}

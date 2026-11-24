import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { editorialDrafts, relatedOptions } from "@/lib/editorial/queries";
import { StudioShell } from "../../StudioShell";
import { EditorialEditor } from "../../editorial/EditorialEditor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (id !== "nuevo" && !z.uuid().safeParse(id).success) notFound();
  const kind = "news" as const;
  const [entry] = id === "nuevo" ? [] : await editorialDrafts(kind, id);
  if (id !== "nuevo" && !entry) notFound();
  const options = kind === "news" ? await relatedOptions() : [];
  return (
    <StudioShell admin={admin}>
      <EditorialEditor kind={kind} entry={entry} options={options} />
    </StudioShell>
  );
}

import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { PageHeader } from "../StudioPrimitives";
import { TranslationWorkspace } from "./TranslationWorkspace";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; id?: string; preferencias?: string }>;
}) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const target = z
    .object({
      kind: z.enum(["product", "collection", "project", "site"]),
      id: z.uuid(),
    })
    .safeParse(query);
  return (
    <StudioShell admin={admin}>
      <PageHeader
        title="Traducciones"
        eyebrow="Herramientas"
        description="Revisa el inglés de los productos y del sitio antes de publicarlo."
      />
      <TranslationWorkspace
        initial={target.success ? target.data : undefined}
        showPreferences={query.preferencias === "1"}
      />
    </StudioShell>
  );
}

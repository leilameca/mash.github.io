import { requireAdmin } from "@/lib/supabase/auth";
import {
  readVisualDraft,
  visualItems,
  visualChrome,
} from "@/lib/visual/queries";
import { pageSchema } from "@/lib/visual/schema";
import { VisualEditor } from "./VisualEditor";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await requireAdmin();
  const page = pageSchema.catch("home").parse((await searchParams).pagina);
  const [draft, items, es, en] = await Promise.all([
    readVisualDraft(page),
    visualItems(),
    visualChrome("es"),
    visualChrome("en"),
  ]);
  return (
    <VisualEditor
      initialPage={page}
      initial={{ ...draft, items, chrome: { es, en } }}
    />
  );
}

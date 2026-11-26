import { requireAdmin } from "@/lib/supabase/auth";
import type { ListQuery } from "@/lib/admin/queries";
import { StudioShell } from "../StudioShell";
import { EntryList } from "../EntryList";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ListQuery>;
}) {
  const admin = await requireAdmin();
  return (
    <StudioShell admin={admin}>
      <EntryList kind="collection" query={await searchParams} />
    </StudioShell>
  );
}

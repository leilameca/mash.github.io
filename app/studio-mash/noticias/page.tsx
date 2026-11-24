import { requireAdmin } from "@/lib/supabase/auth";
import { StudioShell } from "../StudioShell";
import { EditorialList, type EditorialQuery } from "../editorial/EditorialList";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<EditorialQuery>;
}) {
  const admin = await requireAdmin();
  return (
    <StudioShell admin={admin}>
      <EditorialList kind="news" query={await searchParams} />
    </StudioShell>
  );
}

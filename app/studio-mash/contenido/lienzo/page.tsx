import { requireAdmin } from "@/lib/supabase/auth";
import { CanvasMount } from "./CanvasMount";
import "@/app/globals.css";
import "@/app/[locale]/editorial-theme.css";
import "@/components/editorial/editorial.css";
import "@/components/editorial/home-editorial.css";
import "@/components/editorial/workshop-location.css";
import "@/components/visual/visual.css";

export default async function Page() {
  await requireAdmin();
  return <CanvasMount />;
}

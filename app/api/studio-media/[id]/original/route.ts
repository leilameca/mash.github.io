import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/supabase/auth";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentAdmin()))
    return NextResponse.json({ error: "Sesión vencida." }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Recurso no válido." }, { status: 400 });
  const { data, error } = await (await authenticatedContentClient())
    .from("media_assets")
    .select("original_bucket,original_storage_path,original_name,mime,state")
    .eq("id", id)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "No pudimos consultar el original." },
      { status: 503 },
    );
  if (
    !data?.original_storage_path ||
    data.original_bucket !== "mash-originals" ||
    data.state !== "ready"
  )
    return NextResponse.json(
      { error: "No hay un original incorporado para este recurso anterior." },
      { status: 404 },
    );
  const file = await createSupabaseAdminClient()
    .storage.from("mash-originals")
    .download(data.original_storage_path);
  if (file.error || !file.data)
    return NextResponse.json(
      { error: "No pudimos descargar el original." },
      { status: 503 },
    );
  return new NextResponse(file.data, {
    headers: {
      "Content-Type": data.mime || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="original"; filename*=UTF-8''${encodeURIComponent(data.original_name.replace(/[\r\n]/g, ""))}`,
    },
  });
}

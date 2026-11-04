import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET, uploadImage } from "@/lib/supabase/media";

export async function GET(request: NextRequest) {
  if (!await getCurrentAdmin()) return NextResponse.json({ error: "Sesión vencida. Inicia sesión de nuevo." }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const folder = request.nextUrl.searchParams.get("folder") || "products";
  if (!["products", "collections", "projects", "site"].includes(folder)) return NextResponse.json({ error: "Carpeta no válida" }, { status: 400 });
  const page = Math.max(0, Math.min(1000, Number(request.nextUrl.searchParams.get("page")) || 0));
  const { data, error } = await admin.storage.from(MEDIA_BUCKET).list(folder, { limit: 24, offset: Math.floor(page) * 24, search: (request.nextUrl.searchParams.get("search") || "").slice(0, 80), sortBy: { column: "created_at", order: "desc" } });
  if (error) return NextResponse.json({ error: "No pudimos cargar las imágenes." }, { status: 503 });
  return NextResponse.json({ more: data.length === 24, items: data.filter((file) => file.id && /\.(jpe?g|png|webp|avif)$/i.test(file.name)).map((file) => ({ name: file.name, url: admin.storage.from(MEDIA_BUCKET).getPublicUrl(`${folder}/${file.name}`).data.publicUrl })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  if (!await getCurrentAdmin()) return NextResponse.json({ error: "Sesión vencida. Inicia sesión de nuevo." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024) return NextResponse.json({ error: "La imagen debe pesar menos de 4 MB." }, { status: 413 });
  try {
    const data = await request.formData();
    const file = data.get("image");
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Selecciona una imagen de menos de 4 MB." }, { status: 400 });
    const result = await uploadImage(createSupabaseAdminClient(), file, "products");
    return NextResponse.json({ url: result.publicUrl });
  } catch { return NextResponse.json({ error: "No pudimos subir la imagen. Intenta de nuevo." }, { status: 500 }); }
}

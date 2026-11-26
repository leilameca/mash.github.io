import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getCurrentAdmin } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import { uploadManagedImage, MediaUploadError } from "@/lib/media/uploads";
import { mediaLibrary, mediaDetails, safeAsset } from "@/lib/media/queries";
import { MEDIA_FIELDS, type MediaAsset } from "@/lib/media/types";
import { boundedBody, RequestLimitError } from "@/lib/media/http";
export const runtime = "nodejs";
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: NextRequest) {
  if (!(await getCurrentAdmin()))
    return response({ error: "Sesión vencida. Inicia sesión de nuevo." }, 401);
  try {
    const client = await authenticatedContentClient();
    const query = Object.fromEntries(request.nextUrl.searchParams);
    const { data: origin, error: originError } =
      await client.rpc("mash_media_origin");
    if (originError)
      throw Error("No pudimos verificar la configuración de medios.");
    if (query.id) {
      if (!z.string().uuid().safeParse(query.id).success)
        return response({ error: "Recurso no válido." }, 400);
      const details = await mediaDetails(client, query.id);
      if (!details.asset)
        return response({ error: "No se encontró la imagen." }, 404);
      return response({ ...details, asset: safeAsset(details.asset, origin) });
    }
    if (query.path) {
      let { data: asset, error } = await client
        .from("media_library")
        .select(MEDIA_FIELDS)
        .eq("canonical_path", query.path.slice(0, 2048))
        .maybeSingle();
      if (error) throw Error("No pudimos consultar la fotografía.");
      if (!asset) {
        const variant = await client
          .from("media_variants")
          .select("asset_id")
          .eq("public_url", query.path.slice(0, 2048))
          .maybeSingle();
        if (variant.data) {
          const result = await client
            .from("media_library")
            .select(MEDIA_FIELDS)
            .eq("id", variant.data.asset_id)
            .maybeSingle();
          if (result.error) throw Error("No pudimos consultar la fotografía.");
          asset = result.data;
        }
      }
      return asset
        ? response({ asset: safeAsset(asset as MediaAsset, origin) })
        : response(
            { error: "Fotografía anterior pendiente de registro." },
            404,
          );
    }
    const result = await mediaLibrary(client, {
      ...query,
      q: query.q || query.search,
    });
    return response({
      ...result,
      items: result.items.map((a) => safeAsset(a, origin)),
    });
  } catch {
    return response(
      { error: "No pudimos consultar la biblioteca. Intenta de nuevo." },
      503,
    );
  }
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return response({ error: "Solicitud no válida." }, 403);
  if (!(await getCurrentAdmin()))
    return response({ error: "Sesión vencida. Inicia sesión de nuevo." }, 401);
  try {
    const body = await boundedBody(request, 31 * 1024 * 1024);
    const form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") || "" },
      body,
    }).formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size)
      return response({ error: "Selecciona una fotografía." }, 400);
    const id = String(form.get("upload_id") || randomUUID());
    const folder = String(form.get("folder") || "products");
    if (!z.string().uuid().safeParse(id).success)
      return response({ error: "Identificador de carga no válido." }, 400);
    const result = await uploadManagedImage(
      await authenticatedContentClient(),
      createSupabaseAdminClient(),
      file,
      folder,
      id,
    );
    return result.state === "ready"
      ? response({ url: result.asset.url, asset: result.asset, upload_id: id })
      : response({ ...result, pending: true, upload_id: id }, 202);
  } catch (error) {
    return response(
      {
        error:
          error instanceof MediaUploadError ||
          error instanceof RequestLimitError
            ? error.message
            : "No pudimos procesar la carga. Intenta de nuevo.",
      },
      error instanceof MediaUploadError
        ? error.status
        : error instanceof RequestLimitError
          ? 413
          : 503,
    );
  }
}
export async function PATCH(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return response({ error: "Solicitud no válida." }, 403);
  if (!(await getCurrentAdmin()))
    return response({ error: "Sesión vencida. Inicia sesión de nuevo." }, 401);
  const schema = z.object({
    assets: z
      .array(
        z.object({
          id: z.string().uuid(),
          revision: z.number().int().positive(),
        }),
      )
      .min(1)
      .max(50),
    intent: z.enum(["rename", "archive"]),
    name: z.string().trim().min(1).max(255).optional(),
  });
  try {
    const input = schema.safeParse(
      JSON.parse(new TextDecoder().decode(await boundedBody(request, 16384))),
    );
    if (!input.success || (input.data.intent === "rename" && !input.data.name))
      return response({ error: "Revisa los datos del recurso." }, 400);
    const { error } = await (
      await authenticatedContentClient()
    ).rpc("edit_mash_media", {
      p_assets: input.data.assets,
      p_intent: input.data.intent,
      p_name: input.data.name ?? null,
    });
    if (error) {
      if (error.code === "40001")
        return response(
          {
            error: "Otra persona cambió este recurso. Recarga antes de editar.",
          },
          409,
        );
      if (error.code === "23503")
        return response(
          {
            error:
              "La imagen está en uso, también en publicaciones o revisiones anteriores. No puede archivarse.",
          },
          409,
        );
      if (!error.code || !/[0-9A-Z]{5}/.test(error.code))
        return response(
          {
            pending: true,
            message:
              "No pudimos confirmar el cambio. Recarga y verifica el recurso antes de reintentar.",
          },
          202,
        );
      return response({ error: "No pudimos aplicar el cambio." }, 400);
    }
    return response({ ok: true });
  } catch (error) {
    return response(
      {
        error:
          error instanceof RequestLimitError
            ? error.message
            : "Solicitud no válida.",
      },
      error instanceof RequestLimitError ? 413 : 400,
    );
  }
}

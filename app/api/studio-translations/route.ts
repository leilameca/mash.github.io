import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/supabase/auth";
import { authenticatedContentClient } from "@/lib/supabase/persistence";
import type { ContentSnapshot } from "@/lib/supabase/published";
import { fieldKey, translationFields } from "@/lib/translation/content";
import { translationStates } from "@/lib/translation/presentation";
import { runTranslation } from "@/lib/translation/run";
import { boundedBody, RequestLimitError } from "@/lib/media/http";

export const runtime = "nodejs";
export const maxDuration = 35;
const kind = z.enum(["product", "collection", "project", "site"]);
const target = z.object({
  kind,
  id: z.uuid(),
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("batch"),
    entries: z.array(target).min(1).max(12),
  }),
  z.object({
    action: z.literal("preferences"),
    auto: z.boolean(),
    terms: z.array(z.string().trim().min(1).max(160)).max(100),
  }),
  z.object({
    action: z.literal("work"),
    kind,
    id: z.uuid(),
    version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    mode: z.enum(["translate", "regenerate", "review"]),
    edits: z.record(z.string().max(2048), z.string().max(24000)).optional(),
  }),
]);
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  if (!(await getCurrentAdmin()))
    return response({ error: "Sesión administrativa requerida." }, 401);
  try {
    const client = await authenticatedContentClient();
    const query = request.nextUrl.searchParams;
    const id = z.uuid().safeParse(query.get("id"));
    const entity = kind.safeParse(query.get("kind"));
    if (query.has("id")) {
      if (!id.success || !entity.success)
        return response({ error: "Contenido no válido." }, 400);
      const { data: entry, error } = await client
        .from("studio_translation_entries")
        .select("*")
        .eq("kind", entity.data)
        .eq("id", id.data)
        .maybeSingle();
      if (error) throw error;
      if (!entry)
        return response({ error: "No se encontró el contenido." }, 404);
      const { data: revision, error: historyError } = await client
        .from("content_revisions")
        .select("snapshot")
        .eq("entity_kind", entity.data)
        .eq("entity_id", id.data)
        .eq("version", entry.revision)
        .single();
      if (historyError || !revision)
        throw historyError ?? new Error("Missing revision");
      return response({
        entry,
        fields: translationFields(
          entity.data,
          revision.snapshot as ContentSnapshot,
        ).map((field) => ({ ...field, key: fieldKey(field.path) })),
      });
    }

    const state = query.get("state") ?? "";
    const page = Math.min(
      10000,
      Math.max(1, parseInt(query.get("page") ?? "", 10) || 1),
    );
    const name = query.get("q")?.trim().slice(0, 80);
    const pageSize = 12;
    let list = client
      .from("studio_translation_entries")
      .select("*", { count: "exact" });
    if (name) list = list.ilike("name", `%${name.replace(/[\\%_]/g, "\\$&")}%`);
    if (entity.success) list = list.eq("kind", entity.data);
    if (Object.hasOwn(translationStates, state))
      list = list.eq("translation_state", state);
    const keys = Object.keys(translationStates);
    const [rows, prefs, ...counts] = await Promise.all([
      list
        .order("updated_at", { ascending: false })
        .order("id")
        .range((page - 1) * pageSize, page * pageSize - 1),
      client
        .from("translation_preferences")
        .select("auto_on_save,terms")
        .single(),
      ...keys.map((key) =>
        client
          .from("studio_translation_entries")
          .select("id", { count: "exact", head: true })
          .eq("translation_state", key),
      ),
    ]);
    if (rows.error || prefs.error || counts.some((x) => x.error))
      throw new Error("Failed query");
    return response({
      entries: rows.data,
      total: rows.count,
      page,
      pageSize,
      preferences: prefs.data,
      summary: Object.fromEntries(
        keys.map((key, index) => [key, counts[index].count]),
      ),
      providerConfigured: Boolean(process.env.MASH_DEEPL_API_KEY?.trim()),
    });
  } catch {
    return response(
      { error: "No pudimos consultar las traducciones. Intenta de nuevo." },
      503,
    );
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return response({ error: "Origen de solicitud no permitido." }, 403);
  if (!(await getCurrentAdmin()))
    return response({ error: "Sesión administrativa requerida." }, 401);
  try {
    const raw = await boundedBody(request, 192 * 1024);
    const parsed = input.safeParse(JSON.parse(new TextDecoder().decode(raw)));
    if (!parsed.success)
      return response({ error: "Solicitud de traducción no válida." }, 400);
    const client = await authenticatedContentClient();
    const data = parsed.data;
    if (data.action === "preferences") {
      const { error } = await client
        .from("translation_preferences")
        .update({ auto_on_save: data.auto, terms: [...new Set(data.terms)] })
        .eq("singleton", true);
      if (error) throw error;
      return response({ status: "saved" });
    }
    if (data.action === "batch") {
      if (!process.env.MASH_DEEPL_API_KEY?.trim())
        return response({ error: "DeepL aún no está configurado." }, 409);
      const { error } = await client.rpc("enqueue_translation_batch", {
        p_entries: data.entries,
      });
      if (error) throw error;
      return response({ status: "queued" });
    }
    return response(
      await runTranslation(client, data, {
        mode: data.mode,
        edits: data.edits,
      }),
    );
  } catch (error) {
    if (error instanceof RequestLimitError)
      return response(
        { error: "La solicitud supera el tamaño permitido." },
        413,
      );
    if (error instanceof SyntaxError)
      return response({ error: "Solicitud no válida." }, 400);
    return response(
      {
        error:
          "No pudimos confirmar el resultado. Consulta el estado antes de reintentar.",
      },
      503,
    );
  }
}

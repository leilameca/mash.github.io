import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/supabase/auth";
import {
  authenticatedContentClient,
  commitContent,
} from "@/lib/supabase/persistence";
import { isLibraryImage } from "@/lib/supabase/media";
import { boundedBody, RequestLimitError } from "@/lib/media/http";
import {
  announcementData,
  copy,
  editorialKinds,
  localizedHeadline,
  newsData,
  urlSlug,
} from "@/lib/editorial/schema";
import { editorialDrafts } from "@/lib/editorial/queries";

const form = z.strictObject({
  kind: editorialKinds,
  id: z.uuid().optional(),
  revision: z.number().int().nonnegative(),
  slug: urlSlug.optional(),
  intent: z.enum(["save", "publish", "archive"]),
  value: z.unknown().optional(),
  es: copy.optional(),
  en: copy.optional(),
});
const reply = (payload: unknown, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return reply({ error: "Origen no permitido." }, 403);
  if (!(await getCurrentAdmin()))
    return reply({ error: "Sesión administrativa requerida." }, 401);
  try {
    const raw = await boundedBody(request, 384 * 1024);
    const parsed = form.safeParse(JSON.parse(new TextDecoder().decode(raw)));
    if (!parsed.success)
      return reply({ error: "Revisa los datos de la publicación." }, 400);
    const input = parsed.data;
    const [existing] = input.id
      ? await editorialDrafts(input.kind, input.id)
      : [];
    if (input.id && (!existing || input.revision !== existing.revision))
      return reply(
        {
          error:
            "La ficha cambió en otra sesión. Conserva tu copia y abre la revisión más reciente.",
        },
        409,
      );
    const key =
      existing?.key ??
      (input.kind === "news"
        ? "news." + input.slug
        : "announcement." + randomUUID());
    const client = await authenticatedContentClient();
    if (input.intent === "archive") {
      if (!existing) return reply({ error: "Primero guarda esta ficha." }, 400);
      const [archived] = await commitContent(client, [
        {
          kind: "site",
          id: existing.id,
          expected_version: input.revision,
          intent: "archive",
          data: { value: { archived: true } },
        },
      ]);
      revalidatePath("/es", "layout");
      revalidatePath("/en", "layout");
      return reply(archived);
    }
    if (!existing && input.kind === "news" && !input.slug)
      return reply({ error: "Agrega una ruta válida." }, 400);
    if (!input.es || !localizedHeadline.safeParse(input.es.title).success)
      return reply({ error: "Agrega un título de 2 a 200 caracteres." }, 400);
    const value = (
      input.kind === "news" ? newsData : announcementData
    ).safeParse(input.value);
    if (!value.success || value.data.archived)
      return reply(
        {
          error:
            "Revisa las categorías, enlaces, fechas y valores de la ficha.",
        },
        400,
      );
    if ("gallery" in value.data) {
      const previous = newsData.safeParse(existing?.value);
      const known = new Set(
        previous.success
          ? [previous.data.cover, ...previous.data.gallery.map((p) => p.path)]
          : [],
      );
      const paths = [
        ...new Set([
          value.data.cover,
          ...value.data.gallery.map((p) => p.path),
        ]),
      ].filter((path) => path && !known.has(path));
      const checked = await Promise.all(
        paths.map((path) => isLibraryImage(client, path)),
      );
      if (checked.some((ok) => !ok))
        return reply(
          { error: "Selecciona fotografías verificadas en Multimedia." },
          400,
        );
      if (
        input.intent === "publish" &&
        (!value.data.cover ||
          !input.es.excerpt?.trim() ||
          !value.data.blocks.some((block) =>
            input.es?.["body-" + block.id]?.trim(),
          ))
      )
        return reply(
          {
            error: "Completa extracto, portada y al menos un bloque de texto.",
          },
          400,
        );
    } else if (input.intent === "publish") {
      if (
        value.data.language === "en"
          ? !input.en?.message?.trim()
          : !input.es.message?.trim()
      )
        return reply(
          { error: "Agrega el mensaje en el idioma seleccionado." },
          400,
        );
    }
    const [saved] = await commitContent(client, [
      {
        kind: "site",
        id: existing?.id,
        expected_version: input.revision,
        intent: input.intent,
        data: { key, value: value.data },
        translations: [
          { locale: "es", value: input.es },
          { locale: "en", value: input.en ?? {} },
        ],
      },
    ]);
    if (input.intent === "publish") {
      revalidatePath("/es", "layout");
      revalidatePath("/en", "layout");
    }
    return reply({ id: saved.id, revision: saved.revision, key });
  } catch (error) {
    if (error instanceof RequestLimitError)
      return reply({ error: "La ficha supera el tamaño permitido." }, 413);
    if (error instanceof SyntaxError)
      return reply({ error: "Solicitud inválida." }, 400);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos confirmar el guardado.";
    return reply(
      { error: message },
      /pestaña|otra persona|slug o identificador/i.test(message) ? 409 : 503,
    );
  }
}

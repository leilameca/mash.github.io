import { NextRequest, NextResponse } from "next/server";
import { isDeepStrictEqual } from "node:util";
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
  blockRegistry,
  layoutSchema,
  pageSchema,
  visualKey,
  visualTextSchema,
} from "@/lib/visual/schema";
import {
  readVisualDraft,
  visualChrome,
  visualItems,
} from "@/lib/visual/queries";

const body = z.strictObject({
  page: pageSchema,
  id: z.uuid().optional(),
  revision: z.number().int().nonnegative(),
  layout: layoutSchema,
  es: visualTextSchema,
  en: visualTextSchema,
  intent: z.enum(["save", "publish"]),
});
const reply = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
export async function GET(req: NextRequest) {
  if (!(await getCurrentAdmin()))
    return reply({ error: "Sesión administrativa requerida." }, 401);
  const page = pageSchema.safeParse(req.nextUrl.searchParams.get("page"));
  if (!page.success) return reply({ error: "Página no válida." }, 400);
  try {
    const [draft, items, es, en] = await Promise.all([
      readVisualDraft(page.data),
      visualItems(),
      visualChrome("es"),
      visualChrome("en"),
    ]);
    return reply({ ...draft, items, chrome: { es, en } });
  } catch {
    return reply(
      { error: "No pudimos cargar la composición. Intenta de nuevo." },
      503,
    );
  }
}
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return reply({ error: "Origen no permitido." }, 403);
  if (!(await getCurrentAdmin()))
    return reply({ error: "Sesión administrativa requerida." }, 401);
  try {
    const raw = await boundedBody(req, 512 * 1024);
    const parsed = body.safeParse(JSON.parse(new TextDecoder().decode(raw)));
    if (!parsed.success)
      return reply({ error: "Revisa las propiedades de la composición." }, 400);
    const next = parsed.data;
    const allowed = new Set(
      next.layout.sections.flatMap((section) =>
        blockRegistry[section.type].fields.map(
          (field) => section.id + "__" + field,
        ),
      ),
    );
    if (
      [...Object.keys(next.es), ...Object.keys(next.en)].some(
        (key) => !allowed.has(key),
      )
    )
      return reply(
        { error: "Hay textos que no pertenecen a una sección." },
        400,
      );
    if (
      next.intent === "publish" &&
      !next.layout.sections.some(
        (section) =>
          section.visible &&
          !blockRegistry[section.type].protected &&
          section.type !== "spacer" &&
          (section.media.length ||
            blockRegistry[section.type].entity ||
            section.type === "contact" ||
            ["title", "body"].some((field) =>
              next.es[section.id + "__" + field]?.trim(),
            )),
      )
    )
      return reply(
        { error: "Agrega contenido visible en español antes de publicar." },
        400,
      );
    const current = await readVisualDraft(next.page);
    if (current.doc.id !== next.id || current.doc.revision !== next.revision)
      return reply(
        {
          error:
            "La página cambió en otra sesión. Conserva tus cambios y consulta la revisión más reciente.",
        },
        409,
      );
    if (
      next.page === "home" &&
      !current.doc.id &&
      isDeepStrictEqual(next.layout, current.doc.layout) &&
      isDeepStrictEqual(next.es, current.doc.es) &&
      isDeepStrictEqual(next.en, current.doc.en)
    ) {
      return reply({
        revision: current.doc.revision,
        publishedRevision: current.publishedRevision,
        unchanged: true,
      });
    }
    const client = await authenticatedContentClient();
    const known = new Set(
      current.doc.layout.sections.flatMap((section) => section.media),
    );
    const added = [
      ...new Set(next.layout.sections.flatMap((section) => section.media)),
    ].filter((path) => !known.has(path));
    // Validate additions in small groups. The database independently checks exact origin and usage.
    for (let i = 0; i < added.length; i += 8)
      if (
        !(
          await Promise.all(
            added.slice(i, i + 8).map((path) => isLibraryImage(client, path)),
          )
        ).every(Boolean)
      )
        return reply(
          { error: "Selecciona fotografías verificadas desde Multimedia." },
          400,
        );
    const [saved] = await commitContent(client, [
      {
        kind: "site",
        id: next.id,
        expected_version: next.revision,
        intent: next.intent,
        data: {
          key: visualKey(next.page),
          value: { composition: next.layout },
        },
        translations: [
          { locale: "es", value: next.es },
          { locale: "en", value: next.en },
        ],
      },
    ]);
    if (next.intent === "publish") {
      revalidatePath("/es", "layout");
      revalidatePath("/en", "layout");
    }
    return reply({
      id: saved.id,
      revision: saved.revision,
      publishedRevision:
        next.intent === "publish" ? saved.revision : current.publishedRevision,
    });
  } catch (error) {
    if (error instanceof RequestLimitError)
      return reply(
        { error: "La composición supera el tamaño permitido." },
        413,
      );
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

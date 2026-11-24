import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const config = getSupabasePublicConfig();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-mash-locale",
    request.nextUrl.pathname.split("/")[1] === "en" ? "en" : "es",
  );
  const next = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  let response = next();
  const detail = request.nextUrl.pathname.match(
    /^\/(es|en)\/(productos|colecciones|proyectos|noticias)\/([^/]+)\/?$/,
  );
  if (detail) {
    if (!config)
      return new NextResponse("Contenido temporalmente no disponible", {
        status: 503,
      });
    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
    const kind =
      detail[2] === "productos"
        ? "product"
        : detail[2] === "colecciones"
          ? "collection"
          : detail[2] === "proyectos"
            ? "project"
            : "site";
    const slug = kind === "site" ? "news." + detail[3] : detail[3];
    const { data, error } = await client
      .from("published_content")
      .select("slug")
      .eq("entity_kind", kind)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();
    if (error)
      return new NextResponse("Contenido temporalmente no disponible", {
        status: 503,
      });
    if (!data && kind === "site")
      return NextResponse.rewrite(new URL("/_missing", request.url), {
        status: 404,
        request: { headers: requestHeaders },
      });
    if (!data) {
      const { data: redirect, error: redirectError } = await client
        .from("published_redirects")
        .select("target_slug")
        .eq("entity_kind", kind)
        .eq("old_slug", detail[3])
        .maybeSingle();
      if (redirectError)
        return new NextResponse("Contenido temporalmente no disponible", {
          status: 503,
        });
      if (redirect && redirect.target_slug !== detail[3])
        return NextResponse.redirect(
          new URL(
            `/${detail[1]}/${detail[2]}/${redirect.target_slug}`,
            request.url,
          ),
          308,
        );
      return NextResponse.rewrite(new URL("/_missing", request.url), {
        status: 404,
        request: { headers: requestHeaders },
      });
    }
  }
  if (!request.nextUrl.pathname.startsWith("/studio-mash")) return response;

  if (!config) return response;

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        // Forward the refreshed cookie to this render as well as to the browser.
        requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
        response = next();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/studio-mash/:path*", "/es/:path*", "/en/:path*"],
};

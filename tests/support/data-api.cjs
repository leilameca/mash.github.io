// Test-only Data API facade over isolated PostgreSQL. It is not Supabase Auth,
// PostgREST or a production runtime. SQL, snapshots and RLS execute in PostgreSQL.
const http = require("node:http");
const { database } = require("./database.cjs");
async function dataApi({ adminMode = false } = {}) {
  const f = await database({ seed: true });
  // Explicit isolated fixtures: the historical seed intentionally creates drafts.
  for (const kind of ["collection", "product", "project"]) {
    const table = {
      collection: "collections",
      product: "products",
      project: "projects",
    }[kind];
    const rows = (
      await f.db.query(`select id,slug,revision from public.${table}`)
    ).rows;
    for (const row of rows) {
      if (
        kind === "product" &&
        !["oasis-set", "candor-clasico"].includes(row.slug)
      )
        continue;
      await f.save([
        {
          kind,
          id: row.id,
          expected_version: row.revision,
          data: {},
          intent: "publish",
        },
      ]);
    }
  }
  const hero = (
    await f.db.query(
      "select id,revision from site_content where key='home.hero'",
    )
  ).rows[0];
  await f.save([
    {
      kind: "site",
      id: hero?.id,
      expected_version: hero?.revision,
      data: {
        key: "home.hero",
        value: {
          image_path: "/assets/images/oasis-hero-v2.jpg",
          showroom_main_image_path: "/assets/images/candor-mix-collection.jpeg",
          showroom_small_image_path: "/assets/images/oculus-mare-dining.jpg",
        },
      },
      translations: [
        {
          locale: "es",
          value: {
            title: "Contenido de prueba aislado",
            description:
              "Texto original para verificar el sitio en un entorno aislado.",
          },
        },
      ],
      intent: "publish",
    },
  ]);
  const sections = (
    await f.db.query(
      "select id,revision from site_content where key='home.sections'",
    )
  ).rows[0];
  await f.save([
    {
      kind: "site",
      id: sections?.id,
      expected_version: sections?.revision,
      data: {
        key: "home.sections",
        value: {
          visible: {
            intro: true,
            collections: false,
            featured: false,
            lifestyle: false,
            philosophy: false,
            projects: false,
            materials: false,
            benefits: false,
            faq: false,
          },
          introImage: "/assets/images/oasis-set.jpg",
        },
      },
      translations: [
        {
          locale: "es",
          value: {
            introEyebrow: "Prueba de contenido",
            introTitle: "Inicio aislado",
          },
        },
      ],
      intent: "publish",
    },
  ]);
  if (adminMode) {
    const settings = (
      await f.db.query(
        "select id,revision from site_content where key='site.settings'",
      )
    ).rows[0];
    await f.save([
      {
        kind: "site",
        id: settings.id,
        expected_version: settings.revision,
        data: {
          value: {
            full_name: "MASH · Entorno de pruebas",
            email: "contacto@isolated.invalid",
            phone: "+1 (000) 000-0000",
            whatsapp: "https://wa.me/10000000000",
            instagram: "https://example.invalid/social",
            instagram_handle: "@entorno_de_pruebas",
          },
        },
        intent: "save",
      },
    ]);
  }
  const fixtureUser = {
    id: f.ADMIN,
    email: "admin@isolated.invalid",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-11-24T12:00:00Z",
  };
  const fixtureToken = [
    { alg: "HS256", typ: "JWT" },
    {
      sub: f.ADMIN,
      email: fixtureUser.email,
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
    "fixture-signature",
  ]
    .map((x) =>
      typeof x === "string"
        ? x
        : Buffer.from(JSON.stringify(x)).toString("base64url"),
    )
    .join(".");
  const session = {
    access_token: fixtureToken,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: fixtureUser,
  };
  const cookie = {
    name: "sb-127-auth-token",
    value:
      "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
  };
  async function adminRequest(req, url, service) {
    const table = url.pathname.replace("/rest/v1/", "");
    if (table.startsWith("rpc/")) {
      if (req.method !== "POST" || service)
        throw Error("Unsupported fixture RPC");
      let body = "";
      for await (const chunk of req) body += chunk;
      const args = JSON.parse(body);
      if (table === "rpc/save_mash_content") {
        const result = await f.save(args.p_changes);
        return { rpc: result, rows: [] };
      }
      if (table === "rpc/restore_mash_revision")
        return {
          rpc: await f.as(
            "authenticated",
            f.ADMIN,
            async (tx) =>
              (
                await tx.query(
                  "select public.restore_mash_revision($1,$2,$3,$4) result",
                  [
                    args.p_kind,
                    args.p_id,
                    args.p_version,
                    args.p_expected_version,
                  ],
                )
              ).rows[0].result,
          ),
          rows: [],
        };
      throw Error("Unsupported RPC");
    }
    const allowed = [
      "published_content",
      "published_redirects",
      "studio_entries",
      "studio_summary",
      "admin_users",
      "products",
      "product_translations",
      "product_images",
      "collections",
      "collection_translations",
      "projects",
      "project_translations",
      "project_images",
      "site_content",
      "site_content_translations",
      "content_revisions",
      "content_publications",
    ];
    if (
      !allowed.includes(table) ||
      (req.method !== "GET" && req.method !== "HEAD") ||
      (service && table !== "admin_users")
    )
      throw Error("Unsupported authenticated fixture query");
    const columns = (
      await f.db.query(
        "select column_name from information_schema.columns where table_schema=$1 and table_name=$2",
        ["public", table],
      )
    ).rows.map((r) => r.column_name);
    const clauses = [],
      params = [];
    for (const [key, value] of url.searchParams) {
      if (["select", "order", "offset", "limit"].includes(key)) continue;
      if (!columns.includes(key)) throw Error("Unsupported column " + key);
      const dot = value.indexOf("."),
        op = value.slice(0, dot),
        v = value.slice(dot + 1);
      if (op === "in") {
        const values = v.slice(1, -1).split(",");
        const list = values.map((x) => {
          params.push(x.replace(/^"|"$/g, ""));
          return "$" + params.length;
        });
        clauses.push(`"${key}" in (${list})`);
      } else {
        if (!["eq", "neq", "ilike", "is"].includes(op))
          throw Error("Unsupported operation " + op);
        if (op === "is" && v === "null") {
          clauses.push(`"${key}" is null`);
          continue;
        }
        params.push(v === "true" ? true : v === "false" ? false : v);
        clauses.push(
          `"${key}" ${op === "eq" ? "=" : op === "neq" ? "<>" : op === "ilike" ? "ilike" : "="} $${params.length}`,
        );
      }
    }
    const where = clauses.length ? " where " + clauses.join(" and ") : "";
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0),
      limit = Math.min(
        1000,
        Math.max(0, Number(url.searchParams.get("limit")) || 1000),
      );
    const order = (url.searchParams.get("order") || "")
      .split(",")
      .filter(Boolean)
      .map((v) => {
        const [key, direction] = v.split(".");
        if (!columns.includes(key)) throw Error("Unsupported order");
        return `"${key}" ${direction === "desc" ? "desc" : "asc"}`;
      });
    const perform = async (tx) => {
      const count = (
        await tx.query(
          `select count(*)::int n from public.${table}${where}`,
          params,
        )
      ).rows[0].n;
      const rows = (
        await tx.query(
          `select * from public.${table}${where}${order.length ? " order by " + order.join(",") : ""} limit ${limit} offset ${offset}`,
          params,
        )
      ).rows;
      const select = url.searchParams.get("select") || "";
      for (const row of rows) {
        for (const [relation, parent] of [
          ["product_translations", "product"],
          ["product_images", "product"],
          ["collection_translations", "collection"],
          ["project_translations", "project"],
          ["project_images", "project"],
          ["site_content_translations", "site_content"],
        ]) {
          if (select.includes(relation + "("))
            row[relation] = (
              await tx.query(
                `select * from public.${relation} where ${parent}_id=$1`,
                [row.id],
              )
            ).rows;
        }
        if (select.includes("collections("))
          row.collections =
            (
              await tx.query("select * from collections where id=$1", [
                row.collection_id,
              ])
            ).rows[0] || null;
      }
      return { count, rows, offset };
    };
    return service ? perform(f.db) : f.as("authenticated", f.ADMIN, perform);
  }
  let unavailable = false;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("content-type", "application/json");
    if (
      unavailable &&
      !url.pathname.startsWith("/auth/") &&
      !url.pathname.endsWith("/admin_users")
    ) {
      res.writeHead(503);
      res.end(JSON.stringify({ message: "Isolated connection failure" }));
      return;
    }
    const isAdmin =
      adminMode && req.headers.authorization === `Bearer ${fixtureToken}`;
    const isService =
      adminMode && req.headers.authorization === "Bearer fixture-service";
    if (adminMode && url.pathname === "/auth/v1/user") {
      res.writeHead(isAdmin ? 200 : 401);
      res.end(
        JSON.stringify(isAdmin ? fixtureUser : { message: "Unauthorized" }),
      );
      return;
    }
    // Storage transport is explicitly simulated; no hosted objects are read.
    if (
      adminMode &&
      isAdmin &&
      req.method === "POST" &&
      url.pathname === "/storage/v1/object/list/mash-media"
    ) {
      res.end("[]");
      return;
    }
    if (
      adminMode &&
      url.pathname.startsWith("/rest/v1/") &&
      (isAdmin || isService)
    ) {
      try {
        const result = await adminRequest(req, url, isService);
        if (result.count !== undefined)
          res.setHeader(
            "content-range",
            `${result.offset}-${Math.max(result.offset, result.offset + result.rows.length - 1)}/${result.count}`,
          );
        const object = req.headers.accept?.includes("vnd.pgrst.object");
        if (object && result.rows.length !== 1) {
          res.writeHead(406);
          res.end(
            JSON.stringify({
              code: "PGRST116",
              details: `The result contains ${result.rows.length} rows`,
            }),
          );
          return;
        }
        res.end(
          JSON.stringify(result.rpc ?? (object ? result.rows[0] : result.rows)),
        );
      } catch (error) {
        console.error("FIXTURE ERROR", error.message);
        res.writeHead(400);
        res.end(
          JSON.stringify({
            message: error.message,
            code: error.code || "TEST_API",
          }),
        );
      }
      return;
    }
    const table = url.pathname.replace("/rest/v1/", "");
    if (!["published_content", "published_redirects"].includes(table)) {
      res.writeHead(401);
      res.end(JSON.stringify({ message: "Unauthorized" }));
      return;
    }
    try {
      const clauses = [],
        params = [];
      for (const [key, value] of url.searchParams) {
        if (["select", "order", "offset", "limit"].includes(key)) continue;
        if (
          !/^(entity_kind|entity_id|status|slug|old_slug|snapshot->>collection_id)$/.test(
            key,
          )
        )
          throw Error("Unsupported test filter");
        const field =
          key === "snapshot->>collection_id"
            ? "snapshot->>'collection_id'"
            : `"${key}"`;
        const dot = value.indexOf(".");
        const op = value.slice(0, dot);
        if (!["eq", "neq"].includes(op))
          throw Error("Unsupported test comparison");
        params.push(value.slice(dot + 1));
        clauses.push(`${field} ${op === "eq" ? "=" : "<>"} $${params.length}`);
      }
      const where = clauses.length ? " where " + clauses.join(" and ") : "";
      const result = await f.as("anon", "", async (tx) => {
        const count = (
          await tx.query(
            `select count(*)::int n from public.${table}${where}`,
            params,
          )
        ).rows[0].n;
        const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
        const limit = Math.min(
          1000,
          Math.max(0, Number(url.searchParams.get("limit")) || 1000),
        );
        const order =
          table === "published_content" ? " order by sort_order,entity_id" : "";
        const rows = (
          await tx.query(
            `select * from public.${table}${where}${order} limit ${limit} offset ${offset}`,
            params,
          )
        ).rows;
        return { count, rows, offset };
      });
      res.setHeader(
        "content-range",
        `${result.offset}-${Math.max(result.offset, result.offset + result.rows.length - 1)}/${result.count}`,
      );
      const object = req.headers.accept?.includes("vnd.pgrst.object");
      if (object && result.rows.length !== 1) {
        res.writeHead(406);
        res.end(
          JSON.stringify({
            code: "PGRST116",
            details: `The result contains ${result.rows.length} rows`,
          }),
        );
        return;
      }
      res.end(JSON.stringify(object ? result.rows[0] : result.rows));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ message: error.message }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    ...f,
    cookie,
    fixtureToken,
    url: `http://127.0.0.1:${server.address().port}`,
    setUnavailable: (value) => {
      unavailable = value;
    },
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      await f.db.close();
    },
  };
}
module.exports = { dataApi };

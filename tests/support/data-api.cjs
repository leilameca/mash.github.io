// Test-only Data API facade over isolated PostgreSQL. It is not Supabase Auth,
// PostgREST or a production runtime. SQL, snapshots and RLS execute in PostgreSQL.
const http = require("node:http");
const { database } = require("./database.cjs");
async function dataApi({ adminMode = false, mediaTransport = false } = {}) {
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
  let runtimeOrigin='';const objects=new Map();let storageRequests=0,storageFailureAt=0;
  const rawOrigin='https://isolated.invalid';const mediaSuffix='/storage/v1/object/public/mash-media/';
  const fromWire=value=>mediaTransport&&runtimeOrigin?value.replaceAll(runtimeOrigin+mediaSuffix,rawOrigin+mediaSuffix):value;
  const wire=value=>{if(!mediaTransport||!runtimeOrigin)return value;const encoded=JSON.stringify(value);if(encoded===undefined)return value;return JSON.parse(encoded.replaceAll(rawOrigin+mediaSuffix,runtimeOrigin+mediaSuffix).replaceAll('"'+rawOrigin+'"','"'+runtimeOrigin+'"'));};
  async function adminRequest(req, url, service) {
    const table = url.pathname.replace("/rest/v1/", "");
    if (table.startsWith("rpc/")) {
      if (req.method !== "POST")
        throw Error("Unsupported fixture RPC");
      let body = "";
      for await (const chunk of req) body += chunk;
      const args = JSON.parse(fromWire(body));
      if (table === "rpc/save_mash_content") {
        if(service)throw Error("Editorial writes require an administrator session");
        const result = await f.save(args.p_changes);
        return { rpc: result, rows: [] };
      }
      if (table === "rpc/restore_mash_revision"&&!service)
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
      const rpcArgs={
        'rpc/begin_mash_media':{role:'authenticated',sql:'select public.begin_mash_media($1,$2,$3) result',params:[args.p_id,args.p_lease,JSON.stringify(args.p_meta)]},
        'rpc/complete_mash_media':{role:'service_role',sql:'select public.complete_mash_media($1,$2,$3,$4) result',params:[args.p_id,args.p_lease,args.p_original_path,JSON.stringify(args.p_variants)]},
        'rpc/fail_mash_media':{role:'service_role',sql:'select public.fail_mash_media($1,$2,$3) result',params:[args.p_id,args.p_lease,args.p_code]},
        'rpc/edit_mash_media':{role:'authenticated',sql:'select public.edit_mash_media($1,$2,$3) result',params:[JSON.stringify(args.p_assets),args.p_intent,args.p_name]},
        'rpc/mash_media_origin':{role:'authenticated',sql:'select public.mash_media_origin() result',params:[]},
      }[table];
      if(rpcArgs){if(service!==(rpcArgs.role==='service_role'))throw Error('Wrong fixture role for RPC');return {rpc:await f.as(rpcArgs.role,service?'':f.ADMIN,async tx=>(await tx.query(rpcArgs.sql,rpcArgs.params)).rows[0].result),rows:[]};}
      throw Error("Unsupported RPC");
    }
    const allowed = [
      "published_product_collections",
      "media_assets","media_library","media_variants","media_asset_references","media_events","product_collections",
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
        "select column_name,data_type from information_schema.columns where table_schema=$1 and table_name=$2",
        ["public", table],
      )
    ).rows;
    const types=Object.fromEntries(columns.map(r=>[r.column_name,r.data_type]));
    const columnNames=columns.map(r=>r.column_name);
    const clauses = [],
      params = [];
    for (const [key, value] of url.searchParams) {
      if (["select", "order", "offset", "limit"].includes(key)) continue;
      if (!columnNames.includes(key)) throw Error("Unsupported column " + key);
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
        if (!["eq", "neq", "ilike", "is", "gt", "gte", "lt", "lte"].includes(op))
          throw Error("Unsupported operation " + op);
        if (op === "is" && v === "null") {
          clauses.push(`"${key}" is null`);
          continue;
        }
        params.push(types[key]==="boolean"?v==="true":["integer","bigint","numeric"].includes(types[key])?Number(v):types[key]?.startsWith("timestamp")?new Date(v):v);
        clauses.push(
          `"${key}" ${op === "eq" ? "=" : op === "neq" ? "<>" : op === "ilike" ? "ilike" : op==="gt"?">":op==="gte"?">=":op==="lt"?"<":op==="lte"?"<=":"="} $${params.length}`,
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
        if (!columnNames.includes(key)) throw Error("Unsupported order");
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
          ["product_collections", "product"],
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
    for(const [key,value] of url.searchParams)url.searchParams.set(key,fromWire(value));
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
    // Explicit simulated Storage with real processed bytes. No hosted objects.
    if(adminMode&&url.pathname.startsWith('/storage/v1/object/')){
      const isPublic=url.pathname.startsWith('/storage/v1/object/public/');
      const key=decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\/(public\/)?/,''));
      if(req.method==='GET'&&(isService||isPublic&&key.startsWith('mash-media/'))){const object=objects.get(key);if(!object){res.writeHead(404);res.end(JSON.stringify({message:'Missing fixture object'}));return;}res.setHeader('content-type',object.mime);res.setHeader('access-control-allow-origin','*');res.end(object.bytes);return;}
      if(req.method==='POST'&&key.startsWith('list/')&&(isAdmin||isService)){let body='';for await(const chunk of req)body+=chunk;const filter=JSON.parse(body);const bucket=key.slice(5);const prefix=bucket+'/'+filter.prefix.replace(/\/$/,'')+'/';const rows=[...objects.entries()].filter(([k])=>k.startsWith(prefix)&&(!filter.search||k.includes(filter.search))).map(([k,v])=>({id:v.id,name:k.slice(prefix.length),metadata:{size:v.bytes.length,mimetype:v.mime},created_at:'2026-11-24T12:00:00Z'}));res.end(JSON.stringify(rows.slice(filter.offset||0,(filter.offset||0)+(filter.limit||100))));return;}
      if(req.method==='POST'&&isService&&/^(mash-media|mash-originals)\//.test(key)){
        storageRequests++;if(storageRequests===storageFailureAt){res.writeHead(503);res.end(JSON.stringify({message:'Synthetic upload interruption',statusCode:'503'}));return;}
        if(objects.has(key)){res.writeHead(409);res.end(JSON.stringify({message:'Already exists',statusCode:'409'}));return;}
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>31*1024*1024)throw Error('Fixture upload limit');chunks.push(chunk);}const id=require('node:crypto').randomUUID();objects.set(key,{id,bytes:Buffer.concat(chunks),mime:req.headers['content-type']||'application/octet-stream'});res.end(JSON.stringify({Id:id,Key:key}));return;
      }
      res.writeHead(403);res.end(JSON.stringify({message:'Fixture Storage access denied'}));return;
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
          JSON.stringify(wire(result.rpc ?? (object ? result.rows[0] : result.rows))),
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
    if (!["published_content", "published_redirects", "published_product_collections"].includes(table)) {
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
          !/^(entity_kind|entity_id|status|slug|old_slug|collection_id|snapshot->>collection_id)$/.test(
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
      res.end(JSON.stringify(wire(object ? result.rows[0] : result.rows)));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ message: error.message }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  runtimeOrigin=`http://127.0.0.1:${server.address().port}`;
  return {
    ...f,
    objects,failStorageAfter:n=>{storageFailureAt=storageRequests+n;},
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

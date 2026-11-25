const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolve } = require("node:path");
const { database, ADMIN, OUTSIDER } = require("./support/database.cjs");
const { loadTs } = require("./support/load-ts.cjs");

const transport = loadTs(
  resolve("lib/translation/provider.ts"),
  {},
  { Error, AbortSignal },
);
const { deepL } = transport;
const { runTranslation } = loadTs(
  resolve("lib/translation/run.ts"),
  { "./provider": transport },
  { Error, AbortSignal },
);
const { protectText } = loadTs(
  resolve("lib/translation/content.ts"),
  {},
  { Error },
);

async function setup() {
  const f = await database();
  const sql = (query, args, user = ADMIN) =>
    f.as("authenticated", user, (tx) => tx.query(query, args));
  const client = {
    async rpc(name, a) {
      const params =
        name === "claim_translation"
          ? [a.p_kind, a.p_id, a.p_version, a.p_mode, a.p_queue_only]
          : [
              a.p_id,
              a.p_lease,
              JSON.stringify(a.p_fields),
              JSON.stringify(a.p_text),
              JSON.stringify(a.p_alts),
              a.p_provider,
              a.p_billed,
              a.p_error,
              a.p_retry,
            ];
      assert.ok(["claim_translation", "finish_translation"].includes(name));
      const { rows } = await sql(
        `select public.${name}(${params.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
        params,
      );
      return { data: rows[0].result, error: null };
    },
  };
  const write = async (key, es, en = {}, changes = {}) =>
    (
      await f.save([
        {
          kind: "site",
          data: { key, value: {} },
          intent: "save",
          translations: [
            { locale: "es", value: es },
            { locale: "en", value: en },
          ],
          ...changes,
        },
      ])
    )[0];
  const target = ({ id, revision }) => ({
    id,
    version: revision,
    kind: "site",
  });
  const snapshot = async (id) =>
    (
      await f.db.query(
        "select snapshot from content_revisions where entity_id=$1 order by version desc limit 1",
        [id],
      )
    ).rows[0].snapshot;
  const status = async (id) =>
    (
      await sql(
        "select translation_state from studio_translation_entries where id=$1",
        [id],
      )
    ).rows[0].translation_state;
  return { ...f, sql, client, write, target, snapshot, status };
}

function fixtureProvider() {
  const calls = [];
  return {
    name: "Fixture (tests only)",
    calls,
    async translate(text) {
      calls.push(text);
      return {
        translations: text.map((value) =>
          value
            .replace("Muebles", "Furniture")
            .replace("exteriores", "outdoor")
            .replace("Cuidado", "Care"),
        ),
        billed: 42,
      };
    },
  };
}

test("brand protection hides commercial literals, contact information and URLs from the transport", () => {
  const source =
    "Muebles MASH y Fibra (Premium) https://mash.example/a ventas@mash.example +1 829 555 0199";
  const value = protectText(source, ["Fibra (Premium)"]);
  for (const hidden of ["MASH", "Fibra", "https:", "ventas@", "555"])
    assert.equal(value.marked.includes(hidden), false);
  assert.equal(
    value.restore(value.marked.replace("Muebles", "Furniture")),
    source.replace("Muebles", "Furniture"),
  );
  assert.throws(
    () => value.restore(value.marked.replace("<keep>0</keep>", "")),
    /invalid_response/,
  );
});

test("DeepL transport uses HTTPS, bounded batches, verifiable billing and Retry-After", async () => {
  const client = deepL("test-only:fx", async (url, request) => {
    assert.equal(url, "https://api-free.deepl.com/v2/translate");
    assert.equal(request.redirect, "error");
    assert.deepEqual(JSON.parse(request.body).ignore_tags, ["keep"]);
    return Response.json({
      translations: [{ text: "<text>Furniture</text>", billed_characters: 7 }],
    });
  });
  const result = await client.translate(["<text>Muebles</text>"]);
  assert.equal(result.billed, 7);
  assert.equal(result.translations[0], "<text>Furniture</text>");
  await assert.rejects(client.translate(Array(51).fill("x")), /size_limit/);
  const limited = deepL(
    "test-only",
    async () =>
      new Response(null, { status: 429, headers: { "Retry-After": "61" } }),
  );
  await assert.rejects(
    limited.translate(["x"]),
    (error) => error.code === "rate_limit" && error.delay === 61,
  );
});

test("SQL enqueues on save, protects manual English, reuses unchanged fields and isolates publishing", async () => {
  const f = await setup();
  try {
    await f.sql(
      "update translation_preferences set terms=array['Fibra'] where singleton",
    );
    const provider = fixtureProvider();
    const original = {
      title: "Muebles MASH",
      description: "Muebles exteriores",
      seo_title: "Muebles Fibra",
      external_url: "https://example.invalid",
    };
    const content = await f.write(
      "home.hero",
      original,
      { title: "Existing editorial English" },
      { intent: "publish" },
    );
    assert.equal(await f.status(content.id), "queued");
    const task = f.target(content);
    const result = await runTranslation(f.client, task, {
      queued: true,
      provider,
    });
    assert.equal(result.status, "translated");
    assert.equal(provider.calls.length, 1);
    assert.equal(provider.calls[0].length, 2);
    assert.equal(await f.status(content.id), "translated");
    const working = await f.snapshot(content.id);
    const english = working.translations.find((row) => row.locale === "en");
    assert.equal(english.value.title, "Existing editorial English");
    assert.equal(english.value.description, "Furniture outdoor");
    assert.equal(english.value.external_url, undefined);
    const publicResult = await f.as("anon", "", (tx) =>
      tx.query("select snapshot from published_content where entity_id=$1", [
        content.id,
      ]),
    );
    assert.equal(
      publicResult.rows[0].snapshot.translations.find(
        (row) => row.locale === "en",
      ).value.description,
      undefined,
    );

    const latest = await f.write(
      "home.hero",
      { ...original, description: "Muebles exteriores MASH" },
      {},
      { id: content.id, expected_version: 2 },
    );
    assert.equal(
      (await runTranslation(f.client, f.target(latest), { provider })).status,
      "translated",
    );
    assert.equal(provider.calls[1].length, 1);
    const reviewed = await runTranslation(
      f.client,
      { ...task, version: 4 },
      {
        mode: "review",
        provider: null,
        edits: { '["value","description"]': "Reviewed furniture copy" },
      },
    );
    assert.equal(reviewed.status, "reviewed");
    assert.equal(await f.status(content.id), "reviewed");
    const draft = await f.snapshot(content.id);
    assert.equal(
      draft.translations.find((row) => row.locale === "en").translation_status,
      "complete",
    );
    await f.save([
      {
        kind: "site",
        id: content.id,
        expected_version: 5,
        data: {},
        intent: "publish",
      },
    ]);
    const visible = await f.as("anon", "", (tx) =>
      tx.query("select snapshot from published_content where entity_id=$1", [
        content.id,
      ]),
    );
    assert.equal(
      visible.rows[0].snapshot.translations.find((row) => row.locale === "en")
        .value.description,
      "Reviewed furniture copy",
    );

    await f.sql("select public.restore_mash_revision($1,$2,$3,$4)", [
      "site",
      content.id,
      1,
      6,
    ]);
    assert.equal(
      (await f.snapshot(content.id)).translations.find(
        (row) => row.locale === "en",
      ).value.description,
      undefined,
    );
    assert.equal(await f.status(content.id), "queued");
  } finally {
    await f.db.close();
  }
});

test("concurrent reservations, provider failures and late replies preserve the edited working copy", async () => {
  const f = await setup();
  try {
    const content = await f.write("home.sections", {
      introTitle: "Muebles",
      introEyebrow: "Cuidado",
    });
    const target = f.target(content);
    const provider = fixtureProvider();
    let started, release;
    const ready = new Promise((resolve) => {
      started = resolve;
    });
    const wait = new Promise((resolve) => {
      release = resolve;
    });
    const pending = runTranslation(f.client, target, {
      provider: {
        ...provider,
        async translate(text) {
          started();
          await wait;
          return provider.translate(text);
        },
      },
    });
    await ready;
    assert.equal(
      (await runTranslation(f.client, target, { provider })).status,
      "processing",
    );
    const changed = await f.write(
      "home.sections",
      { introTitle: "Muebles nuevos", introEyebrow: "Cuidado" },
      {},
      { id: content.id, expected_version: 1 },
    );
    release();
    assert.equal((await pending).status, "stale");
    assert.equal(provider.calls.length, 1);
    const throwing = deepL(
      "test-only",
      async () => new Response(null, { status: 429 }),
    );
    const result = await runTranslation(f.client, f.target(changed), {
      provider: throwing,
    });
    assert.equal(result.status, "error");
    assert.equal(result.code, "rate_limit");
    assert.equal(await f.status(content.id), "error");
    assert.equal(
      (await runTranslation(f.client, f.target(changed), { provider })).status,
      "error",
    );
    assert.equal(
      (await f.snapshot(content.id)).translations.find(
        (row) => row.locale === "en",
      ),
      undefined,
    );
    await assert.rejects(
      f.sql(
        "select public.claim_translation($1,$2,$3,$4,false)",
        ["site", content.id, 2, "translate"],
        OUTSIDER,
      ),
      (error) => error.code === "42501",
    );
    await assert.rejects(
      f.as("anon", "", (tx) =>
        tx.query("select * from studio_translation_entries"),
      ),
      (error) => error.code === "42501",
    );
    assert.equal(
      (await f.sql("select id from translation_jobs", [], OUTSIDER)).rows
        .length,
      0,
    );
  } finally {
    await f.db.close();
  }
});

test("a batch persists independent jobs and records only usage returned by the provider", async () => {
  const f = await setup();
  try {
    await f.sql("update translation_preferences set auto_on_save=false where singleton");
    const first = await f.write("page.about", {
      title: "Muebles",
      description: "Muebles exteriores",
    });
    const second = await f.write("page.contact", {
      title: "Cuidado",
      description: "Muebles exteriores",
    });
    const selection = JSON.stringify([first, second].map(f.target));
    const queued = await f.sql(
      "select public.enqueue_translation_batch($1) n",
      [selection],
    );
    assert.equal(queued.rows[0].n, 2);
    const repeated = await f.sql(
      "select public.enqueue_translation_batch($1) n",
      [selection],
    );
    assert.equal(repeated.rows[0].n, 0);
    assert.equal(await f.status(second.id), "queued");
    const provider = fixtureProvider();
    for (const content of [first, second])
      assert.equal(
        (await runTranslation(f.client, f.target(content), { provider }))
          .status,
        "translated",
      );
    const history = await f.db.query(
      "select characters_billed,provider from translation_usage",
    );
    assert.deepEqual(
      history.rows.map((row) => row.characters_billed),
      [42, 42],
    );
    assert.ok(history.rows.every((row) => row.provider === provider.name));
  } finally {
    await f.db.close();
  }
});

test("translation entries expose editorial title, summary and placements without public access", async () => {
  const f = await setup();
  try {
    const saved = await f.write("announcement.a3e268d2-5085-4224-8045-8bcb0acc6bc4", {
      title: "Descuento de temporada",
      message: "En muebles seleccionados",
    }, {}, {
      data: {
        key: "announcement.a3e268d2-5085-4224-8045-8bcb0acc6bc4",
        value: {
          active: true, start: "", end: "", href: "/contacto", priority: 20,
          pages: ["home"], language: "both", presentation: "bar", dismissible: true, archived: false,
        },
      },
    });
    const query = "select name, editorial_summary, editorial_pages from studio_translation_entries where id=$1";
    const row = (await f.sql(query, [saved.id])).rows[0];
    assert.equal(row.name, "Descuento de temporada");
    assert.equal(row.editorial_summary, "En muebles seleccionados");
    assert.deepEqual(row.editorial_pages, ["home"]);
    assert.equal((await f.sql(query, [saved.id], OUTSIDER)).rows.length, 0);
  } finally {
    await f.db.close();
  }
});

test("product translation covers alternate text and SEO while preserving the commercial name and gallery", async () => {
  const f = await setup();
  try {
    const [collection] = await f.save([{
      kind: "collection", intent: "publish",
      data: { slug: "prueba-coleccion", cover_image_path: "/assets/images/oasis-set.jpg" },
      translations: [{ locale: "es", name: "MASH Outdoor", description: "Muebles para exteriores" }],
    }]);
    const image = "/assets/images/oasis-set.jpg";
    const [product] = await f.save([{
      kind: "product", intent: "publish", data: { slug: "modelo-oasis", collection_id: collection.id },
      translations: [{ locale: "es", name: "Oasis MASH", description: "Muebles para exteriores", seo_title: "Muebles Oasis MASH" }],
      images: [{ storage_path: image, alt_es: "Muebles MASH", sort_order: 0, is_primary: true }],
    }]);
    const provider = fixtureProvider();
    const target = { kind: "product", id: product.id, version: product.revision };
    assert.equal((await runTranslation(f.client, target, { provider })).status, "translated");
    const draft = await f.snapshot(product.id);
    const en = draft.translations.find(item => item.locale === "en");
    assert.equal(en.name, "Oasis MASH");
    assert.equal(en.seo_title, "Furniture Oasis MASH");
    assert.equal(draft.images[0].alt_en, "Furniture MASH");
    assert.equal(draft.images[0].storage_path, image);
    assert.equal(draft.images[0].is_primary, true);
    const publicSnapshot = await f.as("anon", "", tx => tx.query("select snapshot from published_content where entity_id=$1", [product.id]));
    assert.equal(publicSnapshot.rows[0].snapshot.images[0].alt_en, null);
    assert.equal((await runTranslation(f.client, { ...target, version: 2 }, { provider })).status, "translated");
    assert.equal(provider.calls.length, 1);
  } finally {
    await f.db.close();
  }
});

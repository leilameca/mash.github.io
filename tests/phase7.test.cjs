const assert = require("node:assert/strict");
const { test } = require("node:test");
const { resolve } = require("node:path");
const { loadTs } = require("./support/load-ts.cjs");
const { database, ADMIN, OUTSIDER } = require("./support/database.cjs");

const {
  announcementData,
  fromSantoDomingo,
  inSantoDomingo,
  withinAnnouncementWindow,
} = loadTs(resolve("lib/editorial/schema.ts"));
const { newSection, layoutSchema } = loadTs(resolve("lib/visual/schema.ts"));
const { translationFields, packFields } = loadTs(
  resolve("lib/translation/content.ts"),
);

const photo = "/assets/images/oasis-set.jpg";
const detailPhoto = "/assets/images/candor-clasico.jpg";
const block = "84d51004-098d-419f-a8dc-ce9f60df91c0";
const projectData = {
  slug: "phase7-project",
  location: "Ubicación general de prueba",
  cover_image_path: photo,
  editorial: {
    category: "Hotelero",
    products: [],
    collections: [],
    comparison: {
      before: photo,
      after: detailPhoto,
      x: 50,
      y: 35,
      fit: "cover",
    },
  },
};
const newsData = {
  category: "launches",
  date: "2026-11-21",
  author: "",
  featured: true,
  cover: photo,
  gallery: [],
  blocks: [{ id: block, type: "paragraph" }],
  products: [],
  projects: [],
  archived: false,
};
const announcement = {
  active: true,
  start: "2026-11-24T14:00:00.000Z",
  end: "2026-11-25T14:00:00.000Z",
  href: "/proyectos",
  priority: 20,
  pages: ["projects"],
  language: "es",
  presentation: "bar",
  dismissible: true,
  archived: false,
};
const newsCopy = {
  title: "Noticia de prueba",
  excerpt: "Extracto de prueba",
  ["body-" + block]: "Contenido de prueba",
};

test("Santo Domingo dates round-trip and announcements match locale, destination and exact time boundaries", () => {
  assert.equal(fromSantoDomingo("2026-11-24T10:00"), announcement.start);
  assert.equal(inSantoDomingo(announcement.start), "2026-11-24T10:00");
  assert.throws(() => fromSantoDomingo("2026-02-30T10:00"));
  const start = Date.parse(announcement.start);
  const end = Date.parse(announcement.end);
  assert.equal(
    withinAnnouncementWindow(announcement, "es", "projects", start - 1),
    false,
  );
  assert.equal(
    withinAnnouncementWindow(announcement, "es", "projects", start),
    true,
  );
  assert.equal(
    withinAnnouncementWindow(announcement, "es", "projects", end),
    false,
  );
  assert.equal(
    withinAnnouncementWindow(announcement, "es", "news", start),
    false,
  );
  assert.equal(
    withinAnnouncementWindow(announcement, "en", "projects", start),
    false,
  );
  assert.equal(
    withinAnnouncementWindow(
      { ...announcement, active: false },
      "es",
      "projects",
      start,
    ),
    false,
  );
  assert.equal(
    withinAnnouncementWindow(
      { ...announcement, archived: true },
      "es",
      "projects",
      start,
    ),
    false,
  );
  for (const href of [
    "javascript:alert(1)",
    "https://user@domain.invalid",
    "//domain.invalid",
  ]) {
    assert.equal(
      announcementData.safeParse({ ...announcement, href }).success,
      false,
    );
  }
});

test("SQL stores captions, keeps project drafts separate and restores privately", async (t) => {
  const { db, as, save } = await database();
  t.after(() => db.close());
  const [collection, product] = await save([
    {
      kind: "collection",
      intent: "save",
      data: { slug: "phase7-collection", cover_image_path: photo },
      translations: [
        {
          locale: "es",
          name: "Colección de prueba",
          description: "Descripción",
        },
      ],
    },
    {
      kind: "product",
      intent: "save",
      data: { slug: "phase7-product" },
      translations: [
        {
          locale: "es",
          name: "Producto de prueba",
          description: "Descripción",
        },
      ],
    },
  ]);
  const asset = (
    await db.query(
      "insert into media_assets(original_name,folder,state,canonical_path) values ('phase7.jpg','projects','legacy',$1) returning id",
      [detailPhoto],
    )
  ).rows[0];
  const linked = {
    ...projectData.editorial,
    products: [product.id],
    collections: [collection.id],
  };
  const [project] = await save([
    {
      kind: "project",
      intent: "publish",
      expected_version: 0,
      data: { ...projectData, editorial: linked },
      translations: [
        {
          locale: "es",
          title: "Proyecto sintético",
          description: "Descripción",
          details: { excerpt: "Resumen", before_label: "Antes" },
        },
      ],
      images: [
        {
          storage_path: photo,
          alt_es: "Patio",
          caption_es: "Terraza privada",
          sort_order: 0,
          is_cover: true,
        },
      ],
    },
  ]);
  const published = async () =>
    as(
      "anon",
      null,
      async (tx) =>
        (
          await tx.query(
            "select snapshot from published_content where entity_id=$1",
            [project.id],
          )
        ).rows[0]?.snapshot,
    );
  const first = await published();
  assert.equal(first.location, projectData.location);
  assert.deepEqual(first.editorial.products, [product.id]);
  assert.deepEqual(first.editorial.collections, [collection.id]);
  const usage = await db.query(
    "select distinct source from media_asset_references where asset_id=$1 and entity_id=$2 order by source",
    [asset.id, project.id],
  );
  assert.deepEqual(
    usage.rows.map((row) => row.source),
    ["publication", "revision", "working"],
  );
  await assert.rejects(
    save([
      {
        kind: "project",
        id: project.id,
        expected_version: project.revision,
        intent: "save",
        data: { editorial: { ...linked, products: [block] } },
      },
    ]),
    /Related entity does not exist/,
  );
  assert.equal(first.editorial.coordinates, undefined);
  assert.equal(first.images[0].caption_es, "Terraza privada");
  assert.equal(first.translations[0].details.excerpt, "Resumen");
  await assert.rejects(
    as("anon", null, (tx) => tx.query("select * from content_publications")),
  );

  const [draft] = await save([
    {
      kind: "project",
      id: project.id,
      expected_version: project.revision,
      intent: "save",
      data: {
        location: "Región de prueba",
      },
    },
  ]);
  assert.equal((await published()).location, projectData.location);
  await assert.rejects(
    save([
      {
        kind: "project",
        id: project.id,
        expected_version: project.revision,
        intent: "publish",
        data: {},
      },
    ]),
    /Revision conflict/,
  );
  const [live] = await save([
    {
      kind: "project",
      id: project.id,
      expected_version: draft.revision,
      intent: "publish",
      data: {},
    },
  ]);
  const current = await published();
  assert.equal(current.location, "Región de prueba");
  assert.equal(current.editorial.coordinates, undefined);
  await as("authenticated", ADMIN, (tx) =>
    tx.query(
      "select public.restore_mash_revision('project',$1,$2,$3) restored",
      [project.id, project.revision, live.revision],
    ),
  );
  const restored = (
    await db.query("select editorial, location from projects where id=$1", [
      project.id,
    ])
  ).rows[0];
  assert.equal(restored.location, projectData.location);
  assert.equal((await published()).location, current.location);

  const fields = translationFields("project", current);
  assert.ok(fields.some((field) => field.path[0] === "captions"));
  assert.ok(fields.some((field) => field.path.join(".") === "details.excerpt"));
  const packed = packFields(
    [
      { path: ["alts", photo], text: "Patio" },
      { path: ["captions", photo], text: "Private terrace" },
    ],
    current,
  );
  assert.deepEqual(
    { ...packed.alts[photo] },
    { alt_en: "Patio", caption_en: "Private terrace" },
  );
  const restoredVersion = Number(
    (await db.query("select revision from projects where id=$1", [project.id]))
      .rows[0].revision,
  );
  const claim = await as(
    "authenticated",
    ADMIN,
    async (tx) =>
      (
        await tx.query(
          "select public.claim_translation('project',$1,$2,'translate',false) result",
          [project.id, restoredVersion],
        )
      ).rows[0].result,
  );
  assert.equal(claim.status, "claimed");
  const translated = await as(
    "authenticated",
    ADMIN,
    async (tx) =>
      (
        await tx.query(
          "select public.finish_translation($1,$2,'{}',$3,$4,'Fixture',null,null,null) result",
          [
            claim.id,
            claim.lease,
            JSON.stringify({
              title: "Synthetic project",
              description: "Description",
              details: { excerpt: "Summary" },
            }),
            JSON.stringify(packed.alts),
          ],
        )
      ).rows[0].result,
  );
  assert.equal(translated, "translated");
  assert.equal(
    (
      await db.query(
        "select caption_en from project_images where project_id=$1",
        [project.id],
      )
    ).rows[0].caption_en,
    "Private terrace",
  );
  assert.equal((await published()).images[0].caption_en, null);
});

test("SQL gates editorial publication, preserves stable routes and supports all five editorial visual blocks", async (t) => {
  const { db, as, save } = await database();
  t.after(() => db.close());
  const create = (key, value, es, intent = "save") => ({
    kind: "site",
    expected_version: 0,
    intent,
    data: { key, value },
    translations: [{ locale: "es", value: es }],
  });
  const [news] = await save([create("news.phase7-test", newsData, newsCopy)]);
  const publicRow = async (id) =>
    as(
      "anon",
      null,
      async (tx) =>
        (
          await tx.query(
            "select snapshot from published_content where entity_id=$1",
            [id],
          )
        ).rows[0]?.snapshot,
    );
  assert.equal(await publicRow(news.id), undefined);
  await assert.rejects(
    save([
      create(
        "news.incomplete",
        { ...newsData, cover: "" },
        newsCopy,
        "publish",
      ),
    ]),
    /requires title/,
  );
  await assert.rejects(
    save([create("news.outside", newsData, newsCopy)], OUTSIDER),
  );
  const [newsLive] = await save([
    {
      kind: "site",
      id: news.id,
      expected_version: news.revision,
      intent: "publish",
      data: {},
    },
  ]);
  assert.equal((await publicRow(news.id)).key, "news.phase7-test");
  await assert.rejects(
    save([
      {
        kind: "site",
        id: news.id,
        expected_version: newsLive.revision,
        intent: "save",
        data: { key: "news.rename" },
      },
    ]),
    /identity cannot change/,
  );
  await assert.rejects(
    save([
      create(
        "announcement.764c6c76-cbda-40b8-9d4c-09e84cb98c14",
        { ...announcement, href: "javascript:bad" },
        { title: "Prueba", message: "Prueba" },
        "publish",
      ),
    ]),
    /Unsafe announcement/,
  );
  const [ad] = await save([
    create(
      "announcement.a751600d-c635-46dd-bb61-7dfd77f812e3",
      announcement,
      { title: "Título", message: "Aviso programado" },
      "publish",
    ),
  ]);

  const [future] = await save([
    create(
      "announcement.85baaf08-bc78-4aa6-9d17-325919276d4c",
      { ...announcement, start: "9999-11-24T14:00:00.000Z", end: "" },
      { title: "Título", message: "Futuro" },
      "publish",
    ),
  ]);
  const [expired] = await save([
    create(
      "announcement.89c019c3-f3e0-450b-9a39-baa396c873fa",
      { ...announcement, start: "", end: "2000-11-24T14:00:00.000Z" },
      { title: "Título", message: "Vencido" },
      "publish",
    ),
  ]);
  assert.equal(await publicRow(future.id), undefined);
  assert.equal(await publicRow(expired.id), undefined);

  const types = [
    "projects-grid",
    "news-list",
    "news-featured",
    "comparison",
    "announcements",
  ];
  const layout = {
    schema: 1,
    sections: [
      newSection("navigation", "header"),
      ...types.map((type) => ({
        ...newSection(type, type),
        entities: type.startsWith("news-")
          ? [news.id]
          : type === "announcements"
            ? [ad.id]
            : [],
        media: type === "comparison" ? [photo, detailPhoto] : [],
      })),
      newSection("footer", "footer"),
    ],
  };
  assert.ok(layoutSchema.safeParse(layout).success);
  await save([
    create(
      "visual.home",
      { composition: layout },
      { comparison__before: "Antes", comparison__after: "Después" },
      "publish",
    ),
  ]);
  layout.sections[2].entities = [ad.id];
  await assert.rejects(
    save([create("visual.projects", { composition: layout }, {})]),
    /Invalid visual entity/,
  );

  const [archived] = await save([
    {
      kind: "site",
      id: news.id,
      expected_version: newsLive.revision,
      intent: "archive",
      data: { value: { archived: true } },
    },
  ]);
  assert.equal(await publicRow(news.id), undefined);
  await as("authenticated", ADMIN, (tx) =>
    tx.query("select public.restore_mash_revision('site',$1,$2,$3)", [
      news.id,
      archived.revision,
      archived.revision,
    ]),
  );
  const recovered = (
    await db.query("select value from site_content where id=$1", [news.id])
  ).rows[0].value;
  assert.equal(recovered.archived, false);
  assert.equal(await publicRow(news.id), undefined);
});

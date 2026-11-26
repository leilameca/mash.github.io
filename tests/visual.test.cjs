const assert = require("node:assert/strict");
const { test } = require("node:test");
const { resolve } = require("node:path");
const { loadTs } = require("./support/load-ts.cjs");
const { database, OUTSIDER } = require("./support/database.cjs");
const registry = loadTs(resolve("lib/visual/schema.ts"));
const { adaptLegacy, fromSnapshot, recoverPublishedHomeEnglish } = loadTs(resolve("lib/visual/document.ts"));
const {
  historyReducer,
  beginHistory,
  moveSection,
  duplicateSection,
  removeSection,
  changeSection,
} = loadTs(resolve("lib/visual/history.ts"));
const { translationFields } = loadTs(resolve("lib/translation/content.ts"));
const block = (type, id) => registry.newSection(type, id);
test("restores the original section order once and keeps later Studio arrangements", () => {
  const sections = [
    block("navigation", "header"),
    block("editorial", "legacy-materials"),
    block("image-text", "legacy-material-one"),
    block("image-text", "legacy-material-two"),
    block("editorial", "legacy-benefits"),
    block("editorial", "legacy-faq"),
    block("news-list", "legacy-news"),
    block("footer", "footer"),
  ];
  const composition = { schema: 1, sections };
  const read = (value) => fromSnapshot({ key: "visual.home", value, translations: [] }, 4).layout.sections.map((section) => section.id);
  assert.deepEqual(read({ composition }).slice(1, 4), [
    "legacy-benefits", "legacy-faq", "legacy-materials",
  ]);
  assert.deepEqual(read({ composition, homeLayout: "editorial" }), sections.map((section) => section.id));
});
test("a pending Home composition can inherit only matching, previously approved English", () => {
  const rows = {
    "home.hero": {
      value: {},
      translations: [
        { locale: "es", value: { title: "Exterior", description: "Descripción anterior" } },
        { locale: "en", translation_status: "complete", value: { title: "Outdoors", description: "Previous description" } },
      ],
    },
    "home.sections": {
      value: {},
      translations: [
        { locale: "es", value: { introTitle: "Bienvenidos" } },
        { locale: "en", translation_status: "pending", value: { introTitle: "Unreviewed text" } },
      ],
    },
  };
  const doc = adaptLegacy("home", rows);
  doc.es["legacy-hero__body"] = "Descripción nueva";
  doc.englishReady = false;
  const { inheritedEnglish } = recoverPublishedHomeEnglish(doc, rows);
  assert.equal(inheritedEnglish["legacy-hero__title"], "Outdoors");
  assert.equal(inheritedEnglish["legacy-hero__body"], undefined);
  assert.equal(inheritedEnglish["legacy-intro__title"], undefined);
});
test("saved legacy home galleries recover missing lifestyle photos without changing custom galleries", () => {
  const first = block("gallery", "legacy-lifestyle-one");
  const second = { ...block("gallery", "legacy-lifestyle-two"), media: ["/assets/images/oasis-set.jpg"] };
  const third = { ...block("gallery", "legacy-lifestyle-three"), visible: false };
  const custom = block("gallery", "custom-gallery");
  const composition = { schema: 1, sections: [
    block("navigation", "header"), first, second, third, custom, block("footer", "footer"),
  ] };
  const doc = fromSnapshot({ key: "visual.home", value: { composition }, translations: [] }, 0);
  assert.ok(doc);
  assert.equal(doc.layout.sections[1].media[0], "/assets/images/cama-balinesa-trap.jpg");
  assert.equal(doc.layout.sections[2].media[0], "/assets/images/oasis-set.jpg");
  assert.equal(doc.layout.sections[3].visible, false);
  assert.equal(doc.layout.sections[3].media[0], "/assets/images/oculus-chaise.jpg");
  assert.equal(doc.layout.sections[4].media.length, 0);
});

function sample() {
  const hero = {
    ...block("hero", "photo-hero"),
    media: ["/assets/images/oasis-set.jpg"],
  };
  return {
    layout: {
      schema: 1,
      sections: [
        block("navigation", "header"),
        hero,
        block("editorial", "story"),
        block("footer", "footer"),
      ],
    },
    es: {
      "photo-hero__title": "Texto sintético",
      story__title: "Historia de prueba",
    },
    en: { "photo-hero__title": "Synthetic draft" },
    revision: 0,
  };
}
test("legacy adaptation keeps order, original photos, both languages and hidden CMS sections", () => {
  const doc = adaptLegacy("home", {
    "home.hero": {
      value: {
        image_path: "/assets/images/oasis-set.jpg",
        showroom_small_image_path: "/assets/images/candor-clasico.jpg",
      },
      translations: [
        { locale: "es", value: { title: "Title ES" } },
        { locale: "en", value: { title: "Title EN" } },
      ],
      images: [],
    },
    "home.sections": {
      value: { visible: { philosophy: false } },
      translations: [
        {
          locale: "es",
          value: {
            materialOneTitle: "Fibra",
            faq1Answer: "Respuesta de prueba",
          },
        },
      ],
      images: [],
    },
  });
  assert.ok(registry.layoutSchema.safeParse(doc.layout).success);
  assert.equal(doc.es["legacy-hero__title"], "Title ES");
  assert.equal(doc.en["legacy-hero__title"], "Title EN");
  assert.equal(
    doc.layout.sections.find((block) => block.id === "legacy-philosophy")
      .visible,
    false,
  );
  assert.equal(
    doc.layout.sections.find((block) => block.id === "legacy-showroom")
      .media[0],
    "/assets/images/candor-clasico.jpg",
  );
  assert.equal(doc.es["legacy-faq-1__body"], "Respuesta de prueba");
});
test("first Home adaptation includes recent news without restoring intentional removal", () => {
  const original = adaptLegacy("home", {});
  const news = original.layout.sections.filter((section) => section.type === "news-list");
  assert.equal(news.length, 1);
  assert.equal(news[0].href, "/noticias");
  assert.equal(original.en["legacy-news__title"], "News");
  const removed = removeSection(original, news[0].id);
  const saved = fromSnapshot({
    key: "visual.home",
    value: { composition: removed.layout },
    translations: [],
    images: [],
  }, 2);
  assert.ok(saved);
  assert.equal(saved.layout.sections.some((section) => section.type === "news-list"), false);
});

test("workshop defaults retain its location and reject unsafe map URLs", () => {
  const { workshopDefaults, workshopContent, isMapsLink } = loadTs(resolve("lib/workshop.ts"));
  assert.ok(isMapsLink(workshopDefaults.directions));
  assert.ok(isMapsLink("https://www.google.com/maps?q=Santiago"));
  assert.equal(isMapsLink("https://www.google.com.attacker.invalid/maps"), false);
  assert.equal(isMapsLink("https://other.invalid/maps"), false);
  const map = workshopContent("en", { latitude: 91, longitude: -181, visible: false }, { button: "Directions to the workshop" });
  assert.equal(map.latitude, workshopDefaults.latitude);
  assert.equal(map.longitude, workshopDefaults.longitude);
  assert.equal(map.visible, false);
  assert.equal(map.button, "Directions to the workshop");
});

test("editor operations keep chrome fixed, copy translated text and undo a grouped edit", () => {
  const doc = sample();
  const moved = moveSection(doc, "story", "photo-hero");
  assert.equal(moved.layout.sections[1].id, "story");
  assert.equal(moveSection(moved, "header", "story"), moved);
  assert.equal(removeSection(doc, "footer"), doc);
  const duplicate = duplicateSection(doc, "photo-hero", "duplicated");
  assert.equal(duplicate.en["duplicated__title"], doc.en["photo-hero__title"]);
  const removed = removeSection(duplicate, "duplicated");
  assert.equal(removed.en["duplicated__title"], undefined);
  let history = beginHistory(doc);
  const setVisible = (visible) => (current) =>
    changeSection(current, "photo-hero", (s) => ({ ...s, visible }));
  history = historyReducer(history, {
    type: "change",
    group: "visible",
    apply: setVisible(false),
  });
  history = historyReducer(history, {
    type: "change",
    group: "visible",
    apply: setVisible(true),
  });
  assert.equal(history.past.length, 1);
  assert.equal(historyReducer(history, { type: "undo" }).present, doc);
  const committed = { ...history.present, id: "first", revision: 2 };
  history = historyReducer(history, { type: "commit", doc: committed });
  const undone = historyReducer(history, { type: "undo" });
  assert.equal(undone.present.revision, 2);
  assert.equal(historyReducer(undone, { type: "redo" }).present, committed);
});
test("a block inherits device controls and rejects unsafe or irrelevant properties", () => {
  const doc = sample(),
    hero = doc.layout.sections[1];
  hero.design = { titleSize: 56, textColor: "white", x: 45 };
  hero.mobile = { x: 80, titleSize: 32 };
  assert.equal(registry.effectiveDesign(hero, "tablet").x, 45);
  assert.equal(registry.effectiveDesign(hero, "mobile").x, 80);
  assert.ok(registry.layoutSchema.safeParse(doc.layout).success);
  for (const mutation of [
    { href: "javascript:alert(1)" },
    { design: { color: "url(////foo)" } },
    { mobile: { titleSize: 400 } },
    { media: ["/assets/images/%2e%2e/x"] },
    { type: "invalid" },
  ]) {
    const unsafe = changeSection(doc, hero.id, (s) => ({ ...s, ...mutation }));
    assert.equal(registry.layoutSchema.safeParse(unsafe.layout).success, false);
  }
  assert.equal(
    registry.layoutSchema.safeParse(
      changeSection(doc, "story", (s) => ({
        ...s,
        media: ["/assets/images/oasis-set.jpg"],
      })).layout,
    ).success,
    false,
  );
});
test("visual text exposes stable keys; removed blocks and design do not become translation inputs", () => {
  const doc = sample();
  const fields = translationFields("site", {
    key: "visual.home",
    value: { composition: doc.layout },
    translations: [
      { locale: "es", value: { ...doc.es, deleted__title: "Viejo" } },
      { locale: "en", value: doc.en },
    ],
    images: [],
  });
  assert.deepEqual(
    Array.from(fields, (f) => f.path[1]),
    ["photo-hero__title", "story__title"],
  );
});

test("real PostgreSQL stores, publishes, restores and protects visual compositions", async () => {
  const f = await database();
  try {
    const doc = sample();
    const command = (d, t = "save", id, revision) => ({
      kind: "site",
      id,
      expected_version: revision,
      intent: t,
      data: { key: "visual.home", value: { composition: d.layout } },
      translations: [
        { locale: "es", value: d.es },
        { locale: "en", value: d.en },
      ],
    });
    const [saved] = await f.save([command(doc)]);
    const request = () =>
      f.as("anon", "", (tx) =>
        tx.query(
          "select snapshot from published_content where slug='visual.home'",
        ),
      );
    assert.equal((await request()).rows.length, 0);
    const empty = {
      ...doc,
      layout: {
        ...doc.layout,
        sections: doc.layout.sections.filter(
          (section) => registry.blockRegistry[section.type].protected,
        ),
      },
      es: {},
      en: {},
    };
    await assert.rejects(
      f.save([command(empty, "publish", saved.id, 1)]),
      (error) => error.code === "22023",
    );
    const [published] = await f.save([command(doc, "publish", saved.id, 1)]);
    assert.equal(published.revision, 2);
    const live = (await request()).rows[0].snapshot;
    assert.equal(
      fromSnapshot(live, 2).es["photo-hero__title"],
      "Texto sintético",
    );
    const edited = changeSection(doc, "photo-hero", (s) => ({
      ...s,
      mobile: { x: 82 },
    }));
    await f.save([command(edited, "save", saved.id, 2)]);
    assert.equal(
      (await request()).rows[0].snapshot.value.composition.sections[1].mobile.x,
      undefined,
    );
    await assert.rejects(
      f.save([command(doc, "save", saved.id, 2)]),
      (e) => e.code === "40001",
    );
    await assert.rejects(
      f.save([command(doc, "save", saved.id, 3)], OUTSIDER),
      (e) => e.code === "42501",
    );
    for (const patch of [
      { href: "//example.invalid" },
      {
        media: [
          "https://example.invalid/storage/v1/object/public/mash-media/site/a.webp",
        ],
      },
      { design: { textColor: "red;display:none" } },
      { mobile: { padding: 900 } },
    ]) {
      const invalid = changeSection(doc, "photo-hero", (s) => ({
        ...s,
        ...patch,
      }));
      await assert.rejects(
        f.save([command(invalid, "publish", saved.id, 3)]),
        (e) => e.code === "22023",
      );
    }
    const refs = await f.db.query(
      "select source from media_asset_references where entity_id=$1",
      [saved.id],
    );
    assert.ok(refs.rows.some((r) => r.source === "revision"));
    assert.ok(refs.rows.some((r) => r.source === "publication"));
    await f.as("authenticated", f.ADMIN, (tx) =>
      tx.query("select public.restore_mash_revision($1,$2,$3,$4)", [
        "site",
        saved.id,
        1,
        3,
      ]),
    );
    const copy = (
      await f.db.query(
        "select snapshot from content_revisions where entity_id=$1 and version=4",
        [saved.id],
      )
    ).rows[0].snapshot;
    assert.deepEqual(copy.value.composition, live.value.composition);
    assert.deepEqual((await request()).rows[0].snapshot, live);
  } finally {
    await f.db.close();
  }
});

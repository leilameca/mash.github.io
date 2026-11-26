const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(readFileSync(path.join(__dirname, "../lib/supabase/site-content.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function contentFixture(value, translations = []) {
  const query = {
    select() { return query; }, eq() { return query; },
    maybeSingle: async () => ({ data: { value, site_content_translations: translations }, error: null })
  };
  const {loadTs}=require('./support/load-ts.cjs');
  return loadTs(path.join(__dirname,"../lib/supabase/site-content.ts"),{
    "@/lib/content":{},"./persistence":{},
    "./published": {
      readPublished: async () => [{ slug: "home.sections", snapshot: { value, translations } }],
      readPublishedSite: async () => ({ value, translations }),
      localizedTranslation: (rows, locale) => ({
        text: rows.find((row) => row.locale === locale) ?? rows.find((row) => row.locale === "es"),
        pending: false,
      }),
    },
  });
}

test("public home reads every saved section image in both languages", async () => {
  const imageKeys = ["introImage", "lifestyleImageOne", "lifestyleImageTwo", "lifestyleImageThree", "philosophyImage", "projectsImage", "materialsPrimaryImage", "materialsSecondaryImage"];
  const shared = Object.fromEntries(imageKeys.map((key) => [key, `https://media.test/${key}.jpg`]));
  const content = contentFixture(shared, [{ locale: "es", value: { lifestyleLabelOne: "Patios nuevos" } }]);
  for (const locale of ["es", "en"]) {
    const actual = await content.getHomeSectionsContent(locale);
    for (const key of imageKeys) assert.equal(actual[key], shared[key]);
  }
  assert.equal((await content.getHomeSectionsContent("es")).lifestyleLabels[0], "Patios nuevos");
});

test("missing section images stay empty and never restore legacy defaults", async () => {
  const content = contentFixture({ introImage: "/new-intro.jpg", lifestyleImageTwo: "" });
  const actual = await content.getHomeSectionsContent("es");

  assert.equal(actual.introImage, "/new-intro.jpg");
  for (const key of ["lifestyleImageOne", "lifestyleImageTwo", "lifestyleImageThree"]) assert.equal(actual[key], "");
});

test("visible legacy lifestyle bands recover missing photos and respect cleared slots", async () => {
  const legacy = contentFixture({ visible: { lifestyle: true } });
  const cleared = contentFixture({ visible: { lifestyle: true }, lifestyleImageTwo: "" });
  for (const locale of ["es", "en"]) {
    const actual = await legacy.getHomeSectionsContent(locale);
    assert.equal(actual.lifestyleImageOne, "/assets/images/cama-balinesa-trap.jpg");
    assert.equal(actual.lifestyleImageTwo, "/assets/images/rombois-set.jpg");
    assert.equal(actual.lifestyleImageThree, "/assets/images/oculus-chaise.jpg");
    assert.equal((await cleared.getHomeSectionsContent(locale)).lifestyleImageTwo, "");
  }
});

test("public hero and about page use the stored image URLs", async () => {
  const shared = { image_path: "https://media.test/new.jpg", showroom_main_image_path: "/new-main.jpg", showroom_small_image_path: "/new-small.jpg" };
  const content = contentFixture(shared);
  for (const locale of ["es", "en"]) {
    const hero = await content.getHomeHeroContent(locale);
    assert.equal(hero.image, shared.image_path);
    assert.equal(hero.showroomMainImage, shared.showroom_main_image_path);
    assert.equal(hero.showroomSmallImage, shared.showroom_small_image_path);
    assert.equal((await content.getMarketingPageContent("about", locale)).image, shared.image_path);
  }
});

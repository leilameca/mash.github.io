const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the actual server action with isolated database and storage adapters.
const source = ts.transpileModule(
  readFileSync(path.join(__dirname, "../app/studio-mash/actions.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;

function fixture(savedPaths = ["/one.jpg", "/two.jpg"], imageError = null, heroValue = {}, failure = {}) {
  const calls = [];
  const revalidated = [];
  const savedImages = savedPaths.map((storage_path, index) => ({ id: `image-${index}`, storage_path }));
  const admin = {
    from(table) {
      let operation = "select";
      const query = {
        select() { return query; },
        eq() { return query; },
        neq() { return query; },
        in(column, values) { calls.push({ table, operation, column, values }); return query; },
        update(rows) { operation = "update"; calls.push({ table, operation, rows }); return query; },
        insert(rows) { operation = "insert"; calls.push({ table, operation, rows }); return query; },
        upsert(rows, options) { operation = "upsert"; calls.push({ table, operation, rows, options }); return query; },
        delete() { operation = "delete"; return query; },
        single() { return query; },
        maybeSingle() { return query; },
        then(resolve, reject) {
          return Promise.resolve({
            data: ["products", "projects", "collections"].includes(table) ? { id: "record-1" } : table === "site_content" ? { id: "hero-1", value: heroValue } : savedImages,
            error: table === failure.table && operation === failure.operation ? { message: "Database unavailable" } : table === "product_images" && operation === "upsert" ? imageError : null
          }).then(resolve, reject);
        }
      };
      return query;
    }
  };
  const module = { exports: {} };
  const mocks = {
    "next/cache": { revalidatePath(...args) { revalidated.push(args); } },
    "next/navigation": { redirect(url) { throw new Error(`redirect:${url}`); } },
    "@/lib/supabase/env": { adminRoute: "/studio-mash" },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => admin },
    "@/lib/supabase/auth": { requireAdmin: async () => ({ user_id: "admin-1" }) },
    "@/lib/supabase/server": {},
    "@/lib/supabase/site-content": {
      HOME_HERO_IMAGES: {
        image_path: "/assets/images/oasis-hero-v2.jpg",
        showroom_main_image_path: "/assets/images/candor-mix-collection.jpeg",
        showroom_small_image_path: "/assets/images/oculus-mare-dining.jpg"
      }
    },
    "@/lib/supabase/media": {
      getImageFile: (data, field) => { const file = data.get(field); return file instanceof File && file.size ? file : null; },
      validateImage: (file) => file.type === "image/jpeg" ? null : "Invalid image format",
      uploadImage: async (_admin, file) => ({ publicUrl: `/uploaded/${file.name}`, storagePath: file.name }),
      removeUploadedImage: async (_admin, storagePath) => calls.push({ operation: "cleanup", storagePath })
    }
  };
  vm.runInNewContext(source, {
    module, exports: module.exports, require: (name) => mocks[name] ?? require(name), File, FormData
  });
  return { save: module.exports.upsertProduct, saveHero: module.exports.upsertHomeContent, actions: module.exports, calls, revalidated };
}

function form(paths = ["/one.jpg", "/two.jpg"], primary = "/two.jpg") {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    id: "product-1", slug: "candor-set", collection_id: "collection-1", status: "draft",
    name_es: "Set de comedor Candor", description_es: "Un comedor para compartir en familia.",
    name_en: "Candor dining table set", description_en: "Warm, elegant and welcoming for family dinners.",
    existing_image_paths: JSON.stringify(paths), existing_image_path: "/one.jpg", primary_image_path: primary
  })) data.set(key, value);
  return data;
}

async function saved(save, data) {
  await assert.rejects(save({}, data), /redirect:\/studio-mash\/productos/);
}

test("editing English text without uploads saves unique images and the selected primary", async () => {
  const { save, calls } = fixture();
  await saved(save, form(["/one.jpg", "/two.jpg", "/one.jpg"]));
  const images = calls.find((call) => call.table === "product_images" && call.operation === "upsert").rows;
  assert.equal(images.length, 2);
  assert.deepEqual(Array.from(images, (row) => row.is_primary), [false, true]);
  const translations = calls.find((call) => call.table === "product_translations").rows;
  assert.deepEqual(Array.from(translations, (row) => row.locale), ["es", "en"]);
  assert.equal(translations[1].description, form().get("description_en"));
});

test("removing the old primary deletes its gallery record and keeps exactly one primary", async () => {
  const { save, calls } = fixture();
  await saved(save, form(["/two.jpg"]));
  const deletion = calls.find((call) => call.operation === "delete");
  assert.deepEqual(Array.from(deletion.values), ["image-0"]);
  const images = calls.find((call) => call.table === "product_images" && call.operation === "upsert").rows;
  assert.equal(images[0].is_primary, true);
});

test("a new image can replace every existing image and become primary", async () => {
  const { save, calls } = fixture();
  const data = form([], "");
  data.append("product_images", new File(["first"], "first.jpg", { type: "image/jpeg" }));
  data.append("product_images", new File(["second"], "second.jpg", { type: "image/jpeg" }));
  data.set("primary_new_image_index", "1");
  await saved(save, data);
  const images = calls.find((call) => call.table === "product_images" && call.operation === "upsert").rows;
  assert.deepEqual(Array.from(images, (row) => [row.storage_path, row.is_primary]), [
    ["/uploaded/first.jpg", false], ["/uploaded/second.jpg", true]
  ]);
  assert.equal(calls.find((call) => call.operation === "delete").values.length, 2);
});

test("an empty gallery cannot silently restore a removed primary", async () => {
  const { save, calls } = fixture();
  assert.ok((await save({}, form([]))).errors.hero_image);
  assert.equal(calls.length, 0);
});

test("malformed galleries and images belonging to another product are rejected", async () => {
  for (const value of ['{"path":"/one.jpg"}', '[null]', '["/foreign.jpg"]']) {
    const { save, calls } = fixture();
    const data = form();
    data.set("existing_image_paths", value);
    assert.ok((await save({}, data)).errors.hero_image);
    assert.equal(calls.length, 0);
  }
});

test("a failed image save does not delete existing images or clear their primary flag", async () => {
  const { save, calls } = fixture(undefined, { message: "Database unavailable" });
  assert.equal((await save({}, form(["/two.jpg"]))).message, "Database unavailable");
  assert.equal(calls.some((call) => call.table === "product_images" && ["delete", "update"].includes(call.operation)), false);
});

function heroForm() {
  const data = new FormData();
  for (const field of ["title_es", "description_es", "title_en", "description_en"]) {
    data.set(field, "Outdoor furniture for family gatherings.");
  }
  return data;
}

test("hero support images can both be replaced while preserving the background", async () => {
  const { saveHero, calls } = fixture(undefined, null, { image_path: "/background.jpg", extra: "keep" });
  const data = heroForm();
  data.append("hero_showroom_main_image", new File(["main"], "main.jpg", { type: "image/jpeg" }));
  data.append("hero_showroom_small_image", new File(["small"], "small.jpg", { type: "image/jpeg" }));
  assert.equal((await saveHero({}, data)).ok, true);
  const value = calls.find((call) => call.table === "site_content" && call.operation === "update").rows.value;
  assert.equal(value.image_path, "/background.jpg");
  assert.equal(value.showroom_main_image_path, "/uploaded/main.jpg");
  assert.equal(value.showroom_small_image_path, "/uploaded/small.jpg");
  assert.equal(value.extra, "keep");
});

test("saving hero text preserves all three existing images", async () => {
  const existing = { image_path: "/bg.jpg", showroom_main_image_path: "/main.jpg", showroom_small_image_path: "/small.jpg" };
  const { saveHero, calls } = fixture(undefined, null, existing);
  assert.equal((await saveHero({}, heroForm())).ok, true);
  const value = calls.find((call) => call.table === "site_content" && call.operation === "update").rows.value;
  assert.deepEqual(JSON.parse(JSON.stringify(value)), existing);
});

test("legacy hero content receives the original support images without a migration", async () => {
  const { saveHero, calls } = fixture(undefined, null, { image_path: "/bg.jpg" });
  assert.equal((await saveHero({}, heroForm())).ok, true);
  const value = calls.find((call) => call.table === "site_content" && call.operation === "update").rows.value;
  assert.equal(value.showroom_main_image_path, "/assets/images/candor-mix-collection.jpeg");
  assert.equal(value.showroom_small_image_path, "/assets/images/oculus-mare-dining.jpg");
});

test("invalid hero support images report the corresponding field before any changes", async () => {
  const { saveHero, calls } = fixture();
  const data = heroForm();
  data.append("hero_showroom_small_image", new File(["invalid"], "image.txt", { type: "text/plain" }));
  assert.equal((await saveHero({}, data)).errors.hero_showroom_small_image, "Invalid image format");
  assert.equal(calls.length, 0);
});

test("status updates refresh all public pages in both languages", async () => {
  for (const actionName of ["updateProductStatus", "updateProjectStatus"]) {
    const { actions, revalidated } = fixture();
    const data = new FormData();
    data.set("id", "record-1");
    data.set("status", "hidden");
    assert.equal((await actions[actionName]({}, data)).ok, true);
    assert.ok(revalidated.some(([url, scope]) => url === "/es" && scope === "layout"));
    assert.ok(revalidated.some(([url, scope]) => url === "/en" && scope === "layout"));
  }
});

test("failed status updates return an error without confirming success", async () => {
  for (const [actionName, table] of [["updateProductStatus", "products"], ["updateProjectStatus", "projects"]]) {
    const { actions, revalidated } = fixture(undefined, null, {}, { table, operation: "update" });
    const data = new FormData();
    data.set("id", "record-1");
    data.set("status", "published");
    assert.equal((await actions[actionName]({}, data)).ok, false);
    assert.equal(revalidated.length, 0);
  }
});

test("a translation failure preserves the already saved hero image and reports partial failure", async () => {
  const { saveHero, calls, revalidated } = fixture(undefined, null, {}, { table: "site_content_translations", operation: "upsert" });
  const data = heroForm();
  data.append("hero_showroom_main_image", new File(["image"], "main.jpg", { type: "image/jpeg" }));
  const result = await saveHero({}, data);
  assert.equal(result.ok, false);
  assert.match(result.message, /faltan los textos/);
  assert.equal(calls.some((call) => call.operation === "cleanup"), false);
  assert.ok(revalidated.some(([url, scope]) => url === "/es" && scope === "layout"));
});

function sectionsForm() {
  const data = new FormData();
  const keys = [
    "introEyebrow", "introTitle", "collectionsEyebrow", "collectionsTitle", "collectionsDescription",
    "featuredEyebrow", "featuredTitle", "featuredDescription", "lifestyleLabelOne", "lifestyleLabelTwo", "lifestyleLabelThree",
    "philosophyEyebrow", "philosophyTitle", "philosophyDescription", "projectsEyebrow", "projectsTitle", "projectsDescription",
    "materialsEyebrow", "materialsTitle", "materialsLead", "materialOneTitle", "materialOneDescription", "materialTwoTitle", "materialTwoDescription",
    "benefitsEyebrow", "benefitsTitle", "benefitsDescription", "faqEyebrow", "faqTitle", "faqDescription",
    ...Array.from({ length: 4 }, (_, index) => [`benefit${index + 1}Title`, `benefit${index + 1}Description`]).flat(),
    ...Array.from({ length: 6 }, (_, index) => [`faq${index + 1}Question`, `faq${index + 1}Answer`]).flat()
  ];
  for (const key of keys) for (const locale of ["es", "en"]) data.set(`${key}_${locale}`, `Approved copy for ${key} ${locale}.`);
  return data;
}

test("individual benefits, FAQ answers and section visibility survive saving", async () => {
  const { actions, calls } = fixture();
  const data = sectionsForm();
  data.set("visible_benefits", "on");
  const result = await actions.upsertHomeSections({}, data);
  assert.equal(result.ok, true);
  const content = calls.find((call) => call.table === "site_content" && call.operation === "update").rows.value;
  assert.equal(content.visible.benefits, true);
  assert.equal(content.visible.faq, false);
  assert.equal(content.visible.intro, false);
  const translations = calls.find((call) => call.table === "site_content_translations").rows;
  assert.equal(translations[0].value.benefit4Description, data.get("benefit4Description_es"));
  assert.equal(translations[1].value.faq6Answer, data.get("faq6Answer_en"));
  assert.equal(translations[0].value.benefitsTitle, data.get("benefitsTitle_es"));
});

test("a failed section translation does not delete an image already linked to the homepage", async () => {
  const { actions, calls } = fixture(undefined, null, {}, { table: "site_content_translations", operation: "upsert" });
  const data = sectionsForm();
  data.append("intro_image", new File(["image"], "intro.jpg", { type: "image/jpeg" }));
  assert.equal((await actions.upsertHomeSections({}, data)).ok, false);
  assert.equal(calls.some((call) => call.operation === "cleanup"), false);
});

test("uploads are cleaned up when the section record itself cannot be saved", async () => {
  const { actions, calls } = fixture(undefined, null, {}, { table: "site_content", operation: "update" });
  const data = sectionsForm();
  data.append("intro_image", new File(["image"], "intro.jpg", { type: "image/jpeg" }));
  assert.equal((await actions.upsertHomeSections({}, data)).ok, false);
  assert.ok(calls.some((call) => call.operation === "cleanup" && call.storagePath === "intro.jpg"));
});

test("collection and project translation failures preserve their already saved cover images", async () => {
  for (const [actionName, table] of [["upsertCollection", "collection_translations"], ["upsertProject", "project_translations"]]) {
    const { actions, calls } = fixture(undefined, null, {}, { table, operation: "upsert" });
    const data = form();
    data.set("title_es", "Proyecto de terraza");
    data.set("location", "Santiago");
    data.append("cover_image", new File(["image"], "cover.jpg", { type: "image/jpeg" }));
    const result = await actions[actionName]({}, data);
    assert.equal(result.ok, false);
    assert.match(result.message, /faltan los textos/);
    assert.equal(calls.some((call) => call.operation === "cleanup"), false);
  }
});

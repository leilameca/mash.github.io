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

function fixture(savedPaths = ["/one.jpg", "/two.jpg"], imageError = null) {
  const calls = [];
  const savedImages = savedPaths.map((storage_path, index) => ({ id: `image-${index}`, storage_path }));
  const admin = {
    from(table) {
      let operation = "select";
      const query = {
        select() { return query; },
        eq() { return query; },
        in(column, values) { calls.push({ table, operation, column, values }); return query; },
        update(rows) { operation = "update"; calls.push({ table, operation, rows }); return query; },
        insert(rows) { operation = "insert"; calls.push({ table, operation, rows }); return query; },
        upsert(rows, options) { operation = "upsert"; calls.push({ table, operation, rows, options }); return query; },
        delete() { operation = "delete"; return query; },
        single() { return query; },
        then(resolve, reject) {
          return Promise.resolve({
            data: table === "products" ? { id: "product-1" } : savedImages,
            error: table === "product_images" && operation === "upsert" ? imageError : null
          }).then(resolve, reject);
        }
      };
      return query;
    }
  };
  const module = { exports: {} };
  const mocks = {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect(url) { throw new Error(`redirect:${url}`); } },
    "@/lib/supabase/env": { adminRoute: "/studio-mash" },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => admin },
    "@/lib/supabase/auth": { requireAdmin: async () => ({ user_id: "admin-1" }) },
    "@/lib/supabase/server": {},
    "@/lib/supabase/media": {
      validateImage: () => null,
      uploadImage: async (_admin, file) => ({ publicUrl: `/uploaded/${file.name}`, storagePath: file.name }),
      removeUploadedImage: async (_admin, storagePath) => calls.push({ operation: "cleanup", storagePath })
    }
  };
  vm.runInNewContext(source, {
    module, exports: module.exports, require: (name) => mocks[name] ?? require(name), File, FormData
  });
  return { save: module.exports.upsertProduct, calls };
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

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(readFileSync(path.join(__dirname, "../lib/supabase/catalog.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function catalogFixture(rows) {
  const queries = [];
  const supabase = {
    from(table) {
      const query = {
        select(fields) { queries.push({ table, fields }); return query; },
        eq(field, value) { queries.push({ table, field, value }); return query; },
        order() { return query; },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject); }
      };
      return query;
    }
  };
  const module = { exports: {} };
  const mocks = {
    "@/lib/content": { products: [{ slug: "old-product" }], collections: [{ slug: "old-collection" }], projects: [{ slug: "old-project" }] },
    "./env": { isSupabaseCatalogEnabled: () => true },
    "./server": { createSupabaseServerClient: async () => supabase }
  };
  vm.runInNewContext(source, { module, exports: module.exports, require: (name) => mocks[name] ?? require(name) });
  return { catalog: module.exports, queries };
}

test("an intentionally empty public catalog never restores old products, collections or projects", async () => {
  const { catalog } = catalogFixture([]);
  assert.equal((await catalog.getCatalogProducts("es")).length, 0);
  assert.equal((await catalog.getCatalogCollections()).length, 0);
  assert.equal((await catalog.getCatalogProjects("es")).length, 0);
});

test("saved product specifications and primary image are read into the public catalog", async () => {
  const { catalog, queries } = catalogFixture([{
    id: "product-1", slug: "candor", status: "published", collections: { slug: "dining" },
    dimensions: "63 x 34 inches", finishes: ["Natural", "Black"],
    product_translations: [{ locale: "es", name: "Candor", description: "Descripcion guardada" }],
    product_images: [{ storage_path: "/second.jpg", sort_order: 0, is_primary: false }, { storage_path: "/primary.jpg", sort_order: 1, is_primary: true }]
  }]);
  const [product] = await catalog.getCatalogProducts("es");
  assert.equal(product.image, "/primary.jpg");
  assert.equal(product.dimensions.es, "63 x 34 inches");
  assert.equal(product.finishes.es, "Natural, Black");
  assert.equal(product.description.es, "Descripcion guardada");
  assert.ok(queries.some((query) => query.fields?.includes("dimensions,finishes")));
  assert.ok(queries.some((query) => query.field === "status" && query.value === "published"));
});

test("products without gallery images are not replaced by old catalog content", async () => {
  const { catalog } = catalogFixture([{
    slug: "unfinished", product_translations: [{ locale: "es", name: "Unfinished" }], product_images: []
  }]);
  assert.equal((await catalog.getCatalogProducts("es")).length, 0);
});

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
        neq(field, value) { queries.push({ table, field, value, comparison: "neq" }); return query; },
        limit(value) { queries.push({ table, limit: value }); return query; },
        range(from, to) { queries.push({ table, from, to }); return query; },
        maybeSingle() { return Promise.resolve({ data: rows[0] ? {snapshot:{...rows[0],translations:rows[0].product_translations??[],images:rows[0].product_images??[]}} : null, error: null }); },
        then(resolve, reject) { return Promise.resolve({ data: rows.map(r=>({snapshot:{...r,collection_id:r.collection_id??"c1",translations:r.product_translations??[],images:r.product_images??[]}})), error: null }).then(resolve, reject); }
      };
      return query;
    }
  };
  const {loadTs}=require('./support/load-ts.cjs');
  const adapted=rows.map(r=>({entity_id:r.id??"p1",slug:r.slug,snapshot:{...r,collection_id:r.collection_id??"c1",translations:r.product_translations??[],images:r.product_images??[]}}));
  const collections=rows.length?[{entity_id:rows[0].collection_id??"c1",slug:rows[0].collections?.slug??"dining",snapshot:{translations:[{locale:"es",name:"Colección dinámica"}]}}]:[];
  const catalog=loadTs(path.join(__dirname,"../lib/supabase/catalog.ts"),{
    "./published":{publicContentClient:async()=>supabase,readPublished:async kind=>kind==="product"?adapted:kind==="collection"?collections:[],localizedTranslation:(rows,locale)=>({text:rows.find(r=>r.locale===locale)??rows[0],pending:false})}
  });
  return { catalog, queries };
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
  assert.equal(product.collectionLabel.es,"Colección dinámica");
});

test("products without gallery images are not replaced by old catalog content", async () => {
  const { catalog } = catalogFixture([{
    slug: "unfinished", product_translations: [{ locale: "es", name: "Unfinished" }], product_images: []
  }]);
  assert.equal((await catalog.getCatalogProducts("es")).length, 0);
});

test("product details query only the requested published slug", async () => {
  const { catalog, queries } = catalogFixture([]);
  assert.equal(await catalog.getCatalogProduct("es", "not-found"), undefined);
  assert.ok(queries.some((query) => query.field === "slug" && query.value === "not-found"));
  assert.ok(queries.some((query) => query.field === "status" && query.value === "published"));
});

test("related products are filtered and limited in the database", async () => {
  const { catalog, queries } = catalogFixture([{slug:"source",collection_id:"c1",collections:{slug:"dining"}}]);
  await catalog.getRelatedProducts("es", "dining", "candor");
  assert.ok(queries.some((query) => query.limit === 3));
  assert.ok(queries.some((query) => query.field === "snapshot->>collection_id" && query.value === "c1"));
  assert.ok(queries.some((query) => query.field === "slug" && query.comparison === "neq"));
});

test("catalog pagination requests only twelve database rows", async () => {
  const { catalog, queries } = catalogFixture([]);
  await catalog.getCatalogPage("es", 2);
  assert.ok(queries.some((query) => query.from === 12 && query.to === 23));
});

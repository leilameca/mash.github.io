const assert = require("node:assert/strict");
const { test } = require("node:test");
const { resolve } = require("node:path");
const { loadTs } = require("./support/load-ts.cjs");
const { publicAnalyticsPage, analyticsHostAllowed } = loadTs(
  resolve("lib/analytics.ts"),
);

test("analytics classifies public bilingual routes without sending slugs or accepting private or unknown paths", () => {
  assert.deepEqual(
    { ...publicAnalyticsPage("/es/productos/oasis-set") },
    {
      language: "es",
      page_type: "catalog",
      detailEvent: "view_item",
    },
  );
  assert.equal(
    publicAnalyticsPage("/en/colecciones/oasis").detailEvent,
    "view_collection",
  );
  assert.equal(
    publicAnalyticsPage("/es/proyectos/terraza").detailEvent,
    "view_project",
  );
  for (const path of [
    "/studio-mash",
    "/en/studio-mash",
    "/api/studio-media",
    "/es/contacto/name",
    "/es/constructor",
    "/es/productos/name?private=yes",
  ]) {
    assert.equal(publicAnalyticsPage(path), null);
  }
  assert.equal(analyticsHostAllowed("localhost"), false);
  assert.equal(analyticsHostAllowed("mash-preview.vercel.app"), false);
  assert.equal(analyticsHostAllowed("www.mashoficial.com"), true);
});

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { resolve } = require("node:path");
const { loadTs } = require("./support/load-ts.cjs");
const { publicAnalyticsPage, analyticsHostAllowed, createAnalyticsCollector } =
  loadTs(resolve("lib/analytics.ts"));

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

test("the receiver gets only allowed events, without slugs, duplicate page views or staging traffic", () => {
  const received = [];
  const collect = createAnalyticsCollector((event) =>
    received.push({ ...event }),
  );
  const host = "www.mashoficial.com";
  collect(host, "/es/productos/oasis-set");
  collect(host, "/es/productos/oasis-set");
  collect("mash-staging.vercel.app", "/es/productos/oasis-set", "view_gallery");
  collect(host, "/studio-mash", "click_whatsapp");
  collect(host, "/es/productos/oasis-set", "purchase");
  collect(host, "/es/productos/oasis-set", "view_gallery");
  collect(host, "/en/contacto");
  collect(host, "/en/contacto", "click_directions");
  assert.deepEqual(received, [
    { event: "page_view", language: "es", page_type: "catalog" },
    { event: "view_item", language: "es", page_type: "catalog" },
    { event: "view_gallery", language: "es", page_type: "catalog" },
    { event: "page_view", language: "en", page_type: "contact" },
    { event: "click_directions", language: "en", page_type: "contact" },
  ]);
});

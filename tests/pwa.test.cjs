const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const worker = readFileSync(path.join(__dirname, "../public/sw.js"), "utf8");

function fixture({ offline = false } = {}) {
  const handlers = {};
  const fetched = [];
  const deleted = [];
  const precached = [];
  const notices = new Map([
    ["/offline/es.html", new Response("Sin conexion")],
    ["/offline/en.html", new Response("Offline")]
  ]);
  const cache = {
    addAll: async (requests) => precached.push(...requests.map((request) => request.url)),
    match: async (url) => notices.get(url)?.clone()
  };
  const self = {
    location: { origin: "https://mashoficial.com" },
    addEventListener: (type, handler) => { handlers[type] = handler; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} }
  };
  // Worker-relative URLs resolve against the site root in the browser.
  class WorkerRequest extends Request {
    constructor(url, options) { super(new URL(url, self.location.origin), options); }
  }
  vm.runInNewContext(worker, {
    self, URL, Request: WorkerRequest, Response,
    caches: { open: async () => cache, keys: async () => ["mash-pwa-old", "mash-pwa-v1", "unrelated-cache"], delete: async (name) => deleted.push(name) },
    fetch: async (request, options) => {
      fetched.push({ request, options });
      if (offline) throw new Error("No connection");
      return new Response("Fresh catalog");
    }
  });
  function fetchEvent(pathname, mode = "navigate", method = "GET") {
    let response;
    handlers.fetch({ request: { url: new URL(pathname, self.location.origin).href, mode, method }, respondWith(value) { response = value; } });
    return response;
  }
  return { handlers, fetched, deleted, precached, fetchEvent };
}

test("public pages always use fresh network content and are never added to the offline cache", async () => {
  const { fetchEvent, fetched, precached } = fixture();
  for (let i = 0; i < 2; i++) assert.equal(await (await fetchEvent("/es/productos")).text(), "Fresh catalog");
  assert.equal(fetched.length, 2);
  assert.equal(fetched[0].options.cache, "no-store");
  assert.equal(precached.length, 0);
});

test("offline navigation shows the notice in the requested language", async () => {
  const { fetchEvent } = fixture({ offline: true });
  assert.equal(await (await fetchEvent("/es/productos")).text(), "Sin conexion");
  assert.equal(await (await fetchEvent("/en/colecciones")).text(), "Offline");
});

test("the worker never intercepts admin, APIs, server actions or Next RSC requests", () => {
  const { fetchEvent, fetched } = fixture({ offline: true });
  assert.equal(fetchEvent("/studio-mash/contenido"), undefined);
  assert.equal(fetchEvent("/api/products"), undefined);
  assert.equal(fetchEvent("/es", "navigate", "POST"), undefined);
  assert.equal(fetchEvent("/es?_rsc=1", "cors"), undefined);
  assert.equal(fetchEvent("https://example.com/es"), undefined);
  assert.equal(fetched.length, 0);
});

test("installation only precaches offline notices and icons", async () => {
  const { handlers, precached } = fixture();
  let installed;
  handlers.install({ waitUntil(value) { installed = value; } });
  await installed;
  assert.equal(precached.length, 6);
  assert.ok(precached.every((url) => /^https:\/\/mashoficial.com\/(offline|pwa)\//.test(url)));
});

test("worker updates only remove old MASH PWA caches", async () => {
  const { handlers, deleted } = fixture();
  let activated;
  handlers.activate({ waitUntil(value) { activated = value; } });
  await activated;
  assert.deepEqual(deleted, ["mash-pwa-old"]);
});

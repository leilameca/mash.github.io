/* Only the offline notice and app icons are stored. Live catalog data and admin requests always use the network. */
const CACHE_NAME = "mash-pwa-v1";
const OFFLINE_ES = "/offline/es.html";
const OFFLINE_EN = "/offline/en.html";
const OFFLINE_ASSETS = [OFFLINE_ES, OFFLINE_EN, "/pwa/icon-192.png", "/pwa/icon-512.png", "/pwa/icon-maskable-512.png", "/pwa/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(OFFLINE_ASSETS.map((url) => new Request(url, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("mash-pwa-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (OFFLINE_ASSETS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(url.pathname)) || fetch(request);
    })());
    return;
  }

  const isPublicPage = url.pathname === "/" || /^\/(es|en)(\/|$)/.test(url.pathname);
  if (request.mode !== "navigate" || !isPublicPage) return;

  event.respondWith((async () => {
    try {
      return await fetch(request, { cache: "no-store" });
    } catch {
      const cache = await caches.open(CACHE_NAME);
      const offlinePage = /^\/en(\/|$)/.test(url.pathname) ? OFFLINE_EN : OFFLINE_ES;
      return (await cache.match(offlinePage)) || new Response("MASH: sin conexión / offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});

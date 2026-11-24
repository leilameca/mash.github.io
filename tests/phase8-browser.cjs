const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const fs = require("node:fs");
const origin = process.env.MASH_PREVIEW_URL || "http://localhost:3020";
const directory = process.env.MASH_EVIDENCE_DIR || ".test-artifacts/phase8";
const widths = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920];
const routes = [
  "/es",
  "/es/colecciones",
  "/es/productos",
  "/es/productos/oasis-set",
  "/es/nosotros",
  "/es/proyectos",
  "/es/noticias",
  "/es/contacto",
];

(async () => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  assert.equal(
    (await fetch(origin + "/__preview__/enter", { redirect: "manual" })).status,
    303,
  );
  fs.mkdirSync(directory, { recursive: true });
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    hasTouch: true,
  });
  const errors = [];
  const samples = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.mashEvents = [];
    window.addEventListener("mash:analytics", (event) =>
      window.mashEvents.push(event.detail),
    );
    new PerformanceObserver((entries) => {
      window.mashLcp = entries.getEntries().at(-1)?.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  try {
    for (const route of routes) {
      const response = await page.goto(origin + route, {
        waitUntil: "domcontentloaded",
      });
      assert.equal(response.status(), 200, route);
      await page.locator("main h1").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const article = page.locator("main h1").first();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        assert.ok(await article.isVisible(), route);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
          route + " · " + width,
        );
      }
      if (process.env.MASH_CAPTURE_SCREENSHOTS === "1") {
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          const name = route.slice(1).replaceAll("/", "-");
          await page.screenshot({
            path: directory + "/" + name + "-" + width + ".png",
            animations: "disabled",
          });
        }
      }
      const load = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        return {
          ttfb: Math.round(nav.responseStart),
          lcp: Math.round(window.mashLcp ?? 0) || null,
        };
      });
      samples.push({ route, ...load });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/es");
    const menu = page.locator(".menu-toggle");
    const nav = page.getByRole("navigation", { name: "Principal" });
    assert.equal(await nav.isVisible(), false);
    await menu.press("Enter");
    await nav.waitFor();
    await page.waitForFunction(
      () => document.activeElement.closest("nav")?.id === "primary-navigation",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await menu.evaluate((el) => document.activeElement === el),
      true,
    );
    await menu.click();
    await nav.getByRole("link", { name: "EN", exact: true }).click();
    await page.waitForURL(origin + "/en");
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.equal(await page.locator(".site-header .brand-mark").count(), 1);
    const whatsapp = page.locator(".whatsapp-float");
    assert.match(await whatsapp.getAttribute("href"), /whatsapp|wa\.me/);
    assert.deepEqual(await page.evaluate(() => window.mashEvents), []);
    assert.equal(
      await page
        .locator("main h1")
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
    await page.setViewportSize({ width: 844, height: 390 });
    await menu.click();
    await page.getByRole("navigation", { name: "Main" }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page.route(
      (url) => url.pathname === "/_next/image",
      (route) => route.abort(),
    );
    await page.goto(origin + "/es/productos/oasis-set");
    await page
      .getByText("Fotografía no disponible", { exact: true })
      .first()
      .waitFor();
    await page.unrouteAll();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + "/es");
    const publicLinks = await page
      .locator(".site-header .primary-nav > a")
      .allTextContents();
    const publicFooter = await page
      .locator(".site-footer nav[aria-label=Legal] a")
      .allTextContents();
    await page.goto(origin + "/__preview__/enter");
    await page.goto(origin + "/studio-mash/contenido/editor");
    assert.equal(await page.locator(".whatsapp-float").count(), 0);
    await page.getByRole("button", { name: "Móvil", exact: true }).click();
    const mobileNav = page.locator(".visual-frame .visual-preview-nav");
    await mobileNav.getByLabel("Menú", { exact: true }).tap();
    await mobileNav
      .getByRole("navigation", { name: "Navegación móvil" })
      .waitFor();
    assert.deepEqual(
      await mobileNav.locator(".primary-nav > span").allTextContents(),
      publicLinks,
    );
    assert.deepEqual(
      await page
        .locator(
          ".visual-frame .visual-preview-footer nav[aria-label=Legal] span",
        )
        .allTextContents(),
      publicFooter,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await mobileNav
        .getByLabel("Menú", { exact: true })
        .getAttribute("aria-expanded"),
      "false",
    );
    if (process.env.MASH_CAPTURE_SCREENSHOTS === "1") {
      await page.screenshot({
        path: directory + "/lienzo-movil.png",
        animations: "disabled",
      });
    }
    assert.deepEqual(errors, []);
    const evidence = {
      browser: browser.version(),
      widths,
      routes,
      samples,
      navigation: "pass",
      landscape: "pass",
      analyticsLocalExcluded: true,
    };
    fs.writeFileSync(
      directory + "/result.json",
      JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const assert = require("node:assert/strict");
const { mkdirSync, writeFileSync } = require("node:fs");
const { chromium, firefox, webkit, request } = require("playwright");

async function main() {
  const target = new URL(process.env.MASH_QA_STAGING_URL || "");
  const isRender = target.origin === "https://mash-staging.onrender.com";
  const isVercel = /^https:\/\/mash-staging-[a-z0-9-]+\.vercel\.app$/.test(target.origin);
  assert.ok(isRender || isVercel, "Use an approved MASH staging origin.");
  assert.ok(
    !target.username && !target.password && !target.search && !target.hash,
  );
  const state = process.env.MASH_QA_STORAGE_STATE;
  const password = process.env.MASH_QA_STAGING_PASSWORD;
  const anonymous = await request.newContext();
  try {
    for (const path of ["/es", "/en", "/studio-mash/login", "/__preview__/enter"]) {
      const response = await anonymous.get(target.origin + path, { maxRedirects: 0 });
      if (isRender) {
        assert.equal(response.status(), 401, path);
        assert.match(response.headers()["www-authenticate"] || "", /^Basic /i);
        assert.match(response.headers()["x-robots-tag"] || "", /noindex/i);
        assert.match(response.headers()["cache-control"] || "", /no-store/i);
      } else {
        assert.ok([302, 303, 307, 308, 401, 403].includes(response.status()), path);
      }
    }
    console.log("PASS: four staging routes reject anonymous access");
  } finally {
    await anonymous.dispose();
  }
  if (process.argv.includes("--anonymous-only")) return;
  assert.ok(isRender ? password : state, isRender
    ? "Provide the staging password through MASH_QA_STAGING_PASSWORD."
    : "Set MASH_QA_STORAGE_STATE to an authenticated staging storage state.");
  const httpCredentials = isRender
    ? { username: "mash", password, origin: target.origin }
    : undefined;

  const evidence = [];
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      for (const viewport of [
        { width: 390, height: 844 },
        { width: 768, height: 900 },
        { width: 1440, height: 900 },
      ]) {
        const context = await browser.newContext({
          viewport,
          storageState: state,
          httpCredentials: httpCredentials && { ...httpCredentials, send: "always" },
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.name));
        try {
          const fixture = await context.request.get(
            target.origin + "/__preview__/enter",
            { maxRedirects: 0 },
          );
          assert.equal(
            fixture.status(),
            404,
            "Hosted fixture route must be absent",
          );
          const robots = await context.request.get(target.origin + "/robots.txt");
          assert.equal(robots.status(), 200);
          assert.match(await robots.text(), /^Disallow:\s*\/\s*$/m);
          const sitemap = await context.request.get(target.origin + "/sitemap.xml");
          assert.equal(sitemap.status(), 200);
          assert.doesNotMatch(await sitemap.text(), /<loc[\s>]/i);
          for (const locale of ["es", "en"]) {
            for (const suffix of [
              "",
              "/productos",
              "/colecciones",
              "/proyectos",
              "/noticias",
              "/contacto",
            ]) {
              const path = "/" + locale + suffix;
              const response = await page.goto(target.origin + path, {
                waitUntil: "domcontentloaded",
              });
              assert.equal(response.status(), 200, name + " " + path);
              assert.match(
                response.headers()["x-robots-tag"] || "",
                /noindex/i,
              );
              assert.equal(
                await page.locator("html").getAttribute("lang"),
                locale,
              );
              await page.locator("main h1").first().waitFor({ timeout: 8000 });
              assert.ok(await page.locator("main").count());
              assert.equal(
                await page.evaluate(
                  () => document.documentElement.scrollWidth > innerWidth + 1,
                ),
                false,
                name + " " + path,
              );
              evidence.push({
                name,
                version: browser.version(),
                viewport,
                path,
              });
            }
          }
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  mkdirSync(".test-artifacts/staging-qa", { recursive: true });
  writeFileSync(
    ".test-artifacts/staging-qa/result.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    "PASS: protected staging smoke across browsers, viewports and locales · " +
      evidence.length +
      " route checks",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

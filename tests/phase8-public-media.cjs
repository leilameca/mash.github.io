const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");

const origin = new URL(process.env.MASH_PREVIEW_URL || "http://localhost:3046");
assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname));
const sections = ["", "productos", "colecciones", "proyectos", "noticias", "nosotros", "contacto"];

async function main() {
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const results = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    for (const locale of ["es", "en"]) {
      const paths = new Set(sections.map((section) => "/" + locale + (section ? "/" + section : "")));
      for (const path of paths) {
        const response = await page.goto(new URL(path, origin).href);
        const report = { path, status: response.status() };
        report.lang = await page.locator("html").getAttribute("lang");
        const details = await page.locator("main a[href]").evaluateAll((links) =>
          links.map((link) => link.pathname),
        );
        for (const detail of details) {
          if (new RegExp("^/" + locale + "/(?:productos|colecciones|proyectos|noticias)/[^/]+/?$").test(detail)) {
            paths.add(detail);
          }
        }
        report.brokenImages = await page.locator("main img:visible").evaluateAll(async (images) => {
          return (await Promise.all(images.map(async (image) => {
            image.loading = "eager";
            try {
              await image.decode();
              return null;
            } catch {
              return image.currentSrc || image.src;
            }
          }))).filter(Boolean);
        });
        results.push(report);
      }
    }
  } finally {
    await browser.close();
  }
  const directory = ".test-artifacts/phase8-close/public";
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(directory + "/mobile-media.json", JSON.stringify(results, null, 2));
  const failures = results.filter(({ path, status, lang, brokenImages }) =>
    status !== 200 || path.split("/")[1] !== lang || brokenImages.length,
  );
  console.log(results.length + " rutas públicas, " + failures.length + " con incidencias.");
  assert.deepEqual(failures, []);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

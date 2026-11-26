const assert = require("node:assert/strict");
const { mkdirSync, writeFileSync } = require("node:fs");
const { chromium } = require("playwright");
const { source, version } = require("axe-core");

async function main() {
  const origin = process.env.MASH_PREVIEW_URL || "http://localhost:3022";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const results = [];
  try {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/es",
        "/en",
        "/es/colecciones",
        "/es/productos/oasis-set",
        "/es/contacto",
        "/es/noticias",
        "/es/proyectos",
      ]) {
        const response = await page.goto(origin + route);
        assert.equal(response.status(), 200, route);
        await page.addScriptTag({ content: source });
        const scan = await page.evaluate(() =>
          window.axe.run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
            },
          }),
        );
        results.push({
          route,
          width,
          passed: scan.passes.length,
          violations: scan.violations.map(({ id, impact, nodes }) => ({
            id,
            impact,
            targets: nodes.map((node) => node.target),
          })),
        });
      }
    }
    const dir = ".test-artifacts/phase8-accessibility";
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      dir + "/result.json",
      JSON.stringify(
        { axe: version, browser: browser.version(), results },
        null,
        2,
      ),
    );
    for (const result of results)
      console.log(
        result.route,
        result.width,
        JSON.stringify(result.violations),
      );
    if (results.some((row) => row.violations.length)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

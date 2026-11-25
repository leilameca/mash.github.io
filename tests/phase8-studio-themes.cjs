const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");

const origin = new URL(process.env.MASH_PREVIEW_URL || "http://localhost:3046");
assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname));
const routes = [
  "", "productos", "colecciones", "multimedia", "contenido/editor", "proyectos",
  "noticias", "anuncios", "traducciones", "configuracion", "analitica", "revisiones",
];

async function main() {
  const output = ".test-artifacts/phase8-close/studio";
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const findings = [];
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
        colorScheme: "light",
        viewport: { width, height: 900 },
      });
      try {
        const page = await context.newPage();
        page.on("pageerror", (error) => findings.push(error.message));
        await page.goto(new URL("/__preview__/enter", origin).href);
        for (const route of routes) {
          const path = "/studio-mash" + (route ? "/" + route : "");
          const response = await page.goto(new URL(path, origin).href);
          assert.equal(response.status(), 200, path);
          assert.equal(new URL(page.url()).pathname, path);
          for (const [action, theme] of [["oscuro", "dark"], ["claro", "light"]]) {
            await page.getByRole("button", { name: "Activar modo " + action }).click();
            await page.locator('#mash-studio-root[data-theme="' + theme + '"]').waitFor();
            const name = (route || "inicio").replaceAll("/", "-");
            await page.screenshot({ path: output + "/" + width + "-" + name + "-" + theme + ".png" });
          }
        }
      } finally {
        await context.close();
      }
    }
    assert.deepEqual(findings, []);
    console.log("48 capturas de Studio, 12 rutas, 2 anchos y 2 temas.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

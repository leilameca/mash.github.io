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
          if (width === 390 && route === "contenido/editor") {
            await page.getByRole("button", { name: "Lienzo", exact: true }).click();
            await page.getByRole("button", { name: "Móvil", exact: true }).click();
            const visitor = await context.newPage();
            try {
              for (const locale of ["es", "en"]) {
                await page.getByRole("button", { name: locale.toUpperCase(), exact: true }).click();
                await visitor.goto(new URL("/" + locale, origin).href);
                const live = visitor.locator(".site-header .menu-toggle");
                const canvas = page.locator('iframe[title="Lienzo de Inicio"]');
                const preview = canvas.contentFrame().locator(".site-header .menu-toggle");
                for (const expanded of ["false", "true"]) {
                  assert.equal(await live.getAttribute("aria-expanded"), expanded);
                  assert.equal(await preview.getAttribute("aria-expanded"), expanded);
                  assert.equal(await preview.getAttribute("aria-label"), await live.getAttribute("aria-label"), locale + " menu label");
                  await live.click();
                  await clickInScaledCanvas(page, canvas, preview);
                }
              }
            } finally {
              await visitor.close();
            }
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

async function clickInScaledCanvas(page, canvas, control) {
  // Studio scales the iframe with CSS zoom. Convert its viewport coordinates
  // to the browser viewport before sending a real pointer click.
  await control.waitFor({ state: "visible" });
  await canvas.scrollIntoViewIfNeeded();
  const frame = await canvas.boundingBox();
  const target = await control.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    const view = element.ownerDocument.defaultView;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return {
      x: centerX / view.innerWidth,
      y: centerY / view.innerHeight,
      reachable: element.contains(element.ownerDocument.elementFromPoint(centerX, centerY)),
    };
  });
  assert.ok(frame && target.reachable, "The menu toggle must be reachable inside the canvas");
  await page.mouse.click(frame.x + frame.width * target.x, frame.y + frame.height * target.y);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

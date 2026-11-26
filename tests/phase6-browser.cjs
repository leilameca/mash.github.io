const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

async function main() {
  const origin = process.env.MASH_PREVIEW_URL || "http://localhost:3013";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  const entry = await fetch(origin + "/__preview__/enter", {
    redirect: "manual",
  });
  const cookie = /base64-([^;]+)/.exec(entry.headers.get("set-cookie") ?? "");
  assert.equal(entry.status, 303);
  assert.ok(
    cookie &&
      Buffer.from(cookie[1], "base64url")
        .toString()
        .includes("fixture-refresh"),
  );
  const out = process.env.MASH_EVIDENCE_DIR || ".test-artifacts/phase6-browser";
  fs.mkdirSync(out + "/screenshots", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (e) => failures.push(e.message));
  const checks = [];
  const snap = (name) =>
    page.screenshot({ path: out + "/screenshots/" + name + ".png" });
  const studio = origin + "/studio-mash";
  const text = `Portada visual de prueba ${Date.now()}`;
  const push = async (name, status) => {
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/studio-visual") &&
        r.request().method() === "POST",
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    if (name === "Publicar") page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name, exact: true }).click();
    const result = await response;
    assert.equal(result.status(), status, await result.text());
  };
  try {
    await page.goto(origin + "/__preview__/enter");
    await page.goto(studio + "/contenido/editor");
    const properties = page.getByRole("complementary", {
      name: "Propiedades",
      exact: true,
    });
    const canvas = page.locator(".visual-frame");
    await canvas.waitFor();
    await page.waitForFunction(() => {
      const photo = document.querySelector(".hero-media__image");
      return photo && photo.complete && photo.naturalWidth > 0;
    });
    await snap("01-editor-escritorio");
    const hero = canvas.locator("[data-type=hero]").first();
    const heroId = await hero.getAttribute("data-section");
    assert.equal(await hero.locator(".hero-showroom img").count(), 2);
    assert.equal(await canvas.locator("[data-section=legacy-showroom]").count(), 0);
    const initial = await (await page.request.get(origin + "/api/studio-visual?page=home")).json();
    const { layout, es, en, revision } = initial.doc;
    const unchanged = await page.request.post(origin + "/api/studio-visual", {
      headers: { origin },
      data: { page: "home", layout, es, en, revision, intent: "publish" },
    });
    assert.equal(unchanged.status(), 200, await unchanged.text());
    assert.equal((await unchanged.json()).unchanged, true);
    assert.equal(await page.getByRole("button", { name: "Publicar", exact: true }).isDisabled(), true);
    await hero
      .getByRole("button", {
        name: "Seleccionar Portada en el lienzo",
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    const title = properties.getByRole("textbox", {
      name: "Título ES",
      exact: true,
    });
    await title.fill(text);
    await title.press("Tab");
    assert.equal(await hero.locator(".hero-title").innerText(), text);
    await page.getByRole("button", { name: "Deshacer", exact: true }).click();
    assert.notEqual(await hero.locator(".hero-title").innerText(), text);
    await page.getByRole("button", { name: "Rehacer", exact: true }).click();
    assert.equal(await hero.locator(".hero-title").innerText(), text);
    const stale = await context.newPage();
    await stale.goto(studio + "/contenido/editor");
    await stale.locator(".visual-frame").waitFor();

    await page
      .getByRole("button", { name: "Añadir sección", exact: false })
      .click();
    const menu = page.getByRole("dialog", { name: "Biblioteca de secciones" });
    await menu
      .getByRole("button", { name: "Cuadrícula de fotos", exact: true })
      .waitFor();
    await snap("02-biblioteca-de-secciones");
    await menu
      .getByRole("button", { name: "Cuadrícula de fotos", exact: true })
      .click();
    await properties
      .getByRole("textbox", { name: "Título ES", exact: true })
      .fill("Galería de prueba");
    await properties
      .getByRole("button", { name: "Elegir de Multimedia", exact: true })
      .click();
    const picker = page.getByRole("dialog", { name: "Elegir de Multimedia" });
    await picker
      .getByRole("checkbox", { name: /Seleccionar/ })
      .first()
      .check();
    await picker
      .getByRole("button", { name: "Usar 1 imagen", exact: true })
      .click();
    const photoGrid = canvas.locator("[data-type=photo-grid]");
    await photoGrid.locator("img").waitFor({ state: "attached" });
    const selectedPath = await photoGrid.locator("img").getAttribute("src");
    assert.ok(selectedPath?.startsWith("/assets/images/"));
    const list = page.getByRole("complementary", {
      name: "Secciones",
      exact: true,
    });
    const actions = list.getByLabel("Acciones de sección", { exact: true });
    const openActions = async () => {
      if (!(await actions.evaluate((node) => node.parentElement.open)))
        await actions.click();
    };
    await openActions();
    await list
      .getByRole("button", { name: "Subir sección", exact: true })
      .click();
    await openActions();
    await list.getByRole("button", { name: "Duplicar", exact: true }).click();
    assert.equal(await photoGrid.count(), 2);
    await openActions();
    await list.getByRole("button", { name: "Ocultar", exact: true }).click();
    assert.equal(await photoGrid.count(), 1);
    page.once("dialog", (d) => d.accept());
    await list.getByRole("button", { name: "Eliminar", exact: true }).click();
    assert.equal(
      await list.getByRole("button", { name: /Cuadrícula de fotos/ }).count(),
      2,
    ); // expand + select
    checks.push(
      "Selecting the canvas, edit, undo/redo, block library, photo reuse, reorder, duplicate, hide, delete",
    );

    await list
      .getByRole("button", { name: /^Portada / })
      .first()
      .click();
    await page.getByRole("button", { name: "Tablet", exact: true }).click();
    await properties
      .getByRole("button", { name: "Responsive", exact: true })
      .click();
    const range = properties.getByRole("slider", {
      name: "Punto focal horizontal",
    });
    await range.focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    assert.equal(await range.inputValue(), "1");
    assert.equal(await canvas.evaluate((el) => el.style.width), "768px");
    await snap("03-tablet-ajustes");
    await page.getByRole("button", { name: "Móvil", exact: true }).click();
    assert.equal(await range.inputValue(), "50");
    let result = await page.request.get(origin + "/es");
    assert.equal((await result.text()).includes(text), false);
    await push("Guardar", 200);
    assert.equal(
      (await (await page.request.get(origin + "/es")).text()).includes(text),
      false,
    );
    await stale
      .getByRole("complementary", { name: "Propiedades" })
      .getByRole("textbox", { name: "Título ES", exact: true })
      .fill("Edición concurrente de prueba");
    const staleResponse = stale.waitForResponse(
      (r) =>
        r.url().endsWith("/api/studio-visual") &&
        r.request().method() === "POST",
    );
    await stale.getByRole("button", { name: "Guardar", exact: true }).click();
    assert.equal((await staleResponse).status(), 409);
    await stale.close({ runBeforeUnload: false });
    await page
      .getByRole("button", { name: "Previsualizar", exact: true })
      .click();
    const render = page.getByRole("dialog", { name: /Previsualización/ });
    await render
      .locator("[data-section=" + heroId + "]")
      .getByRole("heading", { name: text })
      .waitFor();
    assert.equal(await render.getByRole("link").count(), 0);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page
      .getByRole("button", { name: "Previsualizar", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: /Previsualización/ })
      .locator(".mash-visual[lang=en]")
      .waitFor();
    assert.equal(
      await page
        .getByRole("dialog", { name: /Previsualización/ })
        .getByRole("link")
        .count(),
      0,
    );
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "ES", exact: true }).click();
    await push("Publicar", 200);
    result = await page.request.get(origin + "/es");
    assert.match(await result.text(), new RegExp(text));
    const publicPage = await context.newPage();
    await publicPage.goto(origin + "/es");
    assert.equal(
      await publicPage
        .locator("[data-section=" + heroId + "] .hero-title")
        .innerText(),
      text,
    );
    assert.equal(await publicPage.locator(".hero-showroom img").count(), 2);
    assert.equal(await publicPage.locator("[data-section=legacy-showroom]").count(), 0);
    assert.equal(
      await publicPage
        .locator("[data-section=" + heroId + "]")
        .evaluate((el) =>
          el.style.getPropertyValue("--visual-focus-tablet").trim(),
        ),
      "1% 50%",
    );
    for (const [device, width] of [["Escritorio", 1280], ["Tablet", 768], ["Móvil", 390]]) {
      await page.getByRole("button", { name: device, exact: true }).click();
      await publicPage.setViewportSize({ width, height: 900 });
      const styles = async (root) => root.locator("[data-section=" + heroId + "] .hero-copy")
        .evaluate((node) => {
          const css = getComputedStyle(node);
          return { left: parseFloat(css.paddingLeft), right: parseFloat(css.paddingRight), font: css.fontFamily };
        });
      const studioStyle = await styles(canvas);
      const publicStyle = await styles(publicPage);
      for (const side of ["left", "right"])
        assert.ok(Math.abs(studioStyle[side] - publicStyle[side]) <= 1, device + " " + side);
      assert.equal(studioStyle.font, publicStyle.font);
      assert.equal(await canvas.locator(".hero-showroom").isVisible(), width > 920);
      assert.equal(await publicPage.locator(".hero-showroom").isVisible(), width > 920);
      if (device === "Tablet") {
        const focus = (root) => root.locator(".hero-media__image").evaluate((image) =>
          getComputedStyle(image).objectPosition,
        );
        assert.equal(await focus(canvas), "1% 52%");
        assert.equal(await focus(publicPage), "1% 52%");
      }
    }
    await publicPage.close();
    checks.push(
      "Preview has no live links, persist responsive overrides, conflict 409, save does not publish, shared public markup after publish",
    );
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByRole("button", { name: "Lienzo", exact: true }).click();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "editor overflow " + width,
      );
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await snap("04-editor-movil");
    checks.push("Responsive at 1440, 768, 390 and 320 px");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(studio + "/traducciones");
    const preference = page.getByRole("button", {
      name: "Preferencias de traducción",
      exact: true,
    });
    const review = page
      .getByRole("button", { name: "Revisar", exact: true })
      .first();
    const filter = page.getByRole("button", { name: "Filtrar", exact: true });
    await review.waitFor();
    async function contrast(locator) {
      return locator.evaluate((el) => {
        const lum = (value) => {
          const [r, g, b] = value
            .match(/\d+/g)
            .map(Number)
            .map((n) => n / 255)
            .map((n) =>
              n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
            );
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const css = getComputedStyle(el);
        let background = css.backgroundColor;
        for (
          let parent = el.parentElement;
          background === "rgba(0, 0, 0, 0)" && parent;
          parent = parent.parentElement
        ) {
          background = getComputedStyle(parent).backgroundColor;
        }
        const a = lum(css.color),
          b = lum(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
    }
    const measurements = {};
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (theme) => localStorage.setItem("mash-studio-theme", theme),
        theme,
      );
      await page.reload();
      await page.locator(`[data-theme="${theme}"]`).waitFor();
      await review.waitFor();
      measurements[theme] = await Promise.all(
        [
          preference,
          filter,
          review,
          page.getByRole("button", { name: "Traducir selección" }),
          page.getByRole("link", { name: "Multimedia", exact: true }),
        ].map(contrast),
      );
      assert.ok(
        measurements[theme].every((value) => value >= 4.5),
        JSON.stringify(measurements),
      );
      await preference.focus();
      assert.equal(
        await preference.evaluate((el) => el.matches(":focus-visible")),
        true,
      );
      if (theme === "dark") await snap("05-contraste-oscuro");
    }
    await page.setViewportSize({ width: 390, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await snap("06-traducciones-movil");
    checks.push(
      "Shared secondary buttons pass contrast in both themes, visible focus and mobile translation indicators",
    );
    assert.deepEqual(failures, []);
    fs.writeFileSync(
      out + "/browser-evidence.json",
      JSON.stringify(
        {
          checks,
          contrast: measurements,
          syntheticFixture: true,
          widths: [1440, 768, 390, 320],
        },
        null,
        2,
      ) + "\n",
    );
    console.log(checks.join("\n"));
  } catch (error) {
    console.error(
      "Editor path:",
      new URL(page.url()).pathname,
      "Alerts:",
      await page.getByRole("alert").allTextContents(),
    );
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

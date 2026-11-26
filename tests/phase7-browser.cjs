const assert = require("node:assert/strict");
const { mkdirSync, writeFileSync } = require("node:fs");
const { chromium } = require("playwright");

async function main() {
  const origin = process.env.MASH_PREVIEW_URL || "http://localhost:3016";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  const login = await fetch(origin + "/__preview__/enter", {
    redirect: "manual",
  });
  const token = /base64-([^;]+)/.exec(login.headers.get("set-cookie") ?? "");
  assert.equal(login.status, 303);
  assert.match(
    Buffer.from(token[1], "base64url").toString(),
    /fixture-refresh/,
  );
  const directory =
    process.env.MASH_EVIDENCE_DIR || ".test-artifacts/phase7-browser";
  mkdirSync(directory + "/screenshots", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const studio = await context.newPage();
  studio.setDefaultTimeout(12000);
  const publicContext = await browser.newContext();
  const visitor = await publicContext.newPage();
  const checks = [];
  const screenshots = (page, name) =>
    page.screenshot({
      path: directory + "/screenshots/" + name + ".png",
      animations: "disabled",
    });
  const timestamp = Date.now();
  const title = "Noticia de prueba " + timestamp;
  const newsUrl = origin + "/es/noticias/noticia-de-prueba-" + timestamp;
  const message = "Aviso programado de prueba " + timestamp;
  const failures = [];
  studio.on("pageerror", (error) => failures.push(error.message));
  visitor.on("pageerror", (error) => failures.push(error.message));
  async function editorial(name) {
    const response = studio.waitForResponse(
      (res) =>
        res.url().endsWith("/api/studio-editorial") &&
        res.request().method() === "POST",
    );
    if (["Publicar", "Mover a papelera"].includes(name))
      studio.once("dialog", (dialog) => dialog.accept());
    await studio.getByRole("button", { name, exact: true }).click();
    const result = await response;
    assert.equal(result.status(), 200, await result.text());
    return result.json();
  }
  async function choosePhoto(label, index = 0) {
    await studio.getByRole("button", { name: label, exact: true }).click();
    const picker = studio.getByRole("dialog", { name: "Elegir de Multimedia" });
    await picker
      .getByRole("checkbox", { name: /Seleccionar/ })
      .nth(index)
      .check();
    await picker
      .getByRole("button", { name: "Usar 1 imagen", exact: true })
      .click();
  }
  try {
    let markRequested;
    let release;
    const requested = new Promise((resolve) => {
      markRequested = resolve;
    });
    const hold = new Promise((resolve) => {
      release = resolve;
    });
    await studio.route(/\/studio-mash\/productos\?/, async (route) => {
      if (route.request().headers().rsc === "1") {
        markRequested();
        await hold;
      }
      await route.continue();
    });
    await studio.goto(origin + "/__preview__/enter");
    const home = studio.getByRole("heading", {
      name: "Tu espacio de trabajo",
      exact: true,
    });
    await home.waitFor();
    try {
      await studio
        .locator(".studio-sidebar")
        .getByRole("link", { name: "Productos", exact: true })
        .click();
      await Promise.race([
        requested,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(Error("No Flight navigation request")),
            10000,
          ),
        ),
      ]);
      await home.waitFor({ state: "visible" });
      assert.equal(await studio.locator(".studio-loading").count(), 0);
    } finally {
      release();
    }
    await studio
      .getByRole("heading", { name: "Productos", exact: true })
      .waitFor();
    checks.push(
      "Old Studio route swaps directly while delayed Flight retains prior content",
    );

    const unauth = await publicContext.request.post(
      origin + "/api/studio-editorial",
      { headers: { origin }, data: {} },
    );
    assert.equal(unauth.status(), 401);
    const foreign = await context.request.post(
      origin + "/api/studio-editorial",
      { headers: { origin: "https://elsewhere.invalid" }, data: {} },
    );
    assert.equal(foreign.status(), 403);
    checks.push("Editorial writes require same origin and a Studio session");

    await studio.goto(origin + "/studio-mash/noticias/nuevo");
    await studio
      .getByRole("textbox", { name: /^(Obligatorio )?Título$/ })
      .fill(title);
    await studio
      .getByRole("textbox", { name: "Extracto", exact: true })
      .fill("Extracto de la prueba editorial.");
    await studio.getByRole("button", { name: /Párrafo/ }).click();
    await studio
      .getByRole("textbox", { name: "1. Párrafo" })
      .fill("Contenido estructurado <em>visible como texto</em>.");
    await choosePhoto("Elegir portada");
    const newsDraft = await editorial("Guardar borrador");
    await studio.getByText("Borrador guardado.", { exact: true }).waitFor();
    assert.equal((await visitor.goto(newsUrl)).status(), 404);
    await visitor.goto(origin + "/es");
    assert.equal(await visitor.getByRole("link", { name: title }).count(), 0);

    await editorial("Publicar");
    await studio.getByText("Versión publicada.", { exact: true }).waitFor();
    await screenshots(studio, "01-noticia-escritorio");
    assert.equal((await visitor.goto(newsUrl)).status(), 200);
    assert.match(await visitor.title(), new RegExp(title));
    await visitor
      .getByText("Contenido estructurado <em>visible como texto</em>.", {
        exact: true,
      })
      .waitFor();
    assert.equal(await visitor.locator("article em").count(), 0);
    assert.match(
      await visitor.locator('link[rel="canonical"]').getAttribute("href"),
      /\/es\/noticias\/noticia-de-prueba-/,
    );
    await visitor.goto(origin + "/es");
    await visitor
      .getByRole("region", { name: "Noticias" })
      .getByRole("link", { name: title })
      .click();
    await visitor.waitForURL(newsUrl);

    const composer = await context.newPage();
    await composer.goto(origin + "/studio-mash/contenido/editor");
    await composer
      .frameLocator('iframe[title="Lienzo de Inicio"]')
      .locator("[data-section=legacy-news]")
      .waitFor();
    await composer
      .getByRole("complementary", { name: "Propiedades" })
      .getByRole("textbox", { name: "Título ES", exact: true })
      .fill("Inicio editorial de prueba " + timestamp);
    const publishComposition = composer.waitForResponse(
      (response) => response.url().endsWith("/api/studio-visual") &&
        response.request().method() === "POST",
    );
    composer.once("dialog", (dialog) => dialog.accept());
    await composer.getByRole("button", { name: "Publicar", exact: true }).click();
    const composition = await publishComposition;
    assert.equal(composition.status(), 200, await composition.text());
    await composer.close();
    for (const locale of ["es", "en"]) {
      await visitor.goto(origin + "/" + locale);
      await visitor.locator("[data-section=legacy-news]").getByRole("link", { name: title }).waitFor();
      assert.equal(await visitor.locator("header a[href$='/noticias']").count(), 0);
      assert.equal(await visitor.locator("footer nav a[href='/" + locale + "/noticias']").count(), 1);
    }
    checks.push("First visual Home publication preserves recent news, with a footer-only navigation link in ES/EN");
    await visitor.goto(newsUrl);

    await studio
      .getByRole("textbox", { name: /^(Obligatorio )?Título$/ })
      .fill("Cambio privado " + timestamp);
    await editorial("Guardar borrador");
    await visitor.reload();
    await visitor.getByRole("heading", { name: title, exact: true }).waitFor();
    assert.equal(
      await visitor.getByText("Cambio privado " + timestamp).count(),
      0,
    );
    assert.ok(newsDraft.id);
    checks.push(
      "News media, draft isolation, structured text, publish and canonical route",
    );

    await studio.goto(origin + "/studio-mash/anuncios/nuevo");
    await studio
      .getByRole("textbox", { name: "Título interno" })
      .fill("Aviso local");
    await studio
      .getByRole("textbox", { name: "Texto del anuncio" })
      .fill(message);
    await studio
      .getByRole("textbox", { name: "Llamada a la acción" })
      .fill("Ver proyectos");
    await studio
      .getByRole("textbox", { name: "Enlace de la acción" })
      .fill("/proyectos");
    const localTime = (offset) =>
      new Date(Date.now() - 4 * 3600000 + offset).toISOString().slice(0, 16);
    await studio
      .getByRole("textbox", { name: "Inicio", exact: true })
      .fill(localTime(-3600000));
    await studio
      .getByRole("textbox", { name: "Fin", exact: true })
      .fill(localTime(3600000));
    await studio.getByRole("checkbox", { name: "Activo al publicar" }).check();
    await studio
      .getByRole("checkbox", { name: "Proyectos", exact: true })
      .check();
    await editorial("Publicar");
    await studio.getByText("Versión publicada.", { exact: true }).waitFor();
    await visitor.goto(origin + "/es/proyectos");
    await visitor.getByText(message, { exact: true }).waitFor();
    await visitor.getByRole("button", { name: "Cerrar anuncio" }).click();
    await visitor.reload();
    await visitor.waitForFunction(
      (text) => !document.body.innerText.includes(text),
      message,
    );
    const fresh = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await fresh.goto(origin + "/es/noticias");
    assert.equal(await fresh.getByText(message).count(), 0);
    await fresh.goto(origin + "/en/proyectos");
    assert.equal(await fresh.getByText(message).count(), 0);
    checks.push(
      "Public announcement scope, locale, priority surface and session dismissal",
    );

    await studio.goto(origin + "/studio-mash/proyectos/nuevo");
    const projectTitle = "Proyecto de prueba " + timestamp;
    const projectSlug = "proyecto-de-prueba-" + timestamp;
    await studio.locator('[name="slug"]').fill(projectSlug);
    await studio.locator('[name="location"]').fill("Región de prueba");
    await studio.locator('[name="title_es"]').fill(projectTitle);
    await studio
      .locator('[name="description_es"]')
      .fill("Descripción del espacio de prueba");
    await studio
      .getByRole("combobox", { name: "Categoría de proyecto" })
      .fill("Hotelero");
    await studio
      .getByRole("textbox", { name: "Descripción breve" })
      .fill("Resumen de prueba");
    await choosePhoto("Añadir desde Multimedia");
    await studio.getByText("Antes y después", { exact: true }).click();
    await choosePhoto("Elegir foto de antes");
    await choosePhoto("Elegir foto de después", 1);
    await screenshots(studio, "02-proyecto-escritorio");
    const publishProject = studio.getByRole("button", {
      name: "Publicar cambios",
      exact: true,
    });
    studio.once("dialog", (dialog) => dialog.accept());
    await publishProject.click();
    await studio.waitForURL(origin + "/studio-mash/proyectos");
    await fresh.goto(origin + "/es/proyectos");
    assert.equal(await fresh.locator(".workshop-location").count(), 0);
    await fresh.getByRole("link", { name: projectTitle, exact: true }).click();
    await fresh
      .getByRole("heading", { name: projectTitle, exact: true })
      .waitFor();
    const projectPath = "/es/proyectos/" + projectSlug;
    await visitor.setViewportSize({ width: 1440, height: 960 });
    await visitor.goto(origin + projectPath);
    const desktopSlider = visitor.getByRole("slider");
    const desktopImages = visitor.locator(".editorial-compare-images");
    await desktopSlider.scrollIntoViewIfNeeded();
    assert.equal(await desktopSlider.inputValue(), "50");
    assert.equal(await desktopImages.getByRole("slider").count(), 1);
    assert.equal(
      await visitor.locator(".editorial-compare figcaption").count(),
      0,
    );
    const handle = await desktopSlider.boundingBox();
    const frame = await desktopImages.boundingBox();
    const mouseX = handle.x + handle.width / 2,
      mouseY = handle.y + handle.height / 2;
    assert.ok(Math.abs(mouseX - (frame.x + frame.width / 2)) < 1);
    await visitor.mouse.move(mouseX, mouseY);
    await visitor.mouse.down();
    await visitor.mouse.move(mouseX - frame.width * 0.25, mouseY + 25, {
      steps: 8,
    });
    await visitor.mouse.up();
    assert.equal(await desktopSlider.inputValue(), "25");

    await visitor.setViewportSize({ width: 768, height: 900 });
    await visitor.reload();
    await desktopSlider.scrollIntoViewIfNeeded();
    assert.equal(await desktopSlider.inputValue(), "50");

    await fresh.setViewportSize({ width: 320, height: 760 });
    const slider = fresh.getByRole("slider");
    await slider.scrollIntoViewIfNeeded();
    assert.equal(await slider.inputValue(), "50");
    const sliderBox = await slider.boundingBox();
    const imageBox = await fresh
      .locator(".editorial-compare-images")
      .boundingBox();
    const x = Math.round(sliderBox.x + sliderBox.width / 2);
    const y = Math.round(sliderBox.y + sliderBox.height / 2);
    const touch = await fresh.context().newCDPSession(fresh);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (const step of [0.08, 0.16, 0.25]) {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + Math.round(imageBox.width * step), y }],
      });
    }
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.equal(await slider.inputValue(), "75");
    await slider.press("Home");
    assert.equal(await slider.inputValue(), "0");
    await slider.press("ArrowRight");
    assert.equal(await slider.inputValue(), "1");
    await slider.press("End");
    assert.equal(await slider.inputValue(), "100");
    await fresh.reload();
    await slider.scrollIntoViewIfNeeded();
    assert.equal(await slider.inputValue(), "50");
    await screenshots(fresh, "04-comparador-movil");
    assert.equal(
      await fresh.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    checks.push(
      "Project publishes with media, stable detail route and an image-centered comparison operated with mouse, touch and keyboard",
    );

    await fresh.setViewportSize({ width: 390, height: 844 });
    await fresh.goto(origin + "/es/contacto", {
      waitUntil: "domcontentloaded",
    });
    const workshop = fresh.getByRole("region", {
      name: "Ubicación del taller",
    });
    await workshop
      .getByRole("heading", { name: "Ubicación del taller" })
      .waitFor();
    await workshop.scrollIntoViewIfNeeded();
    const iframe = workshop.locator("iframe");
    assert.match(
      await iframe.getAttribute("src"),
      /google\.com\/maps\/embed.*19\.486419,-70\.664113/,
    );
    assert.equal(
      await workshop
        .getByRole("link", { name: "Cómo llegar" })
        .getAttribute("href"),
      "https://maps.app.goo.gl/boeE5xkJGyu5Pw4m9",
    );
    assert.equal(
      await fresh.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await iframe
      .contentFrame()
      .getByText("Datos del mapa", { exact: true })
      .waitFor({ state: "attached" });
    await screenshots(fresh, "03-ubicacion-taller-movil");
    await fresh.goto(origin + "/en/contacto", {
      waitUntil: "domcontentloaded",
    });
    await fresh.getByRole("heading", { name: "Workshop location" }).waitFor();
    checks.push(
      "Contact shows the workshop map and directions in both languages",
    );

    const projectRow = studio
      .locator("article.studio-entry")
      .filter({ hasText: projectTitle });
    await projectRow.getByLabel("Acciones de " + projectTitle).click();
    studio.once("dialog", (dialog) => dialog.accept());
    await projectRow.getByRole("button", { name: "Duplicar proyecto" }).click();
    await studio.waitForURL(/\/studio-mash\/proyectos\/[a-f0-9-]+$/);
    assert.match(await studio.locator('[name="slug"]').inputValue(), /-copia-/);
    assert.equal(
      await studio.locator('[name="display_status"]').inputValue(),
      "draft",
    );
    checks.push("Project duplication copies a draft without publishing");

    await studio.goto(origin + "/studio-mash/anuncios");
    await studio.setViewportSize({ width: 390, height: 844 });
    await studio.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await studio.waitForFunction(
      () =>
        document.getElementById("mash-studio-root")?.dataset.theme === "dark",
    );
    assert.equal(
      await studio.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await studio.waitForFunction(() => {
      const button = document.querySelector(
        ".editorial-list .studio-list-filters button",
      );
      return (
        button && getComputedStyle(button).backgroundColor === "rgb(37, 48, 41)"
      );
    });
    await screenshots(studio, "05-anuncios-movil");
    const announcementRow = studio.locator(".editorial-admin-rows li").filter({ hasText: "Aviso local" });
    const remove = announcementRow.getByRole("button", { name: "Eliminar", exact: true });
    studio.once("dialog", (dialog) => dialog.dismiss());
    await remove.click();
    assert.ok(await announcementRow.isVisible());
    studio.once("dialog", (dialog) => dialog.accept());
    await remove.click();
    await announcementRow.waitFor({ state: "detached" });
    await fresh.goto(origin + "/es/proyectos");
    assert.equal(await fresh.getByText(message, { exact: true }).count(), 0);
    await studio.getByRole("link", { name: "Papelera", exact: true }).click();
    await announcementRow.getByRole("link", { name: "Abrir para restaurar" }).click();
    await editorial("Restaurar como borrador");
    await studio.getByText("Borrador guardado.", { exact: true }).waitFor();
    await fresh.reload();
    assert.equal(await fresh.getByText(message, { exact: true }).count(), 0);
    await studio.goto(origin + "/studio-mash/noticias/" + newsDraft.id);
    await editorial("Mover a papelera");
    assert.equal((await visitor.goto(newsUrl)).status(), 404);
    checks.push(
      "Mobile trash actions support cancellation, public removal, and restoring an announcement as a private draft",
    );
    assert.deepEqual(failures, []);
    writeFileSync(
      directory + "/result.json",
      JSON.stringify({ browser: browser.version(), checks }, null, 2),
    );
    console.log(checks.join("\n"));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

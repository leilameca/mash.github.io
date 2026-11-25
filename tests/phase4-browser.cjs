const assert = require("node:assert/strict");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { chromium } = require("playwright");
const sharp = require("sharp");

async function main() {
  const origin = process.env.MASH_PREVIEW_URL || "http://localhost:3010";
  const target = new URL(origin);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(target.hostname));
  // Require the explicit synthetic harness before making any writes.
  const entry = await fetch(origin + "/__preview__/enter", {
    redirect: "manual",
  });
  assert.equal(entry.status, 303);
  const cookie = /base64-([^;]+)/.exec(entry.headers.get("set-cookie") ?? "");
  assert.ok(
    cookie &&
      Buffer.from(cookie[1], "base64url")
        .toString()
        .includes("fixture-refresh"),
  );
  const directory =
    process.env.MASH_EVIDENCE_DIR || ".test-artifacts/phase4-browser";
  fs.mkdirSync(directory + "/screenshots", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = [];
  const path = (suffix) => origin + "/studio-mash/" + suffix;
  async function capture(name, locator = page) {
    await locator.screenshot({
      path: directory + "/screenshots/" + name + ".png",
    });
  }
  try {
    await page.goto(origin + "/__preview__/enter");
    await page.goto(path("productos/nuevo"));
    await page.locator(".studio-gallery-editor").waitFor();
    assert.equal(
      await page
        .locator(".studio-editor-fields")
        .evaluate((el) => getComputedStyle(el).display),
      "grid",
    );
    await capture("01-editor-nuevo");
    const slug = "prueba-multimedia-" + randomUUID().slice(0, 8);
    const name = "Producto de prueba " + slug.slice(-8);
    await page.locator("[name=name_es]").fill(name);
    await page
      .locator("[name=description_es]")
      .fill("Descripción sintética para comprobar el recorrido en español.");
    await page.locator("[name=slug]").fill(slug);
    await page.locator("[name=seo_title_es]").fill("Título SEO de prueba");
    const membership = page.locator(".studio-product-memberships");
    await membership.getByRole("checkbox", { name: "Terraza", exact: true }).check();
    await membership.getByRole("checkbox", { name: "Dining", exact: true }).check();
    await page.locator("[name=collection_id]").selectOption({ label: "Dining" });
    const selectedIds = await page
      .locator("[name=collection_ids]")
      .inputValue();
    await capture(
      "07-colecciones-multiples",
      page.locator(".studio-product-sidebar"),
    );

    const selector = page.locator("[data-studio-upload-input]").first();
    const sources = [
      "public/assets/images/oasis-set.jpg",
      "public/assets/images/oculus-mare-dining.jpg",
    ];
    const images = await Promise.all(
      sources.map((photo, index) =>
        sharp(photo)
          .resize(1200, 800, { fit: "cover" })
          .jpeg()
          .withMetadata({ orientation: index === 0 ? 6 : 1 })
          .toBuffer(),
      ),
    );
    const filenames = images.map(
      (_, index) => slug + "-" + (index + 1) + ".jpg",
    );
    let allowUpload;
    const hold = new Promise((resolve) => {
      allowUpload = resolve;
    });
    const routeUpload = async (route) => {
      if (route.request().method() === "POST") await hold;
      await route.continue();
    };
    await page.route("**/api/studio-media", routeUpload);
    await selector.setInputFiles(
      images.map((buffer, index) => ({
        name: filenames[index],
        mimeType: "image/jpeg",
        buffer,
      })),
    );
    const jobs = page.locator(".studio-upload-jobs");
    await jobs.locator("progress").first().waitFor();
    await capture("09-carga", jobs);
    allowUpload();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-upload-state="done"]').length === 2,
    );
    await page.unroute("**/api/studio-media", routeUpload);
    check.push("Dos originales cargados con progreso individual y Sharp");

    await page
      .getByRole("button", { name: "Elegir de Multimedia", exact: true })
      .click();
    const picker = page.getByRole("dialog");
    const reusable = picker
      .getByRole("checkbox", { name: /^Seleccionar/ })
      .and(picker.locator("input:not(:disabled)"))
      .first();
    await reusable.check();
    await capture("06-selector-multimedia", picker);
    await picker
      .getByRole("button", { name: "Usar 1 imagen", exact: true })
      .click();
    const gallery = page.locator(".studio-gallery-editor");
    await gallery.getByRole("button", { name: "Mover imagen 3 antes" }).focus();
    await page.keyboard.press("Enter");
    await gallery.getByRole("radio").nth(1).check();
    await gallery
      .getByRole("textbox", { name: "Texto alternativo ES", exact: true })
      .fill("Fotografía reutilizada del catálogo");
    const order = await page
      .locator('[name="existing_image_paths"]')
      .inputValue();
    const cover = await page
      .locator('[name="primary_image_path"]')
      .inputValue();
    await capture("02-galeria", gallery);
    await capture("03-portada", gallery.locator(".studio-gallery-thumbnails"));
    await page
      .getByRole("button", { name: "Vista previa", exact: true })
      .click();
    assert.equal(
      await page.locator(".studio-preview-dialog h2").innerText(),
      name,
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page
      .getByRole("button", { name: "Guardar borrador", exact: true })
      .click();
    await page.waitForURL("**/productos?saved=1");
    await page.getByRole("link", { name, exact: true }).first().click();
    await page.waitForURL(/\/studio-mash\/productos\/[0-9a-f-]+$/);
    const productUrl = page.url();
    assert.equal(
      await page.locator("[name=collection_ids]").inputValue(),
      selectedIds,
    );
    assert.equal(
      await page.locator('[name="existing_image_paths"]').inputValue(),
      order,
    );
    assert.equal(
      await page.locator('[name="primary_image_path"]').inputValue(),
      cover,
    );
    assert.equal(
      (await page.request.get(origin + "/es/productos/" + slug)).status(),
      404,
    );
    check.push(
      "Selección de biblioteca, orden por teclado, portada, borrador y colecciones persistentes",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await gallery.evaluate((element) =>
      window.scrollTo(
        0,
        window.scrollY + element.getBoundingClientRect().top - 210,
      ),
    );
    await page.waitForFunction(
      () =>
        document.querySelector(".studio-gallery-editor").getBoundingClientRect()
          .top < 300,
    );
    await capture("08-editor-movil");
    await page.setViewportSize({ width: 1440, height: 1000 });
    page.once("dialog", (dialog) => dialog.accept());
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page
      .getByRole("button", { name: "Publicar cambios", exact: true })
      .click();
    await page.waitForURL("**/productos?published=1");
    const response = await page.request.get(origin + "/es/productos/" + slug);
    assert.equal(response.status(), 200);
    assert.match(await response.text(), /Título SEO de prueba/);
    for (const collection of ["terraza", "dining"]) {
      const publicCollection = await page.request.get(
        origin + "/es/colecciones/" + collection,
      );
      assert.equal(publicCollection.status(), 200);
      assert.ok(
        (await publicCollection.text()).includes("/es/productos/" + slug),
      );
    }
    check.push(
      "Publicación explícita en español con SEO y presencia en ambas colecciones",
    );

    await page.getByRole("searchbox", { name: "Buscar", exact: true }).fill(name);
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get("q") === name);
    const originalPath = new URL(productUrl).pathname;
    await page.getByLabel("Acciones de " + name, { exact: true }).click();
    const duplicate = page.getByRole("button", { name: "Duplicar producto", exact: true });
    page.once("dialog", (dialog) => dialog.dismiss());
    await duplicate.click();
    assert.equal(new URL(page.url()).searchParams.get("q"), name);
    page.once("dialog", (dialog) => dialog.accept());
    await duplicate.click();
    await page.waitForURL((url) =>
      /\/studio-mash\/productos\/[0-9a-f-]+$/.test(url.pathname) && url.pathname !== originalPath,
    );
    const copiedSlug = await page.locator("[name=slug]").inputValue();
    assert.ok(copiedSlug.startsWith(slug + "-copia-"));
    assert.equal(await page.locator("[name=collection_ids]").inputValue(), selectedIds);
    assert.equal(await page.locator('[name="existing_image_paths"]').inputValue(), order);
    assert.equal(await page.locator('[name="primary_image_path"]').inputValue(), cover);
    assert.equal(await page.locator("[name=seo_title_es]").inputValue(), "Título SEO de prueba");
    assert.equal((await page.request.get(origin + "/es/productos/" + copiedSlug)).status(), 404);
    check.push("Buscar, cancelar y duplicar conserva colecciones, fotos y SEO sin publicar la copia");

    await page.goto(path("multimedia"));
    await page.locator(".studio-asset-grid li").first().waitFor();
    await page.waitForFunction(() => {
      const images = [
        ...document.querySelectorAll(".studio-asset-photo img"),
      ].slice(0, 4);
      return (
        images.length === 4 &&
        images.every((image) => image.complete && image.naturalWidth > 0)
      );
    });
    await capture("04-biblioteca");
    await page.getByRole("button", { name: filenames[0], exact: true }).click();
    const detail = page.getByRole("dialog");
    await detail.getByText("800 × 1200 px", { exact: true }).first().waitFor();
    assert.ok(
      await detail.getByText("Alta resolución", { exact: true }).isVisible(),
    );
    const originalHref = await detail
      .getByRole("link", { name: "Descargar original" })
      .getAttribute("href");
    const original = await page.request.get(origin + originalHref);
    assert.equal(original.status(), 200);
    assert.deepEqual(await original.body(), images[0]);
    await capture("05-detalle", detail);
    await page.keyboard.press("Escape");
    await page.locator("[data-studio-upload-input]").setInputFiles({
      name: "archivo-invalido.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not an image"),
    });
    const failed = page.locator('[data-upload-state="error"]');
    await failed.waitFor();
    await capture("10-error", failed);
    check.push(
      "Detalle con derivados y original exacto, rechazo visible de archivo inválido",
    );

    await page.goto(path("configuracion"));
    const business = page.getByRole("tab", { name: "Negocio" });
    await business.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page
        .getByRole("tab", { name: "Contacto" })
        .getAttribute("aria-selected"),
      "true",
    );
    await page.getByRole("tab", { name: "Preferencias" }).click();
    assert.equal(await page.locator("#cuenta").isVisible(), true);
    await page.goto(path("revisiones"));
    await page.locator('select[name="kind"]').selectOption("product");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await page.waitForURL(/kind=product/);
    await page.locator(".studio-revision > details > summary").first().click();
    assert.ok(
      await page
        .getByRole("button", { name: "Restaurar como borrador" })
        .first()
        .isVisible(),
    );
    check.push(
      "Pestañas por teclado y filtro de entidad con comparación expandible",
    );
    await page.goto(path("productos"));
    const row = page.locator(".studio-entry").filter({
      has: page.locator(`.studio-entry-name[href="${originalPath}"]`),
    });
    const menu = row.locator("summary");
    await menu.click();
    const trash = row.getByRole("button", { name: "Mover a papelera", exact: true });
    page.once("dialog", (dialog) => dialog.dismiss());
    await trash.click();
    assert.equal((await page.request.get(origin + "/es/productos/" + slug)).status(), 200);
    page.once("dialog", (dialog) => dialog.accept());
    await trash.click();
    await row.getByText("Trabajo: Archivado", { exact: false }).waitFor();
    assert.equal((await page.request.get(origin + "/es/productos/" + slug)).status(), 404);
    const restore = row.getByRole("button", { name: "Pasar a borrador", exact: true });
    if (!(await restore.isVisible())) await menu.click();
    page.once("dialog", (dialog) => dialog.accept());
    await restore.click();
    await row.getByText("Trabajo: Borrador", { exact: false }).waitFor();
    await page.goto(productUrl);
    assert.equal(await page.locator("[name=collection_ids]").inputValue(), selectedIds);
    assert.equal(await page.locator('[name="existing_image_paths"]').inputValue(), order);
    assert.equal((await page.request.get(origin + "/es/productos/" + slug)).status(), 404);
    check.push("Cancelar papelera mantiene la versión pública; archivar y restaurar conserva fotos y colecciones");

    const collectionSlug = "coleccion-" + slug;
    const collectionName = "Colección · Jardín & Terráza " + slug.slice(-8);
    const publicCollection = origin + "/es/colecciones/" + collectionSlug;
    await page.goto(path("colecciones/nueva"));
    await page.locator("[name=slug]").fill(collectionSlug);
    await page.locator("[name=name_es]").fill(collectionName);
    await page.locator("[name=description_es]").fill("Colección de exterior para terrazas.");
    await page.locator("[name=cover_image]").setInputFiles({
      name: "portada.jpg", mimeType: "image/jpeg", buffer: images[0],
    });
    await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
    await page.waitForURL("**/studio-mash/colecciones");
    assert.equal((await page.request.get(publicCollection)).status(), 404);
    const collectionRow = page.locator(".studio-entry").filter({
      has: page.getByRole("link", { name: collectionName, exact: true }),
    });
    await collectionRow.locator("summary").click();
    page.once("dialog", (dialog) => dialog.accept());
    await collectionRow.getByRole("button", { name: "Publicar versión", exact: true }).click();
    await collectionRow.getByRole("link", { name: "Ver publicado" }).waitFor({ state: "attached" });
    const published = await page.request.get(publicCollection);
    assert.equal(published.status(), 200);
    assert.ok((await published.text()).includes("Jardín"));
    check.push("Crear colección con caracteres especiales, guardar borrador y publicar desde el menú");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      directory + "/phase4-browser.json",
      JSON.stringify(
        {
          testedAt: new Date().toISOString(),
          browser: "Chrome",
          syntheticData: true,
          environment:
            "Next local, PostgreSQL aislado, Auth y Storage simulados",
          checks: check,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(check.join("\n"));
  } catch (error) {
    console.error("Page:", new URL(page.url()).pathname);
    console.error(
      "Alerts:",
      await page.locator('[role="alert"]').allTextContents(),
    );
    console.error(
      "Invalid fields:",
      await page
        .locator("form.studio-product-editor")
        .evaluateAll((forms) =>
          forms.flatMap((form) =>
            [...form.querySelectorAll(":invalid")].map((field) => field.name),
          ),
        ),
    );
    console.error("Browser errors:", errors);
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

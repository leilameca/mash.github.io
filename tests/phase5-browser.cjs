const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

async function main() {
  const origin = process.env.MASH_PREVIEW_URL || "http://localhost:3012";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
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
  const dir = process.env.MASH_EVIDENCE_DIR || ".test-artifacts/phase5-browser";
  fs.mkdirSync(dir + "/screenshots", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const checks = [];
  const capture = (name) =>
    page.screenshot({ path: dir + "/screenshots/" + name + ".png" });
  try {
    const studio = origin + "/studio-mash";
    await page.goto(origin + "/__preview__/enter");
    await page.goto(studio + "/traducciones");
    const table = page.locator(".studio-translation-rows");
    await table.getByRole("button", { name: "Revisar" }).first().waitFor();
    assert.equal(
      await page.getByText("DeepL sin configurar", { exact: true }).count(),
      1,
    );
    await capture("01-centro");
    await page.getByLabel("Entidad").selectOption("product");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await page.waitForResponse(
      (response) =>
        response.url().includes("kind=product") && response.status() === 200,
    );
    await table.getByRole("checkbox").first().check();
    await table.getByRole("checkbox").nth(1).check();
    assert.equal(
      await page
        .getByRole("button", { name: "Traducir selección" })
        .isDisabled(),
      true,
    );
    await table.getByRole("button", { name: "Revisar" }).first().focus();
    await page.keyboard.press("Enter");
    const detail = page.getByRole("dialog");
    await detail
      .getByRole("button", { name: "Editar inglés", exact: true })
      .waitFor();
    await capture("02-revision");
    await detail
      .getByRole("button", { name: "Editar inglés", exact: true })
      .click();
    const inputs = detail.getByRole("textbox");
    const count = await inputs.count();
    assert.ok(count > 1);
    for (let i = 0; i < count; i++)
      await inputs.nth(i).fill("Locally reviewed editorial field " + (i + 1));
    await detail
      .getByRole("button", { name: "Guardar como revisado", exact: true })
      .click();
    await detail
      .getByText("Revisión guardada en la copia de trabajo.", { exact: true })
      .waitFor();
    await detail.getByText(/Revisado · v/).waitFor();
    checks.push(
      "Keyboard review, original/English comparison and manually approved working revision",
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Preferencias de traducción", exact: true })
      .click();
    const prefs = page.getByRole("dialog", {
      name: "Preferencias de traducción",
    });
    await prefs
      .getByLabel("Diccionario de marca")
      .fill("MASH Outdoor\nFibra Premium");
    await prefs
      .getByLabel("Traducir al guardar cuando cambia el español")
      .check();
    await prefs.getByRole("button", { name: "Guardar preferencias" }).click();
    await prefs.getByText("Preferencias guardadas.", { exact: true }).waitFor();
    await capture("03-preferencias");
    await page.keyboard.press("Escape");
    await page.reload();
    await page
      .getByRole("button", { name: "Preferencias de traducción", exact: true })
      .click();
    assert.equal(
      await prefs.getByLabel("Diccionario de marca").inputValue(),
      "MASH Outdoor\nFibra Premium",
    );
    assert.equal(
      await prefs
        .getByLabel("Traducir al guardar cuando cambia el español")
        .isChecked(),
      true,
    );
    await page.keyboard.press("Escape");
    checks.push(
      "Persistent brand dictionary and automatic-on-save preferences",
    );
    const theme = page.locator(".studio-root");
    await theme.evaluate((element) =>
      element.setAttribute("data-theme", "dark"),
    );
    await capture("04-modo-oscuro");
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    await theme.evaluate((element) =>
      element.setAttribute("data-theme", "light"),
    );
    await capture("05-movil");
    checks.push("Responsive at 1440, 768 and 390 pixels");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(studio + "/multimedia");
    const photos = page.locator(".studio-asset-photo img");
    await photos.first().waitFor();
    await page.waitForFunction(() => {
      const first = [
        ...document.querySelectorAll(".studio-asset-photo img"),
      ].slice(0, 4);
      return (
        first.length === 4 &&
        first.every((img) => img.complete && img.naturalWidth > 0)
      );
    });
    const availablePhotos = await photos.count();
    for (let i = 0; i < availablePhotos; i++) {
      await photos.nth(i).scrollIntoViewIfNeeded();
      await photos.nth(i).evaluate((img) => img.decode());
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture("06-multimedia");
    const blocked = await photos.first().getAttribute("src");
    assert.ok(blocked);
    await page.route(new URL(blocked, origin).href, (route) => route.abort());
    await page.reload();
    await page
      .getByRole("img", { name: "Imagen no disponible", exact: true })
      .first()
      .waitFor();
    checks.push(
      `All ${availablePhotos} visible-page legacy image URLs decoded after scroll; simulated image failure renders a fallback`,
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      dir + "/browser-evidence.json",
      JSON.stringify(
        {
          environment:
            "Chrome, isolated PostgreSQL and simulated Auth, no translation provider configured",
          checks,
        },
        null,
        2,
      ) + "\n",
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

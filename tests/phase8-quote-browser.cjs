const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const origin = new URL(process.env.MASH_PREVIEW_URL || "http://localhost:3051");
assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname));

async function main() {
  const entry = await fetch(new URL("/__preview__/enter", origin), { redirect: "manual" });
  assert.equal(entry.status, 303);
  assert.match(Buffer.from(/base64-([^;]+)/.exec(entry.headers.get("set-cookie"))[1], "base64url").toString(), /fixture-refresh/);
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "chrome" : undefined });
  try {
    const studio = await browser.newPage();
    const visitor = await browser.newPage();
    await visitor.addInitScript(() => sessionStorage.setItem("mash-quote", JSON.stringify([
      { slug: "oasis-set", name: "Oasis Set" },
    ])));
    const quote = async (locale) => {
      await visitor.goto(new URL("/" + locale, origin).href);
      await visitor.locator(".quote-selection-trigger").click();
      const link = await visitor.locator(".quote-selection-dialog a").getAttribute("href");
      return new URL(link).searchParams.get("text");
    };
    const before = await quote("es");
    const beforeEnglish = await quote("en");
    const spanish = "Mensaje de cotización " + Date.now();
    const english = "Selected items inquiry " + Date.now();
    await studio.goto(new URL("/__preview__/enter", origin).href);
    await studio.goto(new URL("/studio-mash/contenido?formulario=1", origin).href);
    const form = studio.locator("form").filter({ has: studio.locator("[name=quote_message_es]") });
    await form.getByRole("checkbox", { name: "Mostrar campos en inglés" }).check();
    await form.locator("[name=quote_message_es]").fill(spanish);
    await form.locator("[name=quote_message_en]").fill(english);
    const invalid = await form.locator(":invalid").evaluateAll((elements) =>
      elements.filter((element) => !element.matches("fieldset")).map((element) => element.name),
    );
    assert.deepEqual(invalid, []);
    await form.getByRole("button", { name: "Guardar navegacion", exact: true }).click();
    await form.locator(".admin-success").waitFor();
    assert.equal(await quote("es"), before);
    assert.equal(await quote("en"), beforeEnglish);
    await studio.reload();
    assert.equal(await form.locator("[name=quote_message_es]").inputValue(), spanish);
    const navigationHistory = await studio.getByRole("link", { name: "Navegación", exact: true, includeHidden: true }).getAttribute("href");
    const translation = new URL(navigationHistory, origin);
    translation.pathname = "/studio-mash/traducciones";
    await studio.goto(translation.href);
    const review = studio.getByRole("dialog");
    await review.getByRole("button", { name: "Editar inglés", exact: true }).click();
    const message = review.getByRole("textbox", { name: "Mensaje para cotizar selección", exact: true });
    assert.equal(await message.inputValue(), english);
    await review.getByRole("button", { name: "Guardar como revisado", exact: true }).click();
    await review.getByText("Revisión guardada en la copia de trabajo.", { exact: true }).waitFor();
    await studio.goto(new URL("/studio-mash/contenido?formulario=1", origin).href);
    studio.once("dialog", (dialog) => dialog.accept());
    await form.getByRole("button", { name: "Publicar cambios", exact: true }).click();
    await form.locator(".admin-success").waitFor();
    for (const [locale, prefix] of [["es", spanish], ["en", english]]) {
      assert.ok((await quote(locale)).startsWith(prefix + "\nOasis Set\n"));
    }
    console.log("Plantilla de cotización ES/EN: borrador privado, persistencia y publicación verificados.");
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

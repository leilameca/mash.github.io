// Real Next production UI + real isolated PostgreSQL. Auth/Data API transport is a test-only facade.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const net = require("node:net");
const { chromium } = require("playwright");
const { dataApi } = require("./support/data-api.cjs");
async function main() {
  const backend = await dataApi({ adminMode: true });
  const probe = net.createServer();
  await new Promise((r) => probe.listen(0, "127.0.0.1", r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  const origin = `http://localhost:${port}`;
  let logs = "";
  const server = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "start", "--port", String(port)],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: backend.url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-key",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "fixture-service",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
  const browser = await chromium.launch({
    headless: true,
    channel: process.platform === "win32" ? "chrome" : undefined,
  });
  const evidence = {
    capturedAt: new Date().toISOString(),
    environment:
      "Local Next production build + PostgreSQL/WASM. Test-only simulated Auth and Data API; not hosted Supabase.",
    productionModified: false,
    checks: [],
    viewports: [],
  };
  const evidenceDir = process.env.MASH_EVIDENCE_DIR || ".test-artifacts/studio-browser";
  const dir = evidenceDir + "/screenshots";
  fs.mkdirSync(dir, { recursive: true });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        ready = (await fetch(origin + "/manifest.webmanifest")).ok;
      } catch {}
      if (ready) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(ready, logs);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    await context.addCookies([{ ...backend.cookie, url: origin }]);
    const page = await context.newPage();

    page.on("pageerror", (e) => console.error("BROWSER", e.message));

    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("CLIENT ERROR", msg.text());
    });
    const visit = async (path, title) => {
      await page.goto(origin + path, { waitUntil: "networkidle" });
      await page
        .getByRole("heading", { name: title, exact: true })
        .waitFor({ timeout: 8000 });
      await page.waitForTimeout(200);
    };
    const capture = async (name) => {
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
      evidence.checks.push({
        capture: name,
        route: new URL(page.url()).pathname,
      });
    };
    async function checkContrast(theme) {
      const colors = await page.evaluate(() => {
        const root = getComputedStyle(document.querySelector(".studio")),
          title = getComputedStyle(document.querySelector("h1")),
          button = getComputedStyle(
            document.querySelector(".studio-heading .admin-button"),
          );
        return [
          [title.color, root.backgroundColor],
          [root.getPropertyValue("--studio-muted"), root.backgroundColor],
          [button.color, button.backgroundColor],
        ];
      });
      const luminance = (color) => {
        let values = color.startsWith("#")
          ? color
              .trim()
              .slice(1)
              .match(/../g)
              .map((v) => parseInt(v, 16))
          : color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number);
        return values
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      };
      const ratios = colors.map(([a, b]) => {
        const x = luminance(a.trim()),
          y = luminance(b.trim());
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      });
      for (const ratio of ratios)
        assert.ok(ratio >= 4.5, theme + " contrast " + ratio);
      evidence.checks.push({
        flow: "text and primary-action contrast " + theme,
        ratios: ratios.map((v) => Number(v.toFixed(2))),
        passed: true,
      });
    }
    await visit("/studio-mash", "Tu espacio de trabajo");
    await capture("dashboard-light");
    await checkContrast("light");
    await page.getByRole("button", { name: "Contraer barra lateral" }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: "Expandir barra lateral" })
      .waitFor();
    await page.getByRole("button", { name: "Expandir barra lateral" }).click();
    evidence.checks.push({
      flow: "desktop sidebar collapse persists after reload",
      passed: true,
    });

    assert.ok((await page.locator(".studio-metric").count()) === 4);
    const dbCount = (
      await backend.db.query("select count(*)::int n from products")
    ).rows[0].n;
    assert.equal(
      await page.locator(".studio-metric strong").first().textContent(),
      String(dbCount),
    );
    await page.getByRole("button", { name: "Activar modo oscuro" }).click();
    await capture("dashboard-dark");
    await checkContrast("dark");
    await page.reload();
    await page.waitForTimeout(150);
    assert.equal(
      await page.locator("#mash-studio-root").getAttribute("data-theme"),
      "dark",
    );
    await page.getByRole("button", { name: "Activar modo claro" }).click();
    await visit("/studio-mash/productos", "Productos");
    await capture("products-list");
    await page
      .getByLabel("Buscar", { exact: true })
      .fill("NO-RESULTADO-AISLADO");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await page.getByRole("heading", { name: "No hay resultados" }).waitFor();
    await capture("empty");
    await visit("/studio-mash/colecciones", "Colecciones");
    await capture("collections");
    const product = (
      await backend.db.query("select id from products where slug='oasis-set'")
    ).rows[0];
    await visit("/studio-mash/productos/" + product.id, "Editar producto");
    await capture("product-edit");
    // Exercise actual server actions against the isolated SQL contract.
    await page.locator("[name=name_es]").fill("Oasis revisión de navegador");
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await page.waitForURL("**/studio-mash/productos?saved=1");
    assert.equal(
      (
        await backend.db.query(
          "select (select t->>'name' from jsonb_array_elements(snapshot->'translations') t where t->>'locale'='es') name from content_publications where entity_id=$1",
          [product.id],
        )
      ).rows[0].name,
      "Oasis Set",
    );
    evidence.checks.push({
      flow: "browser draft save leaves live snapshot unchanged",
      passed: true,
    });
    await visit("/studio-mash/productos/" + product.id, "Editar producto");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Publicar cambios", exact: true })
      .click();
    await page.waitForURL("**/studio-mash/productos?published=1");
    assert.equal(
      (
        await backend.db.query(
          "select (select t->>'name' from jsonb_array_elements(snapshot->'translations') t where t->>'locale'='es') name from content_publications where entity_id=$1",
          [product.id],
        )
      ).rows[0].name,
      "Oasis revisión de navegador",
    );
    evidence.checks.push({
      flow: "browser explicit publication",
      passed: true,
    });
    await visit("/studio-mash/productos/" + product.id, "Editar producto");
    const current = (
      await backend.db.query("select revision from products where id=$1", [
        product.id,
      ])
    ).rows[0];
    await backend.save([
      {
        kind: "product",
        id: product.id,
        expected_version: current.revision,
        data: { dimensions: "Cambio concurrente de prueba" },
        intent: "save",
      },
    ]);
    await page.locator("[name=name_es]").fill("Entrada que debe conservarse");
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await page.getByText(/Otra persona o pestaña cambió/).waitFor();
    assert.equal(
      await page.locator("[name=name_es]").inputValue(),
      "Entrada que debe conservarse",
    );
    await page
      .getByRole("link", { name: "Abrir versión más reciente ↗" })
      .waitFor();
    evidence.checks.push({
      flow: "stale revision preserves browser inputs and exposes latest-version link",
      passed: true,
    });
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("link", { name: "Colecciones", exact: true }).click();
    assert.ok(page.url().includes(product.id));
    evidence.checks.push({
      flow: "unsaved navigation can be cancelled",
      passed: true,
    });
    // Full navigation is intentional after dismissing the leave guard above.
    page.once("dialog", (d) => d.accept());
    await page.goto(
      origin + "/studio-mash/revisiones?kind=product&id=" + product.id,
    );
    await page
      .getByRole("heading", { name: "Historial", exact: true })
      .waitFor();
    const beforeRestore = (
      await backend.db.query("select revision from products where id=$1", [
        product.id,
      ])
    ).rows[0].revision;
    page.once("dialog", (d) => d.accept());
    await page.locator(".studio-revision > details > summary").last().click();
    await page
      .getByRole("button", { name: "Restaurar como borrador" })
      .last()
      .click();
    await page.waitForURL(
      "**/studio-mash/revisiones?kind=product&id=" + product.id + "&restored=1",
    );
    await page
      .getByText(
        "Revisión recuperada como borrador. Revisa el contenido antes de publicar.",
      )
      .waitFor();
    assert.equal(
      (
        await backend.db.query("select revision from products where id=$1", [
          product.id,
        ])
      ).rows[0].revision,
      beforeRestore + 1,
    );
    assert.equal(
      (
        await backend.db.query(
          "select (select t->>'name' from jsonb_array_elements(snapshot->'translations') t where t->>'locale'='es') name from content_publications where entity_id=$1",
          [product.id],
        )
      ).rows[0].name,
      "Oasis revisión de navegador",
    );
    evidence.checks.push({
      flow: "browser restore creates working revision and preserves live snapshot",
      passed: true,
    });
    await visit("/studio-mash/revisiones", "Historial");
    await capture("history");
    await visit("/studio-mash/configuracion", "Configuración");
    await capture("settings");
    for (const [route, title] of [
      ["proyectos", "Proyectos"],
      ["multimedia", "Multimedia"],
      ["contenido", "Sitio web"],
      ["noticias", "Noticias"],
      ["traducciones", "Traducciones"],
      ["analitica", "Analítica"],
    ]) {
      await visit("/studio-mash/" + route, title);
      evidence.checks.push({
        flow: "module navigation " + route,
        passed: true,
      });
    }
    const systemContext = await browser.newContext({ colorScheme: "dark" });
    await systemContext.addCookies([{ ...backend.cookie, url: origin }]);
    const systemPage = await systemContext.newPage();
    await systemPage.goto(origin + "/studio-mash", {
      waitUntil: "networkidle",
    });
    assert.equal(
      await systemPage.locator("#mash-studio-root").getAttribute("data-theme"),
      "dark",
    );
    await systemContext.close();
    evidence.checks.push({
      flow: "initial theme follows operating system",
      passed: true,
    });

    await visit("/studio-mash", "Tu espacio de trabajo");
    for (const [width, height] of [
      [320, 568],
      [375, 812],
      [390, 844],
      [768, 1024],
      [1024, 768],
      [1366, 768],
      [1440, 900],
      [1920, 1080],
      [900, 900],
      [540, 720],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, `Overflow ${width}x${height}`);
      if (width <= 800) {
        await page.getByRole("button", { name: "Menú", exact: true }).click();
        await page
          .getByRole("dialog", { name: "Navegación de Studio" })
          .waitFor();
        await page.keyboard.press("Shift+Tab");
        assert.ok(
          await page
            .locator(".studio-sidebar__panel")
            .evaluate((el) => el.contains(document.activeElement)),
        );
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "hidden" });
      }
      const surfacesTested=['dashboard'];
      if([320,390,768].includes(width)){for(const [route,title] of [['productos','Productos'],['productos/'+product.id,'Editar producto'],['configuracion','Configuración']]){await visit('/studio-mash/'+route,title);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' overflow '+width);surfacesTested.push(route);}await visit('/studio-mash','Tu espacio de trabajo');}
      evidence.viewports.push({ width, height, noHorizontalOverflow: true,surfacesTested });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await capture("dashboard-mobile");
    await page.setViewportSize({ width: 1440, height: 900 });
    // Keep Auth online so the application reaches its real content error boundary.
    backend.setUnavailable(true);
    await page.goto(origin + "/studio-mash/productos");
    await page
      .getByRole("heading", { name: "No pudimos cargar esta sección" })
      .waitFor();
    await capture("error");
    backend.setUnavailable(false);
    fs.writeFileSync(
      evidenceDir + "/browser-evidence.json",
      JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence, null, 2));
  } catch (e) {
    fs.writeFileSync(evidenceDir + "/browser-failure.log", logs);
    throw e;
  } finally {
    await browser.close();
    server.kill();
    await backend.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

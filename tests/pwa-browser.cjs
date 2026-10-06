const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

async function availablePort() {
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function main() {
  const port = await availablePort();
  const origin = `http://localhost:${port}`;
  const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--port", String(port)], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });
  let browser;
  const profileRoot = path.resolve(os.tmpdir());
  const profileDir = fs.mkdtempSync(path.join(profileRoot, "mash-pwa-test-"));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { ready = (await fetch(`${origin}/manifest.webmanifest`)).ok; } catch {}
      if (ready) break;
      if (server.exitCode !== null) throw new Error(serverOutput);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, `Production server did not start: ${serverOutput}`);

    const manifest = await (await fetch(`${origin}/manifest.webmanifest`)).json();
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.start_url, "/es");
    for (const icon of manifest.icons) {
      const response = await fetch(`${origin}${icon.src}`);
      assert.equal(response.status, 200);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
    }
    const workerResponse = await fetch(`${origin}/sw.js`);
    assert.match(workerResponse.headers.get("cache-control"), /no-store/);
    assert.match(workerResponse.headers.get("content-type"), /javascript/);

    const channel = process.env.PWA_BROWSER_CHANNEL || (process.platform === "win32" ? "chrome" : undefined);
    browser = await chromium.launchPersistentContext(profileDir, { headless: true, ...(channel ? { channel } : {}), viewport: { width: 390, height: 844 } });
    const context = browser;
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/es`);
    assert.equal(await page.locator('link[rel="manifest"]').getAttribute("href"), "/manifest.webmanifest");
    assert.equal(await page.locator('head link[rel="manifest"]').count(), 1);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const cdp = await context.newCDPSession(page);
    const appManifest = await cdp.send("Page.getAppManifest");
    assert.ok(appManifest.url.endsWith("/manifest.webmanifest"));
    assert.equal(JSON.parse(appManifest.data).short_name, "MASH");
    const installability = await cdp.send("Page.getInstallabilityErrors");
    assert.deepEqual(installability.installabilityErrors, []);
    console.log("Chrome confirms that MASH is installable.");

    const cacheUrls = await page.evaluate(async () => {
      const cache = await caches.open("mash-pwa-v1");
      return (await cache.keys()).map((request) => new URL(request.url).pathname);
    });
    assert.equal(cacheUrls.length, 6);
    assert.ok(cacheUrls.every((url) => /^(\/offline\/|\/pwa\/)/.test(url)));
    await context.setOffline(true);
    await page.goto(`${origin}/es/productos`);
    await page.getByRole("heading", { name: "Estás sin conexión" }).waitFor();
    assert.ok(await page.locator("img").evaluate((img) => img.complete && img.naturalWidth > 0));
    await page.screenshot({ path: ".next/pwa-offline.png", fullPage: true });
    await page.goto(`${origin}/en/colecciones`);
    await page.getByRole("heading", { name: "You're offline" }).waitFor();
    await context.setOffline(false);
    await page.getByRole("button", { name: "Try again" }).click();
    await page.waitForURL(`${origin}/en/colecciones`);
    await page.locator(".site-header").waitFor();
    assert.deepEqual(errors, []);
    console.log("Offline notices pass in both languages; reconnecting restores the live site. No catalog or admin pages were cached.");
  } finally {
    await browser?.close();
    server.kill();
    const profileRelative = path.relative(profileRoot, path.resolve(profileDir));
    if (!profileRelative.startsWith("..") && !path.isAbsolute(profileRelative) && path.basename(profileDir).startsWith("mash-pwa-test-")) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { chromium } = require('playwright');

(async () => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--port', String(port)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const origin = `http://localhost:${port}`;
  let output = ''; server.stdout.on('data', data => output += data); server.stderr.on('data', data => output += data);
  let browser;
  try {
    for (let attempt = 0; attempt < 80; attempt++) { try { if ((await fetch(origin)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
    browser = await chromium.launch({ headless: true, channel: process.platform === 'win32' ? 'chrome' : undefined });
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'mash-ux-'));
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/es/productos/oasis-set`, { waitUntil: 'networkidle' });
      assert.ok(await page.locator('.interactive-gallery__main img').evaluate(img => img.complete && img.naturalWidth > 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
      await page.locator('.interactive-gallery__main').click();
      assert.ok(await page.locator('.product-lightbox').isVisible());
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.product-lightbox').isVisible(), false);
      const quote = new URL(await page.locator('.detail-actions a[href*="wa.me"]').getAttribute('href'));
      assert.ok(quote.searchParams.get('text').includes('/es/productos/oasis-set'));
      await page.screenshot({ path: path.join(screenshots, `product-${width}.png`), fullPage: true });
    }
    await page.locator('.detail-actions .quote-selection-add').click();
    await page.locator('.quote-selection-trigger').click();
    assert.ok(await page.locator('.quote-selection-dialog').isVisible());
    assert.ok((await page.locator('.quote-selection-dialog a').getAttribute('href')).includes('text='));
    await page.keyboard.press('Escape');
    await page.goto(`${origin}/es/productos`, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('.quote-selection-trigger').isVisible());
    assert.ok(await page.locator('.product-card').count() <= 12);
    assert.equal((await page.request.get(`${origin}/api/studio-media`)).status(), 401);
    assert.equal((await page.request.post(`${origin}/api/studio-media`, { headers: { origin } })).status(), 401);
    assert.equal((await page.request.post(`${origin}/api/studio-media`, { headers: { origin: 'https://untrusted.example' } })).status(), 403);
    assert.deepEqual(errors, []);
    console.log(`PASS: desktop/tablet/mobile, gallery dialog, product WhatsApp, quote persistence and upload authorization. Screenshots: ${screenshots}`);
  } finally { await browser?.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

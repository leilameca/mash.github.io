const assert = require("node:assert/strict");
const { chromium } = require("playwright");

async function main() {
  const port = Number(process.env.MASH_ANALYTICS_TEST_PORT || 3024);
  assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
  const local = "http://127.0.0.1:" + port;
  const mock = "http://www.mashoficial.com:" + port;
  assert.equal(
    (await fetch(local + "/__preview__/enter", { redirect: "manual" })).status,
    303,
  );
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "chrome" : undefined,
    args: [
      "--host-resolver-rules=MAP www.mashoficial.com 127.0.0.1",
      "--no-proxy-server",
    ],
  });
  try {
    const page = await browser.newPage({ serviceWorkers: "block" });
    const attempted = [];
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === mock || url.origin === local) return route.continue();
      if (
        url.hostname === "www.googletagmanager.com" &&
        url.pathname === "/gtag/js"
      ) {
        attempted.push(url.searchParams.get("id"));
        return route.fulfill({
          contentType: "application/javascript",
          body: "",
        });
      }
      await route.abort();
    });
    await page.goto(mock + "/es");
    await page.getByRole("button", { name: "Aceptar analítica" }).waitFor();
    assert.deepEqual(attempted, []);
    await page.getByRole("button", { name: "Rechazar" }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Preferencias de analítica" })
      .click();
    assert.deepEqual(attempted, []);
    const tagRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).hostname === "www.googletagmanager.com",
    );
    await page.getByRole("button", { name: "Aceptar analítica" }).click();
    await tagRequest;
    await page.waitForFunction(() =>
      window.dataLayer?.some(
        (command) => command[0] === "event" && command[1] === "page_view",
      ),
    );
    assert.deepEqual(attempted, ["G-TESTONLY"]);
    const events = () =>
      page.evaluate(() =>
        window.dataLayer
          .filter((command) => command[0] === "event")
          .map((command) => [command[1], command[2]]),
      );
    const first = await events();
    assert.equal(first.length, 1);
    assert.equal(first[0][1].page_type, "home");
    await page
      .getByRole("button", { name: "Preferencias de analítica" })
      .click();
    await page.getByRole("button", { name: "Rechazar" }).click();
    await page.waitForFunction(() => window["ga-disable-G-TESTONLY"] === true);
    await page.evaluate(() => {
      const link = document.querySelector(".whatsapp-float");
      link.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      });
      link.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    assert.deepEqual(await events(), first);
    await page.goto(local + "/es");
    assert.equal(
      await page
        .getByRole("region", { name: "Privacidad y analítica" })
        .count(),
      0,
    );
    assert.deepEqual(attempted, ["G-TESTONLY"]);
    console.log(
      "PASS: GA4 tag intercepted locally; acceptance, refusal, revocation, page event and exclusion of loopback.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

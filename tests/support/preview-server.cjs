// Explicit local-only preview. Synthetic Auth + isolated PostgreSQL/WASM.
// No demo route or authorization bypass is added to the production application.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { dataApi } = require("./data-api.cjs");
async function main() {
  const production = process.env.MASH_VERIFICATION_BUILD === "1";
  const backend = await dataApi({ adminMode: true, mediaTransport: true });
  Object.assign(process.env, {
    NODE_ENV: production ? "production" : "development",
    MASH_LOCAL_PREVIEW: "1",
    NEXT_PUBLIC_SUPABASE_URL: backend.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-key",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-service",
  });
  const config = (
    await import(pathToFileURL(path.resolve("next.config.mjs")).href)
  ).default;
  const port = Number(process.env.MASH_PREVIEW_PORT) || 3010;
  const app = require("next")({
    dev: !production,
    dir: process.cwd(),
    hostname: "127.0.0.1",
    port,
    conf: config,
  });
  await app.prepare();
  const handle = app.getRequestHandler();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost:" + port);
    if (url.pathname === "/__preview__/enter") {
      res.writeHead(303, {
        "Set-Cookie":
          backend.cookie.name +
          "=" +
          backend.cookie.value +
          "; Path=/; HttpOnly; SameSite=Lax",
        Location: "/studio-mash",
        "Cache-Control": "no-store",
      });
      res.end();
      return;
    }
    handle(req, res);
  });
  server.on("upgrade", app.getUpgradeHandler());
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  fs.mkdirSync(".test-artifacts", { recursive: true });
  fs.writeFileSync(
    production
      ? ".test-artifacts/preview-production.json"
      : ".test-artifacts/preview-server.json",
    JSON.stringify(
      {
        pid: process.pid,
        port,
        entryUrl: "http://localhost:" + port + "/__preview__/enter",
        dataApi: backend.url,
        distDir: config.distDir,
        syntheticDataOnly: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "LOCAL PREVIEW READY http://localhost:" + port + "/__preview__/enter",
  );
  const stop = async () => {
    server.close();
    await app.close();
    await backend.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

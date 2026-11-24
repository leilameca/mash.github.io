const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "supabase");
const workdir = path.join(root, ".test-artifacts", "supabase-zero-cost");
const target = path.join(workdir, "supabase");
const site = "http://localhost:3030";

fs.mkdirSync(path.join(target, "templates"), { recursive: true });
fs.cpSync(path.join(source, "migrations"), path.join(target, "migrations"), {
  recursive: true,
});

const config = fs
  .readFileSync(path.join(source, "config.toml"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/^project_id = .*$/m, 'project_id = "mash-zero-cost"')
  .replace(/^((?:port|shadow_port) = )5432(\d)$/gm, (_, name, digit) => name + "5442" + digit)
  .replace(/^site_url = .*$/m, `site_url = "${site}"`)
  .replace(/^additional_redirect_urls = .*$/m, `additional_redirect_urls = ["${site}"]`)
  .replace(/(\[(?:db\.seed|storage\.analytics|storage\.vector)\]\nenabled = )true/g, "$1false");

const mail = ["magic_link", "confirmation"]
  .map((name) => `
[auth.email.template.${name}]
subject = "Código de MASH Studio local"
content_path = "./supabase/templates/otp.html"
`)
  .join("");
fs.writeFileSync(path.join(target, "config.toml"), config + mail);
fs.writeFileSync(
  path.join(target, "templates", "otp.html"),
  "<p>Tu código para MASH Studio es <strong>{{ .Token }}</strong>.</p>",
);

// Only for the local Docker stack. Hosted environments keep their HTTPS constraint.
fs.writeFileSync(
  path.join(workdir, "bootstrap.sql"),
  `begin;
alter table private.mash_environment drop constraint mash_environment_storage_origin_check;
alter table private.mash_environment add constraint mash_environment_storage_origin_check
  check (storage_origin = 'http://127.0.0.1:54421');
insert into private.mash_environment (singleton, storage_origin)
values (true, 'http://127.0.0.1:54421')
on conflict (singleton) do nothing;
insert into public.admin_users (email, full_name)
values ('studio-local@example.test', 'MASH Local')
on conflict (email) do nothing;
commit;
`,
);
console.log("Supabase local preparado en .test-artifacts/supabase-zero-cost");

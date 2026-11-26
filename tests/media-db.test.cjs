const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { database, ADMIN, OUTSIDER } = require("./support/database.cjs");
const meta = {
  name: "Original de prueba.jpg",
  folder: "products",
  mime: "image/jpeg",
  bytes: 1200,
  width: 400,
  height: 200,
  sha256: "a".repeat(64),
};
async function reserve(
  f,
  id = randomUUID(),
  lease = randomUUID(),
  who = ADMIN,
) {
  const result = await f.as(
    "authenticated",
    who,
    async (tx) =>
      (
        await tx.query("select public.begin_mash_media($1,$2,$3) result", [
          id,
          lease,
          JSON.stringify(meta),
        ])
      ).rows[0].result,
  );
  return { id, lease, result };
}
const manifest = (id) =>
  ["thumbnail", "catalog", "gallery", "large"].map((role) => ({
    role,
    path: `products/${id}-${role}.webp`,
    width: role === "thumbnail" ? 256 : 400,
    height: role === "thumbnail" ? 128 : 200,
    bytes: 500,
    sha256: "b".repeat(64),
  }));
const finish = (f, job, role = "service_role") =>
  f.as(role, role === "authenticated" ? ADMIN : "", (tx) =>
    tx.query("select public.complete_mash_media($1,$2,$3,$4) result", [
      job.id,
      job.lease,
      `products/${job.id}-original.jpg`,
      JSON.stringify(manifest(job.id)),
    ]),
  );
test("real PostgreSQL media lifecycle, usage protection, RLS and multi-collection snapshots", async (t) => {
  const f = await database();
  try {
    let asset;
    await t.test(
      "admin reserves idempotently; outsider and direct client finalization cannot bypass the server",
      async () => {
        await assert.rejects(
          reserve(f, randomUUID(), randomUUID(), OUTSIDER),
          (e) => e.code === "42501",
        );
        asset = await reserve(f);
        assert.equal(asset.result.state, "reserved");
        const concurrent = await reserve(f, asset.id);
        assert.equal(concurrent.result.state, "processing");
        await assert.rejects(
          finish(f, asset, "authenticated"),
          (e) => e.code === "42501",
        );
        await finish(f, asset);
        assert.equal((await reserve(f, asset.id)).result.state, "ready");
        await assert.rejects(
          f.as("anon", "", (tx) => tx.query("select * from media_library")),
          (e) => e.code === "42501",
        );
        assert.equal(
          (
            await f.as("authenticated", OUTSIDER, (tx) =>
              tx.query("select * from media_assets"),
            )
          ).rows.length,
          0,
        );
        for (const sql of [
          "delete from media_assets",
          "update media_assets set state='ready'",
          "delete from product_collections",
        ])
          await assert.rejects(
            f.as("authenticated", ADMIN, (tx) => tx.exec(sql)),
            (e) => e.code === "42501",
          );
      },
    );
    let product, one, two, url;
    await t.test(
      "one product can publish in two collections with registered variants and no original disclosure",
      async () => {
        [one, two] = await f.save(
          ["one", "two"].map((slug) => ({
            kind: "collection",
            data: { slug, cover_image_path: "/assets/images/oasis-set.jpg" },
            translations: [
              {
                locale: "es",
                name: "Colección " + slug,
                description: "Descripción sintética suficientemente larga.",
              },
            ],
            intent: "publish",
          })),
        );
        url = (
          await f.db.query(
            "select canonical_path from media_assets where id=$1",
            [asset.id],
          )
        ).rows[0].canonical_path;
        [product] = await f.save([
          {
            kind: "product",
            data: { slug: "multi-product", collection_id: one.id },
            collection_ids: [one.id, two.id],
            translations: [
              {
                locale: "es",
                name: "Producto de prueba",
                description: "Descripción sintética suficientemente larga.",
              },
            ],
            images: [
              {
                storage_path: url,
                is_primary: true,
                sort_order: 0,
                alt_es: "Fotografía sintética",
              },
            ],
            intent: "publish",
          },
        ]);
        const rows = (
          await f.as("anon", "", (tx) =>
            tx.query(
              "select * from published_product_collections where entity_id=$1",
              [product.id],
            ),
          )
        ).rows;
        assert.equal(rows.length, 2);
        const image = rows[0].snapshot.images[0];
        assert.ok(image.variants.thumbnail.endsWith("-thumbnail.webp"));
        assert.equal(JSON.stringify(rows[0]).includes("mash-originals"), false);
        const uses = (
          await f.db.query(
            "select * from media_asset_references where asset_id=$1",
            [asset.id],
          )
        ).rows;
        assert.deepEqual(
          new Set(uses.map((u) => u.source)),
          new Set(["working", "revision", "publication"]),
        );
      },
    );
    await t.test(
      "draft memberships stay private, stale versions roll back, and restore recreates the full selection",
      async () => {
        await f.save([
          {
            kind: "product",
            id: product.id,
            expected_version: 1,
            data: {},
            collection_ids: [two.id],
            intent: "save",
          },
        ]);
        assert.equal(
          (
            await f.db.query(
              "select * from product_collections where product_id=$1",
              [product.id],
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await f.as("anon", "", (tx) =>
              tx.query(
                "select * from published_product_collections where entity_id=$1",
                [product.id],
              ),
            )
          ).rows.length,
          2,
        );
        await assert.rejects(
          f.save([
            {
              kind: "product",
              id: product.id,
              expected_version: 1,
              data: {},
              collection_ids: [one.id],
              intent: "save",
            },
          ]),
          (e) => e.code === "40001",
        );
        await f.as("authenticated", ADMIN, (tx) =>
          tx.query("select public.restore_mash_revision($1,$2,$3,$4)", [
            "product",
            product.id,
            1,
            2,
          ]),
        );
        assert.equal(
          (
            await f.db.query(
              "select * from product_collections where product_id=$1",
              [product.id],
            )
          ).rows.length,
          2,
        );
        assert.equal(
          (
            await f.db.query("select revision from products where id=$1", [
              product.id,
            ])
          ).rows[0].revision,
          3,
        );
      },
    );
    await t.test(
      "published and historical usage prevent archive even after removing the current gallery reference",
      async () => {
        await f.save([
          {
            kind: "product",
            id: product.id,
            expected_version: 3,
            data: {},
            images: [],
            intent: "save",
          },
        ]);
        assert.equal(
          (
            await f.db.query(
              "select * from media_asset_references where asset_id=$1 and source='working'",
              [asset.id],
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          f.as("authenticated", ADMIN, (tx) =>
            tx.query("select public.edit_mash_media($1,$2)", [
              JSON.stringify([{ id: asset.id, revision: 2 }]),
              "archive",
            ]),
          ),
          (e) => e.code === "23503",
        );
        assert.ok(
          (
            await f.db.query(
              "select * from media_asset_references where asset_id=$1 and source='revision'",
              [asset.id],
            )
          ).rows.length > 0,
        );
      },
    );
    await t.test(
      "failed partial jobs can resume, old leases are fenced, and unused assets archive with optimistic versions",
      async () => {
        const job = await reserve(f);
        await f.as("service_role", "", (tx) =>
          tx.query("select public.fail_mash_media($1,$2,$3)", [
            job.id,
            job.lease,
            "synthetic_storage_failure",
          ]),
        );
        const retry = await reserve(f, job.id);
        assert.equal(retry.result.state, "reserved");
        await assert.rejects(finish(f, job), (e) => e.code === "40001");
        await finish(f, retry);
        await f.as("authenticated", ADMIN, (tx) =>
          tx.query("select public.edit_mash_media($1,$2,$3)", [
            JSON.stringify([{ id: job.id, revision: 2 }]),
            "rename",
            "Nombre editado",
          ]),
        );
        await assert.rejects(
          f.as("authenticated", ADMIN, (tx) =>
            tx.query("select public.edit_mash_media($1,$2)", [
              JSON.stringify([{ id: job.id, revision: 2 }]),
              "archive",
            ]),
          ),
          (e) => e.code === "40001",
        );
        await f.as("authenticated", ADMIN, (tx) =>
          tx.query("select public.edit_mash_media($1,$2)", [
            JSON.stringify([{ id: job.id, revision: 3 }]),
            "archive",
          ]),
        );
        assert.equal(
          (
            await f.db.query("select state from media_assets where id=$1", [
              job.id,
            ])
          ).rows[0].state,
          "archived",
        );
        assert.equal(
          (
            await f.db.query(
              "select count(*)::int n from media_variants where asset_id=$1",
              [job.id],
            )
          ).rows[0].n,
          4,
        );
      },
    );
  } finally {
    await f.db.close();
  }
});

test("Storage policies restrict writing even with an overlapping permissive policy", async () => {
  const f = await database({ storage: true });
  try {
    await f.db.exec(`
      insert into storage.objects(bucket_id, name) values ('mash-media', 'products/legacy.jpg'), ('mash-originals', 'products/source.jpg');
      create policy other_tool_insert on storage.objects for insert to authenticated with check (true);
      create policy other_tool_update on storage.objects for update to authenticated using (true) with check (true);
      create policy other_tool_delete on storage.objects for delete to authenticated using (true);
    `);
    const read = (role, user) =>
      f.as(role, user, (tx) =>
        tx.query("select name from storage.objects order by name"),
      );
    const anonymous = await read("anon", "");
    assert.deepEqual(
      anonymous.rows.map((row) => row.name),
      ["products/legacy.jpg"],
    );
    assert.equal((await read("authenticated", OUTSIDER)).rows.length, 1);
    assert.equal((await read("authenticated", ADMIN)).rows.length, 2);
    await assert.rejects(
      f.as("authenticated", ADMIN, (tx) =>
        tx.exec(
          "insert into storage.objects(bucket_id,name) values ('mash-media','products/raw.jpg')",
        ),
      ),
      (error) => error.code === "42501",
    );
    assert.equal(
      (
        await f.as("authenticated", ADMIN, (tx) =>
          tx.query("delete from storage.objects returning *"),
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await f.as("authenticated", ADMIN, (tx) =>
          tx.query(
            "update storage.objects set name='products/replaced.webp' returning *",
          ),
        )
      ).rows.length,
      0,
    );
    assert.equal((await read("authenticated", ADMIN)).rows.length, 2);
  } finally {
    await f.db.close();
  }
});

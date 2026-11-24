const { test } = require("node:test");
const assert = require("node:assert/strict");
const { database, ADMIN, OUTSIDER } = require("./support/database.cjs");
test("Phase 3 real SQL privilege boundary, projection, origin, restore and slug ownership", async (t) => {
  const f = await database();
  try {
    const [entry] = await f.save([
      {
        kind: "site",
        data: {
          key: "page.about",
          value: {
            image_path: "/assets/images/oasis-set.jpg",
            original: "first",
          },
        },
        translations: [{ locale: "es", value: { title: "Primero" } }],
        intent: "publish",
      },
    ]);
    await t.test(
      "authenticated administrators cannot bypass revision contract with direct DML",
      async () => {
        for (const sql of [
          "update site_content set value='{}'",
          "delete from site_content",
          "insert into site_content(key) values('page.fake')",
          "delete from content_publications",
          "delete from content_redirects",
        ])
          await assert.rejects(
            f.as("authenticated", ADMIN, (tx) => tx.exec(sql)),
            (e) => e.code === "42501",
          );
      },
    );
    await t.test(
      "anonymous callers cannot retrieve complete publication snapshots or revision actors",
      async () => {
        await assert.rejects(
          f.as("anon", "", (tx) =>
            tx.query("select * from content_publications"),
          ),
          (e) => e.code === "42501",
        );
        const row = (
          await f.as("anon", "", (tx) =>
            tx.query("select * from published_content"),
          )
        ).rows[0];
        for (const key of ["created_by", "published_by", "revision", "version"])
          assert.equal(key in row, false);
        for (const key of ["created_by", "updated_by", "revision", "id"])
          assert.equal(key in row.snapshot, false);
        assert.equal(
          (
            await f.as("authenticated", OUTSIDER, (tx) =>
              tx.query("select * from studio_entries"),
            )
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "untrusted project origins and encoded traversal are denied",
      async () => {
        for (const image_path of [
          "https://other.invalid/storage/v1/object/public/mash-media/site/a.jpg",
          "https://isolated.invalid.evil/storage/v1/object/public/mash-media/site/a.jpg",
          "https://isolated.invalid/storage/v1/object/public/mash-media/site/%2e%2e.jpg",
          "/assets/images/../secret",
        ])
          await assert.rejects(
            f.save([
              {
                kind: "site",
                id: entry.id,
                expected_version: 1,
                data: { value: { image_path } },
                intent: "save",
              },
            ]),
            (e) => e.code === "22023",
          );
      },
    );
    await t.test(
      "exact configured origin is accepted; later shared and translated CMS properties disappear on restore",
      async () => {
        await f.save([
          {
            kind: "site",
            id: entry.id,
            expected_version: 1,
            data: {
              value: {
                image_path:
                  "https://isolated.invalid/storage/v1/object/public/mash-media/site/a.jpg",
                later: "remove",
              },
            },
            translations: [
              { locale: "es", value: { title: "Después", later: "remove" } },
            ],
            intent: "save",
          },
        ]);
        await f.as("authenticated", ADMIN, (tx) =>
          tx.query("select public.restore_mash_revision($1,$2,$3,$4)", [
            "site",
            entry.id,
            1,
            2,
          ]),
        );
        const row = (
          await f.db.query(
            "select value,revision from site_content where id=$1",
            [entry.id],
          )
        ).rows[0];
        assert.equal(row.value.later, undefined);
        assert.equal(row.revision, 3);
        const tr = (
          await f.db.query(
            "select value from site_content_translations where site_content_id=$1 and locale='es'",
            [entry.id],
          )
        ).rows[0];
        assert.equal(tr.value.later, undefined);
        assert.equal(tr.value.title, "Primero");
        const state = (
          await f.as("authenticated", ADMIN, (tx) =>
            tx.query(
              "select publication_state from studio_entries where id=$1",
              [entry.id],
            ),
          )
        ).rows[0];
        assert.equal(state.publication_state, "pending");
      },
    );
    await t.test(
      "historical slug is reserved for its original entity",
      async () => {
        const [c] = await f.save([
          {
            kind: "collection",
            data: {
              slug: "old-path",
              cover_image_path: "/assets/images/oasis-set.jpg",
            },
            translations: [
              {
                locale: "es",
                name: "Colección",
                description: "Descripción de colección completa.",
              },
            ],
            intent: "publish",
          },
        ]);
        await f.save([
          {
            kind: "collection",
            id: c.id,
            expected_version: 1,
            data: { slug: "new-path" },
            intent: "publish",
          },
        ]);
        await assert.rejects(
          f.save([
            { kind: "collection", data: { slug: "old-path" }, intent: "save" },
          ]),
          (e) => e.code === "23505",
        );
        await f.save([
          {
            kind: "collection",
            id: c.id,
            expected_version: 2,
            data: { slug: "old-path" },
            intent: "publish",
          },
        ]);
        const red = (
          await f.as("anon", "", (tx) =>
            tx.query(
              "select * from published_redirects where old_slug='new-path'",
            ),
          )
        ).rows[0];
        assert.equal(red.target_slug, "old-path");
        assert.equal(
          (
            await f.as("anon", "", (tx) =>
              tx.query(
                "select * from published_redirects where old_slug='old-path'",
              ),
            )
          ).rows.length,
          0,
        );
      },
    );
  } finally {
    await f.db.close();
  }
});

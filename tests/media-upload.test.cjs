const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const sharp = require("sharp");
const { database, ADMIN } = require("./support/database.cjs");
const { loadTs } = require("./support/load-ts.cjs");
const { uploadManagedImage } = loadTs(
  path.resolve("lib/media/uploads.ts"),
  {},
  { Error },
);
async function fixture() {
  const f = await database();
  const objects = new Map();
  let calls = 0,
    failAt = 0,
    lostCommit = false,
    unavailableRead = false;
  const auth = {
    from(table) {
      let id;
      const q = {
        select() {
          return q;
        },
        eq(key, value) {
          id = value;
          return q;
        },
        maybeSingle() {
          return q;
        },
        then(resolve, reject) {
          if (unavailableRead)
            return Promise.resolve({
              data: null,
              error: { message: "Simulated unavailable read" },
            }).then(resolve, reject);
          return f
            .as("authenticated", ADMIN, async (tx) => ({
              data:
                (
                  await tx.query(`select * from public.${table} where id=$1`, [
                    id,
                  ])
                ).rows[0] || null,
              error: null,
            }))
            .then(resolve, reject);
        },
      };
      return q;
    },
    async rpc(name, args) {
      try {
        assert.equal(name, "begin_mash_media");
        const r = await f.as("authenticated", ADMIN, (tx) =>
          tx.query("select public.begin_mash_media($1,$2,$3) result", [
            args.p_id,
            args.p_lease,
            JSON.stringify(args.p_meta),
          ]),
        );
        return { data: r.rows[0].result, error: null };
      } catch (error) {
        return {
          data: null,
          error: { code: error.code, message: error.message },
        };
      }
    },
  };
  const service = {
    storage: {
      from(bucket) {
        return {
          async upload(name, bytes) {
            calls++;
            if (calls === failAt)
              return {
                error: {
                  statusCode: "503",
                  message: "Synthetic storage interruption",
                },
              };
            const key = bucket + "/" + name;
            if (objects.has(key))
              return {
                error: { statusCode: "409", message: "Already exists" },
              };
            objects.set(key, Buffer.from(bytes));
            return { error: null };
          },
          async download(name) {
            const bytes = objects.get(bucket + "/" + name);
            return bytes
              ? { data: new Blob([bytes]), error: null }
              : { data: null, error: { message: "Missing fixture object" } };
          },
        };
      },
    },
    async rpc(name, args) {
      try {
        let result;
        if (name === "complete_mash_media") {
          result = await f.as("service_role", "", (tx) =>
            tx.query("select public.complete_mash_media($1,$2,$3,$4) result", [
              args.p_id,
              args.p_lease,
              args.p_original_path,
              JSON.stringify(args.p_variants),
            ]),
          );
          if (lostCommit)
            return {
              data: null,
              error: { message: "Simulated connection loss after COMMIT" },
            };
        } else if (name === "fail_mash_media") {
          result = await f.as("service_role", "", (tx) =>
            tx.query("select public.fail_mash_media($1,$2,$3) result", [
              args.p_id,
              args.p_lease,
              args.p_code,
            ]),
          );
        } else throw Error("Unsupported fixture RPC");
        return { data: result.rows[0].result, error: null };
      } catch (error) {
        return {
          data: null,
          error: { code: error.code, message: error.message },
        };
      }
    },
  };
  return {
    ...f,
    auth,
    service,
    objects,
    get calls() {
      return calls;
    },
    failOn: (n) => {
      failAt = n;
    },
    loseCommit: () => {
      lostCommit = true;
    },
    readUnavailable: (value) => {
      unavailableRead = value;
    },
  };
}
async function photo() {
  return new File(
    [
      await sharp({
        create: {
          width: 1200,
          height: 800,
          channels: 3,
          background: "#547d68",
        },
      })
        .jpeg()
        .toBuffer(),
    ],
    "Prueba.png",
    { type: "image/png" },
  );
}
test("upload coordinates real Sharp and PostgreSQL; partial Storage writes resume without duplicate or deleted files", async () => {
  const f = await fixture();
  try {
    const file = await photo(),
      id = randomUUID();
    f.failOn(3);
    await assert.rejects(
      uploadManagedImage(f.auth, f.service, file, "products", id),
      /incompleta/,
    );
    assert.equal(f.objects.size, 2);
    assert.equal(
      (await f.db.query("select state from media_assets where id=$1", [id]))
        .rows[0].state,
      "failed",
    );
    const result = await uploadManagedImage(
      f.auth,
      f.service,
      file,
      "products",
      id,
    );
    assert.equal(result.state, "ready");
    assert.equal(result.asset.mime, "image/jpeg");
    assert.equal(result.asset.variants.length, 4);
    assert.equal(f.objects.size, 5);
    const calls = f.calls;
    const retry = await uploadManagedImage(
      f.auth,
      f.service,
      file,
      "products",
      id,
    );
    assert.equal(retry.state, "ready");
    assert.equal(f.calls, calls);
    assert.equal(
      (
        await f.db.query(
          "select count(*)::int n from media_events where asset_id=$1 and event='ready'",
          [id],
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await f.db.close();
  }
});
test("a lost completion response after COMMIT is verified as success, never failed or compensated", async () => {
  const f = await fixture();
  try {
    f.loseCommit();
    const id = randomUUID();
    const result = await uploadManagedImage(
      f.auth,
      f.service,
      await photo(),
      "products",
      id,
    );
    assert.equal(result.state, "ready");
    assert.equal(f.objects.size, 5);
    assert.equal(
      (
        await f.db.query(
          "select count(*)::int n from media_events where asset_id=$1 and event='failed'",
          [id],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await f.db.close();
  }
});
test("invalid image content cannot create a reservation or any Storage object", async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      uploadManagedImage(
        f.auth,
        f.service,
        new File(["malicious content"], "fake.jpg", { type: "image/jpeg" }),
        "products",
        randomUUID(),
      ),
      (error) => error.status === 422,
    );
    assert.equal(f.objects.size, 0);
    assert.equal(
      (await f.db.query("select count(*)::int n from media_assets")).rows[0].n,
      0,
    );
  } finally {
    await f.db.close();
  }
});

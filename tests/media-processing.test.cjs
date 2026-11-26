const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sharp = require("sharp");
const { loadTs } = require("./support/load-ts.cjs");
const { processImage, IMAGE_LIMITS, withImageSlot } = loadTs(
  path.resolve("lib/media/image-processing.ts"),
);
test("Sharp generates four real WebP derivatives, rotates EXIF, strips metadata and keeps the original", async () => {
  const bytes = await sharp({
    create: { width: 960, height: 640, channels: 3, background: "#315f49" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await processImage(bytes);
  assert.equal(result.original.width, 640);
  assert.equal(result.original.height, 960);
  assert.ok(result.original.bytes.equals(bytes));
  assert.deepEqual(Object.keys(result.variants), [
    "thumbnail",
    "catalog",
    "gallery",
    "large",
  ]);
  for (const [role, v] of Object.entries(result.variants)) {
    const meta = await sharp(v.bytes).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.orientation, undefined);
    assert.equal(meta.exif, undefined);
    assert.equal(meta.xmp, undefined);
    assert.equal(meta.icc, undefined);
    assert.ok(v.width <= 640 && v.height <= 960);
    assert.equal(v.sha256.length, 64);
    if (role === "thumbnail") assert.equal(v.height, 256);
  }
});
test("small images are never enlarged and declared MIME/extension are not trusted", async () => {
  const bytes = await sharp({
    create: { width: 40, height: 20, channels: 4, background: "#ffffff00" },
  })
    .png()
    .toBuffer();
  const result = await processImage(bytes);
  assert.equal(result.original.mime, "image/png");
  for (const v of Object.values(result.variants)) {
    assert.equal(v.width, 40);
    assert.equal(v.height, 20);
  }
});
test("invalid content, SVG, oversized bytes, excessive dimensions and animated files are rejected", async () => {
  for (const value of [
    Buffer.from("not an image"),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    Buffer.alloc(IMAGE_LIMITS.bytes + 1),
  ])
    await assert.rejects(processImage(value));
  const wide = await sharp({
    create: { width: 16001, height: 1, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await assert.rejects(processImage(wide));
  const frames = await Promise.all(
    ["red", "blue"].map((background) =>
      sharp({ create: { width: 4, height: 4, channels: 4, background } })
        .png()
        .toBuffer(),
    ),
  );
  const animated = await sharp(frames, { join: { animated: true } })
    .webp()
    .toBuffer();
  assert.equal((await sharp(animated, { animated: true }).metadata()).pages, 2);
  await assert.rejects(processImage(animated));
});
test("admission limit rejects a third concurrent job and releases slots after failures", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const a = withImageSlot(() => gate),
    b = withImageSlot(() => gate);
  await assert.rejects(withImageSlot(async () => true));
  release();
  await Promise.all([a, b]);
  await assert.rejects(
    withImageSlot(async () => {
      throw Error("synthetic failure");
    }),
  );
  assert.equal(await withImageSlot(async () => true), true);
});

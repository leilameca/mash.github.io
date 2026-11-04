const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/supabase/media.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleScope = { exports: {} };
vm.runInNewContext(source, { module: moduleScope, exports: moduleScope.exports, URL, require: name => name === 'server-only' ? {} : require(name) });
const { isLibraryImage } = moduleScope.exports;
const base = 'https://storage.example/storage/v1/object/public/mash-media/';
const admin = { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: base } }), list: async () => ({ data: [{ id: 'image-id', name: 'oasis.webp' }], error: null }) }) } };
test('library accepts only existing images in the managed bucket', async () => {
  assert.equal(await isLibraryImage(admin, base + 'products/oasis.webp'), true);
  assert.equal(await isLibraryImage(admin, base + 'products/missing.webp'), false);
});
test('library rejects external origins, unsupported folders and malformed paths', async () => {
  for (const value of [base.replace('storage.example', 'attacker.example') + 'products/oasis.webp', base + 'private/oasis.webp', base + 'products/oasis.webp?token=private', base + 'products/%', base + 'products/sub/oasis.webp', '/local.jpg']) {
    assert.equal(await isLibraryImage(admin, value), false, value);
  }
});

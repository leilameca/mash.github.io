// Reads only. Never exports API keys or Auth credentials. Catalog export comes from a
// separately authorized read-only SQL snapshot; originals use public Storage URLs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
async function main() {
  const root = path.resolve(process.argv[2] || '.audit-backups/2026-11-24');
  if (!root.includes('.audit-backups')) throw Error('Use the ignored .audit-backups directory');
  const input = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json')));
  const manifest = [];
  for (const item of input.storage_objects) {
    if (item.bucket_id !== 'mash-media' || item.name.includes('..')) throw Error('Invalid object');
    const relative = 'storage/' + item.name;
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const response = await fetch('https://guzuqitvzkenzsvcuttg.supabase.co/storage/v1/object/public/mash-media/' + item.name.split('/').map(encodeURIComponent).join('/'));
    if (!response.ok) throw Error(`Storage response ${response.status}`);
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    const bytes = fs.readFileSync(target);
    if (!bytes.length) throw Error('Empty backup object');
    manifest.push({ file: relative, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  for (const file of ['catalog.json', 'legacy-content.ts', 'legacy-colecciones.json']) {
    if (file === 'legacy-content.ts') fs.copyFileSync('lib/content.ts', path.join(root, file));
    if (file === 'legacy-colecciones.json') fs.copyFileSync('data/colecciones.json', path.join(root, file));
    const bytes = fs.readFileSync(path.join(root, file));
    manifest.push({ file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), project: 'guzuqitvzkenzsvcuttg', scope: 'public catalog tables + admin allowlist + Storage originals; not Auth/PITR', files: manifest }, null, 2));
  for (const file of manifest) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file.file))).digest('hex');
    if (hash !== file.sha256) throw Error('Backup verification failed');
  }
  console.log(`Verified ${manifest.length} backup files (${input.storage_objects.length} Storage objects). No remote writes.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

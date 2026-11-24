const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {loadTs}=require('../tests/support/load-ts.cjs');
const root=path.resolve(process.argv[2]||'.audit-backups/2026-11-24');
const backup=JSON.parse(fs.readFileSync(path.join(root,'catalog.json')));
const legacy=loadTs(path.join(root,'legacy-content.ts'));
const json=JSON.parse(fs.readFileSync(path.join(root,'legacy-colecciones.json')));
const sanitize=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!['created_by','updated_by'].includes(key)));
const products=backup.products.map(p=>({...sanitize(p),translations:backup.product_translations.filter(t=>t.product_id===p.id).map(sanitize),images:backup.product_images.filter(i=>i.product_id===p.id).map(sanitize)}));
const collections=backup.collections.map(c=>({...sanitize(c),translations:backup.collection_translations.filter(t=>t.collection_id===c.id).map(sanitize)}));
const projects=backup.projects.map(p=>({...sanitize(p),translations:backup.project_translations.filter(t=>t.project_id===p.id).map(sanitize),images:backup.project_images.filter(i=>i.project_id===p.id).map(sanitize)}));
const references=[];
function walk(value,owner){if(typeof value==='string'&&(value.includes('/assets/images/')||value.includes('/storage/v1/object/public/')))references.push({owner,url:value});else if(Array.isArray(value))value.forEach(v=>walk(v,owner));else if(value&&typeof value==='object')Object.values(value).forEach(v=>walk(v,owner));}
products.forEach(p=>walk(p,`product:${p.slug}`));collections.forEach(c=>walk(c,`collection:${c.slug}`));projects.forEach(p=>walk(p,`project:${p.slug}`));backup.site_content.forEach(s=>walk(s.value,`site:${s.key}`));
const differences=[...products.map(p=>({slug:p.slug,source:'supabase',status:p.status,legacySlugExists:legacy.products.some(l=>l.slug===p.slug),decision:'Use Supabase status; do not merge by name'})),...legacy.products.filter(l=>!products.some(p=>p.slug===l.slug)).map(p=>({slug:p.slug,source:'lib/content.ts',status:'pending_editorial_approval',decision:'Preserved only; do not import or publish'}))];
const output={capturedAt:new Date().toISOString(),project:'guzuqitvzkenzsvcuttg',sourceOfTruth:'Supabase',products,collections,projects,siteContentKeys:backup.site_content.map(s=>({key:s.key,is_public:s.is_public,translationLocales:backup.site_content_translations.filter(t=>t.site_content_id===s.id).map(t=>t.locale)})),legacy:{products:legacy.products,collections:legacy.collections,projects:legacy.projects,jsonCollections:json.collections},differences,imageReferences:references,storageObjects:backup.storage_objects.map(o=>({name:o.name,metadata:o.metadata,referenced:references.some(r=>{try{return decodeURIComponent(new URL(r.url).pathname).endsWith('/mash-media/'+o.name)}catch{return false}})})),policy:{legacyImports:false,automaticNameMatching:false,oculusMare:'draft; never public'}};
fs.mkdirSync('docs/phase-2',{recursive:true});
fs.writeFileSync('docs/phase-2/catalog-reconciliation.json',JSON.stringify(output,null,2));
const csv=['source,slug,status,legacy_slug_exists,decision',...differences.map(d=>[d.source,d.slug,d.status,d.legacySlugExists??'',d.decision].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\n');
fs.writeFileSync('docs/phase-2/catalog-differences.csv',csv);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
for(const file of manifest.files){const bytes=fs.readFileSync(path.join(root,file.file));if(crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Backup hash mismatch');}
fs.writeFileSync('docs/phase-2/backup-verification.json',JSON.stringify({capturedAt:manifest.capturedAt,project:manifest.project,scope:manifest.scope,verified:true,fileCount:manifest.files.length,totalBytes:manifest.files.reduce((n,f)=>n+f.bytes,0),catalogSha256:manifest.files.find(f=>f.file==='catalog.json').sha256,storageObjectCount:backup.storage_objects.length,activeAdministrators:backup.admin_users.filter(a=>a.is_active).length,remoteWritesPerformed:false,authBackupIncluded:false},null,2));
console.log(JSON.stringify({supabaseProducts:products.length,published:products.filter(p=>p.status==='published').length,legacyProducts:legacy.products.length,jsonProducts:json.collections.reduce((n,c)=>n+(c.products?.length||0),0),storage:backup.storage_objects.length,pendingLegacy:legacy.products.filter(l=>!products.some(p=>p.slug===l.slug)).length}));

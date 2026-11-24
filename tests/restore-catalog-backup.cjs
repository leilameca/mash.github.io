// Optional local-only restore drill. Input is deliberately ignored by Git.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {database}=require('./support/database.cjs');
async function main(){
  const input=JSON.parse(fs.readFileSync(process.argv[2]||'.audit-backups/2026-11-24/catalog.json'));
  const tables=['admin_users','collections','collection_translations','products','product_translations','product_images','projects','project_translations','project_images','site_content','site_content_translations','contact_requests'];
  const f=await database({beforeIntegrity:async db=>{
    const users=new Set();for(const table of tables)for(const row of input[table])for(const key of ['user_id','created_by','updated_by'])if(row[key])users.add(row[key]);
    for(const id of users)await db.query('insert into auth.users(id) values($1) on conflict do nothing',[id]);
    for(const table of tables)for(const row of input[table]){
      const keys=Object.keys(row);const cols=keys.map(k=>'"'+k+'"').join(',');
      await db.query(`insert into public.${table}(${cols}) select ${cols} from jsonb_populate_record(null::public.${table},$1::jsonb)`,[JSON.stringify(row)]);
    }
  }});
  try{
    const actual=(await f.as('anon','',tx=>tx.query("select slug from content_publications where entity_kind='product' order by slug"))).rows.map(r=>r.slug);
    const expected=input.products.filter(p=>p.status==='published').map(p=>p.slug).sort();assert.deepEqual(actual,expected);assert.equal(actual.includes('oculus-mare'),false);
    for(const slug of ['trap-set','candor-collection','candor-set','daybed-trap','dulce-luna','furniture-daybed'])assert.ok(actual.includes(slug));
    const {loadTs}=require('./support/load-ts.cjs');const path=require('node:path');
    const published=loadTs(path.resolve('lib/supabase/published.ts'),{'./server':{}});
    const catalog=loadTs(path.resolve('lib/supabase/catalog.ts'),{'./published':{...published,readPublished:async kind=>(await f.as('anon','',tx=>tx.query('select * from content_publications where entity_kind=$1 and status=$2 order by sort_order,entity_id',[kind,'published']))).rows}});
    const rendered=await catalog.getCatalogProducts('es');assert.deepEqual(Array.from(rendered,p=>p.slug).sort(),expected);
    const candorSet=rendered.find(p=>p.slug==='candor-set');const source=input.products.find(p=>p.slug==='candor-set');
    assert.equal(candorSet.collectionLabel.es,input.collection_translations.find(t=>t.collection_id===source.collection_id&&t.locale==='es').name);
    assert.equal((await f.db.query('select count(*)::int n from products')).rows[0].n,input.products.length);
    for(const admin of input.admin_users){const row=(await f.db.query('select user_id,is_active from admin_users where id=$1',[admin.id])).rows[0];assert.equal(row.user_id,admin.user_id);assert.equal(row.is_active,admin.is_active);}
    const result={capturedAt:new Date().toISOString(),environment:'Isolated PostgreSQL/WASM; Auth identities are FK placeholders, not restored Auth accounts',catalogRestored:true,additiveMigrationApplied:true,publicMapperVerified:true,dynamicCollectionLabelsVerified:true,publishedProducts:actual,productCount:input.products.length,originalAdminRowsPreserved:input.admin_users.length,productionModified:false};
    fs.writeFileSync('docs/phase-2/restore-evidence.json',JSON.stringify(result,null,2));
    console.log(`PASS: restored catalog backup, migrated in isolation, ${actual.length} public products, Oculus draft excluded and ${input.admin_users.length} original admin allowlist rows preserved. No hosted writes.`);
  }finally{await f.db.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});

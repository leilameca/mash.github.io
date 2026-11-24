const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const net=require('node:net');
const {dataApi}=require('./support/data-api.cjs');
async function main(){
  const backend=await dataApi();
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const origin=`http://localhost:${port}`;
  const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--port',String(port)],{windowsHide:true,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:backend.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'isolated-test-key',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']});
  let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
  const evidence=[];
  async function get(path,expected=200){const r=await fetch(origin+path,{redirect:'manual'});const body=await r.text();assert.equal(r.status,expected,`${path}: ${body.slice(0,200)}`);evidence.push({path,status:r.status});return {body,headers:r.headers};}
  try{
    let ready=false;for(let i=0;i<60;i++){try{ready=(await fetch(origin+'/manifest.webmanifest')).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,250));}assert.ok(ready,logs);
    const home=await get('/es');assert.ok(home.body.includes('Inicio aislado'));assert.ok(home.body.includes('Contenido de prueba aislado'));
    const first=await get('/es/productos/oasis-set');
    assert.match(first.body,/rel="canonical" href="https:\/\/www.mashoficial.com\/es\/productos\/oasis-set"/);
    assert.match(first.body,/hrefLang="en" href="https:\/\/www.mashoficial.com\/en\/productos\/oasis-set"/);
    assert.equal(first.body.includes('schema.org/InStock'),false);
    const english=await get('/en/productos/oasis-set');assert.match(english.body,/<html lang="en"/);
    await get('/es/productos/oculus-mare',404);await get('/es/productos/not-existing',404);
    await get('/robots.txt');const sitemap=await get('/sitemap.xml');assert.ok(sitemap.body.includes('/productos/oasis-set'));assert.equal(sitemap.body.includes('/productos/oculus-mare'),false);
    const row=(await backend.db.query("select id,revision from products where slug='oasis-set'")).rows[0];
    await backend.save([{kind:'product',id:row.id,expected_version:row.revision,data:{},translations:[{locale:'es',name:'Nombre confirmado',description:'Descripción publicada y conservada.'}],images:[{storage_path:'/assets/images/candor-clasico.jpg',sort_order:0,is_primary:true,alt_es:'Fotografía confirmada'}],intent:'save'}]);
    assert.equal((await get('/es/productos/oasis-set')).body.includes('Nombre confirmado'),false);
    await backend.save([{kind:'product',id:row.id,expected_version:row.revision+1,data:{},intent:'publish'}]);
    const published=await get('/es/productos/oasis-set');assert.ok(published.body.includes('Nombre confirmado'));assert.ok(published.body.includes('Fotografía confirmada'));assert.ok(published.body.includes('candor-clasico.jpg'));
    const collection=(await backend.db.query('select id,revision from collections where id=(select collection_id from products where id=$1)',[row.id])).rows[0];
    await backend.save([{kind:'collection',id:collection.id,expected_version:collection.revision,data:{},translations:[{locale:'es',name:'Etiqueta dinámica confirmada'}],intent:'publish'}]);
    assert.ok((await get('/es/productos')).body.includes('Etiqueta dinámica confirmada'));
    await backend.save([{kind:'product',id:row.id,expected_version:row.revision+2,data:{slug:'oasis-confirmado'},intent:'publish'}]);
    const redirect=await get('/es/productos/oasis-set',308);assert.equal(new URL(redirect.headers.get('location'),origin).href,origin+'/es/productos/oasis-confirmado');
    const studio=await fetch(origin+'/studio-mash/productos');const studioBody=await studio.text();assert.ok(studio.url.endsWith('/studio-mash/login')||studioBody.includes('/studio-mash/login'));assert.equal(studioBody.includes('Nombre confirmado'),false);
    await get('/api/studio-media',401);
    backend.setUnavailable(true);await get('/es/productos/oasis-confirmado',503);
    const failed=await fetch(origin+'/es/productos');const failedBody=await failed.text();assert.equal(failedBody.includes('Oasis Set'),false);assert.equal(failedBody.includes('Rombois Set'),false);
    fs.mkdirSync(process.env.MASH_EVIDENCE_DIR||'docs/phase-2',{recursive:true});
    fs.writeFileSync((process.env.MASH_EVIDENCE_DIR||'docs/phase-2')+'/http-evidence.json',JSON.stringify({capturedAt:new Date().toISOString(),environment:'Local production build + PostgreSQL/WASM + test-only Data API facade; not hosted Supabase/Auth',productionModified:false,checks:evidence,draftIsolation:true,explicitPublication:true,dynamicCollectionLabels:true,englishHtmlLang:true,individualCanonical:true,slugRedirect:true,noStaticFallbackOnFailure:true,anonymousAdminDenied:true},null,2));
    console.log('PASS: HTTP, public draft isolation, explicit publication, photos/alts, dynamic collections, canonical/hreflang/lang, sitemap, 404/308/503 and anonymous admin denial. PostgreSQL isolated; Auth facade is simulated.');
  }finally{server.kill();await backend.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});

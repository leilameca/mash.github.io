const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {loadTs}=require('./support/load-ts.cjs');
test('JSON-LD neutralizes script termination, markup and Unicode line separators',()=>{
  const {safeJsonLd}=loadTs(path.resolve('lib/security.ts'));
  const attack={name:'</script><script>globalThis.pwned=true</script>\u2028\u2029'};
  const serialized=safeJsonLd(attack);assert.equal(serialized.includes('<'),false);assert.deepEqual(JSON.parse(serialized),attack);
});
test('URL policy rejects script/data/http schemes, credentials and network paths',()=>{
  const {isHttpsUrl,isInternalPath}=loadTs(path.resolve('lib/security.ts'));
  for(const url of ['javascript:alert(1)','data:text/html,bad','http://wa.me/1','https://user:secret@example.com','//example.com'])assert.equal(isHttpsUrl(url),false);
  assert.equal(isHttpsUrl('https://wa.me/1'),true);assert.equal(isInternalPath('//example.com'),false);assert.equal(isInternalPath('//evil'),false);assert.equal(isInternalPath('/productos'),true);
});
test('missing configuration, connection failure and valid empty result remain distinct; never legacy',async()=>{
  for(const [client,expected] of [[null,'configuration'],[{from:()=>({select(){return this},eq(){return this},order(){return this},then(resolve){resolve({data:null,error:{message:'private connection details'}})}})},'connection']]){
    const reader=loadTs(path.resolve('lib/supabase/published.ts'),{'./server':{createSupabaseServerClient:async()=>client}});
    await assert.rejects(reader.readPublished('product'),e=>e.code===expected&&!e.message.includes('private connection'));
  }
  const empty=loadTs(path.resolve('lib/supabase/published.ts'),{'./server':{createSupabaseServerClient:async()=>({from:()=>({select(){return this},eq(){return this},order(){return this},then(resolve){resolve({data:[],error:null})}})})}});
  assert.equal((await empty.readPublished('product')).length,0);await assert.rejects(empty.readPublishedSite('home.hero'),e=>e.code==='missing');
});
test('pending English uses Spanish explicitly and never claims completion',()=>{
  const {localizedTranslation}=loadTs(path.resolve('lib/supabase/published.ts'));
  const rows=[{locale:'es',name:'Original español'},{locale:'en',name:'Stale English',translation_status:'needs_review'}];
  assert.equal(localizedTranslation(rows,'en').pending,true);assert.equal(localizedTranslation(rows,'en').text.name,'Original español');
  rows[1].translation_status='complete';assert.equal(localizedTranslation(rows,'en').text.name,'Stale English');
});
test('a transport failure never claims rollback or authorizes deleting uploaded files',async()=>{
  const persistence=loadTs(path.resolve('lib/supabase/persistence.ts'),{'./server':{}});
  await assert.rejects(persistence.commitContent({rpc:async()=>({data:null,error:{code:'',message:'Sensitive transport detail'}})},[]),e=>!persistence.canCleanupFailedSave(e)&&!e.message.includes('Sensitive'));
  await assert.rejects(persistence.commitContent({rpc:async()=>({data:null,error:{code:'40001',message:'Sensitive SQL detail'}})},[]),e=>persistence.canCleanupFailedSave(e)&&!e.message.includes('Sensitive'));
});
test('all navigation links can be hidden without restoring the old menu',async()=>{
  const rows=[{slug:'site.settings',snapshot:{key:'site.settings',value:{whatsapp:'https://wa.me/1'},translations:[]}},{slug:'site.navigation',snapshot:{key:'site.navigation',value:{items:[{id:'home',href:'',visible:false}]},translations:[]}},{slug:'site.footer',snapshot:{key:'site.footer',value:{},translations:[]}}];
  const content=loadTs(path.resolve('lib/supabase/site-content.ts'),{'./published':{readPublished:async()=>rows,localizedTranslation:()=>({text:undefined,pending:true})},'./persistence':{}});
  assert.equal((await content.getSiteChromeContent('es')).navigation.length,0);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { database, ADMIN, OUTSIDER } = require('./support/database.cjs');
const es = { locale: 'es', name: 'Trap Set', description: 'Descripción española verificada.', materials: 'Fibra', care: 'Limpiar con agua' };
const images = [{ storage_path: '/assets/images/oasis-set.jpg', sort_order: 0, is_primary: true, alt_es: 'Conjunto real', alt_en: 'Original caption' }];

test('legacy upgrade preserves an unpublished product and its working content', async () => {
  const visibleSlug = 'oasis-set';
  const draftSlug = 'oculus-mare';
  const f = await database({
    seed: true,
    beforeIntegrity: async (db) => {
      await db.query("update public.products set status = 'published' where slug = $1", [visibleSlug]);
    },
  });
  try {
    const { rows: products } = await f.db.query(
      "select id, slug, status from public.products where slug in ($1, $2)",
      [visibleSlug, draftSlug],
    );
    assert.equal(products.length, 2);
    const draft = products.find((product) => product.slug === draftSlug);
    assert.equal(draft.status, 'draft');
    const { rows: translations } = await f.db.query(
      "select locale from public.product_translations where product_id = $1 order by locale",
      [draft.id],
    );
    assert.deepEqual(translations.map(({ locale }) => locale), ['en', 'es']);
    const { rows: photos } = await f.db.query(
      "select storage_path from public.product_images where product_id = $1 order by sort_order",
      [draft.id],
    );
    assert.deepEqual(photos.map(({ storage_path }) => storage_path), [
      '/assets/images/oculus-mare-dining.jpg',
      '/assets/images/oculus-mare-compacto.jpg',
    ]);
    const { rows: publications } = await f.as('anon', '', (tx) => tx.query(
      "select slug from public.published_content where entity_kind = 'product' and slug in ($1, $2)",
      [visibleSlug, draftSlug],
    ));
    assert.deepEqual(publications.map(({ slug }) => slug), [visibleSlug]);
  } finally {
    await f.db.close();
  }
});

async function fixture() {
  const f = await database();
  const [collection] = await f.save([{kind:'collection',data:{slug:'terraza',cover_image_path:images[0].storage_path},translations:[{locale:'es',name:'Colección dinámica',description:'Descripción de colección válida.'}],intent:'publish'}]);
  const [product] = await f.save([{kind:'product',data:{slug:'trap-set',collection_id:collection.id},translations:[es,{locale:'en',name:'Existing English',description:'Existing description',materials:'Preserved material',care:'Preserved care'}],images,intent:'publish'}]);
  return {...f,collection,product};
}
test('real PostgreSQL: atomic publication, draft isolation, translations, concurrency, history and RLS', async t => {
  const f = await fixture(); const {db,save,product}=f;
  try {
    await t.test('published product is visible anonymously; working copy is private',async()=>{
      const rows=await f.as('anon','',tx=>tx.query("select snapshot from public.published_content where entity_kind='product'"));
      assert.equal(rows.rows[0].snapshot.slug,'trap-set');
      assert.equal((await f.as('anon','',tx=>tx.query('select * from public.products'))).rows.length,0);
    });
    await t.test('Spanish save preserves English materials and care; live snapshot is unchanged',async()=>{
      await save([{kind:'product',id:product.id,expected_version:1,data:{},translations:[{...es,name:'Nuevo nombre'},{locale:'en',name:'',description:''}],intent:'save'}]);
      const en=(await db.query("select * from public.product_translations where product_id=$1 and locale='en'",[product.id])).rows[0];
      assert.equal(en.name,'Existing English');assert.equal(en.materials,'Preserved material');assert.equal(en.care,'Preserved care');assert.equal(en.translation_status,'needs_review');
      const live=(await db.query("select snapshot from public.published_content where entity_kind='product'")).rows[0].snapshot;
      assert.equal(live.translations.find(x=>x.locale==='es').name,'Trap Set');
    });
    await t.test('stale version rolls back before overwriting',async()=>{
      await assert.rejects(save([{kind:'product',id:product.id,expected_version:1,data:{slug:'stale'},intent:'save'}]),e=>e.code==='40001');
      assert.equal((await db.query('select slug from public.products where id=$1',[product.id])).rows[0].slug,'trap-set');
    });
    await t.test('invalid gallery rolls back parent and translations together',async()=>{
      await assert.rejects(save([{kind:'product',id:product.id,expected_version:2,data:{slug:'must-rollback'},translations:[{...es,name:'Must rollback'}],images:[{storage_path:'javascript:bad'}],intent:'publish'}]));
      assert.equal((await db.query('select slug,revision from public.products where id=$1',[product.id])).rows[0].revision,2);
      assert.equal((await db.query("select name from public.product_translations where product_id=$1 and locale='es'",[product.id])).rows[0].name,'Nuevo nombre');
    });
    await t.test('explicit publication changes name, photos, alts, date and creator',async()=>{
      await save([{kind:'product',id:product.id,expected_version:2,data:{slug:'trap-nuevo'},images:[{...images[0],storage_path:'/assets/images/candor-clasico.jpg',alt_es:'Nueva fotografía'}],intent:'publish'}]);
      const r=(await db.query("select * from public.content_publications where entity_kind='product'")).rows[0];
      assert.equal(r.snapshot.translations.find(x=>x.locale==='es').name,'Nuevo nombre');assert.equal(r.snapshot.images[0].alt_es,'Nueva fotografía');assert.equal(r.published_by,ADMIN);assert.ok(r.published_at);
      assert.equal((await db.query('select entity_id from public.content_redirects where old_slug=$1',['trap-set'])).rows[0].entity_id,product.id);
    });
    await t.test('hidden, archived and draft states are excluded for visitors',async()=>{
      for(const [intent,version] of [['hide',3],['archive',4],['draft',5]]){
        await save([{kind:'product',id:product.id,expected_version:version,data:{},intent}]);
        assert.equal((await f.as('anon','',tx=>tx.query("select * from public.published_content where entity_kind='product'"))).rows.length,0);
      }
    });
    await t.test('restore creates a new draft revision without publishing',async()=>{
      await f.as('authenticated',ADMIN,tx=>tx.query('select public.restore_mash_revision($1,$2,$3,$4)',['product',product.id,1,6]));
      assert.equal((await db.query('select slug,revision from public.products where id=$1',[product.id])).rows[0].revision,7);
      assert.equal((await f.as('anon','',tx=>tx.query("select * from public.published_content where entity_kind='product'"))).rows.length,0);
    });
    await t.test('unauthorized authenticated user and anonymous role cannot write',async()=>{
      await assert.rejects(save([{kind:'product',data:{slug:'forbidden'},intent:'save'}],OUTSIDER),e=>e.code==='42501');
      await assert.rejects(f.as('anon','',tx=>tx.query('select public.save_mash_content($1)',[JSON.stringify([])])),e=>e.code==='42501');
      assert.equal((await f.as('authenticated',OUTSIDER,tx=>tx.query('select * from public.content_revisions'))).rows.length,0);
    });
    await t.test('multi-page form failure rolls back every block',async()=>{
      await assert.rejects(save([{kind:'site',data:{key:'page.about',value:{title:'Changed'}},translations:[{locale:'es',value:{title:'Original'}}],intent:'publish'},{kind:'site',data:{key:'page.contact',invalid:'not allowed'},intent:'save'}]));
      assert.equal((await db.query('select * from public.site_content')).rows.length,0);
    });
    await t.test('exactly one primary image is required before publishing',async()=>{
      await assert.rejects(save([{kind:'product',id:product.id,expected_version:7,data:{},images:[{...images[0],is_primary:false}],intent:'publish'}]),e=>e.code==='22023');
    });
    await t.test('even an administrator cannot mutate historical revisions',async()=>{
      await assert.rejects(f.as('authenticated',ADMIN,tx=>tx.query("update public.content_revisions set snapshot='{}' where entity_kind='product'")),e=>e.code==='42501');
    });
  } finally { await db.close(); }
});
test('unchanged reviewed English survives saving the unchanged Spanish original',async()=>{
  const f=await fixture();
  try {
    await f.db.query("update product_translations set translation_status='complete' where product_id=$1 and locale='en'",[f.product.id]);
    await f.save([{kind:'product',id:f.product.id,expected_version:1,data:{},translations:[es,{locale:'en',name:'Existing English',description:'Existing description'}],intent:'save'}]);
    const en=(await f.db.query("select translation_status,materials,care from product_translations where product_id=$1 and locale='en'",[f.product.id])).rows[0];
    assert.equal(en.translation_status,'complete');assert.equal(en.materials,'Preserved material');assert.equal(en.care,'Preserved care');
    await f.save([{kind:'product',id:f.product.id,expected_version:2,data:{},translations:[{locale:'en',description:'Manually revised description'}],intent:'save'}]);
    const revised=(await f.db.query("select name,materials,care from product_translations where product_id=$1 and locale='en'",[f.product.id])).rows[0];assert.equal(revised.name,'Existing English');assert.equal(revised.materials,'Preserved material');assert.equal(revised.care,'Preserved care');
  }finally{await f.db.close();}
});
test('site English survives empty inputs and an older published revision restores privately',async()=>{
  const f=await database();
  try{
    const [entry]=await f.save([{kind:'site',data:{key:'page.about',value:{image_path:'/assets/images/oasis-set.jpg'}},translations:[{locale:'es',value:{title:'Original español',description:'Descripción original'}},{locale:'en',value:{title:'Existing title',description:'Existing description'}}],intent:'publish'}]);
    await f.save([{kind:'site',id:entry.id,expected_version:1,data:{value:{}},translations:[{locale:'es',value:{title:'Nuevo original'}},{locale:'en',value:{title:'',description:''}}],intent:'save'}]);
    const en=(await f.db.query("select value,translation_status from site_content_translations where site_content_id=$1 and locale='en'",[entry.id])).rows[0];
    assert.equal(en.value.title,'Existing title');assert.equal(en.value.description,'Existing description');assert.equal(en.translation_status,'needs_review');
    await f.as('authenticated',f.ADMIN,tx=>tx.query('select restore_mash_revision($1,$2,$3,$4)',['site',entry.id,1,2]));
    const live=(await f.as('anon','',tx=>tx.query('select snapshot from published_content where entity_id=$1',[entry.id]))).rows[0].snapshot;
    assert.equal(live.translations.find(t=>t.locale==='es').value.title,'Original español');
    assert.equal((await f.db.query('select revision,is_public from site_content where id=$1',[entry.id])).rows[0].is_public,false);
    assert.equal((await f.db.query('select revision from site_content where id=$1',[entry.id])).rows[0].revision,3);
  }finally{await f.db.close();}
});

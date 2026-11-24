const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {database}=require('./support/database.cjs');
const {loadTs}=require('./support/load-ts.cjs');
test('real server action -> persistence RPC -> PostgreSQL: create, edit draft and publish',async()=>{
  const f=await database();
  const files=new Map();
  const client={
    from(table){
      assert.equal(table,'product_images');let id;
      const q={select(){return q},eq(field,value){assert.equal(field,'product_id');id=value;return q},then(resolve,reject){return f.db.query('select * from product_images where product_id=$1',[id]).then(r=>({data:r.rows,error:null})).then(resolve,reject)}};
      return q;
    },
    async rpc(name,args){try{assert.equal(name,'save_mash_content');return {data:await f.save(args.p_changes),error:null}}catch(error){return {data:null,error:{code:error.code,message:error.message}}}},
    // Storage boundary is deliberately simulated. Image decoding is the real helper.
    storage:{from(){return {upload:async(key,bytes)=>{files.set(key,Buffer.from(bytes));return {error:null}},getPublicUrl:key=>({data:{publicUrl:'https://isolated.invalid/storage/v1/object/public/mash-media/'+key}}),remove:async keys=>{keys.forEach(k=>files.delete(k));return {error:null}}}}}
  };
  const actions=loadTs(path.resolve('app/studio-mash/actions.ts'),{
    'next/cache':{revalidatePath(){}},'next/navigation':{redirect:url=>{throw Error('redirect:'+url)}},
    '@/lib/supabase/auth':{requireAdmin:async()=>({user_id:f.ADMIN})},
    './server':{createSupabaseServerClient:async()=>client},
    '@/lib/supabase/server':{createSupabaseServerClient:async()=>client}
  },{Error});
  try{
    const [collection]=await f.save([{kind:'collection',data:{slug:'terraza',cover_image_path:'/assets/images/oasis-set.jpg'},translations:[{locale:'es',name:'Colección verificada',description:'Descripción válida de colección.'}],intent:'publish'}]);
    const form=new FormData();for(const [key,value]of Object.entries({slug:'trap-set',collection_id:collection.id,status:'draft',name_es:'Trap Set',description_es:'Texto aprobado para la prueba aislada.',materials_es:'Fibra',care_es:'Limpiar con agua',existing_image_paths:'[]'}))form.set(key,value);
    form.append('product_images',new File([fs.readFileSync('public/assets/images/oasis-set.jpg')],'original.jpg',{type:'image/jpeg'}));
    await assert.rejects(async()=>{const result=await actions.upsertProduct({},form);if(result)throw Error("Action returned: "+JSON.stringify(result));},/redirect:/);
    const row=(await f.db.query("select id,revision from products where slug='trap-set'")).rows[0];
    assert.equal(row.revision,1);assert.equal(files.size,1);assert.equal((await f.db.query("select * from content_publications where entity_kind='product'")).rows.length,0);
    const image=(await f.db.query('select storage_path from product_images where product_id=$1',[row.id])).rows[0].storage_path;
    form.delete('product_images');form.set('id',row.id);form.set('revision','1');form.set('name_es','Nombre actualizado');form.set('existing_image_paths',JSON.stringify([image]));form.set('primary_image_path',image);form.set('image_alts',JSON.stringify({[image]:{alt_es:'Descripción de fotografía'}}));
    await assert.rejects(actions.upsertProduct({},form),/redirect:/);
    assert.equal((await f.db.query("select * from content_publications where entity_kind='product'")).rows.length,0);
    form.set('revision','2');form.set('intent','publish');await assert.rejects(actions.upsertProduct({},form),/redirect:/);
    const publicRows=await f.as('anon','',tx=>tx.query("select snapshot from content_publications where entity_kind='product'"));
    assert.equal(publicRows.rows[0].snapshot.translations.find(t=>t.locale==='es').name,'Nombre actualizado');
    assert.equal(publicRows.rows[0].snapshot.images[0].alt_es,'Descripción de fotografía');
    form.set('revision','1');const stale=await actions.upsertProduct({},form);assert.equal(stale.ok,false);assert.match(stale.message,/pestaña/);
  }finally{await f.db.close();}
});

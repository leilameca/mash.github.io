// Test-only Data API facade over isolated PostgreSQL. It is not Supabase Auth,
// PostgREST or a production runtime. SQL, snapshots and RLS execute in PostgreSQL.
const http = require('node:http');
const {database} = require('./database.cjs');
async function dataApi() {
  const f=await database({seed:true});
  // Explicit isolated fixtures: the historical seed intentionally creates drafts.
  for(const kind of ['collection','product','project']) {
    const table={collection:'collections',product:'products',project:'projects'}[kind];
    const rows=(await f.db.query(`select id,slug,revision from public.${table}`)).rows;
    for(const row of rows) {
      if(kind==='product' && !['oasis-set','candor-clasico'].includes(row.slug))continue;
      await f.save([{kind,id:row.id,expected_version:row.revision,data:{},intent:'publish'}]);
    }
  }
  const hero=(await f.db.query("select id,revision from site_content where key='home.hero'")).rows[0];
  await f.save([{kind:'site',id:hero?.id,expected_version:hero?.revision,data:{key:'home.hero',value:{image_path:'/assets/images/oasis-hero-v2.jpg',showroom_main_image_path:'/assets/images/candor-mix-collection.jpeg',showroom_small_image_path:'/assets/images/oculus-mare-dining.jpg'}},translations:[{locale:'es',value:{title:'Contenido de prueba aislado',description:'Texto original para verificar el sitio en un entorno aislado.'}}],intent:'publish'}]);
  const sections=(await f.db.query("select id,revision from site_content where key='home.sections'")).rows[0];
  await f.save([{kind:'site',id:sections?.id,expected_version:sections?.revision,data:{key:'home.sections',value:{visible:{intro:true,collections:false,featured:false,lifestyle:false,philosophy:false,projects:false,materials:false,benefits:false,faq:false},introImage:'/assets/images/oasis-set.jpg'}},translations:[{locale:'es',value:{introEyebrow:'Prueba de contenido',introTitle:'Inicio aislado'}}],intent:'publish'}]);
  let unavailable=false;
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    res.setHeader('content-type','application/json');
    if(unavailable){res.writeHead(503);res.end(JSON.stringify({message:'Isolated connection failure'}));return;}
    const table=url.pathname.replace('/rest/v1/','');
    if(!['content_publications','content_redirects'].includes(table)){res.writeHead(401);res.end(JSON.stringify({message:'Unauthorized'}));return;}
    try {
      const clauses=[],params=[];
      for(const [key,value] of url.searchParams){
        if(['select','order','offset','limit'].includes(key))continue;
        if(!/^(entity_kind|entity_id|status|slug|old_slug|snapshot->>collection_id)$/.test(key))throw Error('Unsupported test filter');
        const field=key==='snapshot->>collection_id'?"snapshot->>'collection_id'":`"${key}"`;
        const dot=value.indexOf('.');const op=value.slice(0,dot);if(!['eq','neq'].includes(op))throw Error('Unsupported test comparison');
        params.push(value.slice(dot+1));clauses.push(`${field} ${op==='eq'?'=':'<>'} $${params.length}`);
      }
      const where=clauses.length?' where '+clauses.join(' and '):'';
      const result=await f.as('anon','',async tx=>{
        const count=(await tx.query(`select count(*)::int n from public.${table}${where}`,params)).rows[0].n;
        const offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
        const limit=Math.min(1000,Math.max(0,Number(url.searchParams.get('limit'))||1000));
        const order=table==='content_publications'?' order by sort_order,entity_id':'';
        const rows=(await tx.query(`select * from public.${table}${where}${order} limit ${limit} offset ${offset}`,params)).rows;
        return {count,rows,offset};
      });
      res.setHeader('content-range',`${result.offset}-${Math.max(result.offset,result.offset+result.rows.length-1)}/${result.count}`);
      const object=req.headers.accept?.includes('vnd.pgrst.object');
      if(object && result.rows.length!==1){res.writeHead(406);res.end(JSON.stringify({code:'PGRST116',details:`The result contains ${result.rows.length} rows`}));return;}
      res.end(JSON.stringify(object?result.rows[0]:result.rows));
    }catch(error){res.writeHead(500);res.end(JSON.stringify({message:error.message}));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {...f,url:`http://127.0.0.1:${server.address().port}`,setUnavailable:value=>{unavailable=value;},close:async()=>{await new Promise(resolve=>server.close(resolve));await f.db.close();}};
}
module.exports={dataApi};

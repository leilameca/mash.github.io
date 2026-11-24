-- Phase 2. Additive schema. Apply only after a verified backup and isolated tests.
-- The original normalized tables become the administrative working copy.
alter table public.products add column revision bigint not null default 0;
alter table public.collections add column revision bigint not null default 0;
alter table public.projects add column revision bigint not null default 0;
alter table public.site_content add column revision bigint not null default 0;
alter table public.collection_translations add column translation_status text not null default 'needs_review' check (translation_status in ('complete','missing','needs_review'));
alter table public.site_content_translations add column translation_status text not null default 'needs_review' check (translation_status in ('complete','missing','needs_review'));

create table public.content_revisions (
  entity_kind text not null check (entity_kind in ('product','collection','project','site')),
  entity_id uuid not null,
  version bigint not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (entity_kind,entity_id,version)
);
create table public.content_publications (
  entity_kind text not null,
  entity_id uuid not null,
  version bigint not null,
  slug text not null,
  snapshot jsonb not null,
  status public.content_status not null,
  sort_order integer not null default 0,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  primary key (entity_kind,entity_id),
  unique(entity_kind,slug),
  foreign key(entity_kind,entity_id,version) references public.content_revisions(entity_kind,entity_id,version)
);
create table public.content_redirects (
  entity_kind text not null check (entity_kind in ('product','collection','project')),
  old_slug text not null check (old_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(entity_kind,old_slug)
);
alter table public.content_revisions enable row level security;
alter table public.content_publications enable row level security;
alter table public.content_redirects enable row level security;
create policy revisions_admin on public.content_revisions for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy publications_public on public.content_publications for select to anon,authenticated using(status='published');
create policy publications_admin on public.content_publications for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy redirects_public on public.content_redirects for select to anon,authenticated using(exists(select 1 from public.content_publications p where p.entity_kind=content_redirects.entity_kind and p.entity_id=content_redirects.entity_id and p.status='published'));
create policy redirects_admin on public.content_redirects for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.content_revisions,public.content_publications,public.content_redirects from public,anon,authenticated;
grant select on public.content_publications,public.content_redirects to anon;
grant select,insert,update on public.content_publications,public.content_redirects to authenticated;
grant select,insert on public.content_revisions to authenticated;
create index publications_catalog on public.content_publications(entity_kind,status,sort_order,entity_id);
create index publications_author on public.content_publications(published_by);
create index revisions_author on public.content_revisions(created_by);
create index redirects_target on public.content_redirects(entity_kind,entity_id);

create function private.mash_snapshot(p_kind text,p_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare tab text; child text; fk text; result jsonb; translations jsonb; images jsonb:='[]';
begin
  tab:=case p_kind when 'product' then 'products' when 'collection' then 'collections' when 'project' then 'projects' when 'site' then 'site_content' end;
  child:=case p_kind when 'site' then 'site_content' else p_kind end;
  fk:=child||'_id';
  if tab is null then raise exception 'Invalid kind' using errcode='22023'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1',tab) into result using p_id;
  execute format('select coalesce(jsonb_agg(to_jsonb(t) order by locale),''[]''::jsonb) from public.%I t where %I=$1',child||'_translations',fk) into translations using p_id;
  if p_kind in ('product','project') then
    execute format('select coalesce(jsonb_agg(to_jsonb(t) order by sort_order,storage_path),''[]''::jsonb) from public.%I t where %I=$1',p_kind||'_images',fk) into images using p_id;
  end if;
  return result||jsonb_build_object('translations',translations,'images',images);
end $$;
revoke all on function private.mash_snapshot(text,uuid) from public,anon;
grant execute on function private.mash_snapshot(text,uuid) to authenticated;

-- Initial snapshots preserve exactly the existing Supabase records and states.
-- No legacy imports and no promotion of draft/hidden/archived entries.
do $$
declare k text; tab text; item record; snap jsonb; state public.content_status;
begin
  foreach k in array array['collection','product','project','site'] loop
    tab:=case k when 'product' then 'products' when 'collection' then 'collections' when 'project' then 'projects' else 'site_content' end;
    for item in execute format('select id from public.%I',tab) loop
      snap:=private.mash_snapshot(k,item.id);
      state:=case when k='site' then case when (snap->>'is_public')::boolean then 'published' else 'hidden' end else snap->>'status' end;
      insert into public.content_revisions(entity_kind,entity_id,version,snapshot) values(k,item.id,0,snap);
      if state='published' then
        insert into public.content_publications(entity_kind,entity_id,version,slug,snapshot,status,sort_order,published_at)
        values(k,item.id,0,coalesce(snap->>'slug',snap->>'key'),snap,state,coalesce((snap->>'sort_order')::int,0),coalesce((snap->>'published_at')::timestamptz,(snap->>'updated_at')::timestamptz));
      end if;
    end loop;
  end loop;
end $$;

-- Working copies must never be exposed through the original REST tables.
do $$
declare pol record;
begin
  for pol in select * from pg_policies where schemaname='public' and tablename in ('products','product_translations','product_images','collections','collection_translations','projects','project_translations','project_images','site_content','site_content_translations') and cmd='SELECT' loop
    execute format('drop policy %I on public.%I',pol.policyname,pol.tablename);
  end loop;
  for pol in select unnest(array['products','product_translations','product_images','collections','collection_translations','projects','project_translations','project_images','site_content','site_content_translations']) as tablename loop
    execute format('create policy working_copy_admin on public.%I for select to authenticated using ((select public.is_admin()))',pol.tablename);
  end loop;
end $$;

-- One invocation is one PostgreSQL transaction, including multi-block forms.
create function public.save_mash_content(p_changes jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare c jsonb; k text; tab text; child text; fk text; ident uuid; existing jsonb; d jsonb; tr jsonb; im jsonb;
  intent text; ver bigint; snap jsonb; cols text; assignments text; allowed text[]; trans_allowed text[];
  existing_translation jsonb; old_es jsonb; new_es jsonb; changed_es boolean; previous_slug text; live_status public.content_status; results jsonb:='[]';
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if p_changes is null or jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 12 then raise exception 'Invalid changes' using errcode='22023'; end if;
  -- Lock entities in stable order across multi-block requests to avoid deadlocks.
  for c in select value from jsonb_array_elements(p_changes) order by value->>'kind',value->>'id' loop
    k:=c->>'kind'; intent:=coalesce(c->>'intent','save');
    if intent not in ('save','publish','draft','hide','archive','restore') then raise exception 'Invalid intent' using errcode='22023'; end if;
    tab:=case k when 'product' then 'products' when 'collection' then 'collections' when 'project' then 'projects' when 'site' then 'site_content' end;
    if tab is null then raise exception 'Invalid kind' using errcode='22023'; end if;
    child:=case k when 'site' then 'site_content' else k end; fk:=child||'_id';
    ident:=coalesce(nullif(c->>'id','')::uuid,gen_random_uuid());
    execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tab) into existing using ident;
    if existing is null and nullif(c->>'id','') is not null then raise exception 'Missing content' using errcode='P0002'; end if;
    ver:=coalesce((existing->>'revision')::bigint,0);
    if existing is not null and (c->>'expected_version' is null or (c->>'expected_version')::bigint<>ver) then raise exception 'Revision conflict' using errcode='40001'; end if;
    d:=coalesce(c->'data','{}');
    allowed:=case k when 'product' then array['slug','collection_id','featured','sort_order','dimensions','finishes','availability'] when 'collection' then array['slug','cover_image_path','featured','sort_order'] when 'project' then array['slug','cover_image_path','location','project_date','featured','sort_order'] else array['key','value'] end;
    if exists(select 1 from jsonb_object_keys(d) x where not x=any(allowed)) then raise exception 'Invalid field' using errcode='22023'; end if;
    -- Content patches preserve the latest images; stale forms cannot restore old URLs.
    if k='site' and d ? 'value' then d:=jsonb_set(d,'{value}',coalesce(existing->'value','{}')||d->'value'); end if;
    if k='site' then
      d:=d||jsonb_build_object('is_public',case when intent='publish' then true when intent in ('hide','archive','draft','restore') then false else coalesce((existing->>'is_public')::boolean,false) end);
    else
      d:=d||jsonb_build_object('status',case intent when 'publish' then 'published' when 'hide' then 'hidden' when 'archive' then 'archived' when 'draft' then 'draft' when 'restore' then 'draft' else coalesce(existing->>'status','draft') end);
      if intent='publish' then d:=d||jsonb_build_object('published_at',now()); end if;
    end if;
    d:=d||jsonb_build_object('id',ident,'revision',ver+1,'updated_by',auth.uid());
    select string_agg(format('%I',x),',') into cols from jsonb_object_keys(d) x;
    if existing is null then
      d:=d||jsonb_build_object('created_by',auth.uid());
      select string_agg(format('%I',x),',') into cols from jsonb_object_keys(d) x;
      execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1)',tab,cols,cols,tab) using d;
    else
      select string_agg(format('%I=r.%I',x,x),',') into assignments from jsonb_object_keys(d) x;
      execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where t.id=$2',tab,assignments,tab) using d,ident;
    end if;
    execute format('select to_jsonb(t)-''id''-''created_at''-''updated_at'' from public.%I t where %I=$1 and locale=''es''',child||'_translations',fk) into old_es using ident;
    trans_allowed:=case k when 'site' then array['locale','value'] when 'project' then array['locale','title','description','seo_title','seo_description'] when 'collection' then array['locale','name','description','seo_title','seo_description'] else array['locale','name','description','materials','care','seo_title','seo_description'] end;
    for tr in select value from jsonb_array_elements(coalesce(c->'translations','[]')) loop
      if tr->>'locale' not in ('es','en') or tr->>'locale' is null or exists(select 1 from jsonb_object_keys(tr) x where not x=any(trans_allowed)) then raise exception 'Invalid translation' using errcode='22023'; end if;
      execute format('select to_jsonb(t) from public.%I t where %I=$1 and locale=$2',child||'_translations',fk) into existing_translation using ident,tr->>'locale';
      if k='site' then
        if tr->>'locale'='en' then
          select coalesce(jsonb_object_agg(key,value),'{}') into im from jsonb_each(coalesce(tr->'value','{}')) where value<>'null'::jsonb and value<>'""'::jsonb;
          if im='{}'::jsonb then continue; end if;
          tr:=jsonb_set(tr,'{value}',im);
        end if;
        tr:=jsonb_set(tr,'{value}',coalesce(existing_translation->'value','{}')||coalesce(tr->'value','{}'));
      end if;
      -- Empty English inputs mean preserve, never erase or fabricate a translation.
      if tr->>'locale'='en' and k<>'site' then
        select coalesce(jsonb_object_agg(key,value),'{}') into tr from jsonb_each(tr) where key='locale' or (value<>'null'::jsonb and value<>'""'::jsonb);
        if tr='{"locale":"en"}'::jsonb then continue; end if;
      end if;
      -- Populate required columns from the existing row before INSERT/ON CONFLICT;
      -- PostgreSQL checks NOT NULL before resolving the conflict.
      select coalesce(jsonb_object_agg(key,value),'{}') into im from jsonb_each(coalesce(existing_translation,'{}')) where key=any(trans_allowed);
      tr:=im||tr;
      if k<>'site' and tr->>'locale'='en' then
        tr:=jsonb_set(tr,array[case when k='project' then 'title' else 'name' end],to_jsonb(coalesce(tr->>case when k='project' then 'title' else 'name' end,'')));
      end if;
      tr:=tr||jsonb_build_object(fk,ident,'translation_status',case when tr->>'locale'='es' then 'complete' when k<>'site' and (nullif(tr->>case when k='project' then 'title' else 'name' end,'') is null or nullif(tr->>'description','') is null) then 'missing' when existing_translation @> tr then coalesce(existing_translation->>'translation_status','needs_review') else 'needs_review' end);
      select string_agg(format('%I',x),','),string_agg(format('%I=excluded.%I',x,x),',') into cols,assignments from jsonb_object_keys(tr) x;
      execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict(%I,locale) do update set %s',child||'_translations',cols,cols,child||'_translations',fk,assignments) using tr;
    end loop;
    execute format('select to_jsonb(t)-''id''-''created_at''-''updated_at'' from public.%I t where %I=$1 and locale=''es''',child||'_translations',fk) into new_es using ident;
    changed_es:=old_es is distinct from new_es;
    if changed_es then execute format('update public.%I set translation_status=''needs_review'' where %I=$1 and locale=''en''',child||'_translations',fk) using ident; end if;
    if k in ('product','project') and c ? 'images' then
      if jsonb_typeof(c->'images')<>'array' or jsonb_array_length(c->'images')>20 then raise exception 'Invalid gallery' using errcode='22023'; end if;
      for im in select value from jsonb_array_elements(c->'images') loop
        if nullif(im->>'storage_path','') is null or (im->>'storage_path' !~ '^/assets/images/' and im->>'storage_path' !~ '^https://[^/]+/storage/v1/object/public/mash-media/(products|collections|projects|site)/') then raise exception 'Invalid image path' using errcode='22023'; end if;
        im:=jsonb_build_object(fk,ident,'storage_path',im->>'storage_path','sort_order',coalesce((im->>'sort_order')::int,0),case k when 'product' then 'is_primary' else 'is_cover' end,coalesce((im->>case k when 'product' then 'is_primary' else 'is_cover' end)::boolean,false)) || (im - array['id','product_id','project_id','created_at','updated_at','is_primary','is_cover']);
        if exists(select 1 from jsonb_object_keys(im) x where not x=any(array[fk,'storage_path','sort_order','alt_es','alt_en',case k when 'product' then 'is_primary' else 'is_cover' end])) then raise exception 'Invalid image field' using errcode='22023'; end if;
        select string_agg(format('%I',x),','),string_agg(format('%I=excluded.%I',x,x),',') into cols,assignments from jsonb_object_keys(im) x;
        execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict(%I,storage_path) do update set %s',k||'_images',cols,cols,k||'_images',fk,assignments) using im;
      end loop;
      -- Unlink only working-copy references. Historical snapshots and files stay intact.
      execute format('delete from public.%I where %I=$1 and storage_path not in (select value->>''storage_path'' from jsonb_array_elements($2))',k||'_images',fk) using ident,c->'images';
    end if;
    snap:=private.mash_snapshot(k,ident);
    if intent='publish' then
      if new_es is null then raise exception 'Spanish original required' using errcode='22023'; end if;
      if k<>'site' and (length(coalesce(new_es->>case when k='project' then 'title' else 'name' end,''))<2 or length(coalesce(new_es->>'description',''))<10) then raise exception 'Spanish content required' using errcode='22023'; end if;
      if k='product' and (jsonb_array_length(snap->'images')=0 or (select count(*) from jsonb_array_elements(snap->'images') i where (i->>'is_primary')::boolean)<>1 or not exists(select 1 from public.content_publications where entity_kind='collection' and entity_id=(snap->>'collection_id')::uuid and status='published')) then raise exception 'Valid gallery and published collection required' using errcode='22023'; end if;
      if k in ('project','collection') and nullif(snap->>'cover_image_path','') is null then raise exception 'Cover required' using errcode='22023'; end if;
    end if;
    insert into public.content_revisions(entity_kind,entity_id,version,snapshot,created_by) values(k,ident,ver+1,snap,auth.uid());
    if intent='publish' then
      select slug into previous_slug from public.content_publications where entity_kind=k and entity_id=ident;
      if previous_slug is not null and previous_slug<>coalesce(snap->>'slug',snap->>'key') and k<>'site' then
        insert into public.content_redirects(entity_kind,old_slug,entity_id) values(k,previous_slug,ident) on conflict(entity_kind,old_slug) do update set entity_id=excluded.entity_id;
      end if;
      insert into public.content_publications(entity_kind,entity_id,version,slug,snapshot,status,sort_order,published_at,published_by)
      values(k,ident,ver+1,coalesce(snap->>'slug',snap->>'key'),snap,'published',coalesce((snap->>'sort_order')::int,0),now(),auth.uid())
      on conflict(entity_kind,entity_id) do update set version=excluded.version,slug=excluded.slug,snapshot=excluded.snapshot,status=excluded.status,sort_order=excluded.sort_order,published_at=excluded.published_at,published_by=excluded.published_by;
    elsif intent in ('hide','archive','draft') then
      update public.content_publications set status=(case intent when 'hide' then 'hidden' when 'archive' then 'archived' else 'draft' end)::public.content_status,published_by=auth.uid() where entity_kind=k and entity_id=ident;
    end if;
    results:=results||jsonb_build_array(jsonb_build_object('id',ident,'revision',ver+1));
  end loop;
  return results;
end $$;
revoke all on function public.save_mash_content(jsonb) from public,anon;
grant execute on function public.save_mash_content(jsonb) to authenticated;

create function public.restore_mash_revision(p_kind text,p_id uuid,p_version bigint,p_expected_version bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare snap jsonb; d jsonb; allowed text[]; tr jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  select snapshot into snap from public.content_revisions where entity_kind=p_kind and entity_id=p_id and version=p_version;
  if snap is null then raise exception 'Revision not found' using errcode='P0002'; end if;
  allowed:=case p_kind when 'product' then array['slug','collection_id','featured','sort_order','dimensions','finishes','availability'] when 'collection' then array['slug','cover_image_path','featured','sort_order'] when 'project' then array['slug','cover_image_path','location','project_date','featured','sort_order'] else array['key','value'] end;
  select jsonb_object_agg(key,value) into d from jsonb_each(snap) where key=any(allowed);
  select coalesce(jsonb_agg(value-array['id','product_id','project_id','collection_id','site_content_id','created_at','updated_at','translation_status']),'[]') into tr from jsonb_array_elements(snap->'translations');
  return public.save_mash_content(jsonb_build_array(jsonb_build_object('kind',p_kind,'id',p_id,'expected_version',p_expected_version,'data',d,'translations',tr,'images',snap->'images','intent','restore')));
end $$;
revoke all on function public.restore_mash_revision(text,uuid,bigint,bigint) from public,anon;
grant execute on function public.restore_mash_revision(text,uuid,bigint,bigint) to authenticated;

-- Old RPCs remain available in the schema for rollback, but cannot bypass revisions.
revoke execute on function public.save_product_bundle(uuid,text,uuid,public.content_status,boolean,text,text[],text,text,text,text,text,text,text) from authenticated;
revoke execute on function public.save_collection_bundle(uuid,text,text,public.content_status,boolean,integer,text,text,text,text) from authenticated;
revoke execute on function public.save_project_bundle(uuid,text,text,text,date,public.content_status,boolean,integer,text,text,text,text) from authenticated;

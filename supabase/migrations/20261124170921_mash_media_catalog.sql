-- Phase 4: additive asset registry, immutable variants, usage graph and collections.
-- Apply only to the separately authorized target environment. No remote operation here.
create table public.media_assets (
 id uuid primary key default gen_random_uuid(),
 original_name text not null check(length(original_name) between 1 and 255),
 folder text not null check(folder in ('products','collections','projects','site')),
 state text not null check(state in ('legacy','processing','ready','failed','archived')),
 canonical_path text unique,
 original_bucket text check(original_bucket is null or original_bucket='mash-originals'),
 original_storage_path text,
 mime text,byte_size bigint check(byte_size between 1 and 31457280),
 width int check(width between 1 and 16000),height int check(height between 1 and 16000),
 sha256 text check(sha256 ~ '^[0-9a-f]{64}$'),
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 created_by uuid references auth.users(id),
 check(state<>'ready' or (canonical_path is not null and original_storage_path is not null and mime is not null and width is not null and height is not null and byte_size is not null and sha256 is not null))
);
create table public.media_variants (
 asset_id uuid not null references public.media_assets(id) on delete restrict,
 role text not null check(role in ('thumbnail','catalog','gallery','large')),
 storage_path text not null unique,public_url text not null unique,
 mime text not null default 'image/webp' check(mime='image/webp'),
 width int not null check(width between 1 and 2400),height int not null check(height between 1 and 2400),
 byte_size bigint not null check(byte_size between 1 and 8388608),sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 primary key(asset_id,role)
);
create table public.media_asset_references (
 asset_id uuid not null references public.media_assets(id) on delete restrict,
 entity_kind text not null check(entity_kind in ('product','collection','project','site')),
 entity_id uuid not null,source text not null check(source in ('working','revision','publication')),
 version bigint not null check(version>=0),
 primary key(asset_id,entity_kind,entity_id,source,version)
);
create index media_reference_entity on public.media_asset_references(entity_kind,entity_id,source);
create index media_assets_created on public.media_assets(created_at desc,id);
create index media_assets_folder_state on public.media_assets(folder,state,created_at desc);
create index media_assets_name on public.media_assets(lower(original_name) text_pattern_ops);
create table public.media_events (
 id bigint generated always as identity primary key,asset_id uuid not null references public.media_assets(id) on delete restrict,
 event text not null check(event in ('reserved','ready','failed','renamed','archived')),
 actor_id uuid references auth.users(id),created_at timestamptz not null default now()
);
create table private.media_upload_jobs (
 asset_id uuid primary key references public.media_assets(id) on delete restrict,
 lease_id uuid not null,lease_until timestamptz not null,attempts int not null default 1,
 error_code text,updated_at timestamptz not null default now()
);
alter table private.media_upload_jobs enable row level security;
revoke all on private.media_upload_jobs from public,anon,authenticated,service_role;
grant usage on schema private to service_role;
grant select,update on private.media_upload_jobs to service_role;
create policy media_jobs_service on private.media_upload_jobs for all to service_role using(true) with check(true);

do $$declare t text;begin
 foreach t in array array['media_assets','media_variants','media_asset_references','media_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant select,insert,update on public.%I to service_role',t);
  execute format('create policy media_admin_read on public.%I for select to authenticated using ((select public.is_admin()))',t);
  execute format('create policy media_server on public.%I for all to service_role using (true) with check (true)',t);
 end loop;
end $$;
grant usage,select on sequence public.media_events_id_seq to service_role;

create table public.product_collections (
 product_id uuid not null references public.products(id) on delete restrict,
 collection_id uuid not null references public.collections(id) on delete restrict,
 sort_order int not null check(sort_order between 0 and 19),
 primary key(product_id,collection_id)
);
create index product_collections_collection on public.product_collections(collection_id,product_id);
alter table public.product_collections enable row level security;
revoke all on public.product_collections from public,anon,authenticated;
grant select on public.product_collections to authenticated;
create policy product_collections_admin on public.product_collections for select to authenticated using((select public.is_admin()));
insert into public.product_collections(product_id,collection_id,sort_order) select id,collection_id,0 from public.products where collection_id is not null;

-- Scan all structured values conservatively, including old revision snapshots.
create function private.mash_media_paths(doc jsonb) returns table(path text)
language sql immutable security invoker set search_path='' as $$
 with recursive nodes(value) as (
  select doc union all
  select child.value from nodes n cross join lateral (
   select value from jsonb_each(case when jsonb_typeof(n.value)='object' then n.value else '{}'::jsonb end)
   union all select value from jsonb_array_elements(case when jsonb_typeof(n.value)='array' then n.value else '[]'::jsonb end)
  ) child
 ) select distinct value #>> '{}' from nodes where jsonb_typeof(value)='string'
 and (value #>> '{}' ~ '^/assets/images/' or value #>> '{}' ~ '^https://[^/]+/storage/v1/object/public/mash-media/');
$$;
revoke all on function private.mash_media_paths(jsonb) from public,anon;
grant execute on function private.mash_media_paths(jsonb) to authenticated,service_role;
create function private.mash_asset_for_path(p_path text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare ident uuid;begin
 select id into ident from public.media_assets where canonical_path=p_path;
 if ident is null then select asset_id into ident from public.media_variants where public_url=p_path;end if;
 return ident;
end $$;
revoke all on function private.mash_asset_for_path(text) from public,anon;
grant execute on function private.mash_asset_for_path(text) to authenticated,service_role;
create function private.mash_register_legacy(p_path text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare ident uuid; folder text;begin
 ident:=private.mash_asset_for_path(p_path);if ident is not null then return ident;end if;
 if p_path is null or (p_path !~ '^/assets/images/' and p_path !~ '^https://[^/]+/storage/v1/object/public/mash-media/') then raise exception 'Unsupported legacy media path' using errcode='22023';end if;
 folder:=substring(p_path from '/mash-media/(products|collections|projects|site)/');
 insert into public.media_assets(original_name,folder,state,canonical_path)
 values(left(regexp_replace(p_path,'^.*/',''),255),coalesce(folder,'products'),'legacy',p_path)
 on conflict(canonical_path) do update set canonical_path=excluded.canonical_path returning id into ident;
 return ident;
end $$;
revoke all on function private.mash_register_legacy(text) from public,anon,authenticated;
create function private.mash_record_media(p_kind text,p_entity uuid,p_source text,p_version bigint,p_snapshot jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare item record; ident uuid; asset_state text;begin
 if p_source in ('working','publication') then delete from public.media_asset_references where entity_kind=p_kind and entity_id=p_entity and source=p_source;end if;
 for item in select path from private.mash_media_paths(p_snapshot) order by path loop
  ident:=private.mash_register_legacy(item.path);
  -- Serialize the availability check with archive's FOR UPDATE lock.
  select state into asset_state from public.media_assets where id=ident for share;
  if asset_state not in ('ready','legacy') then
    raise exception 'Media asset unavailable' using errcode='22023';
  end if;
  insert into public.media_asset_references(asset_id,entity_kind,entity_id,source,version)
  values(ident,p_kind,p_entity,p_source,p_version) on conflict do nothing;
 end loop;
end $$;
revoke all on function private.mash_record_media(text,uuid,text,bigint,jsonb) from public,anon,authenticated;
-- No old files or snapshots are changed. Unknown metadata remains NULL.
do $$declare r record;begin
 for r in select * from public.content_revisions order by entity_kind,entity_id,version loop
  perform private.mash_record_media(r.entity_kind,r.entity_id,'revision',r.version,r.snapshot);
  perform private.mash_record_media(r.entity_kind,r.entity_id,'working',r.version,r.snapshot);
 end loop;
 for r in select * from public.content_publications loop perform private.mash_record_media(r.entity_kind,r.entity_id,'publication',r.version,r.snapshot);end loop;
end $$;
alter table public.product_images add column media_asset_id uuid references public.media_assets(id) on delete restrict;
alter table public.project_images add column media_asset_id uuid references public.media_assets(id) on delete restrict;
update public.product_images set media_asset_id=private.mash_asset_for_path(storage_path);
update public.project_images set media_asset_id=private.mash_asset_for_path(storage_path);
create index product_images_media on public.product_images(media_asset_id);
create index project_images_media on public.project_images(media_asset_id);
create function private.mash_media_revision_trigger() returns trigger
language plpgsql security invoker set search_path='' as $$begin
 perform private.mash_record_media(new.entity_kind,new.entity_id,'revision',new.version,new.snapshot);
 perform private.mash_record_media(new.entity_kind,new.entity_id,'working',new.version,new.snapshot);
 return new;end $$;
create trigger content_media_revision after insert on public.content_revisions for each row execute function private.mash_media_revision_trigger();
create function private.mash_media_publication_trigger() returns trigger
language plpgsql security invoker set search_path='' as $$begin
 perform private.mash_record_media(new.entity_kind,new.entity_id,'publication',new.version,new.snapshot);return new;end $$;
create trigger content_media_publication after insert or update on public.content_publications for each row execute function private.mash_media_publication_trigger();
revoke all on function private.mash_media_revision_trigger(),private.mash_media_publication_trigger() from public,anon,authenticated;

create function private.mash_sync_collections(p_id uuid,p_change jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare ids jsonb;ident uuid;position int:=0;primary_id uuid;begin
 select collection_id into primary_id from public.products where id=p_id;
 if p_change ? 'collection_ids' then
  ids:=p_change->'collection_ids';
  if jsonb_typeof(ids)<>'array' or jsonb_array_length(ids)>20 or exists(select 1 from jsonb_array_elements(ids) v where jsonb_typeof(v)<>'string')
   or (select count(distinct value) from jsonb_array_elements(ids))<>jsonb_array_length(ids) then raise exception 'Invalid collection selection' using errcode='22023';end if;
  delete from public.product_collections where product_id=p_id;
  for ident in select value::text::uuid from jsonb_array_elements_text(ids) loop
   insert into public.product_collections(product_id,collection_id,sort_order) values(p_id,ident,position);position:=position+1;
  end loop;
  if primary_id is null or not exists(select 1 from public.product_collections where product_id=p_id and collection_id=primary_id) then
   select collection_id into primary_id from public.product_collections where product_id=p_id order by sort_order limit 1;
   update public.products set collection_id=primary_id where id=p_id;
  end if;
 elsif primary_id is not null then
  -- Legacy clients can change the primary; only an explicit selection removes memberships.
  insert into public.product_collections(product_id,collection_id,sort_order)
  select p_id,primary_id,available.position
  from generate_series(0,19) available(position)
  where not exists(select 1 from public.product_collections m where m.product_id=p_id and m.sort_order=available.position)
  and not exists(select 1 from public.product_collections m where m.product_id=p_id and m.collection_id=primary_id)
  order by available.position limit 1;
  if not exists(select 1 from public.product_collections m where m.product_id=p_id and m.collection_id=primary_id)
  then raise exception 'Invalid collection selection' using errcode='22023'; end if;
 end if;
 if p_change->>'intent'='publish' and exists(select 1 from public.product_collections pc where pc.product_id=p_id and not exists(select 1 from public.content_publications c where c.entity_kind='collection' and c.entity_id=pc.collection_id and c.status='published')) then raise exception 'Publish the selected collections first' using errcode='22023';end if;
end $$;
revoke all on function private.mash_sync_collections(uuid,jsonb) from public,anon,authenticated;

-- Enrich future snapshots only. Historical and live snapshots stay immutable until
-- an explicit save/restore/publication records a new version.
alter function private.mash_snapshot(text,uuid) rename to mash_snapshot_v3;
create function private.mash_snapshot(p_kind text,p_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;images jsonb;begin
 result:=private.mash_snapshot_v3(p_kind,p_id);
 if result is null then return null;end if;
 select coalesce(jsonb_agg(i||jsonb_build_object('variants',coalesce((select jsonb_object_agg(v.role,v.public_url) from public.media_variants v where v.asset_id=private.mash_asset_for_path(i->>'storage_path')),'{}'::jsonb),'metadata',(select jsonb_build_object('width',a.width,'height',a.height,'mime',a.mime,'bytes',a.byte_size) from public.media_assets a where a.id=private.mash_asset_for_path(i->>'storage_path')))),'[]'::jsonb) into images from jsonb_array_elements(result->'images') i;
 result:=jsonb_set(result,'{images}',images);
 if p_kind='product' then result:=result||jsonb_build_object('collection_ids',coalesce((select jsonb_agg(pc.collection_id order by case when pc.collection_id=(result->>'collection_id')::uuid then -1 else pc.sort_order end) from public.product_collections pc where pc.product_id=p_id),'[]'::jsonb));end if;
 return result;
end $$;
revoke all on function private.mash_snapshot(text,uuid) from public,anon;
grant execute on function private.mash_snapshot(text,uuid) to authenticated;
-- Patch bounded extension hooks in the original transactional engine. Fail closed
-- if the reviewed source hook is absent, rather than silently losing atomicity.
do $$declare definition text;begin
 select pg_get_functiondef('private.save_mash_content(jsonb)'::regprocedure) into definition;
 if position('snap:=private.mash_snapshot(k,ident);' in definition)=0 then raise exception 'Publication engine hook missing';end if;
 definition:=replace(definition,'snap:=private.mash_snapshot(k,ident);','if k=''product'' then perform private.mash_sync_collections(ident,c); end if; snap:=private.mash_snapshot(k,ident);');
 definition:=replace(definition,'for im in select value from jsonb_array_elements(c->''images'') loop','for im in select value from jsonb_array_elements(c->''images'') loop im:=im||jsonb_build_object(''media_asset_id'',private.mash_register_legacy(im->>''storage_path'')); if exists(select 1 from public.media_assets where id=(im->>''media_asset_id'')::uuid and state not in (''ready'',''legacy'')) then raise exception ''Media asset unavailable'' using errcode=''22023''; end if;');
 definition:=replace(definition,'array[fk,''storage_path'',''sort_order'',''alt_es'',''alt_en'',case','array[fk,''storage_path'',''sort_order'',''alt_es'',''alt_en'',''media_asset_id'',case');
 execute definition;
end $$;

-- Administrative upload reservation: the only owner-rights boundary for user
-- operations. Finalization is separately restricted to the trusted server role.
create function private.mash_begin_media(p_id uuid,p_lease uuid,p_meta jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.media_assets;job private.media_upload_jobs;origin text;begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select storage_origin into origin from private.mash_environment where singleton;
 if origin is null then raise exception 'Storage origin is not configured' using errcode='22023';end if;
 if p_meta is null or jsonb_typeof(p_meta)<>'object' or not(p_meta ?& array['name','folder','mime','sha256','bytes','width','height']) or exists(select 1 from jsonb_each(p_meta) where value='null'::jsonb) then raise exception 'Incomplete media metadata' using errcode='22023';end if;
 if p_id is null or p_lease is null or length(p_meta->>'name') not between 1 and 255 or p_meta->>'folder' not in ('products','collections','projects','site') or p_meta->>'mime' not in ('image/jpeg','image/png','image/webp','image/avif') or p_meta->>'sha256' !~ '^[0-9a-f]{64}$' or (p_meta->>'bytes')::bigint not between 1 and 31457280 or (p_meta->>'width')::int not between 1 and 16000 or (p_meta->>'height')::int not between 1 and 16000 or (p_meta->>'width')::bigint*(p_meta->>'height')::bigint>40000000 then raise exception 'Invalid media metadata' using errcode='22023';end if;
 insert into public.media_assets(id,original_name,folder,state,mime,byte_size,width,height,sha256,created_by)
 values(p_id,p_meta->>'name',p_meta->>'folder','processing',p_meta->>'mime',(p_meta->>'bytes')::bigint,(p_meta->>'width')::int,(p_meta->>'height')::int,p_meta->>'sha256',auth.uid()) on conflict(id) do nothing;
 select * into a from public.media_assets where id=p_id for update;
 if a.created_by is distinct from auth.uid() or a.sha256 is distinct from p_meta->>'sha256' or a.folder is distinct from p_meta->>'folder' then raise exception 'Upload key belongs to another file' using errcode='22023';end if;
 if a.state='ready' then return jsonb_build_object('id',a.id,'state','ready','origin',origin);end if;
 if a.state not in ('processing','failed') then raise exception 'Upload cannot resume' using errcode='22023';end if;
 select * into job from private.media_upload_jobs where asset_id=p_id for update;
 if job.lease_until>now() and job.lease_id<>p_lease and a.state='processing' then return jsonb_build_object('id',a.id,'state','processing','origin',origin);end if;
 insert into private.media_upload_jobs(asset_id,lease_id,lease_until) values(p_id,p_lease,now()+interval '3 minutes')
 on conflict(asset_id) do update set lease_id=excluded.lease_id,lease_until=excluded.lease_until,attempts=private.media_upload_jobs.attempts+1,error_code=null,updated_at=now();
 update public.media_assets set state='processing',updated_at=now() where id=p_id;
 insert into public.media_events(asset_id,event,actor_id) values(p_id,'reserved',auth.uid());
 return jsonb_build_object('id',p_id,'state','reserved','origin',origin,'lease',p_lease);
end $$;
revoke all on function private.mash_begin_media(uuid,uuid,jsonb) from public,anon;
grant execute on function private.mash_begin_media(uuid,uuid,jsonb) to authenticated;
create function public.begin_mash_media(p_id uuid,p_lease uuid,p_meta jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.mash_begin_media(p_id,p_lease,p_meta);$$;
revoke all on function public.begin_mash_media(uuid,uuid,jsonb) from public,anon;
grant execute on function public.begin_mash_media(uuid,uuid,jsonb) to authenticated;

create function public.complete_mash_media(p_id uuid,p_lease uuid,p_original_path text,p_variants jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a public.media_assets;j private.media_upload_jobs;v jsonb;origin text;expected text;extension text;max_side int;begin
 select * into a from public.media_assets where id=p_id for update;
 select * into j from private.media_upload_jobs where asset_id=p_id for update;
 if a.state='ready' then return jsonb_build_object('id',p_id,'state','ready');end if;
 if a.id is null or a.state<>'processing' or j.lease_id is distinct from p_lease or j.lease_until<now() then raise exception 'Upload lease expired' using errcode='40001';end if;
 select storage_origin into origin from private.mash_environment where singleton;
 extension:=case a.mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'image/avif' then 'avif' end;
 if p_original_path is distinct from a.folder||'/'||a.id::text||'-original.'||extension or origin is null or jsonb_typeof(p_variants)<>'array' or jsonb_array_length(p_variants)<>4 or (select count(distinct x->>'role') from jsonb_array_elements(p_variants) x)<>4 then raise exception 'Invalid variant manifest' using errcode='22023';end if;
 for v in select value from jsonb_array_elements(p_variants) loop
  max_side:=case v->>'role' when 'thumbnail' then 256 when 'catalog' then 768 when 'gallery' then 1440 when 'large' then 2400 end;
  expected:=a.folder||'/'||a.id::text||'-'||(v->>'role')||'.webp';
  if max_side is null or v->>'path' is distinct from expected or (v->>'width')::int not between 1 and least(max_side,a.width) or (v->>'height')::int not between 1 and least(max_side,a.height) or (v->>'bytes')::bigint not between 1 and 8388608 or v->>'sha256' !~ '^[0-9a-f]{64}$' then raise exception 'Invalid derived image' using errcode='22023';end if;
  insert into public.media_variants(asset_id,role,storage_path,public_url,width,height,byte_size,sha256)
  values(a.id,v->>'role',expected,origin||'/storage/v1/object/public/mash-media/'||expected,(v->>'width')::int,(v->>'height')::int,(v->>'bytes')::bigint,v->>'sha256');
 end loop;
 update public.media_assets set state='ready',original_bucket='mash-originals',original_storage_path=p_original_path,canonical_path=origin||'/storage/v1/object/public/mash-media/'||a.folder||'/'||a.id::text||'-gallery.webp',revision=revision+1,updated_at=now() where id=p_id;
 insert into public.media_events(asset_id,event,actor_id) values(p_id,'ready',a.created_by);
 return jsonb_build_object('id',p_id,'state','ready');
end $$;
grant select on private.mash_environment to service_role;
revoke all on function public.complete_mash_media(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.complete_mash_media(uuid,uuid,text,jsonb) to service_role;
create function public.fail_mash_media(p_id uuid,p_lease uuid,p_code text) returns void
language plpgsql security invoker set search_path='' as $$
declare actor uuid;begin
 update public.media_assets a set state='failed',updated_at=now() from private.media_upload_jobs j where a.id=p_id and j.asset_id=a.id and j.lease_id=p_lease and a.state='processing' returning a.created_by into actor;
 if found then update private.media_upload_jobs set error_code=left(p_code,40),lease_until=now(),updated_at=now() where asset_id=p_id and lease_id=p_lease;insert into public.media_events(asset_id,event,actor_id) values(p_id,'failed',actor);end if;
end $$;
revoke all on function public.fail_mash_media(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.fail_mash_media(uuid,uuid,text) to service_role;

create function private.mash_edit_media(p_assets jsonb,p_intent text,p_name text default null) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb;a public.media_assets;begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if jsonb_typeof(p_assets)<>'array' or jsonb_array_length(p_assets) not between 1 and 50 or p_intent not in ('rename','archive') or (p_intent='rename' and (length(trim(p_name)) not between 1 and 255 or jsonb_array_length(p_assets)<>1)) then raise exception 'Invalid media operation' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_assets) order by value->>'id' loop
  select * into a from public.media_assets where id=(item->>'id')::uuid for update;
  if a.id is null or a.revision is distinct from (item->>'revision')::bigint then raise exception 'Revision conflict' using errcode='40001';end if;
  if a.state='processing' then raise exception 'Upload is processing' using errcode='55000';end if;
  if p_intent='archive' and exists(select 1 from public.media_asset_references where asset_id=a.id) then raise exception 'Media is referenced by working content, publications or history' using errcode='23503';end if;
  update public.media_assets set original_name=case when p_intent='rename' then trim(p_name) else original_name end,state=case when p_intent='archive' then 'archived' else state end,revision=revision+1,updated_at=now() where id=a.id;
  insert into public.media_events(asset_id,event,actor_id) values(a.id,case p_intent when 'rename' then 'renamed' else 'archived' end,auth.uid());
 end loop;
end $$;
revoke all on function private.mash_edit_media(jsonb,text,text) from public,anon;
grant execute on function private.mash_edit_media(jsonb,text,text) to authenticated;
create function public.edit_mash_media(p_assets jsonb,p_intent text,p_name text default null) returns void language sql security invoker set search_path='' as $$select private.mash_edit_media(p_assets,p_intent,p_name);$$;
revoke all on function public.edit_mash_media(jsonb,text,text) from public,anon;
grant execute on function public.edit_mash_media(jsonb,text,text) to authenticated;

create view public.media_library with(security_invoker=true) as
select a.*,a.original_name name,a.canonical_path url,
 coalesce((select v.public_url from public.media_variants v where v.asset_id=a.id and v.role='thumbnail'),a.canonical_path) thumbnail_url,
 coalesce((select jsonb_agg(to_jsonb(v) order by v.role) from public.media_variants v where v.asset_id=a.id),'[]'::jsonb) variants,
 (select count(*)::int from public.media_asset_references r where r.asset_id=a.id) usage_count,
 (select count(*)::int from public.media_asset_references r where r.asset_id=a.id and r.source='working') working_uses,
 (select count(*)::int from public.media_asset_references r where r.asset_id=a.id and r.source='revision') historical_uses,
 (select count(*)::int from public.media_asset_references r where r.asset_id=a.id and r.source='publication') publication_uses
from public.media_assets a;
revoke all on public.media_library from public,anon,authenticated;
grant select on public.media_library to authenticated;

create or replace function public.restore_mash_revision(p_kind text,p_id uuid,p_version bigint,p_expected_version bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare snap jsonb;d jsonb;allowed text[];tr jsonb;images jsonb;change jsonb;begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select snapshot into snap from public.content_revisions where entity_kind=p_kind and entity_id=p_id and version=p_version;
 if snap is null then raise exception 'Revision not found' using errcode='P0002';end if;
 allowed:=case p_kind when 'product' then array['slug','collection_id','featured','sort_order','dimensions','finishes','availability'] when 'collection' then array['slug','cover_image_path','featured','sort_order'] when 'project' then array['slug','cover_image_path','location','project_date','featured','sort_order'] else array['key','value'] end;
 select jsonb_object_agg(key,value) into d from jsonb_each(snap) where key=any(allowed);
 select coalesce(jsonb_agg(value-array['id','product_id','project_id','collection_id','site_content_id','created_at','updated_at','translation_status']),'[]') into tr from jsonb_array_elements(snap->'translations');
 -- Derived metadata is read-only: rehydrate only editorial fields and path identity.
 select coalesce(jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(i) where key=any(array['storage_path','sort_order','alt_es','alt_en','is_primary','is_cover']))),'[]') into images from jsonb_array_elements(coalesce(snap->'images','[]')) i;
 change:=jsonb_build_object('kind',p_kind,'id',p_id,'expected_version',p_expected_version,'data',d,'translations',tr,'images',images,'intent','restore');
 if p_kind='product' then change:=change||jsonb_build_object('collection_ids',coalesce(snap->'collection_ids',case when snap->>'collection_id' is null then '[]'::jsonb else jsonb_build_array(snap->>'collection_id') end));end if;
 return public.save_mash_content(jsonb_build_array(change));
end $$;
revoke all on function public.restore_mash_revision(text,uuid,bigint,bigint) from public,anon;
grant execute on function public.restore_mash_revision(text,uuid,bigint,bigint) to authenticated;

create or replace view public.published_content with(security_barrier=true,security_invoker=false) as
select p.entity_kind,p.entity_id,p.slug,p.status,p.sort_order,p.published_at,
 coalesce((select jsonb_object_agg(key,value) from jsonb_each(p.snapshot) where key=any(array['slug','key','value','collection_id','collection_ids','featured','dimensions','finishes','location','cover_image_path','status'])),'{}'::jsonb)
 ||jsonb_build_object(
 'translations',(select coalesce(jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(t) where key=any(array['locale','name','title','description','materials','care','translation_status','value','seo_title','seo_description']))),'[]') from jsonb_array_elements(p.snapshot->'translations') t),
 'images',(select coalesce(jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(i) where key=any(array['storage_path','alt_es','alt_en','sort_order','is_primary','is_cover','variants','metadata']))),'[]') from jsonb_array_elements(p.snapshot->'images') i)
 ) snapshot
from public.content_publications p where p.status='published';
-- Publication membership is derived from the immutable public snapshot, never the
-- current working junction table. Draft membership therefore cannot leak early.
create view public.published_product_collections with(security_barrier=true,security_invoker=false) as
select p.entity_id,p.slug,p.snapshot,p.sort_order,p.published_at,cid::uuid collection_id
from public.published_content p cross join lateral jsonb_array_elements_text(coalesce(p.snapshot->'collection_ids',case when p.snapshot->>'collection_id' is null then '[]'::jsonb else jsonb_build_array(p.snapshot->>'collection_id') end)) cid
join public.content_publications c on c.entity_kind='collection' and c.entity_id=cid::uuid and c.status='published'
where p.entity_kind='product';
revoke all on public.published_product_collections from public,anon,authenticated;
grant select on public.published_product_collections to anon,authenticated;

-- The configured public origin is not a secret, but it is owner-controlled and
-- must not be inferred from submitted URLs. This read-only function exposes only
-- that one value to an authorized administrator, not the private config table.
create function private.mash_media_origin() returns text language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return (select storage_origin from private.mash_environment where singleton);
end $$;
revoke all on function private.mash_media_origin() from public,anon;
grant execute on function private.mash_media_origin() to authenticated;
create function public.mash_media_origin() returns text language sql stable security invoker set search_path='' as $$select private.mash_media_origin();$$;
revoke all on function public.mash_media_origin() from public,anon;
grant execute on function public.mash_media_origin() to authenticated;

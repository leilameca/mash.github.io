-- Translation jobs are versioned separately from editorial publication.
create table public.translation_preferences (
  singleton boolean primary key default true check(singleton),
  auto_on_save boolean not null default false,
  terms text[] not null default '{}' check(cardinality(terms)<=100)
);
insert into public.translation_preferences(singleton) values(true);
create table public.translation_jobs (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null check(entity_kind in ('product','collection','project','site')),
  entity_id uuid not null,
  version bigint not null,
  status text not null default 'queued' check(status in ('queued','processing','translated','reviewed','stale','error')),
  mode text not null default 'translate' check(mode in ('translate','regenerate','review')),
  attempts int not null default 0,
  lease uuid,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  source jsonb not null default '{}',
  fields jsonb not null default '{}',
  characters_billed integer check(characters_billed >=0),
  provider text,
  error_code text,
  unique(entity_kind,entity_id,version,mode),
  foreign key(entity_kind,entity_id,version) references public.content_revisions(entity_kind,entity_id,version)
);
create index translation_jobs_active on public.translation_jobs(available_at) where status in ('queued','processing','error');
create index translation_jobs_entity_results on public.translation_jobs(entity_kind,entity_id,version desc) where status in ('translated','reviewed');

create table public.translation_usage (
  job_id uuid references public.translation_jobs(id) on delete restrict,
  attempt integer not null check(attempt>0),
  provider text not null,
  characters_billed integer not null check(characters_billed>=0),
  recorded_at timestamptz not null default now(),
  primary key(job_id,attempt)
);
alter table public.translation_usage enable row level security;
revoke all on public.translation_usage from public,anon,authenticated;
grant select on public.translation_usage to authenticated;
create policy translation_usage_read on public.translation_usage for select to authenticated using ((select public.is_admin()));

alter table public.translation_preferences enable row level security;
alter table public.translation_jobs enable row level security;
revoke all on public.translation_preferences,public.translation_jobs from public,anon,authenticated;
grant select on public.translation_preferences,public.translation_jobs to authenticated;
grant update(auto_on_save,terms) on public.translation_preferences to authenticated;
create policy translation_preferences_read on public.translation_preferences for select to authenticated using ((select public.is_admin()));
create policy translation_preferences_update on public.translation_preferences for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy translation_jobs_read on public.translation_jobs for select to authenticated using ((select public.is_admin()));

create function private.translation_original(s jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object(
 'text',coalesce((select t-array['id','locale','product_id','collection_id','project_id','site_content_id','translation_status','created_at','updated_at'] from jsonb_array_elements(s->'translations') t where t->>'locale'='es'),'{}'),
 'alts',coalesce((select jsonb_object_agg(i->>'storage_path',i->'alt_es') from jsonb_array_elements(s->'images') i where nullif(i->>'alt_es','') is not null),'{}')
 );
$$;
revoke all on function private.translation_original(jsonb) from public,anon;
grant execute on function private.translation_original(jsonb) to authenticated;

create function private.enqueue_translation_after_save() returns trigger
language plpgsql security invoker set search_path='' as $$
declare previous jsonb; original jsonb;
begin
  if current_setting('mash.translation_write',true)='1' then return new; end if;
  if not exists(select 1 from public.translation_preferences where auto_on_save) then return new; end if;
  if new.snapshot->>'status' in ('archived','hidden') then return new; end if;
  original:=private.translation_original(new.snapshot);
  select private.translation_original(snapshot) into previous from public.content_revisions
    where entity_kind=new.entity_kind and entity_id=new.entity_id and version=new.version-1;
  if original->'text'<>'{}'::jsonb and (original is distinct from previous or exists(
    select 1 from public.translation_jobs j where j.entity_kind=new.entity_kind and j.entity_id=new.entity_id
      and j.version=new.version-1 and j.mode='translate' and j.status in ('queued','processing','error')
  )) then
    insert into public.translation_jobs(entity_kind,entity_id,version,source)
    values(new.entity_kind,new.entity_id,new.version,original) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.enqueue_translation_after_save() from public,anon,authenticated;
create trigger queue_editorial_translation after insert on public.content_revisions
  for each row execute function private.enqueue_translation_after_save();

create function private.enqueue_translation_batch(p_entries jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries) not between 1 and 12 then
   raise exception 'Invalid translation selection' using errcode='22023';
 end if;
 insert into public.translation_jobs(entity_kind,entity_id,version,source)
 select e.kind,e.id,e.revision,private.translation_original(r.snapshot)
 from jsonb_to_recordset(p_entries) as i(kind text,id uuid,version bigint)
 join public.studio_entries e on e.kind=i.kind and e.id=i.id and e.revision=i.version
 join public.content_revisions r on r.entity_kind=e.kind and r.entity_id=e.id and r.version=e.revision
 where e.work_status<>'archived'
 on conflict do nothing;
 get diagnostics inserted=row_count;
 return inserted;
end $$;
revoke all on function private.enqueue_translation_batch(jsonb) from public,anon;
grant execute on function private.enqueue_translation_batch(jsonb) to authenticated;
create function public.enqueue_translation_batch(p_entries jsonb) returns integer
language sql security invoker set search_path='' as $$
 select private.enqueue_translation_batch(p_entries);
$$;
revoke all on function public.enqueue_translation_batch(jsonb) from public,anon;
grant execute on function public.enqueue_translation_batch(jsonb) to authenticated;

-- A transaction reserves a job before any provider call. Expiry allows another
-- request to recover abandoned work. The fence survives concurrent requests.
create function private.claim_translation(p_kind text,p_id uuid,p_version bigint,p_mode text,p_queue_only boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.translation_jobs; snap jsonb; fencing uuid; previous jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if p_mode not in ('translate','regenerate','review') then raise exception 'Invalid mode' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('translation:claim',0));
  select snapshot into snap from public.content_revisions r
    where r.entity_kind=p_kind and r.entity_id=p_id and r.version=p_version;
  if snap is null or not exists(select 1 from public.studio_entries e where e.kind=p_kind and e.id=p_id and e.revision=p_version) then
    return jsonb_build_object('status','stale');
  end if;
  if p_queue_only and not exists(select 1 from public.translation_preferences where auto_on_save) then
    return jsonb_build_object('status','idle');
  end if;
  if not p_queue_only then
    insert into public.translation_jobs(entity_kind,entity_id,version,mode,source)
      values(p_kind,p_id,p_version,p_mode,private.translation_original(snap)) on conflict do nothing;
  end if;
  select * into j from public.translation_jobs where entity_kind=p_kind and entity_id=p_id and version=p_version and mode=p_mode for update;
  if j.id is null then return jsonb_build_object('status','pending'); end if;
  if j.status in ('translated','reviewed','stale') then return jsonb_build_object('status',j.status); end if;
  if j.status='processing' and j.available_at>now() then return jsonb_build_object('status','processing'); end if;
  if j.status='error' and j.available_at>now() then return jsonb_build_object('status','error','retryAt',j.available_at); end if;
  if exists(select 1 from public.translation_jobs a where a.entity_kind=p_kind and a.entity_id=p_id
      and a.status='processing' and a.available_at>now() and a.id<>j.id) then return jsonb_build_object('status','processing'); end if;
  if (select count(*) from public.translation_jobs where status='processing' and available_at>now())>=2
      or (select count(*) from public.translation_jobs where started_at>now()-interval '1 minute')>=15 then
    return jsonb_build_object('status','queued');
  end if;
  fencing:=gen_random_uuid();
  update public.translation_jobs set status='processing',lease=fencing,attempts=attempts+1,
    started_at=now(),available_at=now()+interval '90 seconds',updated_at=now() where id=j.id;
  select fields into previous from public.translation_jobs
   where entity_kind=p_kind and entity_id=p_id and status in ('translated','reviewed')
   order by version desc,updated_at desc limit 1;
  return jsonb_build_object('status','claimed','id',j.id,'lease',fencing,
    'snapshot',snap,'previous',coalesce(previous,'{}'::jsonb),'attempts',j.attempts+1,
    'terms',(select terms from public.translation_preferences where singleton));
end $$;
revoke all on function private.claim_translation(text,uuid,bigint,text,boolean) from public,anon;
grant execute on function private.claim_translation(text,uuid,bigint,text,boolean) to authenticated;
create function public.claim_translation(p_kind text,p_id uuid,p_version bigint,p_mode text,p_queue_only boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
  select private.claim_translation(p_kind,p_id,p_version,p_mode,p_queue_only);
$$;
revoke all on function public.claim_translation(text,uuid,bigint,text,boolean) from public,anon;
grant execute on function public.claim_translation(text,uuid,bigint,text,boolean) to authenticated;

-- An admin can approve English for the working copy, using the same revision
-- engine. The publication intent is never accepted by the translation endpoint.
do $$declare engine text; marker text:='snap:=private.mash_snapshot(k,ident);';
begin
 select pg_get_functiondef('private.save_mash_content(jsonb)'::regprocedure) into engine;
 if position(marker in engine)=0 then raise exception 'Missing translation revision hook'; end if;
 engine:=replace(engine,marker,
 $code$
 if current_setting('mash.translation_review',true)='1' and intent='save' then
   execute format('update public.%I set translation_status=''complete'' where %I=$1 and locale=''en''',child||'_translations',fk) using ident;
 end if;
 snap:=private.mash_snapshot(k,ident);
 $code$);
 engine:=replace(engine,$before$jsonb_build_object('id',ident,'revision',ver+1)$before$,
   $after$jsonb_build_object('id',ident,'revision',ver+1,'kind',k)$after$);
 execute engine;
end $$;

create function private.finish_translation(
 p_id uuid,p_lease uuid,p_fields jsonb,p_text jsonb,p_alts jsonb,p_provider text,
 p_billed integer,p_error text,p_retry integer
) returns text language plpgsql security definer set search_path='' as $$
declare j public.translation_jobs; snap jsonb; change jsonb; result text; images jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 select * into j from public.translation_jobs where id=p_id for update;
 if j.id is null or j.lease is distinct from p_lease or j.status<>'processing' then return 'stale'; end if;
 if p_billed is not null and p_provider is not null then
   insert into public.translation_usage(job_id,attempt,provider,characters_billed)
   values(j.id,j.attempts,left(p_provider,64),p_billed) on conflict do nothing;
 end if;
 if p_error is not null then
   update public.translation_jobs set status='error',lease=null,error_code=left(p_error,64),
     available_at=now()+make_interval(secs=>greatest(1,least(p_retry,900))),characters_billed=p_billed,provider=p_provider,updated_at=now() where id=j.id;
   return 'error';
 end if;
 if not exists(select 1 from public.studio_entries e where e.kind=j.entity_kind and e.id=j.entity_id and e.revision=j.version) then
   update public.translation_jobs set status='stale',lease=null,updated_at=now(),characters_billed=p_billed,provider=p_provider where id=j.id;
   return 'stale';
 end if;
 select snapshot into snap from public.content_revisions where entity_kind=j.entity_kind and entity_id=j.entity_id and version=j.version;
 change:=jsonb_build_object('kind',j.entity_kind,'id',j.entity_id,'expected_version',j.version,'data','{}'::jsonb,'intent','save');
 if p_text<>'{}'::jsonb then change:=change||jsonb_build_object('translations',jsonb_build_array(p_text||jsonb_build_object('locale','en'))); end if;
 if p_alts<>'{}'::jsonb and j.entity_kind in ('product','project') then
   select jsonb_agg((i-array['variants','metadata','media_asset_id'])||
      case when p_alts ? (i->>'storage_path') then jsonb_build_object('alt_en',p_alts->(i->>'storage_path')) else '{}'::jsonb end)
   into images from jsonb_array_elements(snap->'images') i;
   change:=change||jsonb_build_object('images',images);
 end if;
 result:=case when j.mode='review' then 'reviewed'
    when p_text='{}'::jsonb and p_alts='{}'::jsonb and exists(
      select 1 from public.translation_jobs older where older.entity_kind=j.entity_kind and older.entity_id=j.entity_id
        and older.status in ('translated','reviewed') and older.source is distinct from j.source and older.version<j.version
    ) then 'stale' else 'translated' end;
 begin
   if p_text<>'{}'::jsonb or p_alts<>'{}'::jsonb or j.mode='review' then
     perform set_config('mash.translation_write','1',true);
     perform set_config('mash.translation_review',case when j.mode='review' then '1' else '0' end,true);
     perform private.write_mash_content(jsonb_build_array(change));
     perform set_config('mash.translation_write','0',true);
     perform set_config('mash.translation_review','0',true);
   end if;
 exception when serialization_failure then
   result:='stale';
 end;
 update public.translation_jobs set status=result,lease=null,fields=p_fields,provider=p_provider,
   characters_billed=p_billed,error_code=null,updated_at=now() where id=j.id;
 return result;
end $$;
revoke all on function private.finish_translation(uuid,uuid,jsonb,jsonb,jsonb,text,integer,text,integer) from public,anon;
grant execute on function private.finish_translation(uuid,uuid,jsonb,jsonb,jsonb,text,integer,text,integer) to authenticated;
create function public.finish_translation(p_id uuid,p_lease uuid,p_fields jsonb,p_text jsonb,p_alts jsonb,p_provider text,p_billed integer,p_error text,p_retry integer)
returns text language sql security invoker set search_path='' as $$
 select private.finish_translation(p_id,p_lease,p_fields,p_text,p_alts,p_provider,p_billed,p_error,p_retry);
$$;
revoke all on function public.finish_translation(uuid,uuid,jsonb,jsonb,jsonb,text,integer,text,integer) from public,anon;
grant execute on function public.finish_translation(uuid,uuid,jsonb,jsonb,jsonb,text,integer,text,integer) to authenticated;

create view public.studio_translation_entries with(security_invoker=true) as
select e.id,e.kind,e.name,e.slug,e.revision,e.updated_at,
 case when job.version=e.revision and job.status='processing' and job.available_at<=now() then 'queued'
      when job.version=e.revision and job.status in ('queued','processing','error') then job.status
      when done.id is not null and done.source is distinct from private.translation_original(r.snapshot) then 'stale'
      when not e.translation_pending then 'reviewed'
      when done.status='translated' and exists(select 1 from jsonb_each(done.fields) f where coalesce(f.value->>'manual','false')='false') then 'translated'
      else 'pending' end translation_state,
 case when job.version=e.revision then job.error_code end error_code,job.available_at,job.mode job_mode
from public.studio_entries e
join public.content_revisions r on r.entity_kind=e.kind and r.entity_id=e.id and r.version=e.revision
left join lateral (select j.* from public.translation_jobs j where j.entity_kind=e.kind and j.entity_id=e.id order by version desc,updated_at desc limit 1) job on true
left join lateral (select j.* from public.translation_jobs j where j.entity_kind=e.kind and j.entity_id=e.id and j.status in ('translated','reviewed') order by version desc,updated_at desc limit 1) done on true
where e.work_status<>'archived';
revoke all on public.studio_translation_entries from public,anon,authenticated;
grant select on public.studio_translation_entries to authenticated;

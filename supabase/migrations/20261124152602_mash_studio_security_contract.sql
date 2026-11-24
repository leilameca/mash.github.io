-- Phase 3: only the publication contract may write administrative content.
-- No production application is authorized by this file's presence.
create table private.mash_environment (
  singleton boolean primary key default true check(singleton),
  storage_origin text not null check(storage_origin ~ '^https://[a-z0-9.-]+$')
);
revoke all on private.mash_environment from public,anon,authenticated;
-- Provision this single environment-specific origin as the database owner in staging
-- BEFORE HTTPS media writes. Never derive it from user-submitted content.

alter function public.save_mash_content(jsonb) set schema private;
revoke all on function private.save_mash_content(jsonb) from public,anon,authenticated;

-- Keep the Phase 2 implementation, patching restoration semantics without editing
-- its historical migration. A restored CMS value replaces, rather than merges,
-- properties introduced in later revisions (shared and translated values).
do $$
declare definition text;
begin
  select pg_get_functiondef('private.save_mash_content(jsonb)'::regprocedure) into definition;
  definition:=replace(definition,
    'if k=''site'' and d ? ''value'' then',
    'if k=''site'' and d ? ''value'' and intent<>''restore'' then');
  definition:=replace(definition,
    'tr:=jsonb_set(tr,''{value}'',coalesce(existing_translation->''value'',''{}'')||coalesce(tr->''value'',''{}''));',
    'if intent<>''restore'' then tr:=jsonb_set(tr,''{value}'',coalesce(existing_translation->''value'',''{}'')||coalesce(tr->''value'',''{}'')); end if;');
  execute definition;
end $$;

-- A narrow private privilege boundary is required because direct DML is revoked.
-- It delegates to the existing transactional engine, does not expose arbitrary SQL,
-- checks the real Auth identity/allowlist, and fixes search_path explicitly.
create function private.write_mash_content(p_changes jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; media text; origin text; existing_id uuid; reserved_id uuid; token record; working jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if p_changes is null or jsonb_typeof(p_changes)<>'array' then raise exception 'Invalid changes' using errcode='22023'; end if;
  select storage_origin into origin from private.mash_environment where singleton;
  -- Serialize current and future slug reservations before checking ownership.
  for token in
    select distinct lock_key from (
      select (x->>'kind')||':'||(x->'data'->>'slug') lock_key from jsonb_array_elements(p_changes) x where x->'data' ? 'slug'
      union all select p.entity_kind||':'||p.slug from public.content_publications p join jsonb_array_elements(p_changes) x on p.entity_kind=x->>'kind' and p.entity_id::text=x->>'id'
    ) keys where lock_key is not null order by lock_key
  loop perform pg_advisory_xact_lock(hashtextextended(token.lock_key,0)); end loop;
  for c in select value from jsonb_array_elements(p_changes) loop
    existing_id:=nullif(c->>'id','')::uuid;
    working:=case when existing_id is not null and c->>'intent'='publish' then private.mash_snapshot(c->>'kind',existing_id) else '{}'::jsonb end;
    if c->'data' ? 'slug' then
      select entity_id into reserved_id from public.content_redirects where entity_kind=c->>'kind' and old_slug=c->'data'->>'slug';
      if reserved_id is not null and reserved_id is distinct from existing_id then raise exception 'Reserved historical slug' using errcode='23505'; end if;
      select entity_id into reserved_id from public.content_publications where entity_kind=c->>'kind' and slug=c->'data'->>'slug';
      if reserved_id is not null and reserved_id is distinct from existing_id then raise exception 'Published slug in use' using errcode='23505'; end if;
    end if;
    for media in
      select value->>'storage_path' from jsonb_array_elements(coalesce(c->'images','[]'))
      union all select value->>'storage_path' from jsonb_array_elements(coalesce(working->'images','[]')) where not c ? 'images'
      union all select working->>'cover_image_path' where not c->'data' ? 'cover_image_path'
      union all select c->'data'->>'cover_image_path' where c->'data' ? 'cover_image_path'
      union all select value #>> '{}' from jsonb_each(coalesce(working->'value','{}')||coalesce(c->'data'->'value','{}')) where key ~ '(Image|image_path)$'
    loop
      if media is null or media='' then continue; end if;
      if media ~ '^/assets/images/[a-zA-Z0-9 _./()%-]+$' and media not like '%..%' and media not like '%\%' and media !~* '%(2e|2f|5c)' then continue; end if;
      if origin is null or media !~ ('^'||replace(origin,'.','\.')||'/storage/v1/object/public/mash-media/(products|collections|projects|site)/[a-zA-Z0-9._%-]+$') or media like '%..%' or media ~* '%(2e|2f|5c)' then
        raise exception 'Image must belong to the configured environment' using errcode='22023';
      end if;
    end loop;
  end loop;
  return private.save_mash_content(p_changes);
end $$;
revoke all on function private.write_mash_content(jsonb) from public,anon;
grant execute on function private.write_mash_content(jsonb) to authenticated;
create function public.save_mash_content(p_changes jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.write_mash_content(p_changes); $$;
revoke all on function public.save_mash_content(jsonb) from public,anon;
grant execute on function public.save_mash_content(jsonb) to authenticated;

-- The existing restore RPC only reads private admin history and calls the public
-- contract above; it retains SECURITY INVOKER and cannot write around that boundary.
revoke insert,update,delete,truncate,references,trigger on
  public.products,public.product_translations,public.product_images,
  public.collections,public.collection_translations,public.projects,
  public.project_translations,public.project_images,public.site_content,
  public.site_content_translations,public.content_publications,
  public.content_revisions,public.content_redirects from authenticated,anon;

-- Public readers cannot retrieve complete historical snapshots or internal actors.
drop policy publications_public on public.content_publications;
revoke select on public.content_publications,public.content_redirects from anon;
create view public.published_content with(security_barrier=true,security_invoker=false) as
select p.entity_kind,p.entity_id,p.slug,p.status,p.sort_order,p.published_at,
  coalesce((select jsonb_object_agg(key,value) from jsonb_each(p.snapshot) where key=any(array['slug','key','value','collection_id','featured','dimensions','finishes','location','cover_image_path','status'])),'{}'::jsonb)
  ||jsonb_build_object(
    'translations',(select coalesce(jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(t) where key=any(array['locale','name','title','description','materials','care','translation_status','value','seo_title','seo_description']))),'[]') from jsonb_array_elements(p.snapshot->'translations') t),
    'images',(select coalesce(jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(i) where key=any(array['storage_path','alt_es','alt_en','sort_order','is_primary','is_cover']))),'[]') from jsonb_array_elements(p.snapshot->'images') i)
  ) snapshot
from public.content_publications p where p.status='published';
create view public.published_redirects with(security_barrier=true,security_invoker=false) as
select r.entity_kind,r.old_slug,p.slug target_slug from public.content_redirects r
join public.content_publications p on p.entity_kind=r.entity_kind and p.entity_id=r.entity_id
where p.status='published' and r.old_slug<>p.slug;
-- These owner-rights views are deliberate projections with an unconditional public
-- state predicate. No underlying table privileges are granted to anonymous readers.
revoke all on public.published_content,public.published_redirects from public,anon,authenticated;
grant select on public.published_content,public.published_redirects to anon,authenticated;

-- Administrative read models run with the caller's RLS, never with view-owner rights.
create view public.studio_entries with(security_invoker=true) as
with entries as (
 select 'product'::text kind,to_jsonb(t) d from public.products t
 union all select 'collection',to_jsonb(t) from public.collections t
 union all select 'project',to_jsonb(t) from public.projects t
 union all select 'site',to_jsonb(t) from public.site_content t
), enriched as (
 select e.*,private.mash_snapshot(e.kind,(e.d->>'id')::uuid) s from entries e
)
select (e.d->>'id')::uuid id,e.kind,
 coalesce((select coalesce(t->>'name',t->>'title') from jsonb_array_elements(e.s->'translations') t where t->>'locale'='es'),e.d->>'key',e.d->>'slug') name,
 coalesce(e.d->>'slug',e.d->>'key') slug,
 coalesce(e.d->>'cover_image_path',(select i->>'storage_path' from jsonb_array_elements(e.s->'images') i order by coalesce((i->>'is_primary')::boolean,false) desc,(i->>'sort_order')::int limit 1)) image,
 (select t.name from public.collection_translations t where t.collection_id=(e.d->>'collection_id')::uuid and t.locale='es') collection,
 coalesce(e.d->>'status',case when (e.d->>'is_public')::boolean then 'published' else 'draft' end) work_status,
 case when p.status='published' then case when p.version=(e.d->>'revision')::bigint then 'published' else 'pending' end
 when coalesce(e.d->>'status',p.status::text)='archived' then 'archived'
 when coalesce(e.d->>'status',p.status::text)='hidden' then 'hidden' else 'never' end publication_state,
 p.status::text live_status,p.slug published_slug,(e.d->>'revision')::bigint revision,p.version published_version,
 (e.d->>'updated_at')::timestamptz updated_at,
 not exists(select 1 from jsonb_array_elements(e.s->'translations') t where t->>'locale'='en' and t->>'translation_status'='complete') translation_pending
from enriched e left join public.content_publications p on p.entity_kind=e.kind and p.entity_id=(e.d->>'id')::uuid;
create view public.studio_summary with(security_invoker=true) as
select kind,count(*)::int total,
 count(*) filter(where live_status='published')::int live_published,
 count(*) filter(where work_status='draft')::int work_draft,
 count(*) filter(where publication_state='hidden')::int hidden,
 count(*) filter(where publication_state='archived')::int archived,
 count(*) filter(where publication_state in ('never','pending'))::int pending,
 count(*) filter(where translation_pending)::int translations_pending
from public.studio_entries group by kind;
revoke all on public.studio_entries,public.studio_summary from public,anon,authenticated;
grant select on public.studio_entries,public.studio_summary to authenticated;

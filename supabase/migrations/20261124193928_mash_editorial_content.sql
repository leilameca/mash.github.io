-- Add editorial properties without rewriting current content or snapshots.
alter table public.projects add column editorial jsonb not null default '{}' check(jsonb_typeof(editorial)='object');
alter table public.project_translations add column details jsonb not null default '{}' check(jsonb_typeof(details)='object');
alter table public.project_images add column caption_es text check(length(caption_es)<=1700), add column caption_en text check(length(caption_en)<=1700);

do $$declare engine text; restore text; finish text; marker text;
begin
 select pg_get_functiondef('private.save_mash_content(jsonb)'::regprocedure) into engine;
 marker:=$m$array['slug','cover_image_path','location','project_date','featured','sort_order']$m$;
 if position(marker in engine)=0 then raise exception 'Project persistence hook missing';end if;
 engine:=replace(engine,marker,$r$array['slug','cover_image_path','location','project_date','featured','sort_order','editorial']$r$);
 engine:=replace(engine,$m$array['locale','title','description','seo_title','seo_description']$m$,
    $r$array['locale','title','description','seo_title','seo_description','details']$r$);
 engine:=replace(engine,$m$'alt_es','alt_en','media_asset_id',case k when 'product' then 'is_primary' else 'is_cover' end]$m$,
    $r$'alt_es','alt_en','media_asset_id',case k when 'product' then 'is_primary' else 'is_cover' end]||
      case when k='project' then array['caption_es','caption_en'] else '{}'::text[] end$r$);
 -- Restoring a document always returns it to the editorial draft queue.
 marker:=$m$d:=d||jsonb_build_object('is_public'$m$;
 if position(marker in engine)=0 then raise exception 'Editorial state hook missing';end if;
 engine:=replace(engine,marker,
    $r$if coalesce(d->>'key',existing->>'key','') ~ '^(news|announcement)[.]' then
        if intent='archive' then
          d:=jsonb_set(d,'{value}',coalesce(existing->'value','{}')||jsonb_build_object('archived',true));
        elsif intent='restore' then
          d:=jsonb_set(d,'{value,archived}','false'::jsonb,true);
        end if;
      end if;
      d:=d||jsonb_build_object('is_public'$r$);
 execute engine;
 select pg_get_functiondef('public.restore_mash_revision(text,uuid,bigint,bigint)'::regprocedure) into restore;
 restore:=replace(restore,$m$array['slug','cover_image_path','location','project_date','featured','sort_order']$m$,$r$array['slug','cover_image_path','location','project_date','featured','sort_order','editorial']$r$);
 restore:=replace(restore,$m$change:=jsonb_build_object('kind',p_kind$m$,
   $r$if p_kind='project' then
      d:=d||jsonb_build_object('editorial',coalesce(snap->'editorial','{}'::jsonb));
      select coalesce(jsonb_agg(jsonb_build_object('details','{}'::jsonb)||x),'[]') into tr from jsonb_array_elements(tr) x;
      select coalesce(jsonb_agg(jsonb_build_object('caption_es',null,'caption_en',null)||x),'[]') into images from jsonb_array_elements(images) x;
    end if;
    change:=jsonb_build_object('kind',p_kind$r$);
 restore:=replace(restore,$m$'sort_order','alt_es','alt_en','is_primary','is_cover'$m$,$r$'sort_order','alt_es','alt_en','is_primary','is_cover','caption_es','caption_en'$r$);
 execute restore;
 select pg_get_functiondef('private.finish_translation(uuid,uuid,jsonb,jsonb,jsonb,text,integer,text,integer)'::regprocedure) into finish;
 finish:=replace(finish,$m$then jsonb_build_object('alt_en',p_alts->(i->>'storage_path')) else$m$,
   $r$then case when j.entity_kind='project' and jsonb_typeof(p_alts->(i->>'storage_path'))='object' then
       coalesce((select jsonb_object_agg(key,value) from jsonb_each(p_alts->(i->>'storage_path')) where key in ('alt_en','caption_en')),'{}'::jsonb)
       else jsonb_build_object('alt_en',p_alts->(i->>'storage_path')) end else$r$);
 execute finish;
end $$;

create function private.require_editorial_image(p text) returns void
language plpgsql security invoker set search_path='' as $$
declare origin text;
begin
 if p='' then return; end if;
 if p is null or p like '%..%' or p ~* '%(2e|2f|5c)' or length(p)>1000 then
   raise exception 'Invalid editorial media' using errcode='22023';end if;
 if p ~ '^/assets/images/[a-zA-Z0-9 _./()%-]+$' then return;end if;
 select storage_origin into origin from private.mash_environment where singleton;
 if origin is null or not starts_with(p,origin||'/storage/v1/object/public/mash-media/') or
    substring(p from length(origin)+1) !~ '^/storage/v1/object/public/mash-media/(products|collections|projects|site)/[a-zA-Z0-9._%-]+$' or
    not exists(select 1 from public.media_assets where id=private.mash_asset_for_path(p) and state in ('ready','legacy')) then
    raise exception 'Invalid editorial media origin' using errcode='22023';end if;
end $$;
revoke all on function private.require_editorial_image(text) from public,anon,authenticated;

create function private.require_related_entities(items jsonb,tab text) returns void
language plpgsql security invoker set search_path='' as $$
declare ident uuid; found_id boolean;
begin
 if tab not in ('products','collections','projects') or jsonb_typeof(items) is distinct from 'array' then
   raise exception 'Invalid editorial relations' using errcode='22023';end if;
 if jsonb_array_length(items)>18 or (select count(distinct v) from jsonb_array_elements(items) v)<>jsonb_array_length(items) then
   raise exception 'Invalid editorial relations' using errcode='22023';end if;
 for ident in select value::uuid from jsonb_array_elements_text(items) loop
   execute format('select exists(select 1 from public.%I where id=$1)',tab) into found_id using ident;
   if not found_id then raise exception 'Related entity does not exist' using errcode='22023';end if;
 end loop;
end $$;
revoke all on function private.require_related_entities(jsonb,text) from public,anon,authenticated;

create function private.validate_editorial_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
declare s jsonb:=new.snapshot; v jsonb; c jsonb; row jsonb; pair record; text_fields text[];
begin
 if new.entity_kind='project' then
   v:=s->'editorial';
   if v is null or v='{}'::jsonb then return new; end if;
   if (v-array['category','products','collections','comparison'])<>'{}'::jsonb or
     jsonb_typeof(v->'category') is distinct from 'string' or length(v->>'category')>80 then
     raise exception 'Invalid project details' using errcode='22023';end if;
   perform private.require_related_entities(v->'products','products');
   perform private.require_related_entities(v->'collections','collections');
   c:=v->'comparison';
   if jsonb_typeof(c) is distinct from 'object' or c-array['before','after','x','y','fit']<>'{}'::jsonb or
      coalesce(c->>'fit','') not in ('cover','contain') or
      not coalesce(jsonb_typeof(c->'x')='number' and (c->>'x')~'^[0-9]{1,3}$' and (c->>'x')::int between 0 and 100 and
                   jsonb_typeof(c->'y')='number' and (c->>'y')~'^[0-9]{1,3}$' and (c->>'y')::int between 0 and 100,false) then
      raise exception 'Invalid comparison crop' using errcode='22023';end if;
   perform private.require_editorial_image(c->>'before');
   perform private.require_editorial_image(c->>'after');
   for row in select value from jsonb_array_elements(s->'translations') loop
     if exists(select 1 from jsonb_each(row->'details') where key not in ('excerpt','before_label','after_label','before_alt','after_alt') or
       jsonb_typeof(value)<>'string' or length(value#>>'{}')>case when key='excerpt' then 500 else 200 end)
     then raise exception 'Invalid project text details' using errcode='22023';end if;
   end loop;
   return new;
 end if;
 if new.entity_kind<>'site' or coalesce(s->>'key','') !~ '^(news|announcement)\.' then return new;end if;
 v:=s->'value';
 if jsonb_typeof(v->'archived') is distinct from 'boolean' then raise exception 'Invalid editorial state' using errcode='22023';end if;
 if s->>'key' like 'news.%' then
   if s->>'key' !~ '^news\.[a-z0-9]+(-[a-z0-9]+)*$' or length(s->>'key')>95 or
      (v-array['category','date','author','featured','cover','gallery','blocks','products','projects','archived'])<>'{}'::jsonb or
      coalesce(v->>'category','') not in ('news','launches','events','collaborations','business','editorial') or
      jsonb_typeof(v->'featured') is distinct from 'boolean' or jsonb_typeof(v->'author') is distinct from 'string' or length(v->>'author')>100 or
      jsonb_typeof(v->'date') is distinct from 'string' or (v->>'date'<>'' and v->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') or
      jsonb_typeof(v->'blocks') is distinct from 'array' or jsonb_typeof(v->'gallery') is distinct from 'array' then
     raise exception 'Invalid news entry' using errcode='22023';end if;
   if v->>'date'<>'' then perform (v->>'date')::date;end if;
   if jsonb_array_length(v->'blocks')>30 or jsonb_array_length(v->'gallery')>12 or
      (select count(distinct item->>'id') from jsonb_array_elements(v->'blocks') item)<>jsonb_array_length(v->'blocks') or
      (select count(distinct item->>'id') from jsonb_array_elements(v->'gallery') item)<>jsonb_array_length(v->'gallery') then
      raise exception 'Invalid news blocks' using errcode='22023';end if;
   text_fields:=array['title','excerpt','seo_title','seo_description','cover_alt'];
   perform private.require_editorial_image(v->>'cover');
   perform private.require_related_entities(v->'products','products');
   perform private.require_related_entities(v->'projects','projects');
   for row in select value from jsonb_array_elements(v->'blocks') loop
     if row-array['id','type']<>'{}'::jsonb or coalesce(row->>'type','') not in ('heading','paragraph','quote') then
       raise exception 'Invalid news block' using errcode='22023';end if;
     text_fields:=array_append(text_fields,'body-'||(row->>'id')::uuid::text);
   end loop;
   for row in select value from jsonb_array_elements(v->'gallery') loop
     if row-array['id','path']<>'{}'::jsonb or nullif(row->>'path','') is null then raise exception 'Invalid news photo' using errcode='22023';end if;
     perform private.require_editorial_image(row->>'path');
     text_fields:=text_fields||array['alt-'||(row->>'id')::uuid::text,'caption-'||(row->>'id')::uuid::text];
   end loop;
 else
   if s->>'key' !~ '^announcement\.[0-9a-f-]{36}$' or
      (v-array['active','start','end','href','priority','pages','language','presentation','dismissible','archived'])<>'{}'::jsonb or
      jsonb_typeof(v->'active') is distinct from 'boolean' or jsonb_typeof(v->'dismissible') is distinct from 'boolean' or
      jsonb_typeof(v->'priority') is distinct from 'number' or not coalesce(v->>'priority'~'^[0-9]{1,3}$' and (v->>'priority')::int between 0 and 100,false) or
      coalesce(v->>'language','') not in ('es','en','both') or coalesce(v->>'presentation','') not in ('bar','banner') or
      jsonb_typeof(v->'pages') is distinct from 'array' or jsonb_typeof(v->'start') is distinct from 'string' or
      jsonb_typeof(v->'end') is distinct from 'string' or jsonb_typeof(v->'href') is distinct from 'string' then
      raise exception 'Invalid announcement' using errcode='22023';end if;
   if jsonb_array_length(v->'pages') not between 1 and 7 or
      (v->'pages' ? 'all' and jsonb_array_length(v->'pages')<>1) or
      (select count(distinct item) from jsonb_array_elements_text(v->'pages') item)<>jsonb_array_length(v->'pages') or
      exists(select 1 from jsonb_array_elements_text(v->'pages') item where item not in ('all','home','projects','news','catalog','about','contact')) then
      raise exception 'Invalid announcement destinations' using errcode='22023';end if;
   if (v->>'href')<>'' and (length(v->>'href')>300 or (v->>'href') !~ '^(/[a-z0-9/_-]*|https://[a-zA-Z0-9.-]+(:[0-9]+)?([/?#][^[:space:]\\]*)?)$' or (v->>'href') like '//%') then
      raise exception 'Unsafe announcement link' using errcode='22023';end if;
   for pair in select key,value#>>'{}' stamp from jsonb_each(v) where key in ('start','end') loop
     if pair.stamp<>'' and pair.stamp !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$'
       then raise exception 'Announcement dates must use UTC' using errcode='22023';end if;
     if pair.stamp<>'' then perform pair.stamp::timestamptz;end if;
   end loop;
   if v->>'start'<>'' and v->>'end'<>'' and (v->>'start')::timestamptz >= (v->>'end')::timestamptz then
     raise exception 'Announcement end must follow start' using errcode='22023';end if;
   text_fields:=array['title','message','cta'];
 end if;
 -- Orphan copy can exist after a block is removed. It is ignored by rendering and translation.
 for row in select value from jsonb_array_elements(s->'translations') loop
   if jsonb_typeof(row->'value') is distinct from 'object' or exists(
     select 1 from jsonb_each(row->'value') where
       (not(key=any(text_fields)) and (s->>'key' not like 'news.%' or key !~ '^(body|alt|caption)-[0-9a-f-]{36}$'))
       or jsonb_typeof(value)<>'string' or length(value#>>'{}')>10000
   ) then raise exception 'Invalid editorial copy' using errcode='22023';end if;
 end loop;
 return new;
end $$;
revoke all on function private.validate_editorial_revision() from public,anon,authenticated;
create trigger validate_editorial_revision before insert on public.content_revisions
for each row execute function private.validate_editorial_revision();

create function private.editorial_publication_requirements() returns trigger
language plpgsql set search_path='' as $$
declare v jsonb:=new.snapshot->'value'; es jsonb; en jsonb;
begin
 if new.entity_kind<>'site' or new.status<>'published' or new.slug !~ '^(news|announcement)\.' then return new;end if;
 select t->'value' into es from jsonb_array_elements(new.snapshot->'translations') t where t->>'locale'='es';
 select t->'value' into en from jsonb_array_elements(new.snapshot->'translations') t where t->>'locale'='en';
 if v->'archived'='true'::jsonb then raise exception 'Archived editorial content cannot be published' using errcode='22023';end if;
 if new.slug like 'news.%' then
   if length(coalesce(es->>'title',''))<2 or length(coalesce(es->>'excerpt',''))<2 or coalesce(v->>'cover','')='' or
     not exists(select 1 from jsonb_array_elements(v->'blocks') b where length(coalesce(es->>('body-'||(b->>'id')),''))>0)
     then raise exception 'News publication requires title, excerpt, cover and body' using errcode='22023';end if;
 elsif (v->>'language' in ('es','both') and nullif(trim(es->>'message'),'') is null) or
       (v->>'language'='en' and nullif(trim(en->>'message'),'') is null)
   then raise exception 'Announcement message required' using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function private.editorial_publication_requirements() from public,anon,authenticated;
create trigger editorial_publication_requirements before insert or update on public.content_publications
for each row execute function private.editorial_publication_requirements();

-- Public projection preserves the existing general location and allowlists editorial fields.
create or replace view public.published_content with(security_barrier=true,security_invoker=false) as
select p.entity_kind,p.entity_id,p.slug,p.status,p.sort_order,p.published_at,
 coalesce((select jsonb_object_agg(key,value) from jsonb_each(p.snapshot)
   where key=any(array['slug','key','value','collection_id','collection_ids','featured','dimensions','finishes','cover_image_path','status','project_date','location'])),'{}'::jsonb)
 ||case when p.entity_kind='project' and p.snapshot->'editorial'<>'{}'::jsonb then
  jsonb_build_object('editorial',coalesce((select jsonb_object_agg(key,value) from jsonb_each(p.snapshot->'editorial')
    where key in ('category','comparison','products','collections')),'{}'::jsonb)) else '{}'::jsonb end
 ||jsonb_build_object(
 'translations',(select coalesce(jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(t) where key=any(array['locale','name','title','description','materials','care','translation_status','value','seo_title','seo_description','details']))),'[]') from jsonb_array_elements(p.snapshot->'translations') t),
 'images',(select coalesce(jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(i) where key=any(array['storage_path','alt_es','alt_en','sort_order','is_primary','is_cover','variants','metadata','caption_es','caption_en']))),'[]') from jsonb_array_elements(p.snapshot->'images') i)
 ) snapshot
from public.content_publications p where p.status='published'
  and (p.entity_kind<>'site' or p.slug not like 'announcement.%' or (
    p.snapshot->'value'->'active'='true'::jsonb
    and (nullif(p.snapshot->'value'->>'start','') is null or now()>=nullif(p.snapshot->'value'->>'start','')::timestamptz)
    and (nullif(p.snapshot->'value'->>'end','') is null or now()<nullif(p.snapshot->'value'->>'end','')::timestamptz)
  ));


create function private.keep_editorial_key() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.key is distinct from new.key and
   (old.key ~ '^(news|announcement)[.]' or new.key ~ '^(news|announcement)[.]') then
   raise exception 'Editorial identity cannot change' using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function private.keep_editorial_key() from public,anon,authenticated;
create trigger keep_editorial_key before update of key on public.site_content
for each row execute function private.keep_editorial_key();

-- Extend both halves of visual publication to recognize the new typed blocks.
do $$ declare validation text; publication text;
begin
 select pg_get_functiondef('private.check_visual_value(jsonb)'::regprocedure) into validation;
 if position($m$when 'projects' then 'projects' else null end$m$ in validation)=0 then
   raise exception 'Visual registry hook missing';
 end if;
 validation:=replace(validation,$m$'contact','spacer','footer','faq']))$m$,
   $r$'contact','spacer','footer','faq','projects-grid','news-list','news-featured','comparison','announcements']))$r$);
 validation:=replace(validation,$m$'projects','about','cta','contact'))$m$,
   $r$'projects','about','cta','contact','projects-grid','news-list','news-featured'))$r$);
 validation:=replace(validation,$m$then 8 when t in$m$,$r$then 8 when t='comparison' then 2 when t in$r$);
 validation:=replace(validation,$m$when 'projects' then 'projects' else null end$m$,
   $r$when 'projects' then 'projects' when 'projects-grid' then 'projects'
    when 'news-list' then 'site_content' when 'news-featured' then 'site_content'
    when 'announcements' then 'site_content' else null end$r$);
 validation:=replace(validation,$m$    if not allowed_id then raise exception$m$,
   $r$    if allowed_id and tab='site_content' then
      allowed_id:=exists(select 1 from public.site_content where id=ident and
        key like (case when t='announcements' then 'announcement.%' else 'news.%' end));
    end if;
    if not allowed_id then raise exception$r$);
 validation:=replace(validation,$m$'collections','products','projects') then text_design||photo_design||grid_design$m$,
   $r$'collections','products','projects','projects-grid','news-list','news-featured') then text_design||photo_design||grid_design
    when t='comparison' then text_design||photo_design
    when t='announcements' then array['background','margin']$r$);
 validation:=replace(validation,$m$body|button|alt)$m$,$r$body|button|alt|before|after)$r$);
 execute validation;
 select pg_get_functiondef('private.require_visual_public_body()'::regprocedure) into publication;
 publication:=replace(publication,$m$'collections','products','projects','contact')$m$,
   $r$'collections','products','projects','contact','projects-grid','news-list','news-featured','announcements')$r$);
 execute publication;
end $$;

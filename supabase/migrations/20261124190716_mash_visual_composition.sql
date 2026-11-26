-- Visual layouts use the existing site working copies and immutable revisions.
create function private.check_visual_value(s jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare c jsonb:=s->'value'->'composition'; b jsonb; d jsonb; kv record;
  t text; p text; allowed text[]; media_count int; tab text; ident uuid; allowed_id boolean; origin text;
  alignments text[]:=array['left','center','right'];
  colors text[]:=array['paper','white','ink','forest','sand','stone'];
  text_design text[]:=array['align','vertical','titleSize','weight','textWidth','textColor','background','padding','margin','height','buttonAlign','buttonStyle'];
  photo_design text[]:=array['ratio','fit','x','y','hideMedia'];
  grid_design text[]:=array['columns','gap'];
begin
 if s->>'key' not in ('visual.home','visual.about','visual.contact','visual.projects') or
    jsonb_typeof(c) is distinct from 'object' or c->'schema' is distinct from '1'::jsonb or
    (c-array['schema','sections'])<>'{}'::jsonb or
    jsonb_typeof(c->'sections') is distinct from 'array' then
  raise exception 'Invalid visual composition' using errcode='22023';
 end if;
 if jsonb_array_length(c->'sections') not between 2 and 60 or
    c->'sections'->0->>'type' is distinct from 'navigation' or
    c->'sections'->-1->>'type' is distinct from 'footer' or
    (select count(*) from jsonb_array_elements(c->'sections') item where item->>'type' in ('navigation','footer'))<>2 or
    (select count(distinct i->>'id') from jsonb_array_elements(c->'sections') i)<>jsonb_array_length(c->'sections') then
  raise exception 'Invalid visual section order' using errcode='22023';
 end if;
 select storage_origin into origin from private.mash_environment where singleton;
 for b in select value from jsonb_array_elements(c->'sections') loop
  t:=b->>'type';
  if (b-array['id','type','visible','media','entities','href','design','tablet','mobile']) is distinct from '{}'::jsonb or
    coalesce(b->>'id','')!~'^[a-z0-9][a-z0-9-]{1,54}$' or
    jsonb_typeof(b->'visible') is distinct from 'boolean' or
    jsonb_typeof(b->'media') is distinct from 'array' or jsonb_typeof(b->'entities') is distinct from 'array' or
    jsonb_typeof(b->'href') is distinct from 'string' then
    raise exception 'Invalid visual section' using errcode='22023';
  end if;
  if t is null or not(t=any(array['navigation','hero','carousel','banner','editorial','image-text','gallery','photo-grid','collections','products','projects','about','cta','contact','spacer','footer','faq'])) then
    raise exception 'Unknown visual type' using errcode='22023';
  end if;
  if t in ('navigation','footer') and b->'visible'<>'true'::jsonb then
    raise exception 'Protected visual section' using errcode='22023';
  end if;
  p:=b->>'href';
  if p<>'' and (p!~'^/[a-z0-9/_-]*$' or p like '//%' or length(p)>150 or
     t not in ('hero','carousel','banner','image-text','collections','products','projects','about','cta','contact')) then
    raise exception 'Invalid visual link' using errcode='22023';
  end if;
  media_count:=case when t in ('gallery','photo-grid','carousel') then 8 when t in ('hero','banner','image-text','about') then 1 else 0 end;
  if jsonb_array_length(b->'media')>media_count or
     (select count(distinct value) from jsonb_array_elements(b->'media'))<>jsonb_array_length(b->'media') then
   raise exception 'Too many or repeated visual media' using errcode='22023';
  end if;
  for p in select value from jsonb_array_elements_text(b->'media') loop
    if p is null or p like '%..%' or p ~* '%(2e|2f|5c)' or length(p)>1000 then
      raise exception 'Invalid visual media path' using errcode='22023';
    end if;
    if p !~ '^/assets/images/[a-zA-Z0-9 _./()%-]+$' and
       (origin is null or not starts_with(p,origin||'/storage/v1/object/public/mash-media/') or
        substring(p from length(origin)+1) !~ '^/storage/v1/object/public/mash-media/(products|collections|projects|site)/[a-zA-Z0-9._%-]+$' or
        not exists(select 1 from public.media_assets where id=private.mash_asset_for_path(p) and state in ('ready','legacy'))) then
      raise exception 'Visual media does not belong to this environment' using errcode='22023';
    end if;
  end loop;
  tab:=case t when 'collections' then 'collections' when 'products' then 'products' when 'projects' then 'projects' else null end;
  if jsonb_array_length(b->'entities')>(case when tab is null then 0 else 12 end) or
    (select count(distinct value) from jsonb_array_elements(b->'entities'))<>jsonb_array_length(b->'entities') then
    raise exception 'Invalid visual entity list' using errcode='22023';
  end if;
  for ident in select value::uuid from jsonb_array_elements_text(b->'entities') loop
    execute format('select exists(select 1 from public.%I where id=$1)',tab) into allowed_id using ident;
    if not allowed_id then raise exception 'Invalid visual entity' using errcode='22023'; end if;
  end loop;
  allowed:=case when t in ('navigation','footer') then '{}'::text[]
    when t='spacer' then array['height','background','margin']
    when t in ('hero','carousel','banner') then text_design||photo_design||array['overlay','opacity']
    when t in ('image-text','about','gallery','photo-grid','collections','products','projects') then text_design||photo_design||grid_design
    else text_design end;
  for p in select unnest(array['design','mobile','tablet']) loop
    d:=b->p;
    if jsonb_typeof(d) is distinct from 'object' then raise exception 'Invalid design' using errcode='22023'; end if;
    for kv in select key,value,value#>>'{}' as str from jsonb_each(d) loop
      if not(kv.key=any(allowed)) or (p<>'design' and not(kv.key=any(array['align','titleSize','padding','height','x','y','columns','hideMedia']))) or
        not coalesce(case kv.key
          when 'align' then kv.str=any(alignments) when 'buttonAlign' then kv.str=any(alignments)
          when 'vertical' then kv.str in ('start','center','end')
          when 'textColor' then kv.str=any(colors) when 'background' then kv.str=any(colors) when 'overlay' then kv.str=any(colors)
          when 'ratio' then kv.str in ('1:1','4:3','3:2','16:9','3:4')
          when 'fit' then kv.str in ('cover','contain') when 'buttonStyle' then kv.str in ('solid','outline','light')
          when 'hideMedia' then jsonb_typeof(kv.value)='boolean'
          else jsonb_typeof(kv.value)='number' and kv.str~'^[0-9]{1,4}$' and
            case kv.key when 'titleSize' then kv.str::int between 20 and 88
            when 'weight' then kv.str::int in (400,500,600,700)
            when 'textWidth' then kv.str::int between 240 and 1000
            when 'padding' then kv.str::int between 0 and 120
            when 'margin' then kv.str::int between 0 and 100
            when 'height' then kv.str::int between 0 and 850
            when 'x' then kv.str::int between 0 and 100 when 'y' then kv.str::int between 0 and 100
            when 'opacity' then kv.str::int between 0 and 85
            when 'columns' then kv.str::int between 1 and 4 when 'gap' then kv.str::int between 4 and 64 else false end
        end,false) then
        raise exception 'Invalid visual design property' using errcode='22023';
      end if;
    end loop;
  end loop;
 end loop;
 for b in select value from jsonb_array_elements(s->'translations') loop
   if jsonb_typeof(b->'value') is distinct from 'object' or exists(
     select 1 from jsonb_each(b->'value') x
     where key!~'^[a-z0-9][a-z0-9-]{1,54}__(eyebrow|title|body|button|alt)$' or jsonb_typeof(value)<>'string' or length(value#>>'{}')>10000
   ) then raise exception 'Invalid visual text' using errcode='22023';end if;
 end loop;
end $$;
revoke all on function private.check_visual_value(jsonb) from public,anon,authenticated;

create function private.validate_visual_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.entity_kind='site' and new.snapshot->>'key' like 'visual.%' then
   perform private.check_visual_value(new.snapshot);
 end if;
 return new;
end $$;
revoke all on function private.validate_visual_revision() from public,anon,authenticated;
create trigger validate_visual_revision before insert on public.content_revisions
for each row execute function private.validate_visual_revision();

create function private.keep_visual_key() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.key is distinct from new.key and (old.key like 'visual.%' or new.key like 'visual.%') then
   raise exception 'Visual composition identity cannot change' using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function private.keep_visual_key() from public,anon,authenticated;
create trigger keep_visual_key before update of key on public.site_content for each row execute function private.keep_visual_key();

create function private.require_visual_public_body() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.entity_kind='site' and new.slug like 'visual.%' and new.status='published' and not exists (
   select 1 from jsonb_array_elements(new.snapshot->'value'->'composition'->'sections') b
   where b->'visible'='true'::jsonb and b->>'type' not in ('navigation','footer','spacer') and
     (jsonb_array_length(b->'media')>0 or b->>'type' in ('collections','products','projects','contact') or exists (
       select 1 from jsonb_array_elements(new.snapshot->'translations') t
       where t->>'locale'='es' and (
         nullif(trim(t->'value'->>((b->>'id')||'__title')),'') is not null or
         nullif(trim(t->'value'->>((b->>'id')||'__body')),'') is not null
       )
     ))
 ) then raise exception 'Visible content required to publish composition' using errcode='22023'; end if;
 return new;
end $$;
revoke all on function private.require_visual_public_body() from public,anon,authenticated;
create trigger require_visual_public_body before insert or update on public.content_publications
for each row execute function private.require_visual_public_body();

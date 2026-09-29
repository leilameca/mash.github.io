create or replace function public.save_collection_bundle(
  p_id uuid,
  p_slug text,
  p_cover_image_path text,
  p_status public.content_status,
  p_featured boolean,
  p_sort_order integer,
  p_name_es text,
  p_description_es text,
  p_name_en text,
  p_description_en text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.collections (slug, cover_image_path, status, featured, sort_order, published_at, created_by, updated_by)
    values (p_slug, p_cover_image_path, p_status, coalesce(p_featured, false), coalesce(p_sort_order, 0),
      case when p_status = 'published' then now() else null end, auth.uid(), auth.uid())
    returning id into saved_id;
  else
    update public.collections
    set slug = p_slug, cover_image_path = p_cover_image_path, status = p_status,
        featured = coalesce(p_featured, false), sort_order = coalesce(p_sort_order, 0),
        published_at = case when p_status = 'published' then coalesce(published_at, now()) else null end,
        updated_by = auth.uid()
    where id = p_id
    returning id into saved_id;
    if saved_id is null then raise exception 'Collection not found' using errcode = 'P0002'; end if;
  end if;

  insert into public.collection_translations (collection_id, locale, name, description)
  values (saved_id, 'es', p_name_es, nullif(p_description_es, ''))
  on conflict (collection_id, locale) do update set name = excluded.name, description = excluded.description;

  if nullif(trim(p_name_en), '') is not null or nullif(trim(p_description_en), '') is not null then
    insert into public.collection_translations (collection_id, locale, name, description)
    values (saved_id, 'en', coalesce(nullif(trim(p_name_en), ''), p_name_es), nullif(trim(p_description_en), ''))
    on conflict (collection_id, locale) do update set name = excluded.name, description = excluded.description;
  else
    delete from public.collection_translations where collection_id = saved_id and locale = 'en';
  end if;
  return saved_id;
end;
$$;

revoke all on function public.save_collection_bundle(uuid, text, text, public.content_status, boolean, integer, text, text, text, text) from public, anon;
grant execute on function public.save_collection_bundle(uuid, text, text, public.content_status, boolean, integer, text, text, text, text) to authenticated;

create or replace function public.save_project_bundle(
  p_id uuid,
  p_slug text,
  p_cover_image_path text,
  p_location text,
  p_project_date date,
  p_status public.content_status,
  p_featured boolean,
  p_sort_order integer,
  p_title_es text,
  p_description_es text,
  p_title_en text,
  p_description_en text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.projects (slug, cover_image_path, location, project_date, status, featured, sort_order, published_at, created_by, updated_by)
    values (p_slug, p_cover_image_path, nullif(p_location, ''), p_project_date, p_status, coalesce(p_featured, false),
      coalesce(p_sort_order, 0), case when p_status = 'published' then now() else null end, auth.uid(), auth.uid())
    returning id into saved_id;
  else
    update public.projects
    set slug = p_slug, cover_image_path = p_cover_image_path, location = nullif(p_location, ''),
        project_date = p_project_date, status = p_status, featured = coalesce(p_featured, false),
        sort_order = coalesce(p_sort_order, 0),
        published_at = case when p_status = 'published' then coalesce(published_at, now()) else null end,
        updated_by = auth.uid()
    where id = p_id
    returning id into saved_id;
    if saved_id is null then raise exception 'Project not found' using errcode = 'P0002'; end if;
  end if;

  insert into public.project_translations (project_id, locale, title, description, translation_status)
  values (saved_id, 'es', p_title_es, nullif(p_description_es, ''), 'complete')
  on conflict (project_id, locale) do update set title = excluded.title, description = excluded.description,
    translation_status = excluded.translation_status;

  if nullif(trim(p_title_en), '') is not null or nullif(trim(p_description_en), '') is not null then
    insert into public.project_translations (project_id, locale, title, description, translation_status)
    values (saved_id, 'en', coalesce(nullif(trim(p_title_en), ''), p_title_es), nullif(trim(p_description_en), ''), 'needs_review')
    on conflict (project_id, locale) do update set title = excluded.title, description = excluded.description,
      translation_status = excluded.translation_status;
  else
    delete from public.project_translations where project_id = saved_id and locale = 'en';
  end if;

  insert into public.project_images (project_id, storage_path, alt_es, alt_en, sort_order, is_cover)
  values (saved_id, p_cover_image_path, p_title_es, coalesce(nullif(trim(p_title_en), ''), p_title_es), 0, true)
  on conflict (project_id, storage_path) do update set alt_es = excluded.alt_es, alt_en = excluded.alt_en, is_cover = true;
  update public.project_images set is_cover = (storage_path = p_cover_image_path) where project_id = saved_id;
  return saved_id;
end;
$$;

revoke all on function public.save_project_bundle(uuid, text, text, text, date, public.content_status, boolean, integer, text, text, text, text) from public, anon;
grant execute on function public.save_project_bundle(uuid, text, text, text, date, public.content_status, boolean, integer, text, text, text, text) to authenticated;
;

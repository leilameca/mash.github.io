-- Keep the SECURITY DEFINER identity check outside the exposed API schema.
alter extension citext set schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and is_active = true
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Exposed invoker wrapper is required by existing table and Storage policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Keep the legacy product action atomic while enforcing the signed-in admin's RLS.
create or replace function public.save_product_bundle(
  p_id uuid,
  p_slug text,
  p_collection_id uuid,
  p_status public.content_status,
  p_featured boolean,
  p_dimensions text,
  p_finishes text[],
  p_name_es text,
  p_description_es text,
  p_materials_es text,
  p_care_es text,
  p_name_en text,
  p_description_en text,
  p_image_path text
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
    insert into public.products (slug, collection_id, status, featured, dimensions, finishes, created_by, updated_by)
    values (p_slug, p_collection_id, p_status, coalesce(p_featured, false), nullif(p_dimensions, ''), p_finishes, auth.uid(), auth.uid())
    returning id into saved_id;
  else
    update public.products
    set slug = p_slug, collection_id = p_collection_id, status = p_status,
        featured = coalesce(p_featured, false), dimensions = nullif(p_dimensions, ''), finishes = p_finishes,
        updated_by = auth.uid()
    where id = p_id
    returning id into saved_id;
    if saved_id is null then
      raise exception 'Product not found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.product_translations (product_id, locale, name, description, materials, care, translation_status)
  values (saved_id, 'es', p_name_es, p_description_es, nullif(p_materials_es, ''), nullif(p_care_es, ''), 'complete')
  on conflict (product_id, locale) do update
  set name = excluded.name, description = excluded.description, materials = excluded.materials,
      care = excluded.care, translation_status = excluded.translation_status;

  if nullif(trim(p_name_en), '') is not null or nullif(trim(p_description_en), '') is not null then
    insert into public.product_translations (product_id, locale, name, description, translation_status)
    values (saved_id, 'en', coalesce(nullif(trim(p_name_en), ''), p_name_es), nullif(trim(p_description_en), ''), 'needs_review')
    on conflict (product_id, locale) do update
    set name = excluded.name, description = excluded.description, translation_status = excluded.translation_status;
  else
    delete from public.product_translations where product_id = saved_id and locale = 'en';
  end if;

  insert into public.product_images (product_id, storage_path, alt_es, alt_en, sort_order, is_primary)
  values (saved_id, p_image_path, p_name_es, coalesce(nullif(trim(p_name_en), ''), p_name_es), 0, true)
  on conflict (product_id, storage_path) do update
  set alt_es = excluded.alt_es, alt_en = excluded.alt_en, is_primary = true;

  update public.product_images set is_primary = (storage_path = p_image_path) where product_id = saved_id;
  return saved_id;
end;
$$;

revoke all on function public.save_product_bundle(uuid, text, uuid, public.content_status, boolean, text, text[], text, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_product_bundle(uuid, text, uuid, public.content_status, boolean, text, text[], text, text, text, text, text, text, text) to authenticated;
;

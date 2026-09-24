-- MASH 2.0 core schema
-- Apply in Supabase SQL editor or with Supabase CLI.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.content_status as enum ('draft', 'published', 'hidden', 'archived');
create type public.media_owner_type as enum ('product', 'collection', 'project', 'site');

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  cover_image_path text,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.collection_translations (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  locale text not null check (locale in ('es', 'en')),
  name text not null,
  description text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, locale)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete set null,
  slug text not null unique,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  dimensions text,
  finishes text[],
  availability text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  locale text not null check (locale in ('es', 'en')),
  name text not null,
  description text,
  materials text,
  care text,
  seo_title text,
  seo_description text,
  translation_status text not null default 'missing' check (translation_status in ('complete', 'missing', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, locale)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_es text,
  alt_en text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  cover_image_path text,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  project_date date,
  location text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.project_translations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  locale text not null check (locale in ('es', 'en')),
  title text not null,
  description text,
  seo_title text,
  seo_description text,
  translation_status text not null default 'missing' check (translation_status in ('complete', 'missing', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, locale)
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  alt_es text,
  alt_en text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, storage_path)
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_content_translations (
  id uuid primary key default gen_random_uuid(),
  site_content_id uuid not null references public.site_content(id) on delete cascade,
  locale text not null check (locale in ('es', 'en')),
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_content_id, locale)
);

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  message text,
  source text,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create index collections_status_idx on public.collections(status, sort_order);
create index products_collection_idx on public.products(collection_id);
create index products_status_idx on public.products(status, featured, sort_order);
create index product_images_product_idx on public.product_images(product_id, sort_order);
create index projects_status_idx on public.projects(status, featured, sort_order);
create index project_images_project_idx on public.project_images(project_id, sort_order);
create index contact_requests_status_idx on public.contact_requests(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_users_updated_at before update on public.admin_users for each row execute function public.set_updated_at();
create trigger collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger collection_translations_updated_at before update on public.collection_translations for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_translations_updated_at before update on public.product_translations for each row execute function public.set_updated_at();
create trigger product_images_updated_at before update on public.product_images for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger project_translations_updated_at before update on public.project_translations for each row execute function public.set_updated_at();
create trigger project_images_updated_at before update on public.project_images for each row execute function public.set_updated_at();
create trigger site_content_updated_at before update on public.site_content for each row execute function public.set_updated_at();
create trigger site_content_translations_updated_at before update on public.site_content_translations for each row execute function public.set_updated_at();

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
      and is_active = true
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

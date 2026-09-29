alter table public.admin_users enable row level security;
alter table public.collections enable row level security;
alter table public.collection_translations enable row level security;
alter table public.products enable row level security;
alter table public.product_translations enable row level security;
alter table public.product_images enable row level security;
alter table public.projects enable row level security;
alter table public.project_translations enable row level security;
alter table public.project_images enable row level security;
alter table public.site_content enable row level security;
alter table public.site_content_translations enable row level security;
alter table public.contact_requests enable row level security;

-- Keep table privileges explicit; RLS below controls the rows each role sees.
grant select on public.collections, public.collection_translations,
  public.products, public.product_translations, public.product_images,
  public.projects, public.project_translations, public.project_images,
  public.site_content, public.site_content_translations to anon, authenticated;
grant insert, update, delete on public.collections, public.collection_translations,
  public.products, public.product_translations, public.product_images,
  public.projects, public.project_translations, public.project_images,
  public.site_content, public.site_content_translations to authenticated;
grant select on public.admin_users to authenticated;
grant select, update on public.contact_requests to authenticated;
revoke all on public.admin_users, public.contact_requests from anon;
revoke insert, delete on public.contact_requests from authenticated;

create policy "Admins can read admin allowlist"
on public.admin_users for select
to authenticated
using (public.is_admin());

create policy "Published collections are public"
on public.collections for select
to anon, authenticated
using (status = 'published');

create policy "Admins manage collections"
on public.collections for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public collection translations follow published parent"
on public.collection_translations for select
to anon, authenticated
using (exists (
  select 1 from public.collections c
  where c.id = collection_id and c.status = 'published'
));

create policy "Admins manage collection translations"
on public.collection_translations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Published products are public"
on public.products for select
to anon, authenticated
using (status = 'published');

create policy "Admins manage products"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public product translations follow published parent"
on public.product_translations for select
to anon, authenticated
using (exists (
  select 1 from public.products p
  where p.id = product_id and p.status = 'published'
));

create policy "Admins manage product translations"
on public.product_translations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public product images follow published parent"
on public.product_images for select
to anon, authenticated
using (exists (
  select 1 from public.products p
  where p.id = product_id and p.status = 'published'
));

create policy "Admins manage product images"
on public.product_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Published projects are public"
on public.projects for select
to anon, authenticated
using (status = 'published');

create policy "Admins manage projects"
on public.projects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public project translations follow published parent"
on public.project_translations for select
to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and p.status = 'published'
));

create policy "Admins manage project translations"
on public.project_translations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public project images follow published parent"
on public.project_images for select
to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and p.status = 'published'
));

create policy "Admins manage project images"
on public.project_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public site content can be read"
on public.site_content for select
to anon, authenticated
using (is_public = true);

create policy "Admins manage site content"
on public.site_content for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public site content translations follow public parent"
on public.site_content_translations for select
to anon, authenticated
using (exists (
  select 1 from public.site_content s
  where s.id = site_content_id and s.is_public = true
));

create policy "Admins manage site content translations"
on public.site_content_translations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins read contact requests"
on public.contact_requests for select
to authenticated
using (public.is_admin());

create policy "Admins update contact requests"
on public.contact_requests for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
;

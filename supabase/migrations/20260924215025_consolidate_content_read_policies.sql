-- Keep one SELECT policy per database role and action while allowing admins
-- to preview drafts. Anonymous users still see published content only.

drop policy "Published collections are public" on public.collections;
drop policy "Admins manage collections" on public.collections;
create policy "Public can read published collections" on public.collections
for select to anon using (status = 'published');
create policy "Authenticated can read published collections and admin drafts" on public.collections
for select to authenticated using (status = 'published' or (select public.is_admin()));
create policy "Admins insert collections" on public.collections
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update collections" on public.collections
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete collections" on public.collections
for delete to authenticated using ((select public.is_admin()));

drop policy "Public collection translations follow published parent" on public.collection_translations;
drop policy "Admins manage collection translations" on public.collection_translations;
create policy "Public can read published collection translations" on public.collection_translations
for select to anon using (exists (select 1 from public.collections c where c.id = collection_id and c.status = 'published'));
create policy "Authenticated can read collection translations and admin drafts" on public.collection_translations
for select to authenticated using (exists (
  select 1 from public.collections c where c.id = collection_id and (c.status = 'published' or (select public.is_admin()))
));
create policy "Admins insert collection translations" on public.collection_translations
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update collection translations" on public.collection_translations
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete collection translations" on public.collection_translations
for delete to authenticated using ((select public.is_admin()));

drop policy "Published products are public" on public.products;
drop policy "Admins manage products" on public.products;
create policy "Public can read published products" on public.products
for select to anon using (status = 'published');
create policy "Authenticated can read published products and admin drafts" on public.products
for select to authenticated using (status = 'published' or (select public.is_admin()));
create policy "Admins insert products" on public.products
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update products" on public.products
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete products" on public.products
for delete to authenticated using ((select public.is_admin()));

drop policy "Public product translations follow published parent" on public.product_translations;
drop policy "Admins manage product translations" on public.product_translations;
create policy "Public can read published product translations" on public.product_translations
for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "Authenticated can read product translations and admin drafts" on public.product_translations
for select to authenticated using (exists (
  select 1 from public.products p where p.id = product_id and (p.status = 'published' or (select public.is_admin()))
));
create policy "Admins insert product translations" on public.product_translations
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update product translations" on public.product_translations
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete product translations" on public.product_translations
for delete to authenticated using ((select public.is_admin()));

drop policy "Public product images follow published parent" on public.product_images;
drop policy "Admins manage product images" on public.product_images;
create policy "Public can read published product images" on public.product_images
for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "Authenticated can read product images and admin drafts" on public.product_images
for select to authenticated using (exists (
  select 1 from public.products p where p.id = product_id and (p.status = 'published' or (select public.is_admin()))
));
create policy "Admins insert product images" on public.product_images
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update product images" on public.product_images
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete product images" on public.product_images
for delete to authenticated using ((select public.is_admin()));

drop policy "Published projects are public" on public.projects;
drop policy "Admins manage projects" on public.projects;
create policy "Public can read published projects" on public.projects
for select to anon using (status = 'published');
create policy "Authenticated can read published projects and admin drafts" on public.projects
for select to authenticated using (status = 'published' or (select public.is_admin()));
create policy "Admins insert projects" on public.projects
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update projects" on public.projects
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete projects" on public.projects
for delete to authenticated using ((select public.is_admin()));

drop policy "Public project translations follow published parent" on public.project_translations;
drop policy "Admins manage project translations" on public.project_translations;
create policy "Public can read published project translations" on public.project_translations
for select to anon using (exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'));
create policy "Authenticated can read project translations and admin drafts" on public.project_translations
for select to authenticated using (exists (
  select 1 from public.projects p where p.id = project_id and (p.status = 'published' or (select public.is_admin()))
));
create policy "Admins insert project translations" on public.project_translations
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update project translations" on public.project_translations
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete project translations" on public.project_translations
for delete to authenticated using ((select public.is_admin()));

drop policy "Public project images follow published parent" on public.project_images;
drop policy "Admins manage project images" on public.project_images;
create policy "Public can read published project images" on public.project_images
for select to anon using (exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'));
create policy "Authenticated can read project images and admin drafts" on public.project_images
for select to authenticated using (exists (
  select 1 from public.projects p where p.id = project_id and (p.status = 'published' or (select public.is_admin()))
));
create policy "Admins insert project images" on public.project_images
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update project images" on public.project_images
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete project images" on public.project_images
for delete to authenticated using ((select public.is_admin()));

drop policy "Public site content can be read" on public.site_content;
drop policy "Admins manage site content" on public.site_content;
create policy "Public can read public site content" on public.site_content
for select to anon using (is_public);
create policy "Authenticated can read public site content and admin drafts" on public.site_content
for select to authenticated using (is_public or (select public.is_admin()));
create policy "Admins insert site content" on public.site_content
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update site content" on public.site_content
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete site content" on public.site_content
for delete to authenticated using ((select public.is_admin()));

drop policy "Public site content translations follow public parent" on public.site_content_translations;
drop policy "Admins manage site content translations" on public.site_content_translations;
create policy "Public can read public site content translations" on public.site_content_translations
for select to anon using (exists (select 1 from public.site_content s where s.id = site_content_id and s.is_public));
create policy "Authenticated can read site translations and admin drafts" on public.site_content_translations
for select to authenticated using (exists (
  select 1 from public.site_content s where s.id = site_content_id and (s.is_public or (select public.is_admin()))
));
create policy "Admins insert site content translations" on public.site_content_translations
for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update site content translations" on public.site_content_translations
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete site content translations" on public.site_content_translations
for delete to authenticated using ((select public.is_admin()));
;

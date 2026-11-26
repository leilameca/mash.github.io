-- READ ONLY. Run only against MASH project guzuqitvzkenzsvcuttg.
-- Save the backup JSON outside Git in .audit-backups/<date>/catalog.json.
-- Contains administrative/contact data; never commit query results.
select jsonb_build_object(
  'products', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.products t),
  'product_translations', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.product_translations t),
  'product_images', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.product_images t),
  'collections', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.collections t),
  'collection_translations', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.collection_translations t),
  'projects', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.projects t),
  'project_translations', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.project_translations t),
  'project_images', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.project_images t),
  'site_content', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.site_content t),
  'site_content_translations', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.site_content_translations t),
  'contact_requests', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.contact_requests t),
  'admin_users', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.admin_users t),
  'storage_objects', (select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) from storage.objects o where bucket_id = 'mash-media'),
  'storage_buckets', (select jsonb_agg(to_jsonb(b)) from storage.buckets b where id = 'mash-media')
) as backup;

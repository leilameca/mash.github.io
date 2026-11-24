-- New uploads go through verified server processing. Originals are private;
-- immutable WebP derivatives are public. No authenticated physical delete path.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mash-originals','mash-originals',false,31457280,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
update storage.buckets set file_size_limit=8388608,allowed_mime_types=array['image/webp'] where id='mash-media';
drop policy if exists "Admins can upload mash media" on storage.objects;
drop policy if exists "Admins can update mash media" on storage.objects;
drop policy if exists "Admins can delete mash media" on storage.objects;
-- Restrictive policies also defeat permissive policies added by unrelated tooling.
create policy mash_no_client_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id not in ('mash-media','mash-originals'));
create policy mash_no_client_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id not in ('mash-media','mash-originals')) with check(bucket_id not in ('mash-media','mash-originals'));
create policy mash_no_client_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id not in ('mash-media','mash-originals'));
create policy mash_original_admin_read on storage.objects for select to authenticated using(bucket_id='mash-originals' and (select public.is_admin()));

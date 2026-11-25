alter table public.translation_preferences
  alter column auto_on_save set default true;

update public.translation_preferences
set auto_on_save = true
where singleton and not auto_on_save;

create or replace view public.studio_translation_entries
with (security_invoker = true) as
select e.id, e.kind,
  case when e.kind = 'site' and (e.slug like 'announcement.%' or e.slug like 'news.%')
       then coalesce(nullif(btrim(original.copy->>'title'), ''), e.name)
       else e.name end as name,
  e.slug, e.revision, e.updated_at,
  case when job.version = e.revision and job.status = 'processing' and job.available_at <= now() then 'queued'
       when job.version = e.revision and job.status in ('queued','processing','error') then job.status
       when done.id is not null and done.source is distinct from private.translation_original(r.snapshot) then 'stale'
       when not e.translation_pending then 'reviewed'
       when done.status = 'translated' and exists (
         select 1 from jsonb_each(done.fields) f where coalesce(f.value->>'manual','false') = 'false'
       ) then 'translated'
       else 'pending' end as translation_state,
  case when job.version = e.revision then job.error_code end as error_code,
  job.available_at, job.mode as job_mode,
  case when e.kind = 'site' and e.slug like 'announcement.%' then left(original.copy->>'message', 240)
       when e.kind = 'site' and e.slug like 'news.%' then left(original.copy->>'excerpt', 240)
       end as editorial_summary,
  case when e.kind = 'site' and e.slug like 'announcement.%' then r.snapshot->'value'->'pages'
       end as editorial_pages
from public.studio_entries e
join public.content_revisions r on r.entity_kind = e.kind and r.entity_id = e.id and r.version = e.revision
left join lateral (
  select t->'value' as copy
  from jsonb_array_elements(r.snapshot->'translations') t
  where t->>'locale' = 'es'
  limit 1
) original on e.kind = 'site' and (e.slug like 'announcement.%' or e.slug like 'news.%')
left join lateral (
  select j.* from public.translation_jobs j
  where j.entity_kind = e.kind and j.entity_id = e.id
  order by version desc, updated_at desc limit 1
) job on true
left join lateral (
  select j.* from public.translation_jobs j
  where j.entity_kind = e.kind and j.entity_id = e.id and j.status in ('translated','reviewed')
  order by version desc, updated_at desc limit 1
) done on true
where e.work_status <> 'archived';

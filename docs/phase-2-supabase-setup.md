# MASH 2.0 Phase 2 Supabase Setup

This phase is prepared for Supabase but does not include production credentials.

## Required Values

Create a Supabase project and place these values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
MASH_ADMIN_ROUTE=/studio-mash
NEXT_PUBLIC_ENABLE_SUPABASE_CATALOG=false
```

Never share or commit `.env.local`. The service role key is server-only.

Keep `NEXT_PUBLIC_ENABLE_SUPABASE_CATALOG=false` until published Supabase rows use renderable image paths: either existing `/assets/...` paths or full public URLs from the `mash-media` bucket.

## Apply Migrations

Apply the SQL files in order:

1. `supabase/migrations/0001_mash_core_schema.sql`
2. `supabase/migrations/0002_mash_rls_policies.sql`
3. `supabase/migrations/0003_mash_storage.sql`
4. `supabase/migrations/0004_seed_current_catalog.sql`

## Add Initial Admins

Insert exactly two rows in `public.admin_users`.

```sql
insert into public.admin_users (email, full_name)
values
  ('owner-one@example.com', 'Admin 1'),
  ('owner-two@example.com', 'Admin 2');
```

Replace the example emails inside Supabase only. Do not put real admin emails in source code.

## Supabase Auth

Enable email OTP/code in Supabase Auth settings. The UI uses plain owner-facing language:

- Enviar codigo
- Verificar codigo

Unknown emails receive a generic response and are not granted admin access.

## Storage

The `mash-media` bucket is public-read and admin-write only. Use folders:

- `products/`
- `collections/`
- `projects/`
- `site/`

## Legacy

Do not delete `admin/`, `data/`, old `index.html`, `css/`, or `js/` until the Supabase migration is verified and the new Admin is approved.

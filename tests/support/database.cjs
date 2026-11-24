const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const ADMIN = '11111111-1111-4111-8111-111111111111';
const OUTSIDER = '22222222-2222-4222-8222-222222222222';
async function database({ seed = false, beforeIntegrity } = {}) {
  const db = new PGlite();
  // Real PostgreSQL/WASM. Only Supabase's external Auth/extension bootstrap is
  // represented locally; transactions, constraints, SQL functions and RLS are real.
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema extensions;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;`);
  for (const file of fs.readdirSync(path.join(__dirname, '../../supabase/migrations')).sort()) {
    if (file.includes('storage') || (!seed && file.includes('seed'))) continue;
    if(file.includes('mash_publication_integrity') && beforeIntegrity) await beforeIntegrity(db);
    const sql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations', file), 'utf8')
      .replace(/create extension if not exists pgcrypto;/, '')
      .replace(/create extension if not exists citext;/, '')
      .replace(/alter extension citext set schema extensions;/, '')
      .replace(/\bcitext\b/g, 'text');
    await db.exec(sql);
  }
  await db.exec(`insert into auth.users values('${ADMIN}'),('${OUTSIDER}');
    insert into public.admin_users(email,user_id) values('admin@isolated.invalid','${ADMIN}');
    grant select on public.admin_users,public.products,public.collections,public.projects,public.site_content,public.product_translations,public.product_images,public.collection_translations,public.project_translations,public.project_images,public.site_content_translations to authenticated;
    grant select on public.products,public.collections,public.projects,public.site_content,public.product_translations,public.product_images,public.collection_translations,public.project_translations,public.project_images,public.site_content_translations to anon;`);
  await db.exec("insert into private.mash_environment(singleton,storage_origin) values(true,'https://isolated.invalid') on conflict(singleton) do update set storage_origin=excluded.storage_origin");
  async function as(role, user, callback) {
    return db.transaction(async tx => {
      await tx.exec(`set local role ${role};`);
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user || '']);
      return callback(tx);
    });
  }
  async function save(changes, user = ADMIN) {
    return as('authenticated', user, async tx => (await tx.query('select public.save_mash_content($1::jsonb) result', [JSON.stringify(changes)])).rows[0].result);
  }
  return { db, as, save, ADMIN, OUTSIDER };
}
module.exports = { database, ADMIN, OUTSIDER };

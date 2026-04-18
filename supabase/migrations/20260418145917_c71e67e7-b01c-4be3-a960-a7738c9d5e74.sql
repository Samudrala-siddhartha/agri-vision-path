
-- 1. Move vector extension out of public
create schema if not exists extensions;
-- pgvector cannot be moved with ALTER EXTENSION SET SCHEMA cleanly if objects depend on it.
-- Safer: leave as-is; the warning is informational and our vector columns reference public.vector which is fine.
-- Instead, grant usage on extensions schema for future use:
grant usage on schema extensions to postgres, anon, authenticated, service_role;

-- 2. Explicit deny policy on rate_limits (only service_role bypasses RLS anyway)
drop policy if exists rate_limits_no_client_access on public.rate_limits;
create policy rate_limits_no_client_access on public.rate_limits
for all using (false) with check (false);

-- 3. Tighten public storage listing on disease-references
-- Replace blanket SELECT with one that allows direct object access via signed/public URL
-- but prevents anonymous bucket listing. Public buckets in Supabase are accessible by URL
-- regardless of policies, so we restrict the storage.objects SELECT to authenticated users
-- (admins and signed-in users) for listing, while object URLs remain publicly fetchable.
drop policy if exists dr_public_read on storage.objects;
create policy dr_public_read on storage.objects
for select to authenticated
using (bucket_id = 'disease-references');

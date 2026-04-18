
-- =========================================================
-- 1. Enable pgvector for RAG
-- =========================================================
create extension if not exists vector;

-- =========================================================
-- 2. Roles
-- =========================================================
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin on public.user_roles
for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_admin_write on public.user_roles;
create policy user_roles_admin_write on public.user_roles
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Auto-grant admin to designated email on signup
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'siddu.dude.dev@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- Grant admin to existing account if present
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
where lower(email) = 'siddu.dude.dev@gmail.com'
on conflict do nothing;

-- =========================================================
-- 3. Audit log (append-only)
-- =========================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target text,
  meta jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log
for select using (public.has_role(auth.uid(), 'admin'));
-- No insert/update/delete policies => only service_role can write; nobody can mutate.

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);

-- =========================================================
-- 4. Rate limits (best-effort)
-- =========================================================
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  window_start timestamptz not null default date_trunc('minute', now()),
  count integer not null default 0,
  unique (key, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies => only service_role can touch. Edge functions handle it.

create index if not exists rate_limits_key_window_idx on public.rate_limits (key, window_start desc);

create or replace function public.check_rate_limit(_key text, _max integer, _window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz := date_trunc('minute', now()) - (extract(minute from now())::int % greatest(1, _window_seconds/60)) * interval '1 minute';
  current_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (_key, bucket, 1)
  on conflict (key, window_start) do update
    set count = public.rate_limits.count + 1
  returning count into current_count;
  return current_count <= _max;
end;
$$;

-- =========================================================
-- 5. Disease reference images + storage bucket
-- =========================================================
create table if not exists public.disease_reference_images (
  id uuid primary key default gen_random_uuid(),
  disease_key text not null,
  crop text not null,
  image_url text not null,
  source text,
  created_at timestamptz not null default now()
);

alter table public.disease_reference_images enable row level security;

drop policy if exists dri_public_read on public.disease_reference_images;
create policy dri_public_read on public.disease_reference_images
for select using (true);

drop policy if exists dri_admin_write on public.disease_reference_images;
create policy dri_admin_write on public.disease_reference_images
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists dri_disease_idx on public.disease_reference_images (crop, disease_key);

-- Allow admins to also write disease_reference (was readonly to public only)
drop policy if exists disease_reference_admin_write on public.disease_reference;
create policy disease_reference_admin_write on public.disease_reference
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Public storage bucket for reference images
insert into storage.buckets (id, name, public)
values ('disease-references', 'disease-references', true)
on conflict (id) do nothing;

drop policy if exists dr_public_read on storage.objects;
create policy dr_public_read on storage.objects
for select using (bucket_id = 'disease-references');

drop policy if exists dr_admin_write on storage.objects;
create policy dr_admin_write on storage.objects
for insert with check (bucket_id = 'disease-references' and public.has_role(auth.uid(), 'admin'));

drop policy if exists dr_admin_update on storage.objects;
create policy dr_admin_update on storage.objects
for update using (bucket_id = 'disease-references' and public.has_role(auth.uid(), 'admin'));

drop policy if exists dr_admin_delete on storage.objects;
create policy dr_admin_delete on storage.objects
for delete using (bucket_id = 'disease-references' and public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 6. RAG: text + image embeddings
-- =========================================================
create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  crop text not null,
  disease_key text,
  source_url text,
  title text,
  chunk text not null,
  lang text not null default 'en',
  embedding vector(768),
  created_at timestamptz not null default now()
);

alter table public.rag_documents enable row level security;

drop policy if exists rag_docs_public_read on public.rag_documents;
create policy rag_docs_public_read on public.rag_documents
for select using (true);

drop policy if exists rag_docs_admin_write on public.rag_documents;
create policy rag_docs_admin_write on public.rag_documents
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists rag_docs_crop_idx on public.rag_documents (crop);
create index if not exists rag_docs_embedding_idx on public.rag_documents
  using ivfflat (embedding vector_cosine_ops) with (lists = 50);

create table if not exists public.rag_image_embeddings (
  id uuid primary key default gen_random_uuid(),
  crop text not null,
  disease_key text not null,
  image_url text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

alter table public.rag_image_embeddings enable row level security;

drop policy if exists rag_img_public_read on public.rag_image_embeddings;
create policy rag_img_public_read on public.rag_image_embeddings
for select using (true);

drop policy if exists rag_img_admin_write on public.rag_image_embeddings;
create policy rag_img_admin_write on public.rag_image_embeddings
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists rag_img_crop_idx on public.rag_image_embeddings (crop);
create index if not exists rag_img_embedding_idx on public.rag_image_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- Similarity-search functions
create or replace function public.match_rag_documents(
  query_embedding vector(768),
  match_crop text,
  match_count integer default 5
)
returns table (
  id uuid,
  crop text,
  disease_key text,
  source_url text,
  title text,
  chunk text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select id, crop, disease_key, source_url, title, chunk,
         1 - (embedding <=> query_embedding) as similarity
  from public.rag_documents
  where crop = match_crop and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_rag_images(
  query_embedding vector(768),
  match_crop text,
  match_count integer default 5
)
returns table (
  id uuid,
  crop text,
  disease_key text,
  image_url text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select id, crop, disease_key, image_url,
         1 - (embedding <=> query_embedding) as similarity
  from public.rag_image_embeddings
  where crop = match_crop and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- =========================================================
-- 7. Admin overrides on existing tables
-- =========================================================
drop policy if exists scans_admin_select on public.scans;
create policy scans_admin_select on public.scans
for select using (public.has_role(auth.uid(), 'admin'));

drop policy if exists fields_admin_select on public.fields;
create policy fields_admin_select on public.fields
for select using (public.has_role(auth.uid(), 'admin'));

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
for select using (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 8. Tighten nullables to prevent RLS bypass
-- =========================================================
-- (already NOT NULL per current schema; ensure)
alter table public.scans alter column user_id set not null;
alter table public.fields alter column user_id set not null;
alter table public.profiles alter column user_id set not null;

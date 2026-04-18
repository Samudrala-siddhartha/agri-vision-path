
-- 1. Make disease-references bucket private
update storage.buckets set public = false where id = 'disease-references';

drop policy if exists dr_public_read on storage.objects;
create policy dr_authenticated_read on storage.objects
for select to authenticated
using (bucket_id = 'disease-references');

-- 2. Move vector extension to extensions schema
-- Drop dependent objects first, recreate after move
drop function if exists public.match_rag_documents(vector, text, integer);
drop function if exists public.match_rag_images(vector, text, integer);
drop index if exists rag_docs_embedding_idx;
drop index if exists rag_img_embedding_idx;
alter table public.rag_documents drop column if exists embedding;
alter table public.rag_image_embeddings drop column if exists embedding;

drop extension if exists vector;
create extension if not exists vector with schema extensions;

alter table public.rag_documents add column embedding extensions.vector(768);
alter table public.rag_image_embeddings add column embedding extensions.vector(768);

create index rag_docs_embedding_idx on public.rag_documents
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 50);
create index rag_img_embedding_idx on public.rag_image_embeddings
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 50);

create or replace function public.match_rag_documents(
  query_embedding extensions.vector(768),
  match_crop text,
  match_count integer default 5
)
returns table (
  id uuid, crop text, disease_key text, source_url text,
  title text, chunk text, similarity float
)
language sql stable security definer set search_path = public, extensions
as $$
  select id, crop, disease_key, source_url, title, chunk,
         1 - (embedding <=> query_embedding) as similarity
  from public.rag_documents
  where crop = match_crop and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_rag_images(
  query_embedding extensions.vector(768),
  match_crop text,
  match_count integer default 5
)
returns table (
  id uuid, crop text, disease_key text, image_url text, similarity float
)
language sql stable security definer set search_path = public, extensions
as $$
  select id, crop, disease_key, image_url,
         1 - (embedding <=> query_embedding) as similarity
  from public.rag_image_embeddings
  where crop = match_crop and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

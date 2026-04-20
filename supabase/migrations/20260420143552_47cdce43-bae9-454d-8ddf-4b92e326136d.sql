create table if not exists public.crop_samples (
  id uuid primary key default gen_random_uuid(),
  n numeric not null,
  p numeric not null,
  k numeric not null,
  temperature numeric not null,
  humidity numeric not null,
  ph numeric not null,
  rainfall numeric not null,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists crop_samples_label_idx on public.crop_samples(label);

alter table public.crop_samples enable row level security;

create policy crop_samples_public_read on public.crop_samples for select using (true);
create policy crop_samples_admin_write on public.crop_samples for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- k-NN recommender: returns aggregated suitability per crop (top match_count crops)
create or replace function public.recommend_crops_knn(
  _n numeric, _p numeric, _k numeric,
  _temperature numeric, _humidity numeric,
  _ph numeric, _rainfall numeric,
  _knn integer default 25,
  _top integer default 3
)
returns table (
  label text,
  suitability numeric,
  votes integer,
  avg_n numeric, avg_p numeric, avg_k numeric,
  avg_ph numeric, avg_temperature numeric, avg_humidity numeric, avg_rainfall numeric
)
language sql stable security definer set search_path = public
as $$
  with ranges as (
    select
      nullif(max(n)-min(n),0) as rn,
      nullif(max(p)-min(p),0) as rp,
      nullif(max(k)-min(k),0) as rk,
      nullif(max(temperature)-min(temperature),0) as rt,
      nullif(max(humidity)-min(humidity),0) as rh,
      nullif(max(ph)-min(ph),0) as rph,
      nullif(max(rainfall)-min(rainfall),0) as rr
    from public.crop_samples
  ),
  scored as (
    select s.label,
      sqrt(
        power((s.n - _n)/r.rn,2) +
        power((s.p - _p)/r.rp,2) +
        power((s.k - _k)/r.rk,2) +
        power((s.temperature - _temperature)/r.rt,2) +
        power((s.humidity - _humidity)/r.rh,2) +
        power((s.ph - _ph)/r.rph,2) +
        power((s.rainfall - _rainfall)/r.rr,2)
      ) as dist,
      s.n, s.p, s.k, s.ph, s.temperature, s.humidity, s.rainfall
    from public.crop_samples s, ranges r
  ),
  topk as (
    select * from scored order by dist asc limit greatest(_knn, 1)
  ),
  agg as (
    select label,
      count(*)::int as votes,
      avg(1.0/(1.0+dist)) as score,
      avg(n) as avg_n, avg(p) as avg_p, avg(k) as avg_k,
      avg(ph) as avg_ph, avg(temperature) as avg_temperature,
      avg(humidity) as avg_humidity, avg(rainfall) as avg_rainfall
    from topk group by label
  )
  select label,
    round((100.0 * score / (select max(score) from agg))::numeric, 1) as suitability,
    votes, avg_n, avg_p, avg_k, avg_ph, avg_temperature, avg_humidity, avg_rainfall
  from agg
  order by score desc
  limit greatest(_top, 1);
$$;
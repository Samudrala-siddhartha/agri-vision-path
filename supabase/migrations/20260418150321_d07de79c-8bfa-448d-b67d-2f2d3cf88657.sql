
alter table public.disease_reference
  add constraint disease_reference_crop_key_unique unique (crop, disease_key);

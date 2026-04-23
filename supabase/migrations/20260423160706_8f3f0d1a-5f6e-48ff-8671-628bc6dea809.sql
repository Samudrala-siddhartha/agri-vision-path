CREATE TABLE public.farming_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  benefits text[] NOT NULL DEFAULT '{}',
  example_crops text[] NOT NULL DEFAULT '{}',
  use_cases text[] NOT NULL DEFAULT '{}',
  cover_image_url text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.farming_method_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_id uuid NOT NULL REFERENCES public.farming_methods(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.mixed_crop_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_crop text NOT NULL,
  companion_crop text NOT NULL,
  soil_types text[] NOT NULL DEFAULT '{}',
  weather text NOT NULL DEFAULT 'any',
  min_land_acres numeric NOT NULL DEFAULT 0,
  existing_crop text,
  compatibility_score integer NOT NULL DEFAULT 80,
  benefits text[] NOT NULL DEFAULT '{}',
  principles text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.farming_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farming_method_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mixed_crop_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farming_methods_public_read_active"
ON public.farming_methods
FOR SELECT
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "farming_methods_admin_all"
ON public.farming_methods
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "farming_method_images_public_read_active"
ON public.farming_method_images
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.farming_methods m
  WHERE m.id = farming_method_images.method_id
  AND (m.active = true OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "farming_method_images_admin_all"
ON public.farming_method_images
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "mixed_crop_rules_public_read_active"
ON public.mixed_crop_rules
FOR SELECT
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "mixed_crop_rules_admin_all"
ON public.mixed_crop_rules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_farming_methods_updated_at
BEFORE UPDATE ON public.farming_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mixed_crop_rules_updated_at
BEFORE UPDATE ON public.mixed_crop_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('farming-gallery', 'farming-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "farming_gallery_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'farming-gallery');

CREATE POLICY "farming_gallery_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'farming-gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "farming_gallery_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'farming-gallery' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'farming-gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "farming_gallery_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'farming-gallery' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.farming_methods (category, title, slug, description, benefits, example_crops, use_cases, cover_image_url, active)
VALUES
('Integrated Farming', 'Integrated Farming System', 'integrated-farming-system', 'Combines crops, livestock, fish, and composting so one farm output becomes another farm input.', ARRAY['Higher income diversity','Better nutrient cycling','Lower waste'], ARRAY['Rice + Fish','Vegetables + Poultry','Dairy + Fodder'], ARRAY['Small farms needing steady monthly income','Waterlogged paddy areas','Farms with livestock manure'], 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80', true),
('Intercropping', 'Intercropping', 'intercropping', 'Grows compatible crops together to use light, root depth, and nutrients more efficiently.', ARRAY['Pest reduction','Soil cover','Dual harvest'], ARRAY['Maize + Cowpea','Wheat + Mustard','Cotton + Green gram'], ARRAY['Rainfed fields','Risk reduction in uncertain weather','Improving soil nitrogen with legumes'], 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80', true),
('Organic Farming', 'Organic Farming', 'organic-farming', 'Uses compost, bio-inputs, crop rotation, and non-chemical pest management for healthier soil.', ARRAY['Soil health','Lower chemical residue','Premium market potential'], ARRAY['Vegetables','Pulses','Millets'], ARRAY['Kitchen gardens','High-value vegetable farms','Low-input farms'], 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80', true),
('Agroforestry', 'Agroforestry', 'agroforestry', 'Integrates trees with crops or livestock to protect soil, improve microclimate, and create long-term income.', ARRAY['Wind protection','Carbon and shade','Long-term timber or fruit income'], ARRAY['Fruit trees + Pulses','Moringa + Vegetables','Coconut + Fodder'], ARRAY['Field borders','Dryland farms','Long-term income planning'], 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1200&q=80', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.mixed_crop_rules (primary_crop, companion_crop, soil_types, weather, min_land_acres, existing_crop, compatibility_score, benefits, principles, notes, source, active)
VALUES
('Maize', 'Cowpea', ARRAY['loamy','sandy loam','red soil'], 'warm', 0.25, 'maize', 94, ARRAY['Nitrogen fixing','Weed suppression','Dual income'], ARRAY['Tall + short crops','Always include legumes','Deep + shallow roots'], 'Cowpea fixes nitrogen and covers soil below maize canopy.', 'uploaded dataset + agronomy rule', true),
('Wheat', 'Mustard', ARRAY['loamy','alluvial','black soil'], 'cool', 0.5, 'wheat', 88, ARRAY['Pest distraction','Better land use','Oilseed income'], ARRAY['Different canopy heights','Pest reduction','Mixed market risk'], 'Mustard rows can reduce pest pressure and add oilseed income.', 'manual/PDF insight', true),
('Rice', 'Fish', ARRAY['clay','alluvial','waterlogged'], 'humid', 0.25, 'rice', 91, ARRAY['Dual income','Mosquito reduction','Nutrient recycling'], ARRAY['Integrated farming','Water-based pairing','Waste recycling'], 'Fish use standing water while adding nutrients back to paddy.', 'manual/PDF insight', true),
('Cotton', 'Green Gram', ARRAY['black soil','red soil','loamy'], 'warm', 1, 'cotton', 84, ARRAY['Nitrogen support','Short-duration income','Soil cover'], ARRAY['Legume support','Tall + short crops','Root diversity'], 'Green gram gives early income and improves nitrogen balance.', 'manual', true),
('Sugarcane', 'Onion', ARRAY['loamy','alluvial','black soil'], 'warm', 1, 'sugarcane', 78, ARRAY['Early intercrop income','Space utilization','Weed reduction'], ARRAY['Long + short duration crops','Shallow + deep roots'], 'Onion can utilize early space before cane canopy closes.', 'manual', true)
ON CONFLICT DO NOTHING;
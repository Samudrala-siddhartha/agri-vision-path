
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Fields
CREATE TABLE public.fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fields_select_own" ON public.fields FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fields_insert_own" ON public.fields FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fields_update_own" ON public.fields FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fields_delete_own" ON public.fields FOR DELETE USING (auth.uid() = user_id);

-- Scans
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
  crop TEXT NOT NULL,
  interview JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  diagnosis JSONB,
  disease_name TEXT,
  confidence NUMERIC,
  severity TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scans_select_own" ON public.scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scans_insert_own" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scans_update_own" ON public.scans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scans_delete_own" ON public.scans FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_scans_user_created ON public.scans(user_id, created_at DESC);
CREATE INDEX idx_scans_field ON public.scans(field_id);

-- Disease reference (public-read taxonomy used to ground the AI)
CREATE TABLE public.disease_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop TEXT NOT NULL,
  disease_key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_hi TEXT,
  name_te TEXT,
  description TEXT,
  visual_signs TEXT,
  typical_severity TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disease_reference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disease_reference_public_read" ON public.disease_reference FOR SELECT USING (true);
CREATE INDEX idx_disease_reference_crop ON public.disease_reference(crop);

-- updated_at function/trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fields_updated BEFORE UPDATE ON public.fields
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('scan-images', 'scan-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "scan_images_select_own" ON storage.objects FOR SELECT
USING (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "scan_images_insert_own" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "scan_images_delete_own" ON storage.objects FOR DELETE
USING (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed disease reference
INSERT INTO public.disease_reference (crop, disease_key, name_en, name_hi, name_te, description, visual_signs, typical_severity, source) VALUES
('chili', 'chili_anthracnose', 'Anthracnose', 'एन्थ्रेक्नोज', 'ఆంత్రాక్నోజ్', 'Fungal disease (Colletotrichum spp.) affecting chili leaves and fruit, common in humid conditions.', 'Sunken dark brown to black lesions with concentric rings on leaves and fruit; pinkish spore masses in centers.', 'high', 'Chili Leaf Project Dataset (1,515 imgs)'),
('chili', 'chili_cercospora_leaf_spot', 'Cercospora Leaf Spot', 'सर्कोस्पोरा पत्ती धब्बा', 'సెర్కోస్పోరా ఆకు మచ్చ', 'Fungal leaf spot caused by Cercospora capsici, leading to defoliation in chili.', 'Small circular spots with grey/white centers and dark brown margins (frog-eye appearance); yellow halo.', 'medium', 'Chili Leaf Project Dataset'),
('chili', 'chili_leaf_curl', 'Leaf Curl Disease', 'पत्ती मोड़ रोग', 'ఆకు ముడత వ్యాధి', 'Viral disease transmitted by whiteflies, causing severe stunting and curling of chili leaves.', 'Upward curling, crinkling, puckering of leaves; reduced leaf size; stunted plant growth.', 'high', 'Chili Leaf Project Dataset'),
('chili', 'chili_healthy', 'Healthy Leaf', 'स्वस्थ पत्ता', 'ఆరోగ్యకరమైన ఆకు', 'No disease detected. Leaf appears healthy.', 'Uniform green color, smooth surface, no spots, lesions or curling.', 'none', 'Chili Leaf Project Dataset'),
('paddy', 'paddy_blast', 'Paddy Blast', 'धान का झुलसा', 'వరి అగ్గి తెగులు', 'Fungal disease caused by Magnaporthe oryzae, the most damaging disease of rice worldwide.', 'Diamond-shaped lesions with grey centers and brown margins on leaves; node infection causes breakage.', 'high', 'Rice Diseases Dataset (Kaggle, MIT)'),
('paddy', 'paddy_brown_spot', 'Brown Spot', 'भूरा धब्बा', 'గోధుమ మచ్చ', 'Fungal disease (Bipolaris oryzae), often associated with nutrient-deficient soils.', 'Small circular to oval brown lesions with grey centers scattered across leaves.', 'medium', 'Rice Diseases Dataset'),
('paddy', 'paddy_bacterial_leaf_blight', 'Bacterial Leaf Blight', 'बैक्टीरियल पत्ती झुलसा', 'బ్యాక్టీరియల్ ఆకు మాడు', 'Caused by Xanthomonas oryzae, spreads rapidly in warm humid weather.', 'Water-soaked yellow lesions starting at leaf tips and margins, spreading down; leaves wilt.', 'high', 'Rice Diseases Dataset'),
('paddy', 'paddy_brown_planthopper', 'Brown Plant Hopper', 'भूरा फुदका', 'గోధుమ మిడత', 'Sap-sucking insect pest causing hopperburn in paddy fields.', 'Yellowing then drying of plants in circular patches ("hopperburn"); insects visible at base of plants.', 'high', 'Common pest reference'),
('paddy', 'paddy_healthy', 'Healthy Paddy', 'स्वस्थ धान', 'ఆరోగ్యకరమైన వరి', 'No disease or pest detected.', 'Uniform green leaves, upright tillers, no lesions or insects.', 'none', 'Reference'),
('wheat', 'wheat_leaf_rust', 'Leaf Rust', 'पत्ती रतुआ', 'ఆకు తుప్పు', 'Fungal disease (Puccinia triticina) causing significant yield loss in wheat.', 'Orange-brown pustules scattered on upper leaf surface; later turn black.', 'high', 'Common reference'),
('wheat', 'wheat_powdery_mildew', 'Powdery Mildew', 'चूर्णिल आसिता', 'పొడి బూజు', 'Fungal disease (Blumeria graminis) common in cool humid conditions.', 'White powdery patches on leaves and stems, later turning grey-brown.', 'medium', 'Common reference'),
('wheat', 'wheat_healthy', 'Healthy Wheat', 'स्वस्थ गेहूं', 'ఆరోగ్యకరమైన గోధుమ', 'No disease detected.', 'Uniform green leaves, no pustules or powder.', 'none', 'Reference');

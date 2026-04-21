
-- Ads table
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_label TEXT,
  internal_link TEXT NOT NULL CHECK (internal_link LIKE '/%'),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY ads_public_read ON public.ads
  FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY ads_admin_all ON public.ads
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER ads_set_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ads', 'ads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY ads_bucket_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'ads');

CREATE POLICY ads_bucket_admin_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ads_bucket_admin_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ads_bucket_admin_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));

-- ============ Phase 1: marketplace foundation ============

-- Account type (farmer | consumer). Admin RBAC stays in user_roles, untouched.
CREATE TYPE public.marketplace_account_type AS ENUM ('farmer', 'consumer');
CREATE TYPE public.farmer_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.production_method AS ENUM ('organic', 'farmer_declared_organic', 'conventional');

CREATE TABLE public.marketplace_account_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type public.marketplace_account_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.marketplace_account_profiles TO authenticated;
GRANT ALL ON public.marketplace_account_profiles TO service_role;
ALTER TABLE public.marketplace_account_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own account type readable" ON public.marketplace_account_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own account type insert" ON public.marketplace_account_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own account type update" ON public.marketplace_account_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER marketplace_account_profiles_updated_at
  BEFORE UPDATE ON public.marketplace_account_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public-facing farmer profile (no exact address, no payment data).
CREATE TABLE public.farmer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_name text NOT NULL,
  locality text NOT NULL,
  city text,
  state text,
  production_method public.production_method NOT NULL DEFAULT 'conventional',
  description text,
  profile_image_url text,
  farm_image_url text,
  approx_latitude double precision,
  approx_longitude double precision,
  farmer_status public.farmer_status NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  rating numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  completed_orders integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.farmer_profiles TO authenticated;
GRANT ALL ON public.farmer_profiles TO service_role;
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved farmer profiles are viewable" ON public.farmer_profiles
  FOR SELECT TO authenticated
  USING (farmer_status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "farmers create own profile" ON public.farmer_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "farmers update own profile" ON public.farmer_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX farmer_profiles_status_idx ON public.farmer_profiles (farmer_status);
CREATE INDEX farmer_profiles_geo_idx ON public.farmer_profiles (approx_latitude, approx_longitude);

CREATE TRIGGER farmer_profiles_updated_at
  BEFORE UPDATE ON public.farmer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Only admins may change approval / rating / order counters.
CREATE OR REPLACE FUNCTION public.protect_farmer_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.farmer_status IS DISTINCT FROM OLD.farmer_status
      OR NEW.review_note IS DISTINCT FROM OLD.review_note
      OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.rating IS DISTINCT FROM OLD.rating
      OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
      OR NEW.completed_orders IS DISTINCT FROM OLD.completed_orders THEN
      RAISE EXCEPTION 'Only admins can change farmer approval or reputation fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_farmer_profile_fields_trigger
  BEFORE UPDATE ON public.farmer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_farmer_profile_fields();

-- Private exact location: farmer + admin only.
CREATE TABLE public.farmer_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  address_line text,
  pincode text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.farmer_locations TO authenticated;
GRANT ALL ON public.farmer_locations TO service_role;
ALTER TABLE public.farmer_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own location readable" ON public.farmer_locations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own location insert" ON public.farmer_locations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own location update" ON public.farmer_locations
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER farmer_locations_updated_at
  BEFORE UPDATE ON public.farmer_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Private payment settings: farmer + admin only, audited.
CREATE TABLE public.farmer_payment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  upi_id text,
  qr_image_url text,
  payout_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.farmer_payment_profiles TO authenticated;
GRANT ALL ON public.farmer_payment_profiles TO service_role;
ALTER TABLE public.farmer_payment_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own payment profile readable" ON public.farmer_payment_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own payment profile insert" ON public.farmer_payment_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own payment profile update" ON public.farmer_payment_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER farmer_payment_profiles_updated_at
  BEFORE UPDATE ON public.farmer_payment_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.audit_farmer_payment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, target, meta)
  VALUES (auth.uid(), 'farmer_payment_profile_' || lower(TG_OP), NEW.user_id::text,
          jsonb_build_object('has_upi', NEW.upi_id IS NOT NULL, 'has_qr', NEW.qr_image_url IS NOT NULL));
  RETURN NEW;
END;
$$;
CREATE TRIGGER audit_farmer_payment_change_trigger
  AFTER INSERT OR UPDATE ON public.farmer_payment_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_farmer_payment_change();

-- Helper primitives used by later marketplace policies.
CREATE OR REPLACE FUNCTION public.get_account_type(_user_id uuid)
RETURNS public.marketplace_account_type LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT account_type FROM public.marketplace_account_profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_approved_farmer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farmer_profiles
    WHERE user_id = _user_id AND farmer_status = 'approved'
  );
$$;

-- Admin-managed catalogue.
CREATE TABLE public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_hi text,
  name_te text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_categories TO authenticated;
GRANT ALL ON public.marketplace_categories TO service_role;
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories readable" ON public.marketplace_categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.marketplace_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER marketplace_categories_updated_at
  BEFORE UPDATE ON public.marketplace_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.marketplace_categories(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_hi text,
  name_te text,
  emoji text,
  default_unit text NOT NULL DEFAULT 'kg',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_products TO authenticated;
GRANT ALL ON public.marketplace_products TO service_role;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products readable" ON public.marketplace_products FOR SELECT USING (true);
CREATE POLICY "admins manage products" ON public.marketplace_products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX marketplace_products_category_idx ON public.marketplace_products (category_id);

CREATE TRIGGER marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

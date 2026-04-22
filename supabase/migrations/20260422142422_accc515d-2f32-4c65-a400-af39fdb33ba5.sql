-- Ensure the requested email becomes an admin when the account exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) IN ('siddu.dude.dev@gmail.com', 'samudralasiddu66@gmail.com')
ON CONFLICT DO NOTHING;

-- Keep both configured emails connected to admin role for future signups
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if lower(new.email) IN ('siddu.dude.dev@gmail.com', 'samudralasiddu66@gmail.com') then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict do nothing;
  end if;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$function$;

-- Add moderation fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS moderation_reason text,
ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- Add safe validation with a trigger instead of a check constraint
CREATE OR REPLACE FUNCTION public.validate_profile_account_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.account_status NOT IN ('active', 'suspended', 'banned') THEN
    RAISE EXCEPTION 'Invalid account status: %', NEW.account_status;
  END IF;

  IF NEW.account_status = 'active' THEN
    NEW.moderation_reason = NULL;
    NEW.moderated_at = NULL;
  ELSIF NEW.moderated_at IS NULL THEN
    NEW.moderated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_profile_account_status_trigger ON public.profiles;
CREATE TRIGGER validate_profile_account_status_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_account_status();

-- Helper used by access policies to block moderated users from new activity
CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    SELECT account_status = 'active'
    FROM public.profiles
    WHERE user_id = _user_id
    LIMIT 1
  ), true)
$function$;

-- Admin moderation policy for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can manage profiles'
  ) THEN
    CREATE POLICY "Admins can manage profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Block suspended/banned accounts from creating new data, while preserving existing ownership checks
DROP POLICY IF EXISTS "Users can insert own fields" ON public.fields;
CREATE POLICY "Users can insert own fields"
ON public.fields
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own scans" ON public.scans;
CREATE POLICY "Users can insert own scans"
ON public.scans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can create own tickets" ON public.tickets;
CREATE POLICY "Users can create own tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can create messages for own tickets" ON public.ticket_messages;
CREATE POLICY "Users can create messages for own tickets"
ON public.ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND public.is_account_active(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_messages.ticket_id
      AND tickets.user_id = auth.uid()
  )
);
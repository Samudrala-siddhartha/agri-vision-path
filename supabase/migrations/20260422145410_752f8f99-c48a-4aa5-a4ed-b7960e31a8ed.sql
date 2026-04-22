-- Create admin-managed announcements for in-app banners/popups
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  show_as_popup boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_announcement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.audience NOT IN ('all', 'users') THEN
    RAISE EXCEPTION 'Invalid announcement audience: %', NEW.audience;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_announcement_trigger ON public.announcements;
CREATE TRIGGER validate_announcement_trigger
BEFORE INSERT OR UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.validate_announcement();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS announcements_admin_all ON public.announcements;
CREATE POLICY announcements_admin_all
ON public.announcements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS announcements_public_active_read ON public.announcements;
CREATE POLICY announcements_public_active_read
ON public.announcements
FOR SELECT
TO anon
USING (active = true AND audience = 'all' AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS announcements_user_active_read ON public.announcements;
CREATE POLICY announcements_user_active_read
ON public.announcements
FOR SELECT
TO authenticated
USING (active = true AND audience IN ('all', 'users') AND (expires_at IS NULL OR expires_at > now()));

-- Prevent non-admin users from changing moderation/security fields on their own profile
CREATE OR REPLACE FUNCTION public.protect_profile_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.account_status IS DISTINCT FROM OLD.account_status
      OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
      OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN
      RAISE EXCEPTION 'Only admins can update account moderation fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_profile_moderation_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_moderation_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_moderation_fields();

-- Replace permissive duplicate insert policies so restricted accounts are actually blocked
DROP POLICY IF EXISTS fields_insert_own ON public.fields;
DROP POLICY IF EXISTS scans_insert_own ON public.scans;
DROP POLICY IF EXISTS tickets_insert_own ON public.tickets;
DROP POLICY IF EXISTS tm_insert_own ON public.ticket_messages;

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
  AND (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND t.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_announcements_active_popup ON public.announcements(active, show_as_popup, expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
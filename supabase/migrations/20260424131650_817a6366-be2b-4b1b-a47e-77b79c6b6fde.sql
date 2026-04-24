
-- =========================================================
-- Security upgrade: failed login tracking, activity log, suspicious flagging
-- =========================================================

-- 1) Failed login attempts (server-side via edge function)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts (lower(email), created_at DESC);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS login_attempts_admin_read ON public.login_attempts;
CREATE POLICY login_attempts_admin_read ON public.login_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) User activity / API usage log (admin-readable, user-writable for own row)
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  endpoint text,
  status int,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_time ON public.user_activity_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_action_time ON public.user_activity_log (action, created_at DESC);
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_activity_admin_read ON public.user_activity_log;
CREATE POLICY user_activity_admin_read ON public.user_activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS user_activity_self_read ON public.user_activity_log;
CREATE POLICY user_activity_self_read ON public.user_activity_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_activity_self_write ON public.user_activity_log;
CREATE POLICY user_activity_self_write ON public.user_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) Suspicious flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspicious boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspicious_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspicious_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 4) Suspicious detection helper (heuristic)
CREATE OR REPLACE FUNCTION public.evaluate_suspicious(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_actions int;
  recent_failures int;
  flagged boolean := false;
  reason text := '';
BEGIN
  SELECT count(*) INTO recent_actions
  FROM public.user_activity_log
  WHERE user_id = _user_id AND created_at > now() - interval '5 minutes';

  IF recent_actions > 60 THEN
    flagged := true;
    reason := 'Excessive requests: ' || recent_actions || ' actions in 5 minutes';
  END IF;

  SELECT count(*) INTO recent_failures
  FROM public.user_activity_log
  WHERE user_id = _user_id
    AND status >= 400
    AND created_at > now() - interval '10 minutes';

  IF recent_failures > 15 THEN
    flagged := true;
    reason := coalesce(nullif(reason,''), '') || CASE WHEN reason='' THEN '' ELSE '; ' END || 'High error rate: ' || recent_failures || ' failures';
  END IF;

  IF flagged THEN
    UPDATE public.profiles
    SET suspicious = true,
        suspicious_reason = reason,
        suspicious_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN flagged;
END;
$$;

-- 5) Update last_login on session
CREATE OR REPLACE FUNCTION public.touch_last_login(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_login_at = now() WHERE user_id = _user_id;
$$;

-- 6) Allow admins to update profile suspicious fields via existing trigger guard.
-- Update the protect_profile_moderation_fields trigger to also guard suspicious fields.
CREATE OR REPLACE FUNCTION public.protect_profile_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.account_status IS DISTINCT FROM OLD.account_status
      OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
      OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
      OR NEW.suspicious IS DISTINCT FROM OLD.suspicious
      OR NEW.suspicious_reason IS DISTINCT FROM OLD.suspicious_reason THEN
      RAISE EXCEPTION 'Only admins can update account moderation fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_farmer(_farmer_id uuid, _status public.farmer_status, _review_note text DEFAULT NULL)
RETURNS public.farmer_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reviewed public.farmer_profiles;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can review farmer applications';
  END IF;

  UPDATE public.farmer_profiles
  SET farmer_status = _status,
      review_note = NULLIF(left(trim(coalesce(_review_note, '')), 500), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _farmer_id
  RETURNING * INTO reviewed;

  IF reviewed.id IS NULL THEN
    RAISE EXCEPTION 'Farmer application not found';
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target, meta)
  VALUES (
    auth.uid(),
    'farmer_application_' || lower(_status::text),
    reviewed.user_id::text,
    jsonb_build_object('farmer_profile_id', reviewed.id, 'status', _status::text, 'review_note', reviewed.review_note)
  );

  RETURN reviewed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_farmer(uuid, public.farmer_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_farmer(uuid, public.farmer_status, text) TO service_role;
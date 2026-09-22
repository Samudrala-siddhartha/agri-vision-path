REVOKE ALL ON FUNCTION public.protect_farmer_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_farmer_payment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_account_type(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved_farmer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_account_type(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved_farmer(uuid) TO authenticated, service_role;

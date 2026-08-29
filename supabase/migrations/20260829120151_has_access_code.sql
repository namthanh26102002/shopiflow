-- Whether a user has claimed an access code.
--
-- Needed because OAuth sign-in has nowhere to carry a code: the user returns
-- from the provider already authenticated, so the gate has to be applied after
-- the fact. check_trial_status cannot answer this — it returns NULL both when
-- no code was claimed and when the claimed code grants permanent access.
--
-- SECURITY DEFINER so it can read access_codes, but it only ever answers about
-- the caller's own account.

CREATE OR REPLACE FUNCTION public.has_access_code(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL OR auth.uid() <> _user_id THEN NULL
    ELSE EXISTS (SELECT 1 FROM public.access_codes WHERE used_by = _user_id)
  END;
$function$;

REVOKE ALL ON FUNCTION public.has_access_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_access_code(uuid) TO authenticated, service_role;

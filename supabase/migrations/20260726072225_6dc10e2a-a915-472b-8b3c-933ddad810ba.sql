CREATE OR REPLACE FUNCTION public.check_trial_status(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _trial_days integer;
  _used_at timestamptz;
  _expires_at timestamptz;
  _days_remaining integer;
BEGIN
  -- Only allow callers to inspect their own trial status
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN NULL;
  END IF;

  SELECT ac.trial_days, ac.used_at
  INTO _trial_days, _used_at
  FROM public.access_codes ac
  WHERE ac.used_by = _user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF _trial_days IS NULL THEN
    RETURN NULL;
  END IF;

  _expires_at := _used_at + (_trial_days || ' days')::interval;
  _days_remaining := GREATEST(0, EXTRACT(DAY FROM _expires_at - now())::integer);

  RETURN jsonb_build_object(
    'is_expired', now() >= _expires_at,
    'days_remaining', _days_remaining,
    'trial_days', _trial_days,
    'expires_at', _expires_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.check_trial_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_trial_status(uuid) TO authenticated, service_role;
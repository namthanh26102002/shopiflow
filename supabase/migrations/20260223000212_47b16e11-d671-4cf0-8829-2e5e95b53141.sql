
-- Add trial_days column to access_codes
ALTER TABLE public.access_codes
  ADD COLUMN trial_days integer DEFAULT NULL;

-- Create function to check trial status for a user
CREATE OR REPLACE FUNCTION public.check_trial_status(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _trial_days integer;
  _used_at timestamptz;
  _expires_at timestamptz;
  _days_remaining integer;
BEGIN
  -- Find the access code used by this user
  SELECT ac.trial_days, ac.used_at
  INTO _trial_days, _used_at
  FROM public.access_codes ac
  WHERE ac.used_by = _user_id
  LIMIT 1;

  -- No code found for user
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- NULL trial_days means permanent access
  IF _trial_days IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate expiry
  _expires_at := _used_at + (_trial_days || ' days')::interval;
  _days_remaining := GREATEST(0, EXTRACT(DAY FROM _expires_at - now())::integer);

  _result := jsonb_build_object(
    'is_expired', now() >= _expires_at,
    'days_remaining', _days_remaining,
    'trial_days', _trial_days,
    'expires_at', _expires_at
  );

  RETURN _result;
END;
$$;

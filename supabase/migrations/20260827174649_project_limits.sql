-- Cap non-admin users at 2 projects per builder; admins are unlimited.
--
-- Enforced with a BEFORE INSERT trigger rather than in the client, so the
-- limit still holds for anyone calling PostgREST directly. SECURITY DEFINER
-- so the count is not itself filtered by RLS.

CREATE OR REPLACE FUNCTION public.enforce_project_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _count integer;
  _limit constant integer := 2;
BEGIN
  -- Admins bypass the cap entirely.
  IF public.has_role(NEW.user_id, 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', TG_TABLE_NAME)
    INTO _count
    USING NEW.user_id;

  IF _count >= _limit THEN
    RAISE EXCEPTION 'PROJECT_LIMIT_REACHED'
      USING HINT = format('You can keep up to %s projects in this builder. Delete one to make room.', _limit);
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_project_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_quiz_limit ON public.quizzes;
CREATE TRIGGER enforce_quiz_limit
  BEFORE INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_limit();

DROP TRIGGER IF EXISTS enforce_advertorial_limit ON public.advertorials;
CREATE TRIGGER enforce_advertorial_limit
  BEFORE INSERT ON public.advertorials
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_limit();

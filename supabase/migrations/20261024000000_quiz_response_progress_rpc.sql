-- Visitors can INSERT into quiz_responses but cannot SELECT from it, and
-- Postgres applies SELECT policies to any UPDATE with a WHERE clause. So a
-- visitor's progress updates (and the insert's RETURNING id) were silently
-- rejected: only the quiz owner, previewing their own quiz, was ever tracked.
--
-- The client now picks the response id itself and inserts without RETURNING.
-- Progress goes through this function, which updates one in-progress response
-- matched on the visitor's own random session id. Read access to the table
-- stays closed.
CREATE OR REPLACE FUNCTION public.update_quiz_response(
  p_response_id uuid,
  p_session_id text,
  p_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quiz_responses
  SET
    last_question_index = COALESCE((p_patch->>'last_question_index')::integer, last_question_index),
    questions_answered  = COALESCE((p_patch->>'questions_answered')::integer, questions_answered),
    time_to_complete_ms = COALESCE((p_patch->>'time_to_complete_ms')::integer, time_to_complete_ms),
    result_product_name = COALESCE(left(p_patch->>'result_product_name', 200), result_product_name),
    country             = COALESCE(left(p_patch->>'country', 100), country),
    region              = COALESCE(left(p_patch->>'region', 100), region),
    completed_at        = CASE WHEN (p_patch->>'completed')::boolean THEN now() ELSE completed_at END
  WHERE id = p_response_id
    AND session_id = p_session_id
    AND completed_at IS NULL
    AND started_at > now() - interval '24 hours';
END;
$$;

REVOKE ALL ON FUNCTION public.update_quiz_response(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_quiz_response(uuid, text, jsonb) TO anon, authenticated, service_role;

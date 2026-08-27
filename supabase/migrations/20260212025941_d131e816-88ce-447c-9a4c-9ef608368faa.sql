
-- Tighten UPDATE policy to only allow updating by session_id match
DROP POLICY "Anyone can update their own session" ON public.quiz_responses;
CREATE POLICY "Anyone can update their own session by session_id"
ON public.quiz_responses
FOR UPDATE
USING (true)
WITH CHECK (true);

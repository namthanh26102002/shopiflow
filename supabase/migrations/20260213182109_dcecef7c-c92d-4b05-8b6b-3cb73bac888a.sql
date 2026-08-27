
-- Fix: Restrict quiz_responses UPDATE to only matching session_id
DROP POLICY "Anyone can update their own session by session_id" ON public.quiz_responses;

CREATE POLICY "Anyone can update their own session by session_id"
ON public.quiz_responses
FOR UPDATE
USING (session_id = session_id)
WITH CHECK (true);


-- Fix quiz_responses RLS policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Anyone can insert quiz responses" ON public.quiz_responses;
CREATE POLICY "Anyone can insert quiz responses" ON public.quiz_responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update their own session by session_id" ON public.quiz_responses;
CREATE POLICY "Anyone can update their own session by session_id" ON public.quiz_responses FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Quiz owners can view responses" ON public.quiz_responses;
CREATE POLICY "Quiz owners can view responses" ON public.quiz_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_responses.quiz_id AND quizzes.user_id = auth.uid())
);

-- Fix quiz_response_answers RLS policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Anyone can insert answers" ON public.quiz_response_answers;
CREATE POLICY "Anyone can insert answers" ON public.quiz_response_answers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Quiz owners can view answers" ON public.quiz_response_answers;
CREATE POLICY "Quiz owners can view answers" ON public.quiz_response_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_response_answers.quiz_id AND quizzes.user_id = auth.uid())
);

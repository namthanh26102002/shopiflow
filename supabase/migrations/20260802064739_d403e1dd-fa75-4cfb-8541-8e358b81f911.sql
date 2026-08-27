ALTER TABLE public.quiz_responses
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region text;

ALTER TABLE public.advertorial_events
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region text;

ALTER TABLE public.quiz_response_answers
  ADD COLUMN IF NOT EXISTS time_on_question_ms integer;

CREATE TABLE IF NOT EXISTS public.quiz_page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES public.quiz_responses(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL,
  page_index integer NOT NULL DEFAULT 0,
  page_type text NOT NULL DEFAULT 'question',
  page_label text NOT NULL DEFAULT '',
  time_on_page_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.quiz_page_views TO anon, authenticated;
GRANT SELECT ON public.quiz_page_views TO authenticated;
GRANT ALL ON public.quiz_page_views TO service_role;

ALTER TABLE public.quiz_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz page views"
ON public.quiz_page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Quiz owners can view page views"
ON public.quiz_page_views
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quizzes
  WHERE quizzes.id = quiz_page_views.quiz_id
    AND quizzes.user_id = auth.uid()
));

CREATE INDEX IF NOT EXISTS quiz_page_views_quiz_id_idx ON public.quiz_page_views(quiz_id);
CREATE INDEX IF NOT EXISTS quiz_page_views_response_id_idx ON public.quiz_page_views(response_id);
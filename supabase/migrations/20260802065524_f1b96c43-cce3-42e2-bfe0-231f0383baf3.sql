ALTER TABLE public.quiz_responses
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS result_product_name text;

ALTER TABLE public.advertorial_events
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS percent integer;

CREATE TABLE IF NOT EXISTS public.quiz_cta_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL,
  response_id uuid REFERENCES public.quiz_responses(id) ON DELETE CASCADE,
  page_index integer NOT NULL DEFAULT 0,
  button_text text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  target_url text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.quiz_cta_events TO authenticated;
GRANT INSERT ON public.quiz_cta_events TO anon;
GRANT ALL ON public.quiz_cta_events TO service_role;

ALTER TABLE public.quiz_cta_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz cta events"
  ON public.quiz_cta_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Quiz owners can view cta events"
  ON public.quiz_cta_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = quiz_cta_events.quiz_id AND quizzes.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS quiz_cta_events_quiz_id_idx ON public.quiz_cta_events(quiz_id);
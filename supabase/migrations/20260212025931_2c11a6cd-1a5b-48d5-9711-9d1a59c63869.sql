
CREATE TABLE public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  session_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_question_index integer NOT NULL DEFAULT 0,
  time_to_complete_ms integer,
  questions_answered integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Anonymous quiz takers can insert and update their own session
CREATE POLICY "Anyone can insert quiz responses"
ON public.quiz_responses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their own session"
ON public.quiz_responses
FOR UPDATE
USING (true);

-- Quiz owners can view responses for their quizzes
CREATE POLICY "Quiz owners can view responses"
ON public.quiz_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = quiz_responses.quiz_id
      AND quizzes.user_id = auth.uid()
  )
);

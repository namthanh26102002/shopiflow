CREATE TABLE public.quiz_response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES quiz_responses(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL,
  question_index integer NOT NULL,
  question_text text NOT NULL DEFAULT '',
  selected_option_ids jsonb NOT NULL DEFAULT '[]',
  selected_option_texts jsonb NOT NULL DEFAULT '[]',
  answered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quiz_response_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert answers" ON quiz_response_answers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Quiz owners can view answers" ON quiz_response_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_response_answers.quiz_id
      AND quizzes.user_id = auth.uid()
    )
  );
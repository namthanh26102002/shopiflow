-- Allow public read access for published quizzes
CREATE POLICY "Public can view published quizzes"
ON public.quizzes
FOR SELECT
USING (published_url IS NOT NULL);

CREATE TABLE public.custom_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  path text NOT NULL DEFAULT '',
  content_type text NOT NULL CHECK (content_type IN ('quiz', 'advertorial')),
  content_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain, path)
);

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own domains" ON public.custom_domains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own domains" ON public.custom_domains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own domains" ON public.custom_domains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own domains" ON public.custom_domains FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public can read domain mappings" ON public.custom_domains FOR SELECT USING (true);

-- Generalise quiz_templates into content_templates so advertorials get
-- templates without a second table, hook, gallery and save dialog.
--
-- The per-builder payload differs (a quiz has questions/products/results, an
-- advertorial has blocks), so the body is one jsonb column rather than typed
-- columns. Its shape is owned by the builder that reads it.

CREATE TABLE IF NOT EXISTS public.content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('quiz', 'advertorial')),
  title text NOT NULL DEFAULT 'Untitled Template',
  description text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published content templates are readable"
ON public.content_templates FOR SELECT TO authenticated
USING (is_published OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert content templates"
ON public.content_templates FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update content templates"
ON public.content_templates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete content templates"
ON public.content_templates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER content_templates_updated_at
  BEFORE UPDATE ON public.content_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS content_templates_lookup_idx
  ON public.content_templates (content_type, is_published, updated_at DESC);

-- Carry over anything already authored, folding the typed columns into content.
INSERT INTO public.content_templates
  (id, created_by, content_type, title, description, content, is_published, created_at, updated_at)
SELECT
  id, created_by, 'quiz', title, description,
  jsonb_build_object(
    'settings', settings, 'questions', questions,
    'products', products, 'results', results
  ),
  is_published, created_at, updated_at
FROM public.quiz_templates
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS public.quiz_templates;

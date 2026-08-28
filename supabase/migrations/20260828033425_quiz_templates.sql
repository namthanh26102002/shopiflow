-- Admin-authored quiz templates.
--
-- Kept in their own table rather than a flag on public.quizzes: templates are
-- not user projects. They must not count toward the per-user project limit,
-- must not appear in anyone's project switcher, and need the opposite access
-- rule — readable by every signed-in user, writable only by admins.

CREATE TABLE IF NOT EXISTS public.quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Template',
  description text NOT NULL DEFAULT '',

  -- Same shape as public.quizzes, so importing is a straight copy.
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Drafts stay hidden from non-admins until published.
  is_published boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_templates ENABLE ROW LEVEL SECURITY;

-- Users see published templates; admins see drafts too.
CREATE POLICY "Published templates are readable"
ON public.quiz_templates
FOR SELECT
TO authenticated
USING (is_published OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins author templates.
CREATE POLICY "Admins insert templates"
ON public.quiz_templates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update templates"
ON public.quiz_templates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete templates"
ON public.quiz_templates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER quiz_templates_updated_at
  BEFORE UPDATE ON public.quiz_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS quiz_templates_published_idx
  ON public.quiz_templates (is_published, updated_at DESC);
